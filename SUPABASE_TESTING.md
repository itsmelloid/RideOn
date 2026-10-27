# RideOn Supabase test setup

The app now uses Supabase for authentication, profiles, ride requests, rider approval, ride status, notifications, and rider location.

## One-time dashboard setup

1. In Supabase Dashboard, open **SQL Editor**.
2. Run the base schema and RLS scripts already created for this project.
3. Run the entire contents of `supabase/migrations/202610270001_ride_workflow.sql`.
4. For simple device testing, open **Authentication > Providers > Email** and turn off **Confirm email**. Turn it back on before production and configure a real redirect/deep-link flow.

## Create test users

Create a passenger account and a rider account from the app using two different email addresses. A newly created rider starts as `registration`; submit its registration form, then approve it in SQL Editor:

```sql
update public.rider_profiles
set status = 'approved', approved_at = now()
where user_id = (
  select id from public.profiles where phone = 'RIDER_PHONE_NUMBER'
);
```

Log the rider out and in again after approval.

## Test flow

1. Sign in as the rider and switch **Online** on.
2. Sign out, then sign in as the passenger.
3. Choose a destination, confirm a **Cash** booking, and wait on the Searching screen.
4. Sign out, then sign in as the rider. The rider receives the request and can accept it.
5. Use **Arrived at Pickup**, **Start Trip**, and **Complete Trip**.
6. Sign in as the passenger again. The completed booking and rating flow are loaded from Supabase.

## Current testing scope

Rider document selection is still local to the device; the registration form saves rider details and sends the application for review, but document upload to Supabase Storage is intentionally not enabled yet. Wallet top-ups remain disabled because real payment handling needs a payment provider and server-side webhooks.
