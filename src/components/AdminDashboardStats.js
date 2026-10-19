'use client';

import { IconWallet, IconArrowDown, IconClock, IconTrend, IconTransactions, IconBroadcast, IconUsers } from './admin/AdminIcons';
import '../styles/adminTransactions.css';

const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Admin overview: KPI cards + quick actions.
 *
 * Props:
 *  - adminStats: { platform_balance, total_deposit, deposit_count, pending_deposits, total_profit, total_users }
 *  - onNav: (path) => void
 */
export default function AdminDashboardStats({ adminStats, onNav = () => {} }) {
    const pending = Number(adminStats?.pending_deposits || 0);

    return (
        <div className="adb">
            {/* KPI ROW */}
            <section className="atx-kpis" aria-label="Platform overview">
                <div className="atx-kpi">
                    <span className="atx-kpi-label adb-c-gold"><IconWallet size={15} /> Members&apos; balance</span>
                    <strong>${money(adminStats?.platform_balance)}</strong>
                    <small>Held in {adminStats?.total_users ?? 0} member wallets</small>
                </div>
                <div className="atx-kpi">
                    <span className="atx-kpi-label adb-c-blue"><IconArrowDown size={15} /> Deposits received</span>
                    <strong>${money(adminStats?.total_deposit)}</strong>
                    <small>{adminStats?.deposit_count ?? 0} approved</small>
                </div>
                <div className="atx-kpi atx-kpi--ok">
                    <span className="atx-kpi-label"><IconTrend size={15} /> Signal revenue</span>
                    <strong>${money(adminStats?.total_profit)}</strong>
                    <small>From signal purchases</small>
                </div>
                <button type="button" className={`atx-kpi awl-link ${pending > 0 ? 'atx-kpi--warn' : ''}`} onClick={() => onNav('/transaction')}>
                    <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
                    <strong>{pending}</strong>
                    <small>{pending > 0 ? 'Review deposits →' : 'All caught up'}</small>
                </button>
            </section>

            {/* QUICK ACTIONS */}
            <section className="adb-actions" aria-label="Quick actions">
                <button type="button" className="adb-action" onClick={() => onNav('/transaction')}>
                    <span className="adb-action-icon adb-bg-amber"><IconTransactions size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Review deposits</strong>
                        <small>Check proofs, approve and credit wallets</small>
                    </span>
                    {pending > 0 && <span className="adb-badge">{pending}</span>}
                </button>
                <button type="button" className="adb-action" onClick={() => onNav('/admin/signals')}>
                    <span className="adb-action-icon adb-bg-gold"><IconBroadcast size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Broadcast a signal</strong>
                        <small>Send a new signal or start a countdown</small>
                    </span>
                </button>
                <button type="button" className="adb-action" onClick={() => onNav('/admin/users')}>
                    <span className="adb-action-icon adb-bg-blue"><IconUsers size={20} /></span>
                    <span className="adb-action-text">
                        <strong>Members</strong>
                        <small>{adminStats?.total_users ?? 0} registered members</small>
                    </span>
                </button>
            </section>
        </div>
    );
}
