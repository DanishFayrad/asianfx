-- =====================================================================
-- AsianFX — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- It is safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
    id                      uuid primary key references auth.users(id) on delete cascade,
    user_id                 bigint generated always as identity unique,
    name                    text,
    email                   text,
    phone                   text,
    country                 text,
    referral_code           text unique,
    referred_by             uuid references public.profiles(id) on delete set null,
    wallet_balance          numeric(14,2) not null default 0,
    affiliate_balance       numeric(14,2) not null default 0,
    referral_count          integer       not null default 0,
    total_referral_deposits numeric(14,2) not null default 0,
    is_admin                boolean       not null default false,
    is_active               boolean       not null default false,
    profile_image           text,
    created_at              timestamptz   not null default now()
);

create table if not exists public.signals (
    id             bigint generated always as identity primary key,
    symbol         text not null,
    type           text not null,                 -- Buy / Sell
    entry_price    numeric,
    target_price   numeric,
    stop_loss      numeric,
    signal_type    text not null default 'free',  -- free / premium
    description    text,
    status         text not null default 'Active',-- Active / TP Hit / Stop Loss / Closed
    target_user_id uuid references public.profiles(id) on delete cascade, -- null = broadcast to everyone
    release_at     timestamptz,                   -- locked until this time
    total_taken    integer not null default 0,
    created_by     uuid default auth.uid(),
    created_at     timestamptz not null default now()
);

create table if not exists public.user_signals (
    id              bigint generated always as identity primary key,
    user_id         uuid not null references public.profiles(id) on delete cascade,
    signal_id       bigint references public.signals(id) on delete set null,
    taken_price     numeric,
    invested_amount numeric(14,2) not null default 1,
    result          text not null default 'pending', -- pending / win / loss
    profit          numeric(14,2) not null default 0,
    taken_at        timestamptz not null default now(),
    unique (user_id, signal_id)
);

create table if not exists public.transactions (
    id             bigint generated always as identity primary key,
    user_id        uuid not null references public.profiles(id) on delete cascade,
    type           text not null,                    -- deposit / withdrawal / signal_fee / commission
    amount         numeric(14,2) not null default 0,
    status         text not null default 'pending',  -- pending / approved / rejected
    payment_method text,
    proof_image    text,                             -- path inside the deposit-proofs bucket
    auto_approved  boolean not null default false,
    processed_at   timestamptz,
    created_at     timestamptz not null default now()
);

create table if not exists public.notifications (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references public.profiles(id) on delete cascade,
    type       text not null,     -- signal / payment_approval / signal_access / info
    title      text,
    message    text,
    data       jsonb,
    is_read    boolean not null default false,
    created_at timestamptz not null default now()
);

create table if not exists public.signal_requests (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references public.profiles(id) on delete cascade,
    status     text not null default 'pending',  -- pending / approved
    created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
    key        text primary key,
    value      jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
    id         bigint generated always as identity primary key,
    full_name  text,
    email      text,
    message    text,
    created_at timestamptz not null default now()
);

-- Signals a member removed from their own dashboard (live list + purchased history).
-- Only hides them for that member — the signal and its win/loss record stay.
create table if not exists public.hidden_signals (
    user_id    uuid   not null references public.profiles(id) on delete cascade,
    signal_id  bigint not null references public.signals(id)  on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, signal_id)
);

-- Free signal credits: one is granted for every taken signal that closes at Stop Loss.
alter table public.profiles add column if not exists free_signals integer not null default 0;

create index if not exists idx_transactions_user   on public.transactions(user_id);
create index if not exists idx_transactions_status on public.transactions(type, status);
create index if not exists idx_notifications_user  on public.notifications(user_id, created_at desc);
create index if not exists idx_user_signals_user   on public.user_signals(user_id);
create index if not exists idx_signals_created     on public.signals(created_at desc);

insert into public.app_settings (key, value)
values ('global_timer', '{"expires_at": null}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Who receives BROADCAST signals: approved members who can actually pay for one right now
-- (wallet ≥ $1 signal fee) or who hold a free credit from a Stop Loss.
create or replace function public.can_receive_signals(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((select not p.is_admin and p.is_active and (p.wallet_balance >= 1 or p.free_signals > 0)
                     from public.profiles p where p.id = p_user_id), false);
$$;
revoke execute on function public.can_receive_signals(uuid) from public, anon, authenticated;

-- Create a profile row automatically when someone signs up.
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

    insert into public.profiles (id, email, name, phone, country, referral_code, referred_by)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'country',
        v_code,
        v_ref
    );

    if v_ref is not null then
        update public.profiles set referral_count = referral_count + 1 where id = v_ref;
    end if;

    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Fan out a notification to the right users whenever a signal is created.
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
           or (new.target_user_id is null and p.is_active and (p.wallet_balance >= 1 or p.free_signals > 0)));
    return new;
end $$;

drop trigger if exists on_signal_created on public.signals;
create trigger on_signal_created
    after insert on public.signals
    for each row execute function public.notify_new_signal();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.signals          enable row level security;
alter table public.user_signals     enable row level security;
alter table public.transactions     enable row level security;
alter table public.notifications    enable row level security;
alter table public.signal_requests  enable row level security;
alter table public.app_settings     enable row level security;
alter table public.contact_messages enable row level security;
alter table public.hidden_signals   enable row level security;

-- hidden_signals: members read their own rows; writes go through hide_signal().
drop policy if exists hidden_signals_select on public.hidden_signals;
create policy hidden_signals_select on public.hidden_signals for select to authenticated
    using (user_id = auth.uid());

-- profiles: see yourself (admins see everyone); users may edit only harmless columns.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
    using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
    using (id = auth.uid() or public.is_admin())
    with check (id = auth.uid() or public.is_admin());

revoke update on public.profiles from authenticated, anon;
grant update (name, phone, country, profile_image) on public.profiles to authenticated;

-- signals: ONLY admins read the table directly. Members go through get_member_signals(),
-- which hides Entry / TP / SL until the member has paid for (taken) the signal.
drop policy if exists signals_select on public.signals;
create policy signals_select on public.signals for select to authenticated
    using (public.is_admin());

drop policy if exists signals_insert on public.signals;
create policy signals_insert on public.signals for insert to authenticated
    with check (public.is_admin());

drop policy if exists signals_update on public.signals;
create policy signals_update on public.signals for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists signals_delete on public.signals;
create policy signals_delete on public.signals for delete to authenticated
    using (public.is_admin());

-- user_signals: read own (writes go through take_signal()).
drop policy if exists user_signals_select on public.user_signals;
create policy user_signals_select on public.user_signals for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

drop policy if exists user_signals_admin on public.user_signals;
create policy user_signals_admin on public.user_signals for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- transactions: users read own and may only create pending deposits; admins manage all.
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert to authenticated
    with check (
        user_id = auth.uid() and type = 'deposit' and status = 'pending' and auto_approved = false
    );

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update to authenticated
    using (public.is_admin()) with check (public.is_admin());

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions for delete to authenticated
    using (public.is_admin());

-- notifications: own only.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
    using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated
    with check (public.is_admin());

-- signal_requests
drop policy if exists signal_requests_select on public.signal_requests;
create policy signal_requests_select on public.signal_requests for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

-- app_settings: everyone logged in can read, only admins write (via RPC).
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings for select to authenticated
    using (true);

-- contact_messages: anyone can submit, only admins read.
drop policy if exists contact_insert on public.contact_messages;
create policy contact_insert on public.contact_messages for insert to anon, authenticated
    with check (true);

drop policy if exists contact_select on public.contact_messages;
create policy contact_select on public.contact_messages for select to authenticated
    using (public.is_admin());

-- ---------------------------------------------------------------------
-- RPC FUNCTIONS (called from the frontend via supabase.rpc)
-- ---------------------------------------------------------------------

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
    if v_s.id is null or (v_s.target_user_id is not null and v_s.target_user_id <> v_p.id) then
        raise exception 'Signal not found';
    end if;
    if v_s.release_at is not null and v_s.release_at > now() then
        raise exception 'This signal is still locked. Please wait for the countdown.';
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

create or replace function public.approve_deposit(p_tx_id bigint, p_amount numeric)
returns json language plpgsql security definer set search_path = public as $$
declare
    v_tx  public.transactions;
    v_ref uuid;
    v_commission numeric;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

    select * into v_tx from public.transactions where id = p_tx_id for update;
    if v_tx.id is null then raise exception 'Transaction not found'; end if;
    if v_tx.status <> 'pending' then raise exception 'Transaction already processed'; end if;

    update public.transactions
        set status = 'approved', amount = p_amount, processed_at = now()
        where id = p_tx_id;

    update public.profiles
        set wallet_balance = wallet_balance + p_amount, is_active = true
        where id = v_tx.user_id
        returning referred_by into v_ref;

    -- 30% referral commission
    if v_ref is not null then
        v_commission := round(p_amount * 0.30, 2);
        update public.profiles
            set affiliate_balance = affiliate_balance + v_commission,
                total_referral_deposits = total_referral_deposits + p_amount
            where id = v_ref;
        insert into public.transactions (user_id, type, amount, status, processed_at)
            values (v_ref, 'commission', v_commission, 'approved', now());
    end if;

    insert into public.notifications (user_id, type, title, message)
        values (v_tx.user_id, 'payment_approval', 'Deposit Approved',
                format('Your deposit of $%s has been approved and credited to your wallet.', p_amount));

    return json_build_object('message', 'Deposit approved');
end $$;

create or replace function public.reject_deposit(p_tx_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare v_tx public.transactions;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    select * into v_tx from public.transactions where id = p_tx_id for update;
    if v_tx.id is null then raise exception 'Transaction not found'; end if;
    if v_tx.status <> 'pending' then raise exception 'Transaction already processed'; end if;

    update public.transactions set status = 'rejected', processed_at = now() where id = p_tx_id;
    insert into public.notifications (user_id, type, title, message)
        values (v_tx.user_id, 'info', 'Deposit Rejected', 'Your deposit request was rejected. Please contact support.');
    return json_build_object('message', 'Deposit rejected');
end $$;

create or replace function public.request_signal_access()
returns json language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    if exists (select 1 from public.signal_requests where user_id = auth.uid()) then
        raise exception 'You have already requested access';
    end if;
    insert into public.signal_requests (user_id) values (auth.uid());
    return json_build_object('message', 'Request sent! Admin will review it shortly.');
end $$;

create or replace function public.approve_signal_request(p_request_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    update public.signal_requests set status = 'approved' where id = p_request_id returning user_id into v_user;
    if v_user is null then raise exception 'Request not found'; end if;
    insert into public.notifications (user_id, type, title, message)
        values (v_user, 'signal_access', 'Access Granted', 'Your access to the upcoming signal has been approved.');
    return json_build_object('message', 'Request approved');
end $$;

create or replace function public.set_global_timer(p_minutes numeric)
returns json language plpgsql security definer set search_path = public as $$
declare v_exp timestamptz;
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    if p_minutes is null or p_minutes <= 0 then raise exception 'Invalid minutes'; end if;
    v_exp := now() + make_interval(secs => p_minutes * 60);
    delete from public.signal_requests where true;  -- Supabase blocks DELETE without WHERE
    insert into public.app_settings (key, value, updated_at)
        values ('global_timer', jsonb_build_object('expires_at', v_exp), now())
        on conflict (key) do update set value = excluded.value, updated_at = now();
    return json_build_object('expires_at', v_exp);
end $$;

create or replace function public.clear_global_timer()
returns json language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    delete from public.signal_requests where true;  -- Supabase blocks DELETE without WHERE
    update public.app_settings set value = '{"expires_at": null}'::jsonb, updated_at = now()
        where key = 'global_timer';
    return json_build_object('message', 'Timer cleared');
end $$;

create or replace function public.get_global_timer()
returns json language plpgsql stable security definer set search_path = public as $$
declare
    v_exp    timestamptz;
    v_status text;
begin
    select nullif(value->>'expires_at', '')::timestamptz into v_exp
        from public.app_settings where key = 'global_timer';
    if v_exp is not null and v_exp < now() then v_exp := null; end if;

    select status into v_status from public.signal_requests
        where user_id = auth.uid() order by created_at desc limit 1;

    return json_build_object(
        'expires_at',    v_exp,
        'server_time',   (extract(epoch from now()) * 1000)::bigint,
        'requestStatus', v_status
    );
end $$;

create or replace function public.extend_signal_timer(p_signal_id bigint, p_minutes numeric)
returns json language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    update public.signals
        set release_at = greatest(coalesce(release_at, now()), now()) + make_interval(secs => p_minutes * 60)
        where id = p_signal_id;
    return json_build_object('message', 'Timer extended');
end $$;

-- Stats for the signals table cards — counts only the signals this member can see.
create or replace function public.get_signal_stats()
returns json language sql stable security definer set search_path = public as $$
    select json_build_object(
        'total_signals',  count(*),
        'active_signals', count(*) filter (where status = 'Active' and (release_at is null or release_at <= now())),
        'success_rate',   coalesce(round(100.0 * count(*) filter (where status ilike '%hit%')
                                 / nullif(count(*) filter (where status <> 'Active'), 0)), 0)
    )
    from public.signals
    where auth.uid() is not null
      and (target_user_id is null or target_user_id = auth.uid() or public.is_admin());
$$;

-- Signals list for the dashboard. Entry / TP / SL are returned only when the caller is an
-- admin, has taken (paid for) the signal, or the signal is already closed (public record).
create or replace function public.get_member_signals()
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(x order by x.created_at desc), '[]'::json)
    from (
        select s.id, s.symbol, s.type, s.signal_type, s.description, s.status,
               s.target_user_id, s.release_at, s.total_taken, s.created_at,
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
               or (s.target_user_id is null and public.can_receive_signals(auth.uid())))
          and not exists (select 1 from public.hidden_signals h where h.user_id = auth.uid() and h.signal_id = s.id)
        order by s.created_at desc
        limit 100
    ) x;
$$;

-- The member's purchased signals, with full levels (they paid for them).
create or replace function public.get_my_signal_history()
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(h order by h.taken_at desc), '[]'::json)
    from (
        select us.id, us.signal_id, us.taken_price, us.invested_amount, us.result, us.profit, us.taken_at,
               json_build_object('symbol', s.symbol, 'type', s.type, 'status', s.status,
                                 'entry_price', s.entry_price, 'target_price', s.target_price,
                                 'stop_loss', s.stop_loss) as "Signal"
        from public.user_signals us
        left join public.signals s on s.id = us.signal_id
        where us.user_id = auth.uid()
          and not exists (select 1 from public.hidden_signals hs where hs.user_id = auth.uid() and hs.signal_id = us.signal_id)
    ) h;
$$;

-- A member removes a signal from their own dashboard (both lists). Admins delete signals instead.
create or replace function public.hide_signal(p_signal_id bigint)
returns json language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    insert into public.hidden_signals (user_id, signal_id) values (auth.uid(), p_signal_id)
        on conflict do nothing;
    return json_build_object('message', 'Signal removed from your list');
end $$;

create or replace function public.get_wallet_stats()
returns json language sql stable security definer set search_path = public as $$
    select json_build_object(
        'balance',           (select wallet_balance from public.profiles where id = auth.uid()),
        'total_deposit',     coalesce(sum(amount) filter (where type = 'deposit'    and status = 'approved'), 0),
        'deposit_count',     count(*)             filter (where type = 'deposit'    and status = 'approved'),
        'total_withdrawal',  coalesce(sum(amount) filter (where type = 'withdrawal' and status = 'approved'), 0),
        'withdrawal_count',  count(*)             filter (where type = 'withdrawal' and status = 'approved'),
        'total_signal_fees', coalesce(sum(amount) filter (where type = 'signal_fee'), 0),
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
        )
        from public.transactions
    );
end $$;

create or replace function public.get_all_users()
returns json language plpgsql stable security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    return (
        select coalesce(json_agg(u order by u.created_at desc), '[]'::json)
        from (
            select p.*,
                   coalesce(sum(t.amount) filter (where t.type = 'deposit' and t.status = 'approved'), 0) as total_deposit,
                   count(t.id)            filter (where t.type = 'deposit' and t.status = 'approved')     as deposit_count
            from public.profiles p
            left join public.transactions t on t.user_id = p.id
            group by p.id
        ) u
    );
end $$;

-- Public track record for the landing page (anyone, even logged out).
-- Only broadcast signals; active signals are counted but never exposed.
create or replace function public.get_public_stats()
returns json language sql stable security definer set search_path = public as $$
    select json_build_object(
        'total_signals',  (select count(*) from public.signals where target_user_id is null),
        'active_signals', (select count(*) from public.signals where target_user_id is null and status = 'Active'
                              and (release_at is null or release_at <= now())),
        'closed_signals', (select count(*) from public.signals where target_user_id is null and status <> 'Active'),
        'wins',           (select count(*) from public.signals where target_user_id is null and status ilike '%hit%'),
        'recent', coalesce((
            select json_agg(r) from (
                select symbol, type, status, entry_price, target_price, stop_loss, created_at
                from public.signals
                where target_user_id is null and status <> 'Active'
                order by created_at desc
                limit 6
            ) r
        ), '[]'::json)
    );
$$;

grant execute on function public.get_public_stats() to anon, authenticated;

-- When admin closes a signal, settle everyone who took it.
create or replace function public.settle_signal_results()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.status is distinct from old.status then
        -- Loss → every holder gets one free signal credit.
        if new.status ilike '%stop%' then
            update public.profiles p
                set free_signals = free_signals + 1
                from public.user_signals us
                where us.signal_id = new.id and us.result = 'pending' and us.user_id = p.id;

            insert into public.notifications (user_id, type, title, message)
                select us.user_id, 'info', 'Free Signal Credited',
                       format('%s hit Stop Loss — your next signal is FREE.', new.symbol)
                from public.user_signals us
                where us.signal_id = new.id and us.result = 'pending';
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

drop trigger if exists on_signal_status_change on public.signals;
create trigger on_signal_status_change
    after update of status on public.signals
    for each row execute function public.settle_signal_results();

create or replace function public.get_global_transaction_count()
returns integer language sql stable security definer set search_path = public as $$
    select count(*)::int from public.transactions where type = 'deposit';
$$;

-- ---------------------------------------------------------------------
-- STORAGE (deposit proof screenshots — private bucket)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('deposit-proofs', 'deposit-proofs', false)
on conflict (id) do nothing;

drop policy if exists "deposit proofs upload own" on storage.objects;
create policy "deposit proofs upload own" on storage.objects for insert to authenticated
    with check (bucket_id = 'deposit-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "deposit proofs read own or admin" on storage.objects;
create policy "deposit proofs read own or admin" on storage.objects for select to authenticated
    using (bucket_id = 'deposit-proofs'
           and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "deposit proofs admin delete" on storage.objects;
create policy "deposit proofs admin delete" on storage.objects for delete to authenticated
    using (bucket_id = 'deposit-proofs' and public.is_admin());

-- ---------------------------------------------------------------------
-- REALTIME (replaces socket.io)
-- ---------------------------------------------------------------------

do $$
declare t text;
begin
    foreach t in array array['notifications', 'signals', 'transactions', 'app_settings', 'signal_requests'] loop
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
        ) then
            execute format('alter publication supabase_realtime add table public.%I', t);
        end if;
    end loop;
end $$;

-- ---------------------------------------------------------------------
-- MAKE YOURSELF ADMIN (run after you have registered your account):
--   update public.profiles set is_admin = true, is_active = true where email = 'you@example.com';
-- ---------------------------------------------------------------------
