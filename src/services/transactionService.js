import { supabase, unwrap, toError, getSessionUserId, PROOF_BUCKET } from '@/lib/supabaseClient';
import authService, { isAdminUsername } from './authService';

const WITH_USER = '*, User:profiles(name, email, wallet_balance)';

const requestDeposit = async (formData) => {
    const userId = await getSessionUserId();
    const amount = parseFloat(formData.get('amount'));
    const paymentMethod = formData.get('payment_method');
    const file = formData.get('proof_image');

    if (!amount || amount <= 0) throw toError('Invalid deposit amount');

    let proofPath = null;
    if (file && typeof file !== 'string') {
        const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
        proofPath = `${userId}/${Date.now()}.${ext}`;
        unwrap(await supabase.storage.from(PROOF_BUCKET).upload(proofPath, file, { contentType: file.type }));
    }

    return unwrap(await supabase
        .from('transactions')
        .insert({ user_id: userId, type: 'deposit', amount, payment_method: paymentMethod, proof_image: proofPath })
        .select()
        .single());
};

const getPendingTransactions = async () => {
    return unwrap(await supabase
        .from('transactions')
        .select(WITH_USER)
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }));
};

const getUserTransactions = async () => {
    const userId = await getSessionUserId();
    return unwrap(await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }));
};

const approveTransaction = async (id, amount) => {
    return unwrap(await supabase.rpc('approve_deposit', { p_tx_id: id, p_amount: amount }));
};

const rejectTransaction = async (id) => {
    return unwrap(await supabase.rpc('reject_deposit', { p_tx_id: id }));
};

const getAllTransactions = async () => {
    return unwrap(await supabase
        .from('transactions')
        .select(WITH_USER)
        .order('created_at', { ascending: false })
        .limit(500));
};

const getAdminStats = async () => {
    return unwrap(await supabase.rpc('get_admin_stats'));
};

const getWalletStats = async () => {
    return unwrap(await supabase.rpc('get_wallet_stats'));
};

const getAllUsers = async () => {
    return unwrap(await supabase.rpc('get_all_users'));
};

// Per-user signal counts (taken / wins / losses) keyed by user id.
// Pages through user_signals so it is not capped at the default 1000 rows.
const getUserSignalCounts = async () => {
    const counts = {};
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
        const rows = unwrap(await supabase
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

const deleteTransaction = async (id) => {
    unwrap(await supabase.from('transactions').delete().eq('id', id));
    return { message: 'Transaction deleted' };
};

const getGlobalTransactionCount = async () => {
    const count = unwrap(await supabase.rpc('get_global_transaction_count'));
    return { count: count || 0 };
};

// Proof screenshots live in a private bucket — return a short-lived signed URL.
const getProofUrl = async (path) => {
    if (!path) throw toError('No proof uploaded');
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const { signedUrl } = unwrap(await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 60 * 60));
    return signedUrl;
};

const secretLogin = async (username, password) => {
    if (isAdminUsername(username)) {
        const { access_token } = await authService.adminLogin({ email: username, password });
        return { token: access_token };
    }
    const { session } = unwrap(await supabase.auth.signInWithPassword({ email: username, password }));
    const profile = unwrap(await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single());
    if (!profile?.is_admin) {
        await supabase.auth.signOut();
        throw toError('Invalid credentials');
    }
    return { token: session.access_token };
};

const getSecretAutoDeposits = async () => {
    return unwrap(await supabase
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
    getUserSignalCounts,
    deleteTransaction,
    getGlobalTransactionCount,
    getProofUrl,
    secretLogin,
    getSecretAutoDeposits
};

export default transactionService;
