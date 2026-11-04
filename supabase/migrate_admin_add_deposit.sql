-- Admin adds a deposit by hand (e.g. the member paid by cash or bank transfer outside the site).
-- It is saved as a deposit and approved straight away through approve_deposit, so the wallet is
-- credited, the account is activated, and the first-deposit bonus / influencer commission apply as usual.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

create or replace function public.admin_add_deposit(p_user_id uuid, p_amount numeric, p_method text default 'manual')
returns json language plpgsql security definer set search_path = public as $$
declare v_tx bigint;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than 0'; end if;
    if not exists (select 1 from public.profiles where id = p_user_id and not is_admin) then
        raise exception 'Member not found';
    end if;

    insert into public.transactions (user_id, type, amount, status, payment_method)
        values (p_user_id, 'deposit', p_amount, 'pending', coalesce(nullif(trim(p_method), ''), 'manual'))
        returning id into v_tx;
    perform public.approve_deposit(v_tx, p_amount);

    return json_build_object('message', 'Deposit added and approved', 'transaction_id', v_tx);
end $$;
