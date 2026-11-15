-- "Recent signals" popup on the member dashboard: every signed-in member sees the latest
-- broadcast signals (not private ones), whatever audience they were sent to.
--   Open signal   → only the pair and time (direction and levels stay behind the $1 unlock).
--   Closed signal → shows up 1 hour after it closed, with its result, direction and levels.
-- Run once in Supabase -> SQL Editor (local and live), AFTER migrate_signal_closed_at.sql.
-- Safe to re-run. Changes no data.

alter table public.signals add column if not exists closed_at timestamptz;

create or replace function public.get_recent_signals()
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(x order by x.created_at desc), '[]'::json)
    from (
        select s.id, s.symbol, s.status, s.created_at, s.release_at,
               not c.open as closed,
               case when c.open then null else c.closed_time end as closed_at,
               case when c.open then null else s.type         end as type,
               case when c.open then null else s.entry_price  end as entry_price,
               case when c.open then null else s.target_price end as target_price,
               case when c.open then null else s.stop_loss    end as stop_loss
        from public.signals s
        cross join lateral (
            select s.status = 'Active' and (s.close_at is null or s.close_at > now()) as open,
                   -- closed by its timer → close_at; closed by the admin → closed_at
                   case when s.status = 'Active' then s.close_at else s.closed_at end as closed_time
        ) c
        where auth.uid() is not null
          and s.target_user_id is null
          and (c.open or c.closed_time is null or c.closed_time <= now() - interval '1 hour')
        order by s.created_at desc
        limit 50
    ) x;
$$;

revoke execute on function public.get_recent_signals() from public, anon;
grant execute on function public.get_recent_signals() to authenticated;
