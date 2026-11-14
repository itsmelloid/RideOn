-- =====================================================================
-- RideOn manual cash-in flow (F2)
-- Run AFTER schema.sql, matching.sql, and admin_portal.sql.
-- Safe to run more than once.
-- =====================================================================

create table if not exists public.topup_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  amount         numeric(10,2) not null check (amount >= 50 and amount <= 5000),
  reference_note text not null default '' check (char_length(reference_note) <= 160),
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    uuid references auth.users(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  constraint topup_requests_reviewed_state check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists topup_requests_user_created_idx
  on public.topup_requests (user_id, created_at desc);
create index if not exists topup_requests_pending_idx
  on public.topup_requests (created_at asc) where status = 'pending';

alter table public.topup_requests enable row level security;

drop policy if exists "passengers read own topup requests" on public.topup_requests;
create policy "passengers read own topup requests" on public.topup_requests
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admins read all topup requests" on public.topup_requests;
create policy "admins read all topup requests" on public.topup_requests
  for select to authenticated using (coalesce(public.is_admin(), false));

-- The app never inserts this table directly. This RPC applies server-side
-- validation and prevents a passenger from accidentally submitting duplicates.
create or replace function public.create_topup_request(p_amount numeric, p_reference_note text default '')
returns public.topup_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request public.topup_requests;
  v_note text := btrim(coalesce(p_reference_note, ''));
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount < 50 or p_amount > 5000 or p_amount <> round(p_amount, 2) then
    raise exception 'Top-up amount must be between 50 and 5000 pesos';
  end if;
  if char_length(v_note) > 160 then raise exception 'Reference note is too long'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'passenger') then
    raise exception 'Only passengers can request a wallet top-up';
  end if;
  if exists (select 1 from public.topup_requests where user_id = auth.uid() and status = 'pending') then
    raise exception 'You already have a pending top-up request';
  end if;

  insert into public.topup_requests (user_id, amount, reference_note)
  values (auth.uid(), p_amount, v_note)
  returning * into v_request;
  return v_request;
end;
$$;

-- Only this RPC can settle a request. The row lock and pending-state test make
-- approval idempotent: a retry never credits the wallet twice.
create or replace function public.review_topup_request(p_request_id uuid, p_status text)
returns public.topup_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request public.topup_requests;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Only administrators can review top-up requests';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'Top-up status must be approved or rejected';
  end if;

  select * into v_request from public.topup_requests where id = p_request_id for update;
  if not found then raise exception 'Top-up request not found'; end if;
  if v_request.status <> 'pending' then return v_request; end if;

  if p_status = 'approved' then
    update public.profiles
      set wallet_balance = wallet_balance + v_request.amount
      where id = v_request.user_id and role = 'passenger';
    if not found then raise exception 'Passenger account was not found'; end if;
    insert into public.wallet_transactions (user_id, title, amount, kind)
      values (v_request.user_id, 'Manual wallet top-up', v_request.amount, 'topup');
  end if;

  update public.topup_requests
    set status = p_status, reviewed_by = auth.uid(), reviewed_at = now()
    where id = v_request.id
    returning * into v_request;
  return v_request;
end;
$$;

-- Close the prototype free-money endpoint, including for existing sessions.
do $$
begin
  if to_regprocedure('public.top_up_wallet(numeric)') is not null then
    execute 'revoke all on function public.top_up_wallet(numeric) from public, anon, authenticated';
  end if;
end $$;

revoke all on function public.create_topup_request(numeric, text) from public, anon;
revoke all on function public.review_topup_request(uuid, text) from public, anon;
grant execute on function public.create_topup_request(numeric, text) to authenticated;
grant execute on function public.review_topup_request(uuid, text) to authenticated;
grant select on public.topup_requests to authenticated;
