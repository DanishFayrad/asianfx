import type { SupabaseClient } from '@supabase/supabase-js';

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
 * Members who should hear about a signal — used by both the email and the web-push routes,
 * and the same rule the database uses (signal_audience_match):
 *   private signal → that member;
 *   broadcast → 'deposited' = has an approved deposit, 'not_deposited' = no approved deposit, 'all' = everyone.
 * `supabase` must act as the calling admin (RLS lets admins read profiles and transactions).
 */
export const getSignalRecipients = async (
    supabase: SupabaseClient,
    signal: SignalTarget,
): Promise<{ recipients: SignalRecipient[]; error?: string }> => {
    const audience = signal.audience || 'deposited';
    let query = supabase.from('profiles').select('id, email, name').eq('is_admin', false).is('deleted_at', null);
    if (signal.target_user_id) query = query.eq('id', signal.target_user_id);

    const { data: members, error } = await query;
    if (error) return { recipients: [], error: error.message };
    let recipients = (members ?? []) as SignalRecipient[];

    if (!signal.target_user_id && audience !== 'all') {
        const { data: deposits, error: depositsError } = await supabase
            .from('transactions').select('user_id').eq('type', 'deposit').eq('status', 'approved');
        if (depositsError) return { recipients: [], error: depositsError.message };
        const depositors = new Set((deposits ?? []).map((d) => d.user_id));
        recipients = recipients.filter((m) => depositors.has(m.id) === (audience === 'deposited'));
    }
    return { recipients };
};
