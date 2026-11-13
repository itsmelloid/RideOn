-- =====================================================================
-- RideOn admin portal access
-- Run this once in Supabase SQL Editor after schema.sql.
-- Add administrator rows only from the SQL Editor (never from the app).
-- =====================================================================

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admins read own admin record" on public.admin_users;
create policy "admins read own admin record" on public.admin_users
  for select to authenticated using (id = auth.uid());

-- This function is deliberately the single source of truth for admin checks.
-- SECURITY DEFINER prevents RLS recursion when it is used inside RLS policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "admins read trips" on public.trips;
create policy "admins read trips" on public.trips
  for select to authenticated using (public.is_admin());

-- Allows only authenticated administrators to create the short-lived signed
-- URLs used by the document-review panel. The bucket remains private.
drop policy if exists "admins read rider documents" on storage.objects;
create policy "admins read rider documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'rider-documents' and public.is_admin());

create or replace function public.review_rider_application(p_rider_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can review rider applications';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid rider review status';
  end if;

  update public.profiles
  set rider_status = p_status
  where id = p_rider_id and role = 'rider' and rider_status = 'pending';

  if not found then
    raise exception 'Rider application is not pending or does not exist';
  end if;
end;
$$;

revoke all on function public.review_rider_application(uuid, text) from public, anon;
grant execute on function public.review_rider_application(uuid, text) to authenticated;

-- Rejected applications return to the registration form so riders can replace
-- an unreadable or missing document and submit the application again.
create or replace function public.submit_rider_application()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set rider_status = 'pending', submitted_at = now()
  where id = auth.uid() and role = 'rider' and rider_status in ('registration', 'rejected')
    and plate is not null and license_number is not null;
  if not found then raise exception 'Application is incomplete or already submitted'; end if;
end $$;

revoke all on function public.submit_rider_application() from public, anon;
grant execute on function public.submit_rider_application() to authenticated;

-- Example (replace the UUID with the auth.users ID of the administrator):
-- insert into public.admin_users (id, full_name)
-- values ('00000000-0000-0000-0000-000000000000', 'RideOn Admin')
-- on conflict (id) do update set full_name = excluded.full_name;
