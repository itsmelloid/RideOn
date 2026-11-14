-- =====================================================================
-- RideOn suspended-account enforcement (F4)
-- Run AFTER schema.sql, matching.sql, and admin_portal.sql.
-- =====================================================================

alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_reason text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete restrict,
  admin_name text not null,
  action text not null,
  category text not null,
  target text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
alter table public.audit_logs enable row level security;

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
  for select to authenticated using (coalesce(public.is_admin(), false));

create or replace function public.set_account_suspension(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_admin_name text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_target public.profiles;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Only administrators can restrict accounts';
  end if;
  if p_user_id is null or p_suspended is null then raise exception 'Invalid account restriction request'; end if;
  if p_suspended and v_reason is null then raise exception 'A restriction reason is required'; end if;
  if char_length(coalesce(v_reason, '')) > 300 then raise exception 'Restriction reason is too long'; end if;

  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Account not found'; end if;
  if v_target.id = auth.uid() then raise exception 'Administrators cannot restrict their own account'; end if;

  update public.profiles
    set suspended = p_suspended,
        suspended_reason = case when p_suspended then v_reason else null end
    where id = p_user_id;

  select full_name into v_admin_name from public.admin_users where id = auth.uid();
  insert into public.audit_logs (admin_id, admin_name, action, category, target, details)
  values (
    auth.uid(), coalesce(v_admin_name, 'RideOn Admin'),
    case when p_suspended then 'restricted account' else 'restored account' end,
    'accounts', v_target.id::text,
    jsonb_build_object('role', v_target.role, 'reason', case when p_suspended then v_reason else null end)
  );
end;
$$;

revoke all on function public.set_account_suspension(uuid, boolean, text) from public, anon;
grant execute on function public.set_account_suspension(uuid, boolean, text) to authenticated;
grant select on public.audit_logs to authenticated;
