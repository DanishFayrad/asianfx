import { supabase, unwrap, toError, getSessionUserId, PROOF_BUCKET } from '@/lib/supabaseClient';
import authService, { isAdminUsername } from './authService';
import type { AdminStats, AdminUser, MessageResponse, Profile, Transaction, WalletStats } from '@/types';

const WITH_USER = '*, User:profiles(user_id, name, email, wallet_balance)';

export type UserAction = 'activate' | 'deactivate' | 'delete';

interface SignalCounts {
    taken: number;
    wins: number;
    losses: number;
}

const requestDeposit = async (formData: FormData): Promise<Transaction> => {
    const userId = await getSessionUserId();
    const amount = parseFloat(String(formData.get('amount') ?? ''));
    const paymentMethod = formData.get('payment_method');
    const file = formData.get('proof_image');

    if (!amount || amount <= 0) throw toError('Invalid deposit amount');

    let proofPath: string | null = null;
    if (file && typeof file !== 'string') {
        const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
        proofPath = `${userId}/${Date.now()}.${ext}`;
        unwrap(await supabase.storage.from(PROOF_BUCKET).upload(proofPath, file, { contentType: file.type }));
    }

    return unwrap<Transaction>(await supabase
        .from('transactions')
        .insert({ user_id: userId, type: 'deposit', amount, payment_method: paymentMethod, proof_image: proofPath })
        .select()
        .single());
};

const getPendingTransactions = async (): Promise<Transaction[]> => {
    return unwrap<Transaction[]>(await supabase
        .from('transactions')
        .select(WITH_USER)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }));
};

const getUserTransactions = async (): Promise<Transaction[]> => {
    const userId = await getSessionUserId();
    return unwrap<Transaction[]>(await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }));
};

const approveTransaction = async (id: number, amount: number): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('approve_deposit', { p_tx_id: id, p_amount: amount }));
};

const rejectTransaction = async (id: number): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('reject_deposit', { p_tx_id: id }));
};

const getAllTransactions = async (): Promise<Transaction[]> => {
    return unwrap<Transaction[]>(await supabase
        .from('transactions')
        .select(WITH_USER)
        .order('created_at', { ascending: false })
        .limit(500));
};

const getAdminStats = async (): Promise<AdminStats> => {
    return unwrap<AdminStats>(await supabase.rpc('get_admin_stats'));
};

const getWalletStats = async (): Promise<WalletStats> => {
    return unwrap<WalletStats>(await supabase.rpc('get_wallet_stats'));
};

const getAllUsers = async (): Promise<Array<Profile & { total_deposit: number; deposit_count: number }>> => {
    return unwrap(await supabase.rpc('get_all_users'));
};

// action: 'activate' | 'deactivate' | 'delete' — checked on the server (admin only).
const updateUserStatus = async (userId: string, action: UserAction): Promise<MessageResponse> => {
    const { data } = await supabase.auth.getSession();
    const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ userId, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw toError(body.message || 'Could not update the user');
    return body;
};

// Per-user signal counts (taken / wins / losses) keyed by user id.
// Pages through user_signals so it is not capped at the default 1000 rows.
const getUserSignalCounts = async (): Promise<Record<string, SignalCounts>> => {
    const counts: Record<string, SignalCounts> = {};
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
        const rows = unwrap<Array<{ user_id: string; result: string }>>(await supabase
            .from('user_signals')
            .select('user_id, result')
            .range(from, from + pageSize - 1));
        rows.forEach(({ user_id, result }) => {
            const c = (counts[user_id] ??= { taken: 0, wins: 0, losses: 0 });
            c.taken += 1;
            if (result === 'win') c.wins += 1;
            if (result === 'loss') c.losses += 1;
        });
        if (rows.length < pageSize) break;
    }
    return counts;
};

// All users with their signal counts merged in (for the admin users table).
const getAllUsersWithSignals = async (): Promise<AdminUser[]> => {
    const [usersList, signalCounts] = await Promise.all([
        getAllUsers(),
        getUserSignalCounts().catch((e): Record<string, SignalCounts> => {
            console.error('Failed to load signal counts', e);
            return {};
        })
    ]);
    return (Array.isArray(usersList) ? usersList : []).map((u) => ({
        ...u,
        signals_taken: signalCounts[u.id]?.taken || 0,
        signals_won: signalCounts[u.id]?.wins || 0,
        signals_lost: signalCounts[u.id]?.losses || 0,
    }));
};

const deleteTransaction = async (id: number): Promise<MessageResponse> => {
    unwrap(await supabase.from('transactions').delete().eq('id', id));
    return { message: 'Transaction deleted' };
};

const getGlobalTransactionCount = async (): Promise<{ count: number }> => {
    const count = unwrap<number>(await supabase.rpc('get_global_transaction_count'));
    return { count: count || 0 };
};

// Proof screenshots live in a private bucket — return a short-lived signed URL.
const getProofUrl = async (path: string | null | undefined): Promise<string> => {
    if (!path) throw toError('No proof uploaded');
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const { signedUrl } = unwrap(await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 60 * 60));
    return signedUrl;
};

const secretLogin = async (username: string, password: string): Promise<{ token: string }> => {
    if (isAdminUsername(username)) {
        const { access_token } = await authService.adminLogin({ email: username, password });
        return { token: access_token };
    }
    const { session } = unwrap(await supabase.auth.signInWithPassword({ email: username, password }));
    const profile = unwrap<Pick<Profile, 'is_admin'>>(await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single());
    if (!profile?.is_admin) {
        await supabase.auth.signOut();
        throw toError('Invalid credentials');
    }
    return { token: session.access_token };
};

const getSecretAutoDeposits = async (): Promise<Transaction[]> => {
    return unwrap<Transaction[]>(await supabase
        .from('transactions')
        .select(WITH_USER)
        .eq('auto_approved', true)
        .order('created_at', { ascending: false }));
};

const transactionService = {
    requestDeposit,
    getPendingTransactions,
    getUserTransactions,
    approveTransaction,
    rejectTransaction,
    getAllTransactions,
    getAdminStats,
    getWalletStats,
    getAllUsers,
    updateUserStatus,
    getUserSignalCounts,
    getAllUsersWithSignals,
    deleteTransaction,
    getGlobalTransactionCount,
    getProofUrl,
    secretLogin,
    getSecretAutoDeposits
};

export default transactionService;
