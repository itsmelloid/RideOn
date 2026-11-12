-- =====================================================================
-- RideOn DEMO ACCOUNTS  (run AFTER schema.sql, in the SQL Editor)
-- Re-running this script resets the demo accounts to a clean state.
--
--  PASSENGERS (password123)         RIDERS - already APPROVED (password123)
--  09123456789  Adrian Dusal  P500  09123456780  Hans Braga   RD-0042
--  09123456781  Maria Santos  P200  09123456782  Mario Reyes  RD-0043
--
-- Hans Braga and Adrian Dusal also share sample trips, so Bookings, Wallet,
-- Trip History and Earnings are not empty. FOR TESTING ONLY - delete these
-- accounts before launching the real app.
-- =====================================================================

-- 0. Clean previous demo data
delete from public.trips where trip_code like '#RO-98%' or passenger_id in (
  'a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222')
  or rider_id in ('b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');
delete from auth.users where id in (
  'a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222',
  'b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

-- 1. Create the login accounts (the database trigger creates each profile)
with demo(user_id, phone, full_name, user_role, real_email) as (values
  ('a1111111-1111-4111-8111-111111111111'::uuid, '09123456789', 'Adrian Dusal', 'passenger', 'adrian@example.com'),
  ('a2222222-2222-4222-8222-222222222222'::uuid, '09123456781', 'Maria Santos', 'passenger', 'maria@example.com'),
  ('b1111111-1111-4111-8111-111111111111'::uuid, '09123456780', 'Hans Braga',   'rider',     'hans@example.com'),
  ('b2222222-2222-4222-8222-222222222222'::uuid, '09123456782', 'Mario Reyes',  'rider',     'mario@example.com')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
select
  '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated',
  phone || '@phone.rideon.app',                       -- must match PHONE_EMAIL_DOMAIN in the app
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('role', user_role, 'full_name', full_name, 'phone', phone, 'email', real_email),
  now(), now(), '', '', '', '', '', '', '', ''
from demo;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.id in ('a1111111-1111-4111-8111-111111111111', 'a2222222-2222-4222-8222-222222222222',
               'b1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222');

-- 2. Passenger details
update public.profiles set wallet_balance = 500, rides_count = 124, rating = 4.9
  where id = 'a1111111-1111-4111-8111-111111111111';
update public.profiles set wallet_balance = 200, rides_count = 12, rating = 4.8
  where id = 'a2222222-2222-4222-8222-222222222222';

-- 3. Riders: APPROVED by "admin" (this is the same change an admin makes in the Table Editor)
update public.profiles set
  rider_status = 'approved', rider_code = 'RD-0042', rating = 4.9,
  plate = 'TRI-4821', vehicle_model = 'Bajaj RE', license_number = 'N01-00-123456', license_expiry = '2028-03-31',
  submitted_at = now() - interval '10 days'
  where id = 'b1111111-1111-4111-8111-111111111111';
update public.profiles set
  rider_status = 'approved', rider_code = 'RD-0043', rating = 4.8,
  plate = 'TRI-5532', vehicle_model = 'TVS King', license_number = 'N02-11-654321', license_expiry = '2027-12-31',
  submitted_at = now() - interval '12 days'
  where id = 'b2222222-2222-4222-8222-222222222222';

-- 4. Sample trips: passenger Adrian Dusal with rider Hans Braga
insert into public.trips (trip_code, passenger_id, rider_id, pickup_name, pickup_lat, pickup_lng,
  destination_name, destination_lat, destination_lng, distance_km, duration_min,
  fare, commission, rider_share, commission_status, payment_method, status, created_at, completed_at)
select t.code, 'a1111111-1111-4111-8111-111111111111', 'b1111111-1111-4111-8111-111111111111',
  t.pname, t.plat, t.plng, t.dname, t.dlat, t.dlng, t.km, t.mins,
  t.fare, t.comm, t.share, t.cstatus, 'RideOn Wallet', t.st, now() - t.ago,
  case when t.st = 'completed' then now() - t.ago + interval '12 minutes' end
from (values
  ('#RO-9821', 'Bunawan Public Market', 8.1752, 125.9902, 'Bunawan Elementary School', 8.1741, 125.9951, 1.6, 8.0, 35.00, 3.50, 31.50, 'pending', 'completed', interval '2 hours'),
  ('#RO-9820', 'Poblacion Plaza',        8.1775, 125.9928, 'Bunawan Health Center',          8.1768, 125.9917, 0.0, 0.0,  0.00, 0.00,  0.00, 'pending', 'cancelled', interval '5 hours'),
  ('#RO-9819', 'Bunawan Health Center',  8.1768, 125.9917, 'Poblacion Plaza',                8.1775, 125.9928, 1.2, 6.0, 25.00, 2.50, 22.50, 'paid',    'completed', interval '1 day'),
  ('#RO-9818', 'Bunawan Public Market',  8.1752, 125.9902, 'Bunawan Elementary School',      8.1741, 125.9951, 1.6, 8.0, 40.00, 4.00, 36.00, 'pending', 'completed', interval '1 day 3 hours'),
  ('#RO-9815', 'San Teodoro, Public Market', 8.1581, 125.9955, 'Agusan del Sur State University', 8.16928, 126.00455, 1.9, 9.0, 30.00, 3.00, 27.00, 'paid', 'completed', interval '3 days'),
  ('#RO-9812', 'Bunawan Public Market',  8.1752, 125.9902, 'Agusan del Sur State University', 8.16928, 126.00455, 2.8, 12.0, 50.00, 5.00, 45.00, 'paid', 'completed', interval '5 days')
) as t(code, pname, plat, plng, dname, dlat, dlng, km, mins, fare, comm, share, cstatus, st, ago);

-- 5. Adrian's wallet history (adds up to the P500 balance)
insert into public.wallet_transactions (user_id, title, amount, kind, created_at) values
  ('a1111111-1111-4111-8111-111111111111', 'Top Up Wallet',  680.00, 'topup', now() - interval '6 days'),
  ('a1111111-1111-4111-8111-111111111111', 'Ride Payment',   -50.00, 'ride',  now() - interval '5 days'),
  ('a1111111-1111-4111-8111-111111111111', 'Ride Payment',   -30.00, 'ride',  now() - interval '3 days'),
  ('a1111111-1111-4111-8111-111111111111', 'Ride Payment',   -40.00, 'ride',  now() - interval '1 day 3 hours'),
  ('a1111111-1111-4111-8111-111111111111', 'Ride Payment',   -25.00, 'ride',  now() - interval '1 day'),
  ('a1111111-1111-4111-8111-111111111111', 'Ride Payment',   -35.00, 'ride',  now() - interval '2 hours');
