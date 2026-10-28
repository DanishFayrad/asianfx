'use client';

import Link from 'next/link';
import { IconDashboard, IconUsers, IconBroadcast, IconTransactions, IconWallet, IconLogout } from './admin/AdminIcons';
import '../styles/adminSignals.css';
import '../styles/adminShell.css';
import type { Profile } from '@/types';

export type AdminNavKey = 'dashboard' | 'signals' | 'transactions' | 'users' | 'wallet';

interface AdminSidebarProps {
    active: AdminNavKey;
    user: Profile | null;
    pendingDeposits?: number;
    onLogout?: () => void;
    isOpen?: boolean;
    onClose?: () => void;
}

const NAV = [
    { key: 'dashboard', href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
    { key: 'signals', href: '/admin/signals', label: 'Broadcast Signal', Icon: IconBroadcast },
    { key: 'transactions', href: '/transaction', label: 'Deposits', Icon: IconTransactions, badge: true },
    { key: 'users', href: '/admin/users', label: 'Members', Icon: IconUsers },
    { key: 'wallet', href: '/wallet', label: 'Platform Wallet', Icon: IconWallet },
];

export const initials = (name = '') =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'A';

/**
 * Shared admin navigation shell used across all admin screens.
 *
 * Props:
 *  - active: 'dashboard' | 'signals' | 'transactions' | 'users' | 'wallet'
 *  - user: current admin user (for the footer)
 *  - pendingDeposits: number shown as a badge on Deposits
 *  - onLogout: logout handler
 *  - isOpen / onClose: mobile drawer state
 */
export default function AdminSidebar({ active, user, pendingDeposits = 0, onLogout, isOpen = false, onClose = () => {} }: AdminSidebarProps) {
    const name = user?.name || 'Administrator';

    return (
        <aside className={`asb ${isOpen ? 'asb--open' : ''}`} aria-label="Admin navigation">
            <Link href="/dashboard" className="asb-brand" onClick={onClose}>
                <img src="/images/logo-mark.svg" alt="" width={32} height={32} />
                <span>Asian<b>FX</b></span>
                <em>Admin</em>
            </Link>

            <span className="asb-section">Manage</span>
            <nav className="asb-nav">
                {NAV.map(({ key, href, label, Icon, badge }) => (
                    <Link
                        key={key}
                        href={href}
                        className={`asb-link ${active === key ? 'asb-link--active' : ''}`}
                        aria-current={active === key ? 'page' : undefined}
                        onClick={onClose}
                    >
                        <Icon />
                        <span>{label}</span>
                        {badge && pendingDeposits > 0 && <i className="asb-badge" title={`${pendingDeposits} deposit(s) waiting for approval`}>Pending</i>}
                    </Link>
                ))}
            </nav>

            <div className="asb-user">
                <div className="asb-avatar" aria-hidden="true">{initials(name)}</div>
                <div className="asb-user-text">
                    <strong>{name}</strong>
                    <small>{user?.email || 'Admin account'}</small>
                </div>
                {onLogout && (
                    <button type="button" className="asb-logout" onClick={onLogout} aria-label="Log out" title="Log out">
                        <IconLogout />
                    </button>
                )}
            </div>
        </aside>
    );
}
