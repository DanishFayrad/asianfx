// Shared data shapes for the app. They mirror the tables and RPC results in supabase/schema.sql.

export interface Profile {
    id: string;
    user_id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    referral_code: string | null;
    referred_by: string | null;
    wallet_balance: number;
    affiliate_balance: number;
    referral_count: number;
    total_referral_deposits: number;
    is_admin: boolean;
    is_active: boolean;
    profile_image: string | null;
    free_signals: number;
    /** Approved for the influencer programme (earns referral commission). */
    is_influencer?: boolean;
    /** The influencer's commission, in percent of each referred deposit. */
    commission_percent?: number;
    created_at: string;
}

/** A row from get_all_users(), with the signal counts merged in by transactionService. */
export interface AdminUser extends Profile {
    total_deposit: number;
    deposit_count: number;
    signals_taken: number;
    signals_won: number;
    signals_lost: number;
}

export type SignalSide = 'Buy' | 'Sell';

export interface Signal {
    id: number;
    symbol: string;
    type: string;
    entry_price: number | null;
    target_price: number | null;
    stop_loss: number | null;
    signal_type: string;
    description: string | null;
    status: string;
    target_user_id: string | null;
    release_at: string | null;
    /** When the signal closes on its own (admin's "Close after" timer); null = closed by hand. */
    close_at?: string | null;
    total_taken: number;
    created_at: string;
    /** Only on get_member_signals(): whether the caller already took this signal. */
    purchased?: boolean;
    /** Only on createSignal(): result of the email notification. */
    email?: EmailResult;
}

export interface EmailResult {
    sent?: number;
    failed?: number;
    error?: string;
}

export interface SignalStats {
    total_signals?: number;
    active_signals?: number;
    success_rate?: number;
}

export interface SignalHistoryItem {
    id: number;
    signal_id: number | null;
    taken_price: number | null;
    invested_amount: number;
    result: 'pending' | 'win' | 'loss' | string;
    profit: number;
    taken_at: string;
    Signal: {
        symbol: string | null;
        type: string | null;
        status: string | null;
        entry_price: number | null;
        target_price: number | null;
        stop_loss: number | null;
    } | null;
}

export interface TransactionUser {
    user_id: number | null;
    name: string | null;
    email: string | null;
    wallet_balance: number;
}

export interface Transaction {
    id: number;
    user_id: string;
    type: string;
    amount: number;
    status: string;
    payment_method: string | null;
    proof_image: string | null;
    auto_approved: boolean;
    processed_at: string | null;
    created_at: string;
    User?: TransactionUser | null;
}

export interface Notification {
    id: number;
    user_id: string;
    type: string;
    title: string | null;
    message: string | null;
    data: { signal?: Partial<Signal> } | null;
    is_read: boolean;
    created_at: string;
    signal?: Partial<Signal>;
}

export interface SignalRequest {
    id: number;
    user_id: string;
    status: string;
    created_at: string;
    User?: { name: string | null; wallet_balance: number } | null;
}

export interface GlobalTimer {
    expires_at: string | null;
    server_time?: number;
    requestStatus?: string | null;
}

export interface AdminStats {
    platform_balance?: number;
    total_users?: number;
    total_deposit?: number;
    deposit_count?: number;
    pending_deposits?: number;
    total_withdrawal?: number;
    withdrawal_count?: number;
    total_profit?: number;
}

export interface WalletStats {
    balance?: number;
    total_deposit?: number;
    deposit_count?: number;
    total_withdrawal?: number;
    withdrawal_count?: number;
    total_signal_fees?: number;
    total_profit?: number;
}

export interface PublicStats {
    total_signals: number;
    active_signals: number;
    closed_signals: number;
    wins: number;
    recent: Array<Pick<Signal, 'symbol' | 'type' | 'status' | 'entry_price' | 'target_price' | 'stop_loss' | 'created_at'>>;
}

export interface InfluencerApplication {
    id: number;
    user_id: string;
    full_name: string;
    platform: string;
    profile_url: string;
    followers: number | null;
    phone: string | null;
    message: string | null;
    status: 'pending' | 'approved' | 'rejected' | string;
    commission_percent: number | null;
    created_at: string;
    reviewed_at: string | null;
    User?: { user_id: number | null; name: string | null; email: string | null; referral_count: number; total_referral_deposits: number } | null;
}

export interface MessageResponse {
    message: string;
}
