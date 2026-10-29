import { supabase, unwrap, toError, errorMessage } from '@/lib/supabaseClient';
import { serverTimeOffset } from './serverTime';
import type {
    EmailResult, GlobalTimer, MessageResponse, PublicStats, Signal, SignalHistoryItem, SignalRequest, SignalStats,
} from '@/types';

type PriceInput = string | number | null | undefined;

const toNumber = (v: PriceInput): number | null =>
    (v === '' || v === null || v === undefined ? null : parseFloat(String(v)));

interface SignalLevels {
    symbol?: string;
    type?: string;
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
}

/** Input accepted by createSignal() — form values may still be strings. */
export interface NewSignalInput {
    symbol: string;
    type: string;
    entry_price: PriceInput;
    target_price: PriceInput;
    stop_loss: PriceInput;
    signal_type?: string;
    timer_minutes?: string | number;
    /** Close the signal automatically this many minutes after it is released (blank = never). */
    close_minutes?: string | number;
    description?: string | null;
    target_user_id?: string | null;
}

/** The signal taken by take_signal(), with its now-unlocked levels. */
export interface TakeSignalResult extends MessageResponse {
    signal_id: number;
    symbol: string;
    type: string;
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
}

// Entry / TP / SL come back only for signals the member has paid for (admins see all).
const getSignalsDashboard = async (): Promise<{ active_signals: Signal[]; stats: SignalStats }> => {
    // Close any signal whose "Close after" time has passed, so every viewer sees the same status.
    // Ignored if the database function isn't installed yet.
    await supabase.rpc('close_expired_signals').then(() => undefined, () => undefined);
    const [signals, stats] = await Promise.all([
        supabase.rpc('get_member_signals').then((r) => unwrap<Signal[]>(r)),
        supabase.rpc('get_signal_stats').then((r) => unwrap<SignalStats>(r)),
    ]);
    return { active_signals: signals || [], stats: stats || {} };
};

// Catch typos before a wrong signal reaches paying members.
const validateSignal = ({ symbol, type, entry_price, target_price, stop_loss }: SignalLevels): void => {
    if (!symbol || !String(symbol).trim()) throw toError('Symbol is required');
    const side = String(type || '').toLowerCase();
    if (side !== 'buy' && side !== 'sell') throw toError('Choose BUY or SELL');
    if (entry_price === null || target_price === null || stop_loss === null
        || [entry_price, target_price, stop_loss].some((v) => Number.isNaN(v) || v <= 0)) {
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
export const getSignalLevelError = ({ type, entry_price, target_price, stop_loss }: {
    type: string; entry_price: PriceInput; target_price: PriceInput; stop_loss: PriceInput;
}): string | null => {
    const nums = [entry_price, target_price, stop_loss];
    if (nums.some((v) => v === '' || v === null || v === undefined)) return null;
    try {
        validateSignal({ symbol: 'X', type, entry_price: toNumber(entry_price), target_price: toNumber(target_price), stop_loss: toNumber(stop_loss) });
        return null;
    } catch (e) {
        return errorMessage(e);
    }
};

const createSignal = async (signalData: NewSignalInput): Promise<Signal> => {
    const minutes = parseFloat(String(signalData.timer_minutes ?? ''));
    const closeMinutes = parseFloat(String(signalData.close_minutes ?? ''));
    const releaseMs = Date.now() + serverTimeOffset + (minutes > 0 ? minutes * 60000 : 0);
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
        // Counted from the release time, so a delayed signal still gets its full open window.
        close_at: closeMinutes > 0 ? new Date(releaseMs + closeMinutes * 60000).toISOString() : null,
    };
    validateSignal(row);
    const signal = unwrap<Signal>(await supabase.from('signals').insert(row).select().single());
    signal.email = await notifySignalByEmail(signal.id);
    return signal;
};

// Ask the server to email the signal's recipients. Never throws — the signal is
// already published, so an email problem must not look like a failed broadcast.
const notifySignalByEmail = async (signalId: number): Promise<EmailResult> => {
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
        return { error: errorMessage(e) };
    }
};

const takeSignal = async ({ signal_id }: { signal_id: number }): Promise<TakeSignalResult> => {
    return unwrap<TakeSignalResult>(await supabase.rpc('take_signal', { p_signal_id: signal_id }));
};

// The signed-in member's purchased signals (with full levels).
const getUserSignalHistory = async (_userId?: string | number): Promise<SignalHistoryItem[]> => {
    return unwrap<SignalHistoryItem[]>(await supabase.rpc('get_my_signal_history'));
};

// Member: remove a signal from their own dashboard (live list + purchased history).
const hideSignal = async (id: number): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('hide_signal', { p_signal_id: id }));
};

const deleteSignal = async (id: number): Promise<MessageResponse> => {
    unwrap(await supabase.from('signals').delete().eq('id', id));
    return { message: 'Signal removed' };
};

const setGlobalTimer = async (minutes: number | string): Promise<{ expires_at: string }> => {
    return unwrap(await supabase.rpc('set_global_timer', { p_minutes: Number(minutes) }));
};

const getGlobalTimer = async (): Promise<GlobalTimer> => {
    return unwrap<GlobalTimer>(await supabase.rpc('get_global_timer'));
};

const clearGlobalTimer = async (): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('clear_global_timer'));
};

const requestSignalAccess = async (): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('request_signal_access'));
};

const getSignalRequests = async (): Promise<SignalRequest[]> => {
    return unwrap<SignalRequest[]>(await supabase
        .from('signal_requests')
        .select('*, User:profiles(name, wallet_balance)')
        .order('created_at', { ascending: false }));
};

const approveSignalRequest = async (id: number): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('approve_signal_request', { p_request_id: id }));
};

const extendSignalTimer = async (id: number, minutes: number): Promise<MessageResponse> => {
    return unwrap<MessageResponse>(await supabase.rpc('extend_signal_timer', { p_signal_id: id, p_minutes: minutes }));
};

// Admin: close a signal as 'TP Hit' / 'Stop Loss' / 'Closed' (settles user results via trigger).
const updateSignalStatus = async (id: number, status: string): Promise<MessageResponse> => {
    unwrap(await supabase.from('signals').update({ status }).eq('id', id));
    return { message: 'Signal updated' };
};

// Public track record for the landing page (works logged out).
const getPublicStats = async (): Promise<PublicStats> => {
    return unwrap<PublicStats>(await supabase.rpc('get_public_stats'));
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
