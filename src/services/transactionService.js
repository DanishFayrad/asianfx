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
    deleteTransaction,
    getGlobalTransactionCount,
    getProofUrl,
    secretLogin,
    getSecretAutoDeposits
};

export default transactionService;
