-- Deposit reject reason: the admin can type why a deposit was rejected; the member sees it
-- in their notification (and as a browser push if they turned signal alerts on).
-- Run once in Supabase -> SQL Editor (live and local). Safe to re-run.

-- Reject a pending deposit, with an optional reason that is saved and sent to the member.
alter table public.transactions add column if not exists reject_reason text;

drop function if exists public.reject_deposit(bigint);
create or replace function public.reject_deposit(p_tx_id bigint, p_reason text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
    v_tx     public.transactions;
    v_reason text := nullif(left(trim(coalesce(p_reason, '')), 500), '');
begin
    if not public.is_admin() then raise exception 'Admin only'; end if;
    select * into v_tx from public.transactions where id = p_tx_id for update;
    if v_tx.id is null then raise exception 'Transaction not found'; end if;
    if v_tx.status <> 'pending' then raise exception 'Transaction already processed'; end if;

    update public.transactions
        set status = 'rejected', processed_at = now(), reject_reason = v_reason
        where id = p_tx_id;
    insert into public.notifications (user_id, type, title, message)
        values (v_tx.user_id, 'info', 'Deposit Rejected',
                case when v_reason is not null
                    then format('Your deposit of $%s was rejected. Reason: %s', v_tx.amount, v_reason)
                    else 'Your deposit request was rejected. Please contact support.'
                end);
    return json_build_object('message', 'Deposit rejected');
end $$;
