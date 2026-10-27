-- RideOn test workflow. Run this in Supabase SQL Editor after the base tables/policies.
-- It provides atomic rider actions and keeps clients from assigning themselves rides.

create or replace function public.available_rides()
returns table (
  id uuid, passenger_name text, pickup_label text, pickup_lat double precision,
  pickup_lng double precision, destination_label text, destination_lat double precision,
  destination_lng double precision, distance_km numeric, duration_min integer,
  fare_total numeric, rider_share numeric, payment_method text, requested_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.rider_profiles
    where user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'Only approved riders can view ride requests';
  end if;

  return query
  select r.id, p.full_name, r.pickup_label, r.pickup_lat, r.pickup_lng,
         r.destination_label, r.destination_lat, r.destination_lng,
         r.distance_km, r.duration_min, r.fare_total, r.rider_share,
         r.payment_method, r.requested_at
  from public.rides r
  join public.profiles p on p.id = r.passenger_id
  where r.status = 'requested' and r.rider_id is null
  order by r.requested_at asc
  limit 20;
end;
$$;

create or replace function public.claim_ride(p_ride_id uuid)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare claimed public.rides;
begin
  if not exists (
    select 1 from public.rider_profiles
    where user_id = auth.uid() and status = 'approved'
  ) then
    raise exception 'Only approved riders can accept rides';
  end if;

  update public.rides
  set rider_id = auth.uid(), status = 'accepted', accepted_at = now()
  where id = p_ride_id and rider_id is null and status = 'requested'
  returning * into claimed;

  if not found then
    raise exception 'This ride is no longer available';
  end if;

  insert into public.notifications (user_id, title, body, type)
  values (claimed.passenger_id, 'Booking accepted', 'Your rider accepted your booking and is on the way.', 'Bookings');

  return claimed;
end;
$$;

create or replace function public.update_ride_status(p_ride_id uuid, p_status public.ride_status)
returns public.rides
language plpgsql security definer set search_path = public
as $$
declare updated_ride public.rides;
begin
  if p_status = 'cancelled' then
    update public.rides
    set status = 'cancelled', cancelled_at = now()
    where id = p_ride_id
      and (passenger_id = auth.uid() or rider_id = auth.uid())
      and status in ('requested', 'accepted', 'rider_arrived')
    returning * into updated_ride;
  elsif p_status = 'rider_arrived' then
    update public.rides
    set status = 'rider_arrived', arrived_at = now()
    where id = p_ride_id and rider_id = auth.uid() and status = 'accepted'
    returning * into updated_ride;
  elsif p_status = 'in_progress' then
    update public.rides
    set status = 'in_progress', started_at = now()
    where id = p_ride_id and rider_id = auth.uid() and status = 'rider_arrived'
    returning * into updated_ride;
  elsif p_status = 'completed' then
    update public.rides
    set status = 'completed', completed_at = now()
    where id = p_ride_id and rider_id = auth.uid() and status = 'in_progress'
    returning * into updated_ride;
  else
    raise exception 'Unsupported ride status';
  end if;

  if not found then
    raise exception 'Ride cannot be updated in its current state';
  end if;

  if p_status = 'completed' and updated_ride.payment_method = 'RideOn Wallet' then
    insert into public.wallet_transactions (user_id, ride_id, amount, kind, status)
    values (updated_ride.passenger_id, updated_ride.id, -updated_ride.fare_total, 'ride_payment', 'success');
  end if;

  return updated_ride;
end;
$$;

create or replace function public.submit_rider_application(
  p_full_name text,
  p_phone text,
  p_plate text,
  p_vehicle_model text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'rider') then
    raise exception 'Only rider accounts can submit an application';
  end if;

  update public.profiles
  set full_name = p_full_name, phone = p_phone, updated_at = now()
  where id = auth.uid();

  update public.rider_profiles
  set plate = p_plate, vehicle_model = p_vehicle_model,
      status = 'pending', submitted_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.rate_ride(p_ride_id uuid, p_rating smallint)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  update public.rides
  set rating = p_rating
  where id = p_ride_id and passenger_id = auth.uid() and status = 'completed';
  if not found then raise exception 'Completed ride not found'; end if;
end;
$$;

grant execute on function public.available_rides() to authenticated;
grant execute on function public.claim_ride(uuid) to authenticated;
grant execute on function public.update_ride_status(uuid, public.ride_status) to authenticated;
grant execute on function public.submit_rider_application(text, text, text, text) to authenticated;
grant execute on function public.rate_ride(uuid, smallint) to authenticated;

-- Realtime events for both rider and passenger testing.
do $$
begin
  alter publication supabase_realtime add table public.rides;
exception when duplicate_object then null;
end $$;
