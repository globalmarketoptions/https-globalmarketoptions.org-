begin;

-- Keep the API's supported currencies aligned with the deposit UI and payment-method API.
do $$
declare item record;
begin
  for item in
    select conname from pg_constraint
    where conrelid = 'public.payment_instructions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%currency%'
  loop
    execute format('alter table public.payment_instructions drop constraint %I', item.conname);
  end loop;

  for item in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%currency%'
  loop
    execute format('alter table public.transactions drop constraint %I', item.conname);
  end loop;
end $$;

alter table public.payment_instructions
  add constraint payment_instructions_currency_supported_check
  check (currency in ('USD','EUR','GBP','CHF','SGD','BTC','ETH','TRX','USDT'));

alter table public.transactions
  add constraint transactions_currency_supported_check
  check (currency in ('USD','EUR','GBP','CHF','SGD','BTC','ETH','TRX','USDT'));

commit;
