# Supabase setup guide for RideOn

Supabase gives the app a real database (Postgres), user login (Auth) and file storage (for rider documents).
Free plan is enough for development and testing.

## What is stored where
| Data | Where |
|---|---|
| Users, passwords | Supabase Auth |
| Name, phone, role, wallet balance, rider status | table `profiles` |
| Wallet history | table `wallet_transactions` |
| Trips (completed / cancelled) | table `trips` |
| Rider documents (license, ORCR, photo) | Storage bucket `rider-documents` (private) |

Security: **Row Level Security** is ON for every table. A user can only read their own rows, and cannot edit
their own wallet, role or rider approval from the app. Only the database functions (`top_up_wallet`,
`record_passenger_trip`, `submit_rider_application`) change those.

## Step 1 - Create the project
1. Go to https://supabase.com and sign in (GitHub is easiest).
2. **New project** > name `rideon` > set a strong **database password** (save it) > pick the region closest to
   you (Singapore) > **Create new project**. Wait ~2 minutes.

## Step 2 - Create the tables
1. Left menu > **SQL Editor** > **New query**.
2. Open `supabase/schema.sql` from this project, copy ALL of it, paste, click **Run**.
   You should see "Success. No rows returned".
3. Check: **Table Editor** shows `profiles`, `trips`, `wallet_transactions`.

## Step 3 - Turn OFF email confirmation
The app signs people up with their phone number (a hidden email is created, nothing is ever emailed), so
confirmation must be off.
**Authentication > Sign In / Providers > Email** > turn **Confirm email** OFF > Save.
(Menu names move around; look for "Confirm email".)

## Step 4 - Add the demo accounts (optional but recommended)
SQL Editor > New query > paste `supabase/seed_demo.sql` > **Run**.

| Role | Phone | Password | Notes |
|---|---|---|---|
| Passenger | 09123456789 | password123 | Adrian Dusal, wallet P500, trip history |
| Passenger | 09123456781 | password123 | Maria Santos, wallet P200 |
| Rider | 09123456780 | password123 | Hans Braga, **Approved**, plate TRI-4821 |
| Rider | 09123456782 | password123 | Mario Reyes, **Approved**, plate TRI-5532 |

Running the script again resets these accounts. Delete them before launching the real app.
If this script errors in your project (Supabase changes its internal auth tables sometimes), use the fallback:
sign up the account inside the app, then approve it with the SQL in Step 7.

## Step 5 - Connect the app
1. **Project Settings > API Keys** (or **Connect** button on top).
2. Copy the **Project URL** and the **Publishable key** (older projects call it *anon public*).
3. In the app folder, copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. **Never** put the *secret* / *service_role* key in the app or in `.env`.
5. Install the two new packages and restart:
   ```
   npm install @supabase/supabase-js react-native-url-polyfill
   npx expo start -c
   ```

## Step 6 - Test
- Log in as Passenger `09123456789` / `password123`. Wallet shows P500 and past trips.
- Book a trip and let it finish: the wallet drops and the trip appears in Bookings (check **Table Editor > trips**).
- Top Up adds money (prototype only, no real payment).
- Log in as Rider `09123456780`: goes straight to the Dashboard because the account is approved.
- Sign up a NEW rider: you register, upload documents, and land on "Application under review".

## Step 7 - Approve a new rider (what the Admin does)
Table Editor > `profiles` > find the rider > change `rider_status` to `approved`.
Or in the SQL Editor:
```sql
update public.profiles set rider_status = 'approved' where phone = '09XXXXXXXXX';
```
In the app, tap **Check Status** on the Verification screen. Uploaded files are in **Storage > rider-documents**.

## Troubleshooting
| Problem | Fix |
|---|---|
| "Supabase is not set up yet" | `.env` missing or app not restarted: `npx expo start -c` |
| "Email address is invalid" when signing up | change `PHONE_EMAIL_DOMAIN` in `src/services/supabase.js` AND in `seed_demo.sql` to a domain you own |
| "Email confirmation is still ON" | Step 3 |
| "Database error saving new user" / already registered | that phone number already exists |
| Login says incorrect password for demo accounts | re-run `seed_demo.sql`; make sure you chose the right role (Passenger/Rider) |
| Empty wallet / trips | check the Table Editor; RLS hides other users' rows |
| "new row violates row-level security policy" | the rider account is not `approved` |

## What is still simulated
Rider matching and live tracking are still timers: a passenger booking does not reach a real rider yet.
Next step: realtime matching (`trips` table + Supabase Realtime), real SMS OTP (Twilio), real payments, and an
admin dashboard.
