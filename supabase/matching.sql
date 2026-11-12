-- =====================================================================
-- RideOn REAL MATCHING  (run AFTER schema.sql, in the Supabase SQL Editor)
-- Safe to re-run. Every step of a trip is now a secured database function, so the
-- phone can no longer invent fares, trips or earnings.
--
-- Trip life:  searching -> accepted -> arrived -> in_progress -> completed
--                  \______________ cancelled ______________/
-- =====================================================================

-- ---------- 1. Settings, rider locations, trip columns ----------
alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_reason text;

-- One row of rules. The server uses it to calculate fares; the app reads it to show estimates.
--   dispatch_radius_km : riders only see requests this close to them. 0 = no limit.
--                        Keep 0 while TESTING from far away; set about 5 when you go live.
--   request_timeout_sec: how long we look for a rider before "no riders available".
create table if not exists public.fare_settings (
  id                  int primary key default 1 check (id = 1),
  base_fare           numeric(8,2) not null default 15,
  per_km              numeric(8,2) not null default 1.60,
  min_fare            numeric(8,2) not null default 15,
  rounding            text not null default 'nearest_1' check (rounding in ('none', 'nearest_1', 'up_1', 'nearest_5')),
  service_area        text not null default 'Bunawan, Agusan del Sur',
  commission_rate     numeric(4,3) not null default 0.100 check (commission_rate between 0 and 0.5),
  dispatch_radius_km  numeric(6,2) not null default 0,
  request_timeout_sec int not null default 90,
  updated_at          timestamptz not null default now()
);
insert into public.fare_settings (id) values (1) on conflict (id) do nothing;
alter table public.fare_settings enable row level security;
drop policy if exists "everyone reads fares" on public.fare_settings;
create policy "everyone reads fares" on public.fare_settings for select to authenticated using (true);

-- Where each rider is and whether they are online (the rider app updates this).
create table if not exists public.rider_locations (
  rider_id   uuid primary key references public.profiles(id) on delete cascade,
  latitude   double precision,
  longitude  double precision,
  online     boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.rider_locations enable row level security;
drop policy if exists "rider writes own location" on public.rider_locations;
create policy "rider writes own location" on public.rider_locations for insert to authenticated
  with check (rider_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rider_status = 'approved' and not p.suspended));
drop policy if exists "rider updates own location" on public.rider_locations;
create policy "rider updates own location" on public.rider_locations for update to authenticated
  using (rider_id = auth.uid()) with check (rider_id = auth.uid());
drop policy if exists "rider reads own location" on public.rider_locations;
create policy "rider reads own location" on public.rider_locations for select to authenticated using (rider_id = auth.uid());

alter table public.trips
  add column if not exists accepted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancel_reason text,
  add column if not exists passenger_name text,
  add column if not exists passenger_phone text,
  add column if not exists passenger_rating numeric(3,2),
  add column if not exists passenger_trip_count int,
  add column if not exists rider_name text,
  add column if not exists rider_phone text,
  add column if not exists rider_plate text,
  add column if not exists rider_vehicle text,
  add column if not exists rider_rating numeric(3,2),
  add column if not exists rider_score int check (rider_score between 1 and 5),
  add column if not exists rider_feedback text;

-- A passenger can have only ONE active trip and a rider only ONE active job. The database enforces it,
-- so even two phones tapping at the same moment cannot break the rule.
create unique index if not exists trips_one_active_per_passenger on public.trips (passenger_id)
  where status in ('searching', 'accepted', 'arrived', 'in_progress');
create unique index if not exists trips_one_active_per_rider on public.trips (rider_id)
  where status in ('accepted', 'arrived', 'in_progress');

create sequence if not exists public.trip_code_seq start 10001;

-- Riders who declined a request (so it does not come back to them).
create table if not exists public.trip_declines (
  trip_id    uuid not null references public.trips(id) on delete cascade,
  rider_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, rider_id)
);
alter table public.trip_declines enable row level security;   -- no policies: only the functions below use it

-- ---------- 2. Close the old "the phone writes trips" doors ----------
drop policy if exists "passenger records cancelled trip" on public.trips;
drop policy if exists "rider records own trip" on public.trips;
revoke execute on function public.record_passenger_trip(jsonb) from authenticated;

-- ---------- 3. Helpers (internal, not callable by the apps) ----------
create or replace function public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- The server alone decides the fare.
create or replace function public.calc_fare(p_km numeric)
returns table (total numeric, commission numeric, rider_share numeric)
language plpgsql stable security definer set search_path = public as $$
declare s public.fare_settings; raw numeric; rounded numeric; t numeric;
begin
  select * into s from public.fare_settings where id = 1;
  raw := s.base_fare + p_km * s.per_km;
  rounded := case s.rounding when 'nearest_1' then round(raw) when 'up_1' then ceil(raw) when 'nearest_5' then round(raw / 5) * 5 else round(raw, 2) end;
  t := greatest(s.min_fare, rounded);
  total := t;
  commission := round(t * s.commission_rate, 2);
  rider_share := t - round(t * s.commission_rate, 2);
  return next;
end $$;

-- Searches nobody accepted in time are closed ("no riders available").
create or replace function public.expire_stale_trips() returns void
language sql security definer set search_path = public as $$
  update public.trips set status = 'cancelled', cancelled_at = now(), cancelled_by = 'system', cancel_reason = 'no_rider'
  where status = 'searching' and coalesce(expires_at, created_at + interval '90 seconds') < now();
$$;

-- ---------- 4. PASSENGER functions ----------
create or replace function public.request_trip(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; s public.fare_settings; f record; v_row public.trips;
  v_km numeric := (p->>'distance_km')::numeric;
  v_min numeric := coalesce((p->>'duration_min')::numeric, 0);
  v_method text := coalesce(p->>'payment_method', 'Cash');
  v_plat double precision := (p->>'pickup_lat')::float8;      v_plng double precision := (p->>'pickup_lng')::float8;
  v_dlat double precision := (p->>'destination_lat')::float8; v_dlng double precision := (p->>'destination_lng')::float8;
  v_hav double precision;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null or me.role <> 'passenger' or me.suspended then raise exception 'This account cannot book rides'; end if;
  perform public.expire_stale_trips();
  if exists (select 1 from public.trips where passenger_id = auth.uid() and status in ('searching', 'accepted', 'arrived', 'in_progress')) then
    raise exception 'You already have an active trip';
  end if;
  if v_plat is null or v_plng is null or v_dlat is null or v_dlng is null or v_km is null then raise exception 'Missing trip details'; end if;
  v_hav := public.km_between(v_plat, v_plng, v_dlat, v_dlng);
  if v_hav < 0.05 then raise exception 'Pickup and destination are too close'; end if;
  if v_hav > 30 then raise exception 'That destination is too far'; end if;
  -- the road distance must make sense compared with the straight-line distance
  if v_km < v_hav * 0.9 - 0.2 or v_km > v_hav * 4 + 1 then raise exception 'Invalid distance'; end if;
  if v_method not in ('Cash', 'RideOn Wallet') then raise exception 'Invalid payment method'; end if;

  select * into f from public.calc_fare(v_km);
  if v_method = 'RideOn Wallet' and me.wallet_balance < f.total then raise exception 'Insufficient wallet balance'; end if;
  select * into s from public.fare_settings where id = 1;

  begin
    insert into public.trips (trip_code, passenger_id, pickup_name, pickup_lat, pickup_lng, destination_name, destination_lat, destination_lng,
      distance_km, duration_min, fare, commission, rider_share, payment_method, status, expires_at,
      passenger_name, passenger_phone, passenger_rating, passenger_trip_count)
    values ('#RO-' || lpad(nextval('public.trip_code_seq')::text, 4, '0'), auth.uid(),
      left(p->>'pickup_name', 120), v_plat, v_plng, left(p->>'destination_name', 120), v_dlat, v_dlng,
      round(v_km, 2), v_min, f.total, f.commission, f.rider_share, v_method, 'searching', now() + make_interval(secs => s.request_timeout_sec),
      me.full_name, me.phone, me.rating, me.rides_count)
    returning * into v_row;
  exception when unique_violation then
    raise exception 'You already have an active trip';
  end;
  return to_jsonb(v_row);
end $$;

create or replace function public.cancel_trip(p_trip uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips;
begin
  update public.trips set status = 'cancelled', cancelled_at = now(), cancelled_by = 'passenger', cancel_reason = left(p_reason, 200)
  where id = p_trip and passenger_id = auth.uid() and status in ('searching', 'accepted', 'arrived') returning * into t;
  if t.id is null then raise exception 'This trip can no longer be cancelled'; end if;
  return to_jsonb(t);
end $$;

create or replace function public.rate_trip(p_trip uuid, p_rating int, p_feedback text default null) returns void
language plpgsql security definer set search_path = public as $$
declare t public.trips;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1 to 5'; end if;
  update public.trips set rider_score = p_rating, rider_feedback = left(p_feedback, 500)
  where id = p_trip and passenger_id = auth.uid() and status = 'completed' and rider_score is null returning * into t;
  if t.id is null then raise exception 'This trip cannot be rated'; end if;
  -- Fair average: starts at 5 stars worth 5 "starter" ratings, so one bad rating cannot wreck a rider.
  update public.profiles set rating = (select round((25.0 + coalesce(sum(rider_score), 0)) / (5.0 + count(rider_score)), 2)
                                       from public.trips where rider_id = t.rider_id and rider_score is not null)
  where id = t.rider_id;
end $$;

-- ---------- 5. Used by BOTH apps ----------
-- Lets an app pick up where it left off after being closed.
create or replace function public.my_active_trip() returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips;
begin
  perform public.expire_stale_trips();
  select * into t from public.trips
  where (passenger_id = auth.uid() or rider_id = auth.uid()) and status in ('searching', 'accepted', 'arrived', 'in_progress')
  order by created_at desc limit 1;
  if t.id is null then return null; end if;
  return to_jsonb(t);
end $$;

-- Current state of one trip (+ the rider's position, for the passenger).
create or replace function public.poll_trip(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips; loc public.rider_locations;
begin
  perform public.expire_stale_trips();
  select * into t from public.trips where id = p_trip and (passenger_id = auth.uid() or rider_id = auth.uid());
  if t.id is null then return null; end if;
  if t.passenger_id = auth.uid() and t.rider_id is not null and t.status in ('accepted', 'arrived', 'in_progress') then
    select * into loc from public.rider_locations where rider_id = t.rider_id;
  end if;
  return jsonb_build_object('trip', to_jsonb(t),
    'rider_location', case when loc.rider_id is null or loc.latitude is null then null
      else jsonb_build_object('latitude', loc.latitude, 'longitude', loc.longitude, 'updated_at', loc.updated_at) end);
end $$;

-- ---------- 6. RIDER functions ----------
-- Open requests this rider may see: online, approved, no current job, near enough, not declined.
create or replace function public.open_requests() returns setof jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; loc public.rider_locations; s public.fare_settings;
begin
  perform public.expire_stale_trips();
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'rider' or me.rider_status <> 'approved' or me.suspended then return; end if;
  select * into loc from public.rider_locations where rider_id = auth.uid();
  if loc.rider_id is null or not loc.online or loc.updated_at < now() - interval '3 minutes' then return; end if;
  if exists (select 1 from public.trips where rider_id = auth.uid() and status in ('accepted', 'arrived', 'in_progress')) then return; end if;
  select * into s from public.fare_settings where id = 1;
  return query
    select jsonb_build_object(
      'id', t.id, 'trip_code', t.trip_code, 'passenger_name', t.passenger_name, 'passenger_rating', t.passenger_rating,
      'passenger_trip_count', t.passenger_trip_count, 'pickup_name', t.pickup_name, 'pickup_lat', t.pickup_lat, 'pickup_lng', t.pickup_lng,
      'destination_name', t.destination_name, 'destination_lat', t.destination_lat, 'destination_lng', t.destination_lng,
      'distance_km', t.distance_km, 'duration_min', t.duration_min, 'fare', t.fare, 'commission', t.commission, 'rider_share', t.rider_share,
      'payment_method', t.payment_method, 'expires_at', coalesce(t.expires_at, t.created_at + interval '90 seconds'),
      'distance_to_pickup_km', case when loc.latitude is null then null else round(public.km_between(loc.latitude, loc.longitude, t.pickup_lat, t.pickup_lng)::numeric, 1) end)
    from public.trips t
    where t.status = 'searching' and coalesce(t.expires_at, t.created_at + interval '90 seconds') > now()
      and not exists (select 1 from public.trip_declines d where d.trip_id = t.id and d.rider_id = auth.uid())
      and (s.dispatch_radius_km = 0 or (loc.latitude is not null and public.km_between(loc.latitude, loc.longitude, t.pickup_lat, t.pickup_lng) <= s.dispatch_radius_km))
    order by t.created_at limit 5;
end $$;

create or replace function public.decline_trip(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'rider') then raise exception 'Riders only'; end if;
  insert into public.trip_declines (trip_id, rider_id) values (p_trip, auth.uid()) on conflict do nothing;
end $$;

-- The first rider to call this wins. "where status = 'searching'" makes it atomic.
create or replace function public.accept_trip(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me public.profiles; loc public.rider_locations; t public.trips;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'rider' or me.rider_status <> 'approved' or me.suspended then raise exception 'Your rider account is not active'; end if;
  select * into loc from public.rider_locations where rider_id = auth.uid();
  if loc.rider_id is null or not loc.online then raise exception 'Go online first'; end if;
  begin
    update public.trips set rider_id = auth.uid(), status = 'accepted', accepted_at = now(),
      rider_name = me.full_name, rider_phone = me.phone, rider_plate = me.plate, rider_vehicle = me.vehicle_model, rider_rating = me.rating
    where id = p_trip and status = 'searching' and rider_id is null and coalesce(expires_at, created_at + interval '90 seconds') > now()
    returning * into t;
  exception when unique_violation then
    raise exception 'You already have an active trip';
  end;
  if t.id is null then raise exception 'This request is no longer available'; end if;
  return to_jsonb(t);
end $$;

create or replace function public.rider_arrived(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips;
begin
  update public.trips set status = 'arrived', arrived_at = now() where id = p_trip and rider_id = auth.uid() and status = 'accepted' returning * into t;
  if t.id is null then raise exception 'This trip is not waiting for pickup'; end if;
  return to_jsonb(t);
end $$;

create or replace function public.start_trip(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips;
begin
  update public.trips set status = 'in_progress', started_at = now() where id = p_trip and rider_id = auth.uid() and status = 'arrived' returning * into t;
  if t.id is null then raise exception 'Mark "arrived" first'; end if;
  return to_jsonb(t);
end $$;

-- Completing records the final result ONCE and settles a wallet payment.
create or replace function public.complete_trip(p_trip uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.trips; v_bal numeric;
begin
  update public.trips set status = 'completed', completed_at = now() where id = p_trip and rider_id = auth.uid() and status = 'in_progress' returning * into t;
  if t.id is null then raise exception 'This trip is not in progress'; end if;
  if t.payment_method = 'RideOn Wallet' then
    update public.profiles set wallet_balance = wallet_balance - t.fare where id = t.passenger_id and wallet_balance >= t.fare returning wallet_balance into v_bal;
    if v_bal is null then
      -- the wallet no longer covers the fare: the rider collects cash instead
      update public.trips set payment_method = 'Cash' where id = t.id returning * into t;
    else
      insert into public.wallet_transactions (user_id, title, amount, kind) values (t.passenger_id, 'Ride Payment', -t.fare, 'ride');
    end if;
  end if;
  update public.profiles set rides_count = rides_count + 1 where id = t.passenger_id;
  return to_jsonb(t);
end $$;

-- A rider who cancels does not cancel the passenger's trip: it goes back to "searching".
create or replace function public.rider_cancel_trip(p_trip uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare t public.trips; s public.fare_settings;
begin
  select * into s from public.fare_settings where id = 1;
  update public.trips set status = 'searching', rider_id = null, accepted_at = null, arrived_at = null,
    rider_name = null, rider_phone = null, rider_plate = null, rider_vehicle = null, rider_rating = null,
    expires_at = now() + make_interval(secs => s.request_timeout_sec)
  where id = p_trip and rider_id = auth.uid() and status in ('accepted', 'arrived') returning * into t;
  if t.id is null then raise exception 'This trip can no longer be cancelled'; end if;
  insert into public.trip_declines (trip_id, rider_id) values (p_trip, auth.uid()) on conflict do nothing;
end $$;

-- ---------- 7. Who may call what ----------
revoke all on function public.km_between(double precision, double precision, double precision, double precision) from public, anon, authenticated;
revoke all on function public.calc_fare(numeric) from public, anon, authenticated;
revoke all on function public.expire_stale_trips() from public, anon, authenticated;
revoke all on function public.request_trip(jsonb), public.cancel_trip(uuid, text), public.rate_trip(uuid, int, text),
  public.my_active_trip(), public.poll_trip(uuid), public.open_requests(), public.decline_trip(uuid), public.accept_trip(uuid),
  public.rider_arrived(uuid), public.start_trip(uuid), public.complete_trip(uuid), public.rider_cancel_trip(uuid, text) from public, anon;
grant execute on function public.request_trip(jsonb), public.cancel_trip(uuid, text), public.rate_trip(uuid, int, text),
  public.my_active_trip(), public.poll_trip(uuid), public.open_requests(), public.decline_trip(uuid), public.accept_trip(uuid),
  public.rider_arrived(uuid), public.start_trip(uuid), public.complete_trip(uuid), public.rider_cancel_trip(uuid, text) to authenticated;

-- RECOMMENDED before real users: stop free test money (there is no payment provider yet).
-- Remove the two dashes in front of the next line to lock it:
-- revoke execute on function public.top_up_wallet(numeric) from authenticated;
