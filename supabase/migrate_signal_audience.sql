-- Signal audience: admin picks who a broadcast signal goes to (all / deposited / not deposited).
-- Run once in Supabase → SQL Editor (live and local). Safe to re-run.

alter table public.signals add column if not exists audience text not null default 'deposited';

create or replace function public.has_deposit(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.transactions
                   where user_id = p_user_id and type = 'deposit' and status = 'approved');
$$;
revoke execute on function public.has_deposit(uuid) from public, anon, authenticated;

create or replace function public.signal_audience_match(p_audience text, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((
        select not p.is_admin and case coalesce(p_audience, 'deposited')
            when 'all'           then true
            when 'not_deposited' then not public.has_deposit(p.id)
            else p.is_active
        end
        from public.profiles p where p.id = p_user_id), false);
$$;
revoke execute on function public.signal_audience_match(text, uuid) from public, anon, authenticated;

create or replace function public.notify_new_signal()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.notifications (user_id, type, title, message, data)
    select p.id,
           'signal',
           case when new.target_user_id is null then 'New Signal Available!' else 'New Private Signal!' end,
           format('%s %s — open your dashboard to unlock it', upper(new.type), new.symbol),
           -- No prices here: Entry / TP / SL are only revealed after the member pays for the signal.
           jsonb_build_object('signal', jsonb_build_object(
               'id', new.id, 'symbol', new.symbol, 'type', new.type, 'signal_type', new.signal_type,
               'release_at', new.release_at, 'target_user_id', new.target_user_id, 'created_at', new.created_at))
    from public.profiles p
    where not p.is_admin
      -- Private → that member. Broadcast → only members with money (or a free credit) in their account.
      and (p.id = new.target_user_id
           or (new.target_user_id is null and public.signal_audience_match(new.audience, p.id)));
    return new;
end $$;

create or replace function public.get_member_signals()
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(x order by x.created_at desc), '[]'::json)
    from (
        select s.id, s.symbol, s.type, s.signal_type, s.description, s.status,
               s.target_user_id, s.release_at, s.close_at, s.total_taken, s.created_at,
               (us.id is not null) as purchased,
               case when public.is_admin() or us.id is not null or s.status <> 'Active' then s.entry_price  end as entry_price,
               case when public.is_admin() or us.id is not null or s.status <> 'Active' then s.target_price end as target_price,
               case when public.is_admin() or us.id is not null or s.status <> 'Active' then s.stop_loss    end as stop_loss
        from public.signals s
        left join public.user_signals us on us.signal_id = s.id and us.user_id = auth.uid()
        where auth.uid() is not null
          -- Admin: everything. Member: their private signals, signals they already took, and
          -- broadcast signals only while they have money (or a free credit) in their account.
          and (public.is_admin()
               or s.target_user_id = auth.uid()
               or us.id is not null
               -- broadcast signals: only ones sent after the member joined (new members don't see old history)
               or (s.target_user_id is null and public.signal_audience_match(s.audience, auth.uid())
                   and s.created_at >= (select p.created_at from public.profiles p where p.id = auth.uid())))
          and not exists (select 1 from public.hidden_signals h where h.user_id = auth.uid() and h.signal_id = s.id)
        order by s.created_at desc
        limit 100
    ) x;
$$;

create or replace function public.take_signal(p_signal_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare
    v_fee numeric := 1;
    v_p   public.profiles;
    v_s   public.signals;
begin
    select * into v_p from public.profiles where id = auth.uid() for update;
    if v_p.id is null then raise exception 'Not authenticated'; end if;
    if not v_p.is_active and not v_p.is_admin then
        raise exception 'Your account is not active for signals. Please complete a deposit and wait for admin approval.';
    end if;

    select * into v_s from public.signals where id = p_signal_id;
    if v_s.id is null or (v_s.target_user_id is not null and v_s.target_user_id <> v_p.id)
       or (v_s.target_user_id is null and not v_p.is_admin and not public.signal_audience_match(v_s.audience, v_p.id)) then
        raise exception 'Signal not found';
    end if;
    if v_s.release_at is not null and v_s.release_at > now() then
        raise exception 'This signal is still locked. Please wait for the countdown.';
    end if;
    -- A closed signal (TP Hit / Stop Loss / Closed, or past its close time) can no longer be taken or charged for.
    if v_s.status <> 'Active' or (v_s.close_at is not null and v_s.close_at <= now()) then
        raise exception 'This signal has already closed and can no longer be taken.';
    end if;
    if exists (select 1 from public.user_signals where user_id = v_p.id and signal_id = p_signal_id) then
        raise exception 'You have already taken this signal';
    end if;
    -- A free credit (earned from a Stop Loss) covers the fee.
    if v_p.free_signals > 0 then
        update public.profiles set free_signals = free_signals - 1 where id = v_p.id;
        insert into public.user_signals (user_id, signal_id, taken_price, invested_amount)
            values (v_p.id, p_signal_id, v_s.entry_price, 0);
        update public.signals set total_taken = total_taken + 1 where id = p_signal_id;
        return json_build_object('message', 'Signal taken using your FREE signal credit!', 'signal_id', v_s.id, 'symbol', v_s.symbol, 'type', v_s.type,
                                 'entry_price', v_s.entry_price, 'target_price', v_s.target_price, 'stop_loss', v_s.stop_loss);
    end if;

    if v_p.wallet_balance < v_fee then
        raise exception 'Insufficient wallet balance. The signal fee is $1.00';
    end if;

    update public.profiles set wallet_balance = wallet_balance - v_fee where id = v_p.id;
    insert into public.user_signals (user_id, signal_id, taken_price, invested_amount)
        values (v_p.id, p_signal_id, v_s.entry_price, v_fee);
    insert into public.transactions (user_id, type, amount, status, processed_at)
        values (v_p.id, 'signal_fee', v_fee, 'approved', now());
    update public.signals set total_taken = total_taken + 1 where id = p_signal_id;

    return json_build_object('message', 'Signal taken successfully!', 'signal_id', v_s.id, 'symbol', v_s.symbol, 'type', v_s.type,
                                 'entry_price', v_s.entry_price, 'target_price', v_s.target_price, 'stop_loss', v_s.stop_loss);
end $$;
