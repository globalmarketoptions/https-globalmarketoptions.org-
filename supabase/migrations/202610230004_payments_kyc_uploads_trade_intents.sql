begin;

create table if not exists public.payment_instructions (
 id uuid primary key default gen_random_uuid(),
 method text not null check (method in ('CRYPTO','BANK_TRANSFER')),
 currency text not null check (currency in ('USD','EUR','BTC','ETH','USDT')),
 network text,
 recipient_address text,
 bank_name text,
 beneficiary_name text,
 iban text,
 swift_bic text,
 instructions text not null default '',
 is_active boolean not null default true,
 display_order integer not null default 100,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint payment_instruction_details check (
  (method='CRYPTO' and recipient_address is not null and length(trim(recipient_address)) between 8 and 256)
  or
  (method='BANK_TRANSFER' and bank_name is not null and beneficiary_name is not null
    and (iban is not null or recipient_address is not null))
 )
);
create index if not exists payment_instructions_active_idx
 on public.payment_instructions(is_active, display_order);
alter table public.payment_instructions enable row level security;
drop policy if exists "No direct client access to payment instructions" on public.payment_instructions;
-- Reads and writes go through authenticated server API routes; no browser table grants.
revoke all on public.payment_instructions from anon, authenticated;
grant select, insert, update, delete on public.payment_instructions to service_role;

alter table public.transactions
 add column if not exists payment_instruction_id uuid references public.payment_instructions(id) on delete set null;

-- Private bucket for identity verification files. Files must never be publicly readable.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('kyc-private','kyc-private',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
 public=false,
 file_size_limit=10485760,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "Users upload KYC files only to their own folder" on storage.objects;
create policy "Users upload KYC files only to their own folder"
on storage.objects for insert to authenticated
with check (
 bucket_id='kyc-private'
 and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users read KYC files only from their own folder" on storage.objects;
create policy "Users read KYC files only from their own folder"
on storage.objects for select to authenticated
using (
 bucket_id='kyc-private'
 and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users update KYC files only in their own folder" on storage.objects;
create policy "Users update KYC files only in their own folder"
on storage.objects for update to authenticated
using (
 bucket_id='kyc-private'
 and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
 bucket_id='kyc-private'
 and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists "Users delete KYC files only in their own folder" on storage.objects;
create policy "Users delete KYC files only in their own folder"
on storage.objects for delete to authenticated
using (
 bucket_id='kyc-private'
 and (storage.foldername(name))[1] = (select auth.uid())::text
);

create table if not exists public.trade_execution_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 market text not null check (market in ('CRUDE_OIL','REAL_ESTATE','BTC','ETH','USDT','FX','OTHER')),
 side text not null check (side in ('BUY','SELL')),
 quantity numeric(20,8) not null check (quantity > 0 and quantity <= 1000000000),
 currency text not null check (currency in ('USD','EUR','BTC','ETH','USDT')),
 order_type text not null default 'MARKET' check (order_type in ('MARKET','LIMIT')),
 limit_price numeric(20,8) check (limit_price is null or limit_price > 0),
 status text not null default 'PENDING_REVIEW'
  check (status in ('PENDING_REVIEW','APPROVED_FOR_PROVIDER','REJECTED','SUBMITTED','FAILED')),
 provider_reference text,
 admin_notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint limit_orders_need_price check (order_type <> 'LIMIT' or limit_price is not null)
);
create index if not exists trade_execution_user_created_idx
 on public.trade_execution_requests(user_id,created_at desc);
create index if not exists trade_execution_status_created_idx
 on public.trade_execution_requests(status,created_at);
alter table public.trade_execution_requests enable row level security;
drop policy if exists "Users read own trade execution requests" on public.trade_execution_requests;
create policy "Users read own trade execution requests" on public.trade_execution_requests
 for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users create own pending trade execution requests" on public.trade_execution_requests;
create policy "Users create own pending trade execution requests" on public.trade_execution_requests
 for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING_REVIEW');
revoke all on public.trade_execution_requests from anon, authenticated;
grant select, insert on public.trade_execution_requests to authenticated;
grant select,insert,update,delete on public.trade_execution_requests to service_role;

create or replace function public.admin_review_trade_execution(
 p_request_id uuid,
 p_status text,
 p_admin_notes text,
 p_admin_user_id uuid
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old_row public.trade_execution_requests%rowtype; new_row public.trade_execution_requests%rowtype;
begin
 if p_status not in ('APPROVED_FOR_PROVIDER','REJECTED') then raise exception 'Invalid trade review status'; end if;
 if not exists(select 1 from public.admin_users where user_id=p_admin_user_id and is_active=true) then
  raise exception 'Active administrator required';
 end if;
 select * into old_row from public.trade_execution_requests where id=p_request_id for update;
 if not found then raise exception 'Trade request not found'; end if;
 if old_row.status <> 'PENDING_REVIEW' then raise exception 'Only pending trade requests can be reviewed'; end if;
 update public.trade_execution_requests set status=p_status,
  admin_notes=nullif(left(coalesce(p_admin_notes,''),1000),''),
  updated_at=now()
 where id=p_request_id returning * into new_row;
 insert into public.admin_audit_logs(admin_user_id,action,record_type,record_id,details)
 values(p_admin_user_id,'TRADE_REQUEST_REVIEWED','trade_execution_request',p_request_id,
 jsonb_build_object('from',old_row.status,'to',p_status,'market',old_row.market,'side',old_row.side));
 return jsonb_build_object('id',new_row.id,'status',new_row.status,'updated_at',new_row.updated_at);
end;
$$;
revoke all on function public.admin_review_trade_execution(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_review_trade_execution(uuid,text,text,uuid) to service_role;

commit;
