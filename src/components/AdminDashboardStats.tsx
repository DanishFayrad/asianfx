'use client';

import type { ReactNode } from 'react';
import { IconWallet, IconArrowDown, IconClock, IconTrend, IconBroadcast, IconUsers } from './admin/AdminIcons';
import Skeleton from './Skeleton';
import '../styles/adminTransactions.css';
import type { AdminStats, SignalStats } from '@/types';

const money = (n: number | string | null | undefined) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Admin overview: KPI cards + signal / members shortcuts.
 *
 * Props:
 *  - adminStats: platform money / member counts (null while loading)
 *  - signalStats: optional total / active signal counts (from get_signal_stats)
 *  - onNav: (path) => void
 */
export default function AdminDashboardStats({
    adminStats,
    signalStats = null,
    onNav = () => {},
}: {
    adminStats: AdminStats | null;
    signalStats?: SignalStats | null;
    onNav?: (path: string) => void;
}) {
    const loading = !adminStats;
    const pending = Number(adminStats?.pending_deposits || 0);
    const totalSignals = Number(signalStats?.total_signals ?? adminStats?.total_signals ?? 0);
    const activeSignals = Number(signalStats?.active_signals ?? adminStats?.active_signals ?? 0);
    const signalsLoading = loading && signalStats == null;

    // While loading, show a shimmer instead of a misleading "0".
    const value = (content: ReactNode) => (loading ? <Skeleton width={110} height={30} radius={8} /> : content);
    const note = (content: ReactNode) => (loading ? <Skeleton width={140} height={12} /> : content);
    const signalValue = (content: ReactNode) => (signalsLoading ? <Skeleton width={48} height={22} radius={8} /> : content);

    return (
        <div className="adb">
            {/* KPI ROW */}
            <section className="atx-kpis" aria-label="Platform overview" aria-busy={loading}>
                <div className="atx-kpi">
                    <span className="atx-kpi-label adb-c-gold"><IconWallet size={15} /> Members&apos; balance</span>
                    <strong>{value(`$${money(adminStats?.platform_balance)}`)}</strong>
                    <small>{note(`Held in ${adminStats?.total_users ?? 0} member wallets`)}</small>
                </div>
                <div className="atx-kpi">
                    <span className="atx-kpi-label adb-c-blue"><IconArrowDown size={15} /> Deposits received</span>
                    <strong>{value(`$${money(adminStats?.total_deposit)}`)}</strong>
                    <small>{note(`${adminStats?.deposit_count ?? 0} approved`)}</small>
                </div>
                <div className="atx-kpi atx-kpi--ok">
                    <span className="atx-kpi-label"><IconTrend size={15} /> Signal revenue</span>
                    <strong>{value(`$${money(adminStats?.total_profit)}`)}</strong>
                    <small>{note('From signal purchases')}</small>
                </div>
                <button type="button" className={`atx-kpi awl-link ${pending > 0 ? 'atx-kpi--warn' : ''}`} onClick={() => onNav('/transaction')}>
                    <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
                    <strong>{value(pending)}</strong>
                    <small>{note(pending > 0 ? 'Review deposits →' : 'All caught up')}</small>
                </button>
            </section>

            {/* SIGNAL COUNTS + MEMBERS */}
            <section className="adb-actions" aria-label="Signals and members">
                <button type="button" className="adb-action" onClick={() => onNav('/admin/signals')}>
                    <span className="adb-action-icon adb-bg-gold"><IconBroadcast size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Total signals</strong>
                        <small>{signalValue(totalSignals)}</small>
                    </span>
                </button>
                <button type="button" className="adb-action" onClick={() => onNav('/admin/signals')}>
                    <span className="adb-action-icon adb-bg-amber"><IconTrend size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Active signals</strong>
                        <small>{signalValue(activeSignals)}</small>
                    </span>
                </button>
                <button type="button" className="adb-action" onClick={() => onNav('/admin/users')}>
                    <span className="adb-action-icon adb-bg-blue"><IconUsers size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Members</strong>
                        <small>{note(`${adminStats?.total_users ?? 0} registered members`)}</small>
                    </span>
                </button>
            </section>
        </div>
    );
}
