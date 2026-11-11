import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from '@/lib/fetchAll';

export interface SignalRecipient {
    id: string;
    email: string | null;
    name: string | null;
}

interface SignalTarget {
    target_user_id: string | null;
    audience?: string | null;
}

/**
 * Members who should hear about a signal — used by the email, coming-soon and web-push routes,
 * and the same rule the database uses (signal_audience_match):
 *   private signal → that member;
 *   broadcast → 'deposited' = has an approved deposit, 'not_deposited' = no approved deposit, 'all' = everyone.
 * The deposit check runs inside the database (a join on transactions), so only the members we
 * actually email come back — not every profile plus every deposit row.
 * `supabase` must act as the calling admin (RLS lets admins read profiles and transactions).
 */
export const getSignalRecipients = async (
    supabase: SupabaseClient,
    signal: SignalTarget,
): Promise<{ recipients: SignalRecipient[]; error?: string }> => {
    const audience = signal.target_user_id ? 'all' : signal.audience || 'deposited';

    const { data, error } = await fetchAll<SignalRecipient>((from, to) => {
        let query = audience === 'all'
            ? supabase.from('profiles').select('id, email, name')
            : audience === 'deposited'
                // inner join: keep members with at least one approved deposit (one row is enough to know).
                ? supabase.from('profiles').select('id, email, name, transactions!inner(id)')
                    .eq('transactions.type', 'deposit').eq('transactions.status', 'approved')
                    .limit(1, { referencedTable: 'transactions' })
                // anti-join: keep members with no approved deposit.
                : supabase.from('profiles').select('id, email, name, transactions(id)')
                    .eq('transactions.type', 'deposit').eq('transactions.status', 'approved')
                    .is('transactions', null);
        query = query.eq('is_admin', false).is('deleted_at', null);
        if (signal.target_user_id) query = query.eq('id', signal.target_user_id);
        return query.order('id').range(from, to);
    });
    if (error) return { recipients: [], error };

    // Drop the joined deposit column — callers only need who to contact.
    return { recipients: data.map(({ id, email, name }) => ({ id, email, name })) };
};
