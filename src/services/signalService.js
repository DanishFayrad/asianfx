import { supabase, unwrap, toError } from '@/lib/supabaseClient';
import { serverTimeOffset } from './serverTime';

const toNumber = (v) => (v === '' || v === null || v === undefined ? null : parseFloat(v));

// Entry / TP / SL come back only for signals the member has paid for (admins see all).
const getSignalsDashboard = async () => {
    const [signals, stats] = await Promise.all([
        supabase.rpc('get_member_signals').then(unwrap),
        supabase.rpc('get_signal_stats').then(unwrap),
    ]);
    return { active_signals: signals || [], stats: stats || {} };
};

// Catch typos before a wrong signal reaches paying members.
const validateSignal = ({ symbol, type, entry_price, target_price, stop_loss }) => {
    if (!symbol || !String(symbol).trim()) throw toError('Symbol is required');
    const side = String(type || '').toLowerCase();
    if (side !== 'buy' && side !== 'sell') throw toError('Choose BUY or SELL');
    if ([entry_price, target_price, stop_loss].some((v) => v === null || Number.isNaN(v) || v <= 0)) {
        throw toError('Entry, Take Profit and Stop Loss must all be valid prices');
    }
    if (side === 'buy' && !(target_price > entry_price && stop_loss < entry_price)) {
        throw toError('For a BUY: Take Profit must be above Entry and Stop Loss below Entry');
    }
    if (side === 'sell' && !(target_price < entry_price && stop_loss > entry_price)) {
        throw toError('For a SELL: Take Profit must be below Entry and Stop Loss above Entry');
    }
};

// For live form hints: returns a human message, or null when the levels are valid.
// Empty fields return null (the form just isn't finished yet).
export const getSignalLevelError = ({ type, entry_price, target_price, stop_loss }) => {
    const nums = [entry_price, target_price, stop_loss];
    if (nums.some((v) => v === '' || v === null || v === undefined)) return null;
    try {
        validateSignal({ symbol: 'X', type, entry_price: parseFloat(entry_price), target_price: parseFloat(target_price), stop_loss: parseFloat(stop_loss) });
        return null;
    } catch (e) {
        return e.message;
    }
};

const createSignal = async (signalData) => {
    const minutes = parseFloat(signalData.timer_minutes);
    const row = {
        symbol: String(signalData.symbol || '').trim().toUpperCase(),
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
    validateSignal(row);
    const signal = unwrap(await supabase.from('signals').insert(row).select().single());
    signal.email = await notifySignalByEmail(signal.id);
    return signal;
};

// Ask the server to email the signal's recipients. Never throws — the signal is
// already published, so an email problem must not look like a failed broadcast.
const notifySignalByEmail = async (signalId) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/notify-signal', {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ signal_id: signalId }),
        });
        const body = await res.json().catch(() => ({}));
        return res.ok ? { sent: body.sent || 0, failed: body.failed || 0 } : { error: body.message || 'Email failed' };
    } catch (e) {
        return { error: e.message };
    }
};

const takeSignal = async ({ signal_id }) => {
    return unwrap(await supabase.rpc('take_signal', { p_signal_id: signal_id }));
};

// The signed-in member's purchased signals (with full levels).
const getUserSignalHistory = async () => {
    return unwrap(await supabase.rpc('get_my_signal_history'));
};

// Member: remove a signal from their own dashboard (live list + purchased history).
const hideSignal = async (id) => {
    return unwrap(await supabase.rpc('hide_signal', { p_signal_id: id }));
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
    hideSignal,
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
