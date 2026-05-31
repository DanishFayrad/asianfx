'use client';

import Link from 'next/link';
import '../styles/adminSignals.css';

/**
 * Shared admin navigation shell used across all admin screens
 * (Dashboard, Broadcast Signal, Transactions) so the flow stays consistent.
 *
 * Props:
 *  - active: 'dashboard' | 'signals' | 'transactions'
 *  - user: current admin user (for the footer)
 *  - pendingDeposits: number shown as a badge on Transactions
 *  - onLogout: logout handler
 *  - isOpen / onClose: mobile drawer state
 */
export default function AdminSidebar({ active, user, pendingDeposits = 0, onLogout, isOpen = false, onClose = () => {} }) {
    const iconStyle = { filter: 'brightness(0) invert(1)', width: '20px' };

    return (
        <aside className={`admin-sidebar ${isOpen ? 'show' : ''}`}>
            <div className="admin-logo">
                <div className="logo-box">
                    <img src="/images/logo-mark.svg" alt="AsianFX" style={{ height: '32px' }} />
                </div>
                <span>AsianFX Admin</span>
            </div>

            <nav className="admin-nav">
                <Link href="/dashboard" className={`admin-item ${active === 'dashboard' ? 'active' : ''}`} onClick={onClose}>
                    <img src="/images/i (5).png" alt="Dashboard" style={iconStyle} /> Dashboard
                </Link>
                <Link href="/admin/users" className={`admin-item ${active === 'users' ? 'active' : ''}`} onClick={onClose}>
                    <img src="/images/i (3).png" alt="Users" style={iconStyle} /> Users
                </Link>
                <Link href="/admin/signals" className={`admin-item ${active === 'signals' ? 'active' : ''}`} onClick={onClose}>
                    <img src="/images/i (11).png" alt="Broadcast" style={iconStyle} /> Broadcast Signal
                </Link>
                <Link
                    href="/transaction"
                    className={`admin-item ${active === 'transactions' ? 'active' : ''}`}
                    onClick={onClose}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/images/svg (15).png" alt="Transactions" style={iconStyle} />
                        Transactions
                    </span>
                    {pendingDeposits > 0 && (
                        <span style={{
                            background: '#ef4444', color: 'white', borderRadius: '50%',
                            width: '18px', height: '18px', fontSize: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{pendingDeposits}</span>
                    )}
                </Link>
            </nav>

            <div className="admin-footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/images/img.png" alt="Profile" className="admin-avatar" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name || 'Administrator'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Admin Account</span>
                    </div>
                </div>
                {onLogout && (
                    <button
                        onClick={onLogout}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'transparent', border: '1px solid var(--admin-danger)',
                            color: 'var(--admin-danger)', padding: '8px 16px', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: 600, width: '100%'
                        }}
                    >
                        Log Out
                    </button>
                )}
            </div>
        </aside>
    );
}
