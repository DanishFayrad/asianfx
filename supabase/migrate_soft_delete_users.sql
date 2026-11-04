-- Soft delete for members: "Delete" on the Members page no longer wipes the account.
-- The member is marked deleted (deleted_at), cannot log in, gets no signals or emails,
-- and shows in the "Deleted" tab where the admin can restore them.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

alter table public.profiles add column if not exists deleted_at timestamptz;

-- New-signal notifications skip deleted members.
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
      and p.deleted_at is null
      -- Private → that member. Broadcast → only members with money (or a free credit) in their account.
      and (p.id = new.target_user_id
           or (new.target_user_id is null and public.signal_audience_match(new.audience, p.id)));
    return new;
end $$;

-- Admin dashboard totals skip deleted members.
create or replace function public.get_admin_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    return (
        select json_build_object(
            'platform_balance', (select round(coalesce(sum(wallet_balance), 0), 2) from public.profiles where not is_admin and deleted_at is null),
            'total_users',      (select count(*) from public.profiles where not is_admin and deleted_at is null),
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
