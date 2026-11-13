-- =====================================================================
-- RideOn database schema for Supabase (run once in: SQL Editor > New query)
-- Safe to re-run: uses "if not exists" / "or replace" where possible.
-- =====================================================================

-- ---------- 1. PROFILES (one row per user; created automatically) ----------
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  role           text not null check (role in ('passenger', 'rider')),
  full_name      text not null,
  phone          text not null unique,          -- 09XXXXXXXXX
  email          text,                          -- optional real email
  login_email    text not null unique,          -- email used by Supabase Auth (phone-based)
  rider_status   text check (rider_status in ('registration', 'pending', 'approved', 'rejected')),
  rider_code     text,                          -- e.g. RD-0042
  plate          text,
  vehicle_model  text,
  license_number text,
  license_expiry date,
  documents      jsonb not null default '{}'::jsonb,   -- storage paths of uploaded files
  submitted_at   timestamptz,
  wallet_balance numeric(10,2) not null default 0 check (wallet_balance >= 0),
  rides_count    int not null default 0,
  rating         numeric(3,2) not null default 5,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Users may only edit these columns themselves. Wallet, role, rating and
-- rider_status can NOT be changed from the app (so nobody can approve themselves).
revoke update on public.profiles from anon, authenticated;
grant update (full_name, email, plate, vehicle_model, license_number, license_expiry, documents)
  on public.profiles to authenticated;

-- ---------- 2. Auto-create a profile when someone signs up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'passenger');
begin
  if r not in ('passenger', 'rider') then r := 'passenger'; end if;
  insert into public.profiles (id, role, full_name, phone, email, login_email, rider_status, rider_code)
  values (
    new.id, r,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'RideOn User'),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_user_meta_data->>'email', ''),
    new.email,
    case when r = 'rider' then 'registration' end,
    case when r = 'rider' then 'RD-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0') end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 3. Login by phone OR email ----------
-- Returns the auth email for a phone/email so the app can sign in. (Lets anyone check
-- whether a number is registered - acceptable for this prototype.)
create or replace function public.resolve_login_email(identifier text)
returns text language sql stable security definer set search_path = public as $$
  select login_email from public.profiles
  where phone = identifier or lower(email) = lower(identifier)
  limit 1;
$$;

-- ---------- 4. WALLET TRANSACTIONS ----------
create table if not exists public.wallet_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  amount     numeric(10,2) not null,            -- negative = money out
  status     text not null default 'Success',
  kind       text,                              -- 'topup' | 'ride'
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx on public.wallet_transactions (user_id, created_at desc);
alter table public.wallet_transactions enable row level security;
drop policy if exists "read own transactions" on public.wallet_transactions;
create policy "read own transactions" on public.wallet_transactions
  for select to authenticated using (auth.uid() = user_id);
-- No insert/update policy on purpose: only the functions below can write.

-- ---------- 5. TRIPS ----------
create table if not exists public.trips (
  id                uuid primary key default gen_random_uuid(),
  trip_code         text not null,                         -- e.g. #RO-9821
  passenger_id      uuid references public.profiles(id) on delete set null,
  rider_id          uuid references public.profiles(id) on delete set null,
  pickup_name       text not null,
  pickup_lat        double precision,
  pickup_lng        double precision,
  destination_name  text not null,
  destination_lat   double precision,
  destination_lng   double precision,
  distance_km       numeric(6,2),
  duration_min      numeric(6,1),
  fare              numeric(10,2) not null default 0,
  commission        numeric(10,2) not null default 0,
  rider_share       numeric(10,2) not null default 0,
  commission_status text not null default 'pending' check (commission_status in ('pending', 'paid', 'disputed')),
  payment_method    text,
  status            text not null check (status in ('searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index if not exists trips_passenger_idx on public.trips (passenger_id, created_at desc);
create index if not exists trips_rider_idx on public.trips (rider_id, created_at desc);
alter table public.trips enable row level security;

drop policy if exists "participants read trips" on public.trips;
create policy "participants read trips" on public.trips
  for select to authenticated using (auth.uid() = passenger_id or auth.uid() = rider_id);

drop policy if exists "passenger records cancelled trip" on public.trips;
create policy "passenger records cancelled trip" on public.trips
  for insert to authenticated with check (passenger_id = auth.uid() and rider_id is null and status = 'cancelled');

drop policy if exists "rider records own trip" on public.trips;
create policy "rider records own trip" on public.trips
  for insert to authenticated with check (
    rider_id = auth.uid() and passenger_id is null and status in ('completed', 'cancelled')
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rider_status = 'approved')
  );

-- ---------- 6. FUNCTIONS (the only way to change money / status) ----------
-- PROTOTYPE: top-up adds money without a real payment. In production, remove this
-- function and credit wallets from a payment-provider webhook (service role key).
create or replace function public.top_up_wallet(p_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 5000 then raise exception 'Invalid amount'; end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount
    where id = auth.uid() and role = 'passenger' returning wallet_balance into v_bal;
  if v_bal is null then raise exception 'Only passengers have a wallet'; end if;
  insert into public.wallet_transactions (user_id, title, amount, kind) values (auth.uid(), 'Top Up Wallet', p_amount, 'topup');
  return v_bal;
end $$;

-- Saves a finished passenger trip and charges the wallet when paying with RideOn Wallet.
-- PROTOTYPE: the fare comes from the phone. In production calculate it on the server.
create or replace function public.record_passenger_trip(p jsonb)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_fare   numeric := coalesce((p->>'fare')::numeric, 0);
  v_method text := p->>'payment_method';
  v_bal    numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select wallet_balance into v_bal from public.profiles where id = auth.uid() and role = 'passenger' for update;
  if v_bal is null then raise exception 'Only passengers can record trips'; end if;
  if v_fare < 0 or v_fare > 5000 then raise exception 'Invalid fare'; end if;

  if v_method = 'RideOn Wallet' then
    if v_bal < v_fare then raise exception 'Insufficient wallet balance'; end if;
    v_bal := v_bal - v_fare;
    update public.profiles set wallet_balance = v_bal where id = auth.uid();
    insert into public.wallet_transactions (user_id, title, amount, kind) values (auth.uid(), 'Ride Payment', -v_fare, 'ride');
  end if;

  update public.profiles set rides_count = rides_count + 1 where id = auth.uid();

  insert into public.trips (trip_code, passenger_id, pickup_name, pickup_lat, pickup_lng,
    destination_name, destination_lat, destination_lng, distance_km, duration_min,
    fare, commission, rider_share, payment_method, status, completed_at)
  values (p->>'trip_code', auth.uid(), p->>'pickup_name', (p->>'pickup_lat')::float8, (p->>'pickup_lng')::float8,
    p->>'destination_name', (p->>'destination_lat')::float8, (p->>'destination_lng')::float8,
    (p->>'distance_km')::numeric, (p->>'duration_min')::numeric,
    v_fare, coalesce((p->>'commission')::numeric, 0), coalesce((p->>'rider_share')::numeric, 0),
    v_method, 'completed', now());
  return v_bal;
end $$;

-- Moves a rider's application from "registration" to "pending" (admin then approves).
create or replace function public.submit_rider_application()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set rider_status = 'pending', submitted_at = now()
  where id = auth.uid() and role = 'rider' and rider_status in ('registration', 'rejected')
    and plate is not null and license_number is not null;
  if not found then raise exception 'Application is incomplete or already submitted'; end if;
end $$;

-- Lock function access: only signed-in users (login lookup is also allowed for anon).
revoke all on function public.top_up_wallet(numeric) from public, anon;
revoke all on function public.record_passenger_trip(jsonb) from public, anon;
revoke all on function public.submit_rider_application() from public, anon;
revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.top_up_wallet(numeric) to authenticated;
grant execute on function public.record_passenger_trip(jsonb) to authenticated;
grant execute on function public.submit_rider_application() to authenticated;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- ---------- 7. STORAGE for rider documents (private) ----------
insert into storage.buckets (id, name, public) values ('rider-documents', 'rider-documents', false)
  on conflict (id) do nothing;

drop policy if exists "riders upload own documents" on storage.objects;
create policy "riders upload own documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "riders update own documents" on storage.objects;
create policy "riders update own documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "riders read own documents" on storage.objects;
create policy "riders read own documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'rider-documents' and (storage.foldername(name))[1] = auth.uid()::text);
