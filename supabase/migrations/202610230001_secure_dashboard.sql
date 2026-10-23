begin;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, display_name text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 type text not null check (type in ('DEPOSIT','WITHDRAWAL')),
 amount numeric(20,8) not null check (amount > 0 and amount <= 1000000000),
 currency text not null check (currency in ('USD','EUR','BTC','ETH','USDT')),
 status text not null default 'PENDING' check (status in ('PENDING','UNDER_REVIEW','COMPLETED','REJECTED')),
 reference text, admin_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists transactions_user_created_idx on public.transactions(user_id,created_at desc);
create index if not exists transactions_status_created_idx on public.transactions(status,created_at desc);
create table if not exists public.trades (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete restrict,
 title text not null default 'Trading plan',
 amount numeric(20,8) not null check (amount >= 0),
 status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED','CANCELLED')),
 progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists trades_user_created_idx on public.trades(user_id,created_at desc);
create table if not exists public.kyc_records (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete restrict,
 status text not null default 'PENDING' check (status in ('PENDING','UNDER_REVIEW','APPROVED','REJECTED')),
 document_path text, admin_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.admin_users (
 user_id uuid primary key references auth.users(id) on delete cascade,
 is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.admin_audit_logs (
 id bigint generated always as identity primary key,
 admin_user_id uuid not null references auth.users(id) on delete restrict,
 action text not null, record_type text not null, record_id uuid not null,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
 insert into public.profiles(id,email,display_name)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'))
 on conflict(id) do update set email=excluded.email;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.trades enable row level security;
alter table public.kyc_records enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists "Users can read their own transactions" on public.transactions;
create policy "Users can read their own transactions" on public.transactions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users can create their own pending requests" on public.transactions;
create policy "Users can create their own pending requests" on public.transactions for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING');
drop policy if exists "Users can read their own trades" on public.trades;
create policy "Users can read their own trades" on public.trades for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users can read their own KYC status" on public.kyc_records;
create policy "Users can read their own KYC status" on public.kyc_records for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users can create their own pending KYC record" on public.kyc_records;
create policy "Users can create their own pending KYC record" on public.kyc_records for insert to authenticated with check(user_id=(select auth.uid()) and status='PENDING');

create or replace function public.admin_update_transaction_status(
 p_transaction_id uuid,p_status text,p_admin_notes text,p_admin_user_id uuid
) returns jsonb language plpgsql security definer set search_path=public as $$
declare current_row public.transactions%rowtype; updated_row public.transactions%rowtype;
begin
 if p_status not in ('UNDER_REVIEW','COMPLETED','REJECTED') then raise exception 'Invalid transaction status'; end if;
 if not exists(select 1 from public.admin_users where user_id=p_admin_user_id and is_active=true) then raise exception 'Active administrator required'; end if;
 select * into current_row from public.transactions where id=p_transaction_id for update;
 if not found then raise exception 'Transaction not found'; end if;
 if current_row.status not in ('PENDING','UNDER_REVIEW') then raise exception 'Only pending requests can be reviewed'; end if;
 update public.transactions set status=p_status,admin_notes=nullif(left(coalesce(p_admin_notes,''),1000),''),updated_at=now()
 where id=p_transaction_id returning * into updated_row;
 insert into public.admin_audit_logs(admin_user_id,action,record_type,record_id,details)
 values(p_admin_user_id,'TRANSACTION_STATUS_CHANGED','transaction',p_transaction_id,
 jsonb_build_object('from',current_row.status,'to',p_status));
 return jsonb_build_object('id',updated_row.id,'status',updated_row.status,'updated_at',updated_row.updated_at);
end; $$;
revoke all on function public.admin_update_transaction_status(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_transaction_status(uuid,text,text,uuid) to service_role;
grant select on public.profiles,public.transactions,public.trades,public.kyc_records to authenticated;
grant insert on public.transactions,public.kyc_records to authenticated;
grant select,insert,update,delete on public.profiles,public.transactions,public.trades,public.kyc_records,public.admin_users,public.admin_audit_logs to service_role;
commit;
