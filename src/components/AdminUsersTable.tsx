'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import { EMPTY_ROWS, listTableFeatures, searchText } from '@/lib/tables';
import transactionService from '@/services/transactionService';
import { displayUserId } from '@/lib/memberId';
import Skeleton, { SkeletonRows } from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import { errorMessage } from '@/lib/supabaseClient';
import type { UserAction } from '@/services/transactionService';
import type { AdminUser } from '@/types';

const ROWS_PER_PAGE = 8;

// TanStack Table handles search and paging. The single column is what the search box matches
// (name, email, phone, country, referral code, member ID); the row markup is rendered below.
const userColumns = createColumnHelper<typeof listTableFeatures, AdminUser>();
const columns = userColumns.columns([
    userColumns.accessor(
        (u) => searchText(u.name, u.email, u.phone, u.country, u.referral_code, displayUserId(u.user_id)),
        { id: 'search' },
    ),
]);

/**
 * Admin users overview table — every user with their details and total deposits.
 *
 * Props:
 *  - users: array of { id, name, email, phone, country, wallet_balance,
 *                      is_active, is_admin, total_deposit, deposit_count, created_at,
 *                      free_signals, signals_taken, signals_won, signals_lost }
 *  - loading: boolean
 */
export default function AdminUsersTable({ users: rawUsers = EMPTY_ROWS, loading = false }: { users?: AdminUser[]; loading?: boolean }) {
    const queryClient = useQueryClient();
    const [busyId, setBusyId] = useState<string | null>(null);
    // Local changes made from the Status dropdown, shown right away without a page reload.
    const [statusOverrides, setStatusOverrides] = useState<Record<string, boolean>>({});
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

    // Memoized so the table only re-processes rows when the list really changes.
    const users = useMemo(() => rawUsers
        .filter((u) => !deletedIds.includes(u.id))
        .map((u) => (u.id in statusOverrides ? { ...u, is_active: statusOverrides[u.id] } : u)),
    [rawUsers, deletedIds, statusOverrides]);

    // Search and paging. The page goes back to 1 when the search or the list changes.
    const table = useTable({
        features: listTableFeatures,
        columns,
        data: users,
        getRowId: (u) => u.id,
        globalFilterFn: 'includesString',
        initialState: { pagination: { pageIndex: 0, pageSize: ROWS_PER_PAGE } },
    });

    // Runs an activate / deactivate / delete action on the server and updates the table locally.
    const performAction = async (u: AdminUser, action: UserAction) => {
        setBusyId(u.id);
        try {
            const { message } = await transactionService.updateUserStatus(u.id, action);
            toast.success(message);
            if (action === 'delete') setDeletedIds((ids) => [...ids, u.id]);
            else setStatusOverrides((o) => ({ ...o, [u.id]: action === 'activate' }));
            // Refresh member lists and platform stats everywhere they are shown.
            queryClient.invalidateQueries({ queryKey: ['admin'] });
        } catch (e) {
            toast.error(errorMessage(e, 'Could not update the user'));
        } finally {
            setBusyId(null);
        }
    };

    // Status dropdown: Active / Inactive act right away; Delete asks for confirmation first.
    const handleStatusChange = (u: AdminUser, value: string) => {
        if (value === 'delete') {
            setPendingDelete(u);
            return;
        }
        performAction(u, value === 'active' ? 'activate' : 'deactivate');
    };

    const confirmDelete = () => {
        const u = pendingDelete;
        if (!u) return;
        setPendingDelete(null);
        performAction(u, 'delete');
    };

    const fmt = (n: number | string | null | undefined) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d: string | null | undefined) => {
        if (!d) return '—';
        const date = new Date(d);
        return isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const query = String(table.state.globalFilter ?? '');
    const filtered = table.getFilteredRowModel().rows;
    const pageRows = table.getRowModel().rows.map((row) => row.original);
    const totalPages = Math.max(1, table.getPageCount());
    const safePage = table.state.pagination.pageIndex + 1;

    const th: CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 'var(--fs-th)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border-color)', whiteSpace: 'nowrap' };
    const td: CSSProperties = { padding: '12px 14px', fontSize: 'var(--fs-table)', borderBottom: '1px solid var(--admin-border-color)', whiteSpace: 'nowrap' };

    return (
        <div style={{ background: 'var(--admin-bg-card)', border: '1px solid var(--admin-border-color)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.25rem 1rem', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>👥 Users</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>
                        {loading ? <Skeleton width={90} height={12} /> : `${filtered.length} of ${users.length} member${users.length === 1 ? '' : 's'}`}
                    </p>
                </div>
                <input
                    value={query}
                    onChange={(e) => table.setGlobalFilter(e.target.value)}
                    placeholder="Search name, email, phone, ID…"
                    style={{ background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-main)', padding: '10px 14px', borderRadius: '10px', minWidth: '240px', outline: 'none' }}
                />
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                    <thead>
                        <tr>
                            <th style={th}>Member</th>
                            <th style={th}>Contact</th>
                            <th style={{ ...th, textAlign: 'right' }}>Deposited</th>
                            <th style={{ ...th, textAlign: 'right' }}>Wallet</th>
                            <th style={{ ...th, textAlign: 'center' }}>Free signals</th>
                            <th style={{ ...th, textAlign: 'center' }}>Signals</th>
                            <th style={{ ...th, textAlign: 'center', color: '#16a34a' }}>Won</th>
                            <th style={{ ...th, textAlign: 'center', color: '#dc2626' }}>Lost</th>
                            <th style={{ ...th, textAlign: 'center' }}>Win rate</th>
                            <th style={th}>Status</th>
                            <th style={th}>Joined</th>
                        </tr>
                    </thead>
                    <tbody aria-busy={loading}>
                        {loading && <SkeletonRows rows={5} cols={11} cellStyle={td} />}
                        {!loading && filtered.length === 0 && (
                            <tr><td style={{ ...td, textAlign: 'center', color: 'var(--admin-text-muted)' }} colSpan={11}>No users found.</td></tr>
                        )}
                        {pageRows.map((u) => (
                            <tr key={u.id}>
                                <td style={td}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {u.name || 'Unnamed'}
                                            {u.is_admin && <span style={{ fontSize: '0.6rem', background: 'rgba(var(--t-accent-rgb), 0.15)', color: 'var(--admin-primary)', padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.5px' }}>ADMIN</span>}
                                        </span>
                                        {!u.is_admin && <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.email}</span>}
                                        {u.user_id != null && <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>ID: {displayUserId(u.user_id)}</span>}
                                    </div>
                                </td>
                                <td style={td}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{u.phone || '—'}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.country || '—'}</span>
                                    </div>
                                </td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--admin-success)' }}>${fmt(u.total_deposit)}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{u.deposit_count || 0} deposit{(u.deposit_count || 0) === 1 ? '' : 's'}</span>
                                    </div>
                                </td>
                                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>${fmt(u.wallet_balance)}</td>
                                <td style={{ ...td, textAlign: 'center' }}>
                                    {u.free_signals > 0 ? (
                                        <span title={`${u.free_signals} free signal credit${u.free_signals > 1 ? 's' : ''} (earned from Stop Loss)`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: 'rgba(var(--t-accent-rgb), 0.15)', color: 'var(--t-gold)' }}>
                                            🎁 {u.free_signals}
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--admin-text-muted)' }}>0</span>
                                    )}
                                </td>
                                {(() => {
                                    const taken = Number(u.signals_taken || 0);
                                    const won = Number(u.signals_won || 0);
                                    const lost = Number(u.signals_lost || 0);
                                    const open = Number(u.signals_open || 0);
                                    const decided = won + lost;
                                    const rate = decided > 0 ? Math.round((won / decided) * 100) : null;
                                    const muted = { color: 'var(--admin-text-muted)' };
                                    const num = (n: number, color: string) => n > 0
                                        ? <span style={{ fontWeight: 700, fontSize: '0.95rem', color }}>{n}</span>
                                        : <span style={muted}>0</span>;
                                    return (
                                        <>
                                            <td style={{ ...td, textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 700 }}>{taken}</span>
                                                    {open > 0 && <span style={{ fontSize: '0.72rem', color: '#d97706' }} title="Still active — waiting for Profit / Loss">{open} open</span>}
                                                </div>
                                            </td>
                                            <td style={{ ...td, textAlign: 'center' }} title="Signals that hit Take Profit">{num(won, '#16a34a')}</td>
                                            <td style={{ ...td, textAlign: 'center' }} title="Signals that hit Stop Loss">{num(lost, '#dc2626')}</td>
                                            <td style={{ ...td, textAlign: 'center' }}>
                                                {rate === null ? <span style={muted}>—</span> : (
                                                    <span style={{
                                                        fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                                                        background: rate >= 50 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: rate >= 50 ? '#16a34a' : '#dc2626'
                                                    }}>{rate}%</span>
                                                )}
                                            </td>
                                        </>
                                    );
                                })()}
                                <td style={td}>
                                    {u.is_admin ? (
                                        <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                                    ) : (
                                        <select
                                            value={u.is_active ? 'active' : 'inactive'}
                                            disabled={busyId === u.id}
                                            onChange={(e) => handleStatusChange(u, e.target.value)}
                                            aria-label={`Status for ${u.name || u.email}`}
                                            style={{
                                                background: u.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(156,163,175,0.12)',
                                                border: `1px solid ${u.is_active ? 'rgba(34,197,94,0.4)' : 'rgba(156,163,175,0.4)'}`,
                                                color: u.is_active ? '#16a34a' : '#6b7280',
                                                padding: '5px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                                                cursor: busyId === u.id ? 'wait' : 'pointer', outline: 'none'
                                            }}
                                        >
                                            <option value="active" style={{ color: '#16a34a', background: '#fdfcf8' }}>Active</option>
                                            <option value="inactive" style={{ color: '#6b7280', background: '#fdfcf8' }}>Inactive</option>
                                            <option value="delete" style={{ color: '#dc2626', background: '#fdfcf8' }}>Delete</option>
                                        </select>
                                    )}
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
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            style={{
                                background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)',
                                color: 'var(--admin-text-main)', padding: '7px 14px', borderRadius: '8px',
                                cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.4 : 1, fontWeight: 600
                            }}
                        >Prev</button>
                        <span style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>Page {safePage} / {totalPages}</span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            style={{
                                background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)',
                                color: 'var(--admin-text-main)', padding: '7px 14px', borderRadius: '8px',
                                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.4 : 1, fontWeight: 600
                            }}
                        >Next</button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                title="Are you sure you want to delete this user?"
                message={pendingDelete && (
                    <><strong>{pendingDelete.name || pendingDelete.email}</strong> — their account, deposits and signal history will be removed. This cannot be undone.</>
                )}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );
}
