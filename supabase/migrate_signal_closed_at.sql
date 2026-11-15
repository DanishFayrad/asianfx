-- Remember WHEN a signal was closed (admin: Profit / Loss / Close, or its "Close after" timer),
-- so the member dashboard can add a closed signal to their history 1 hour after it closed.
-- Run once in Supabase -> SQL Editor (local and live). Safe to re-run.
-- Changes no existing data except filling the NEW closed_at column for signals that are already closed.

-- 1. New column.
alter table public.signals add column if not exists closed_at timestamptz;

-- 2. Fill it for signals closed before this migration (best guess: their close timer, else when they were sent).
update public.signals
    set closed_at = coalesce(close_at, created_at)
    where status <> 'Active' and closed_at is null;

-- 3. From now on the database stamps the time itself whenever a signal's status changes.
create or replace function public.stamp_signal_closed_at()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.status is distinct from old.status then
        new.closed_at := case when new.status = 'Active' then null else now() end;
    end if;
    return new;
end $$;

drop trigger if exists on_signal_closed_stamp on public.signals;
create trigger on_signal_closed_stamp
    before update of status on public.signals
    for each row execute function public.stamp_signal_closed_at();

-- 4. Members' signal list now also returns closed_at (same as before otherwise).
create or replace function public.get_member_signals()
returns json language sql stable security definer set search_path = public as $$
    select coalesce(json_agg(x order by x.created_at desc), '[]'::json)
    from (
        select s.id, s.symbol, s.type, s.signal_type, s.description, s.status,
               s.target_user_id, s.release_at, s.close_at, s.closed_at, s.total_taken, s.created_at,
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
