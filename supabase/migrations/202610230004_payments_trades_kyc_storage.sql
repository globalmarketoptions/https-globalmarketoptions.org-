begin;

alter table public.kyc_records drop constraint if exists kyc_records_status_check;
alter table public.kyc_records add constraint kyc_records_status_check
 check (status in ('UPLOAD_PENDING','PENDING','UNDER_REVIEW','APPROVED','REJECTED'));

create table if not exists public.payment_instructions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('CRYPTO','BANK')),
  currency text not null check (currency in ('BTC','ETH','USDT','USD','EUR')),
  network text,
  label text not null,
  instructions jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payment_instructions enable row level security;
drop policy if exists "Users can read active payment instructions" on public.payment_instructions;
create policy "Users can read active payment instructions" on public.payment_instructions
 for select to authenticated using (is_active = true);
grant select on public.payment_instructions to authenticated;
grant select, insert, update, delete on public.payment_instructions to service_role;

alter table public.transactions add column if not exists payment_method_code text references public.payment_instructions(code) on update cascade on delete set null;

create table if not exists public.trade_intents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 market text not null check (market in ('CRUDE_OIL','REAL_ESTATE','BTC','ETH','USDT','OTHER')),
 side text not null check (side in ('BUY','SELL','SUBSCRIBE','REDEEM')),
 amount numeric(20,8) not null check (amount > 0 and amount <= 1000000000),
 currency text not null check (currency in ('USD','EUR','BTC','ETH','USDT')),
 notes text,
 status text not null default 'PENDING_REVIEW'
  check (status in ('PENDING_REVIEW','APPROVED','REJECTED','CANCELLED','EXECUTED','FAILED')),
 provider_order_id text,
 execution_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists trade_intents_user_created_idx on public.trade_intents(user_id,created_at desc);
create index if not exists trade_intents_status_created_idx on public.trade_intents(status,created_at desc);
alter table public.trade_intents enable row level security;
drop policy if exists "Users can read their own trade intents" on public.trade_intents;
create policy "Users can read their own trade intents" on public.trade_intents
 for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users can create their own trade intents" on public.trade_intents;
create policy "Users can create their own trade intents" on public.trade_intents
 for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'PENDING_REVIEW'
  and provider_order_id is null and execution_message is null
 );
grant select on public.trade_intents to authenticated;
grant insert on public.trade_intents to authenticated;
grant select, insert, update, delete on public.trade_intents to service_role;

-- Private KYC document storage. No public read access; use short-lived signed URLs
-- minted only after server-side ownership/admin checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-private', 'kyc-private', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
 allowed_mime_types = array['image/jpeg','image/png','application/pdf'];

drop policy if exists "KYC users can upload only to their own folder" on storage.objects;
create policy "KYC users can upload only to their own folder" on storage.objects
 for insert to authenticated
 with check (bucket_id = 'kyc-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "KYC users can read only their own documents" on storage.objects;
create policy "KYC users can read only their own documents" on storage.objects
 for select to authenticated
 using (bucket_id = 'kyc-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.admin_update_trade_intent(
 p_intent_id uuid, p_status text, p_admin_notes text, p_admin_user_id uuid
) returns jsonb language plpgsql security definer set search_path=public as $$
declare current_row public.trade_intents%rowtype; updated_row public.trade_intents%rowtype;
begin
 if p_status not in ('APPROVED','REJECTED','CANCELLED') then
  raise exception 'Invalid trade intent status';
 end if;
 if not exists(select 1 from public.admin_users where user_id=p_admin_user_id and is_active=true) then
  raise exception 'Active administrator required';
 end if;
 select * into current_row from public.trade_intents where id=p_intent_id for update;
 if not found then raise exception 'Trade intent not found'; end if;
 if current_row.status <> 'PENDING_REVIEW' then raise exception 'Only pending trade intents can be reviewed'; end if;
 update public.trade_intents set status=p_status,
  execution_message=nullif(left(coalesce(p_admin_notes,''),1000),''),
  updated_at=now()
 where id=p_intent_id returning * into updated_row;
 insert into public.admin_audit_logs(admin_user_id,action,record_type,record_id,details)
 values(p_admin_user_id,'TRADE_INTENT_REVIEWED','trade_intent',p_intent_id,
 jsonb_build_object('from',current_row.status,'to',p_status,
 'note',left(coalesce(p_admin_notes,''),300)));
 return jsonb_build_object('id',updated_row.id,'status',updated_row.status,'updated_at',updated_row.updated_at);
end; $$;
revoke all on function public.admin_update_trade_intent(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_trade_intent(uuid,text,text,uuid) to service_role;

commit;
