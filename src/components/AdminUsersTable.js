'use client';

import { useState, useEffect } from 'react';

const ROWS_PER_PAGE = 8;

/**
 * Admin users overview table — every user with their details and total deposits.
 *
 * Props:
 *  - users: array of { id, name, email, phone, country, wallet_balance,
 *                      is_active, is_admin, total_deposit, deposit_count, created_at }
 *  - loading: boolean
 */
export default function AdminUsersTable({ users = [], loading = false }) {
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => {
        if (!d) return '—';
        const date = new Date(d);
        return isNaN(date) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const q = query.trim().toLowerCase();
    const filtered = q
        ? users.filter((u) =>
            [u.name, u.email, u.phone, u.country, u.referral_code]
                .some((f) => (f || '').toLowerCase().includes(q)))
        : users;

    const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageRows = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

    // Reset to first page whenever the search query or the result count changes.
    useEffect(() => { setPage(1); }, [q, filtered.length]);

    const th = { textAlign: 'left', padding: '12px 14px', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', whiteSpace: 'nowrap' };
    const td = { padding: '12px 14px', fontSize: '0.85rem', borderBottom: '1px solid var(--admin-border-color)', whiteSpace: 'nowrap' };

    return (
        <div style={{ background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border-color)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.25rem 1rem', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>👥 Users</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                        {loading ? 'Loading…' : `${filtered.length} of ${users.length} member${users.length === 1 ? '' : 's'}`}
                    </p>
                </div>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, email, phone…"
                    style={{ background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-main)', padding: '10px 14px', borderRadius: '10px', minWidth: '240px', outline: 'none' }}
                />
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                    <thead>
                        <tr>
                            <th style={th}>User</th>
                            <th style={th}>Phone</th>
                            <th style={th}>Country</th>
                            <th style={{ ...th, textAlign: 'right' }}>Total Deposited</th>
                            <th style={{ ...th, textAlign: 'right' }}>Deposits</th>
                            <th style={{ ...th, textAlign: 'right' }}>Wallet</th>
                            <th style={th}>Status</th>
                            <th style={th}>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && filtered.length === 0 && (
                            <tr><td style={{ ...td, textAlign: 'center', color: 'var(--admin-text-muted)' }} colSpan={8}>No users found.</td></tr>
                        )}
                        {pageRows.map((u) => (
                            <tr key={u.id}>
                                <td style={td}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {u.name || 'Unnamed'}
                                            {u.is_admin && <span style={{ fontSize: '0.6rem', background: 'rgba(212,175,55,0.15)', color: 'var(--admin-primary)', padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>ADMIN</span>}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.email}</span>
                                    </div>
                                </td>
                                <td style={td}>{u.phone || '—'}</td>
                                <td style={td}>{u.country || '—'}</td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--admin-success)' }}>${fmt(u.total_deposit)}</td>
                                <td style={{ ...td, textAlign: 'right' }}>{u.deposit_count || 0}</td>
                                <td style={{ ...td, textAlign: 'right' }}>${fmt(u.wallet_balance)}</td>
                                <td style={td}>
                                    <span style={{
                                        fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                        background: u.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.12)',
                                        color: u.is_active ? 'var(--admin-success)' : 'var(--admin-text-muted)'
                                    }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                                </td>
                                <td style={{ ...td, color: 'var(--admin-text-muted)' }}>{fmtDate(u.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!loading && filtered.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderTop: '1px solid var(--admin-border-color)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                        Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            style={{
                                background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)',
                                color: 'var(--admin-text-main)', padding: '7px 14px', borderRadius: '8px',
                                cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1, fontWeight: 600
                            }}
                        >Prev</button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Page {safePage} / {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            style={{
                                background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)',
                                color: 'var(--admin-text-main)', padding: '7px 14px', borderRadius: '8px',
                                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1, fontWeight: 600
                            }}
                        >Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
