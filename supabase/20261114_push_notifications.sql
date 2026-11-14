-- F1: device push-token and persistent inbox storage. Run after matching.sql.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
drop policy if exists "users manage own push tokens" on public.push_tokens;
create policy "users manage own push tokens" on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 120),
  body text not null check (char_length(body) <= 500),
  type text not null default 'Updates',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.create_trip_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text; v_body text; v_target uuid; v_type text := 'Bookings';
begin
  if tg_op = 'INSERT' and new.status = 'searching' then
    insert into public.notifications (user_id, title, body, type, data)
    select l.rider_id, 'New ride request', new.passenger_name || ' needs a ride to ' || new.destination_name, v_type,
      jsonb_build_object('target', 'requests', 'trip_id', new.id, 'trip_code', new.trip_code)
    from public.rider_locations l join public.profiles p on p.id = l.rider_id
    where l.online and l.updated_at > now() - interval '3 minutes' and p.role = 'rider' and p.rider_status = 'approved' and not p.suspended;
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    v_target := case when new.status in ('accepted', 'arrived', 'completed') then new.passenger_id when new.status = 'cancelled' and new.cancelled_by = 'passenger' then new.rider_id else new.passenger_id end;
    if v_target is null then return new; end if;
    v_title := case new.status when 'accepted' then 'Rider found' when 'arrived' then 'Your rider has arrived' when 'completed' then 'Trip completed' when 'cancelled' then 'Trip cancelled' else null end;
    if v_title is null then return new; end if;
    v_body := case new.status when 'accepted' then coalesce(new.rider_name, 'Your rider') || ' accepted your booking.' when 'arrived' then coalesce(new.rider_name, 'Your rider') || ' is waiting at your pickup.' when 'completed' then 'Your trip ' || new.trip_code || ' is complete.' else 'Your trip ' || new.trip_code || ' was cancelled.' end;
    insert into public.notifications (user_id, title, body, type, data) values (v_target, v_title, v_body, v_type, jsonb_build_object('target', case when v_target = new.rider_id then 'requests' else 'bookings' end, 'trip_id', new.id, 'trip_code', new.trip_code));
  end if;
  return new;
end $$;
drop trigger if exists trips_create_notifications on public.trips;
create trigger trips_create_notifications after insert or update of status on public.trips for each row execute function public.create_trip_notification();
grant select, delete on public.push_tokens to authenticated;
grant select on public.notifications to authenticated;
