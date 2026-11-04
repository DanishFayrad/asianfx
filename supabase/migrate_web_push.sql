-- Web push notifications: each browser a member turns "signal alerts" on in is saved here,
-- so a new signal can pop up on their phone / computer even when the site is closed.
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

create table if not exists public.push_subscriptions (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references public.profiles(id) on delete cascade,
    endpoint   text not null unique,       -- the browser's push address
    p256dh     text not null,              -- browser encryption keys
    auth       text not null,
    user_agent text,
    created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;

-- Members see their own; admins read all (to send pushes) and delete dead ones.
drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
    using (user_id = auth.uid() or public.is_admin());

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
    using (user_id = auth.uid() or public.is_admin());

-- Save (or move to this member) the current browser's subscription.
create or replace function public.save_push_subscription(
    p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
        raise exception 'Invalid subscription';
    end if;
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
        values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
        on conflict (endpoint) do update
            set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
                user_agent = excluded.user_agent;
    return json_build_object('message', 'Signal alerts turned on');
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns json language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then raise exception 'Not authenticated'; end if;
    delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
    return json_build_object('message', 'Signal alerts turned off');
end $$;
