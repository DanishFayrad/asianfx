-- Run this once in Supabase → SQL Editor (live DB).
-- Changes: no $5 at signup; $5 bonus on the member's FIRST approved deposit.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_ref  uuid;
    v_code text;
    v_input_code text := nullif(trim(new.raw_user_meta_data->>'referral_code'), '');
begin
    if v_input_code is not null then
        select id into v_ref from public.profiles where upper(referral_code) = upper(v_input_code);
    end if;

    loop
        v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
        exit when not exists (select 1 from public.profiles where referral_code = v_code);
    end loop;

    -- New members start with $0 and inactive. $5 is granted on first approved deposit.
    insert into public.profiles (id, email, name, phone, country, referral_code, referred_by, wallet_balance, is_active)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'country',
        v_code,
        v_ref,
        0,
        false
    );

    if v_ref is not null then
        update public.profiles set referral_count = referral_count + 1 where id = v_ref;
    end if;

    return new;
end $$;

create or replace function public.approve_deposit(p_tx_id bigint, p_amount numeric)
returns json language plpgsql security definer set search_path = public as $$
declare
    v_tx  public.transactions;
    v_ref uuid;
    v_commission numeric;
    v_percent numeric;
    v_is_first boolean;
    v_bonus numeric := 5;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

    select * into v_tx from public.transactions where id = p_tx_id for update;
    if v_tx.id is null then raise exception 'Transaction not found'; end if;
    if v_tx.status <> 'pending' then raise exception 'Transaction already processed'; end if;

    v_is_first := not exists (
        select 1 from public.transactions
        where user_id = v_tx.user_id and type = 'deposit' and status = 'approved'
    );

    update public.transactions
        set status = 'approved', amount = p_amount, processed_at = now()
        where id = p_tx_id;

    update public.profiles
        set wallet_balance = wallet_balance + p_amount
                + case when v_is_first then v_bonus else 0 end,
            is_active = true
        where id = v_tx.user_id
        returning referred_by into v_ref;

    if v_is_first then
        insert into public.transactions (user_id, type, amount, status, processed_at)
            values (v_tx.user_id, 'bonus', v_bonus, 'approved', now());
    end if;

    if v_ref is not null then
        select case when is_influencer then commission_percent else 0 end
            into v_percent from public.profiles where id = v_ref;
        update public.profiles
            set total_referral_deposits = total_referral_deposits + p_amount
            where id = v_ref;
        if coalesce(v_percent, 0) > 0 and v_is_first then
            v_commission := round(p_amount * v_percent / 100, 2);
            update public.profiles
                set affiliate_balance = affiliate_balance + v_commission
                where id = v_ref;
            insert into public.transactions (user_id, type, amount, status, processed_at)
                values (v_ref, 'commission', v_commission, 'approved', now());
        end if;
    end if;

    insert into public.notifications (user_id, type, title, message)
        values (v_tx.user_id, 'payment_approval', 'Deposit Approved',
                case when v_is_first then
                    format('Your deposit of $%s was approved, plus a $%s first-deposit bonus. Total credited: $%s.',
                           p_amount, v_bonus, p_amount + v_bonus)
                else
                    format('Your deposit of $%s has been approved and credited to your wallet.', p_amount)
                end);

    return json_build_object('message', 'Deposit approved', 'first_deposit_bonus', case when v_is_first then v_bonus else 0 end);
end $$;
