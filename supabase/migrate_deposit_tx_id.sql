-- Deposit transaction ID: members must enter the 12-digit transaction ID of their payment
-- when they submit a deposit; the admin sees it on the Deposits page.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

alter table public.transactions add column if not exists tx_id text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'transactions_tx_id_format') then
        alter table public.transactions
            add constraint transactions_tx_id_format check (tx_id is null or tx_id ~ '^[0-9]{12}$');
    end if;
end $$;
