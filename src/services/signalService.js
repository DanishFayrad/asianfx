import { supabase, unwrap } from '@/lib/supabaseClient';
import { serverTimeOffset } from './serverTime';

const toNumber = (v) => (v === '' || v === null || v === undefined ? null : parseFloat(v));

const getSignalsDashboard = async () => {
    const [signals, stats] = await Promise.all([
        supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(100).then(unwrap),
        supabase.rpc('get_signal_stats').then(unwrap),
    ]);
    return { active_signals: signals || [], stats: stats || {} };
};

const createSignal = async (signalData) => {
    const minutes = parseFloat(signalData.timer_minutes);
    const row = {
        symbol: signalData.symbol,
        type: signalData.type,
        entry_price: toNumber(signalData.entry_price),
        target_price: toNumber(signalData.target_price),
        stop_loss: toNumber(signalData.stop_loss),
        signal_type: signalData.signal_type || 'free',
        description: signalData.description || null,
        target_user_id: signalData.target_user_id || null,
        release_at: minutes > 0
            ? new Date(Date.now() + serverTimeOffset + minutes * 60000).toISOString()
            : null,
    };
    return unwrap(await supabase.from('signals').insert(row).select().single());
};

const takeSignal = async ({ signal_id }) => {
    return unwrap(await supabase.rpc('take_signal', { p_signal_id: signal_id }));
};

const getUserSignalHistory = async (userId) => {
    return unwrap(await supabase
        .from('user_signals')
        .select('*, Signal:signals(symbol, type)')
        .eq('user_id', userId)
        .order('taken_at', { ascending: false }));
};

const deleteSignal = async (id) => {
    unwrap(await supabase.from('signals').delete().eq('id', id));
    return { message: 'Signal removed' };
};

const setGlobalTimer = async (minutes) => {
    return unwrap(await supabase.rpc('set_global_timer', { p_minutes: Number(minutes) }));
};

const getGlobalTimer = async () => {
    return unwrap(await supabase.rpc('get_global_timer'));
};

const clearGlobalTimer = async () => {
    return unwrap(await supabase.rpc('clear_global_timer'));
};

const requestSignalAccess = async () => {
    return unwrap(await supabase.rpc('request_signal_access'));
};

const getSignalRequests = async () => {
    return unwrap(await supabase
        .from('signal_requests')
        .select('*, User:profiles(name, wallet_balance)')
        .order('created_at', { ascending: false }));
};

const approveSignalRequest = async (id) => {
    return unwrap(await supabase.rpc('approve_signal_request', { p_request_id: id }));
};

const extendSignalTimer = async (id, minutes) => {
    return unwrap(await supabase.rpc('extend_signal_timer', { p_signal_id: id, p_minutes: minutes }));
};

// Admin: close a signal as 'TP Hit' / 'Stop Loss' / 'Closed' (settles user results via trigger).
const updateSignalStatus = async (id, status) => {
    unwrap(await supabase.from('signals').update({ status }).eq('id', id));
    return { message: 'Signal updated' };
};

// Public track record for the landing page (works logged out).
const getPublicStats = async () => {
    return unwrap(await supabase.rpc('get_public_stats'));
};

const signalService = {
    getSignalsDashboard,
    createSignal,
    takeSignal,
    getUserSignalHistory,
    deleteSignal,
    setGlobalTimer,
    getGlobalTimer,
    clearGlobalTimer,
    requestSignalAccess,
    getSignalRequests,
    approveSignalRequest,
    extendSignalTimer,
    updateSignalStatus,
    getPublicStats
};

export default signalService;
