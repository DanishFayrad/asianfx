-- Stop Loss refund: members who took a signal that hits Stop Loss get their $1 fee back in the wallet
-- (instead of a free signal credit). Free credits members already have still work.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

create or replace function public.settle_signal_results()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.status is distinct from old.status then
        -- Loss → every holder gets the signal fee they paid ($1) back in their wallet.
        -- (Members who used a free credit paid $0, so nothing is refunded to them.)
        if new.status ilike '%stop%' then
            update public.profiles p
                set wallet_balance = wallet_balance + us.invested_amount
                from public.user_signals us
                where us.signal_id = new.id and us.result = 'pending' and us.user_id = p.id
                  and us.invested_amount > 0;

            insert into public.transactions (user_id, type, amount, status, processed_at)
                select us.user_id, 'signal_refund', us.invested_amount, 'approved', now()
                from public.user_signals us
                where us.signal_id = new.id and us.result = 'pending' and us.invested_amount > 0;

            insert into public.notifications (user_id, type, title, message)
                select us.user_id, 'info', 'Signal Fee Refunded',
                       format('%s hit Stop Loss — your $%s signal fee is back in your wallet.',
                              new.symbol, to_char(us.invested_amount, 'FM999990.00'))
                from public.user_signals us
                where us.signal_id = new.id and us.result = 'pending' and us.invested_amount > 0;
        end if;

        update public.user_signals
            set result = case
                when new.status ilike '%hit%'  then 'win'
                when new.status ilike '%stop%' then 'loss'
                else result end
            where signal_id = new.id and result = 'pending';
    end if;
    return new;
end $$;

create or replace function public.get_wallet_stats()
returns json language sql stable security definer set search_path = public as $$
    select json_build_object(
        'balance',           (select wallet_balance from public.profiles where id = auth.uid()),
        'total_deposit',     coalesce(sum(amount) filter (where type = 'deposit'    and status = 'approved'), 0),
        'deposit_count',     count(*)             filter (where type = 'deposit'    and status = 'approved'),
        'total_withdrawal',  coalesce(sum(amount) filter (where type = 'withdrawal' and status = 'approved'), 0),
        'withdrawal_count',  count(*)             filter (where type = 'withdrawal' and status = 'approved'),
        -- Net: fees paid minus fees refunded after a Stop Loss.
        'total_signal_fees', coalesce(sum(amount) filter (where type = 'signal_fee'), 0)
                           - coalesce(sum(amount) filter (where type = 'signal_refund'), 0),
        'total_profit',      (select coalesce(sum(profit), 0) from public.user_signals where user_id = auth.uid())
    )
    from public.transactions
    where user_id = auth.uid();
$$;

create or replace function public.get_admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    return (
        select json_build_object(
            'platform_balance', (select round(coalesce(sum(wallet_balance), 0), 2) from public.profiles where not is_admin),
            'total_users',      (select count(*) from public.profiles where not is_admin),
            'total_deposit',     coalesce(sum(amount) filter (where type = 'deposit'    and status = 'approved'), 0),
            'deposit_count',     count(*)             filter (where type = 'deposit'    and status = 'approved'),
            'pending_deposits',  count(*)             filter (where type = 'deposit'    and status = 'pending'),
            'total_withdrawal',  coalesce(sum(amount) filter (where type = 'withdrawal' and status = 'approved'), 0),
            'withdrawal_count',  count(*)             filter (where type = 'withdrawal' and status = 'approved'),
            'total_profit',      coalesce(sum(amount) filter (where type = 'signal_fee'), 0)
                               - coalesce(sum(amount) filter (where type = 'signal_refund'), 0),
            'total_signals',     (select count(*) from public.signals where target_user_id is null),
            'active_signals',    (select count(*) from public.signals
                                    where target_user_id is null and status = 'Active'
                                      and (close_at is null or close_at > now()))
        )
        from public.transactions
    );
end $$;
