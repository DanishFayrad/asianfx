-- "Deposited members" signals now go to every member with an approved deposit
-- (before: only members switched to Active). "Not deposited" = no approved deposit, as before,
-- so every member is in exactly one of the two groups.
-- Affects: who sees the signal on the dashboard, the in-app notification, email and push.
-- Run once in Supabase -> SQL Editor (local and live). Safe to re-run. Changes no data.

create or replace function public.signal_audience_match(p_audience text, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select coalesce((
        select not p.is_admin and case coalesce(p_audience, 'deposited')
            when 'all'           then true
            when 'not_deposited' then not public.has_deposit(p.id)
            else public.has_deposit(p.id) -- 'deposited': has an approved deposit
        end
        from public.profiles p where p.id = p_user_id), false);
$$;
revoke execute on function public.signal_audience_match(text, uuid) from public, anon, authenticated;
