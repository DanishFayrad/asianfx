'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import { EMPTY_ROWS, listTableFeatures, searchText } from '@/lib/tables';
import transactionService from '../../services/transactionService';
import { connectRealtime } from '../../services/realtimeService';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useAllTransactions, usePendingTransactions } from '@/hooks/queries';
import toast from 'react-hot-toast';
import AdminSidebar, { initials } from '../../components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { IconCheck, IconX, IconClock, IconImage, IconTrash, IconSearch, IconInbox, IconTransactions } from '@/components/admin/AdminIcons';
import { displayUserId } from '@/lib/memberId';
import Skeleton, { SkeletonRows } from '@/components/Skeleton';
import '../../styles/adminSignals.css';
import '../../styles/adminTransactions.css';
import { errorMessage } from '@/lib/supabaseClient';
import type { Transaction } from '@/types';

const PAGE_SIZE = 25;
const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

type FilterKey = typeof FILTERS[number]['key'];
type StatusKey = 'approved' | 'pending' | 'rejected';

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: '' | 'approve' | 'reject' | 'delete';
  data: number | null;
  inputValue: string;
  tx?: Transaction;
}
const money = (n: number | string | null | undefined) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusKey = (st: string): StatusKey => (st === 'approved' || st === 'completed' ? 'approved' : st === 'pending' ? 'pending' : 'rejected');
const statusLabel = (st: string) => ({ approved: 'Approved', pending: 'Pending', rejected: 'Rejected' }[statusKey(st)]);
const formatMethod = (m: string | null) => (!m ? '—' : m.toUpperCase().replace(/_/g, ' '));

// TanStack Table columns used for filtering: the search box matches member name / email / ID,
// the status tabs match the normalised status. The row markup itself is rendered in the page.
const depositColumnHelper = createColumnHelper<typeof listTableFeatures, Transaction>();
const depositColumns = depositColumnHelper.columns([
  depositColumnHelper.accessor((t) => searchText(t.User?.name, t.User?.email, displayUserId(t.User?.user_id)), { id: 'search' }),
  depositColumnHelper.accessor((t) => statusKey(t.status), { id: 'status', filterFn: 'equalsString' }),
]);

export default function Transaction() {
  // Access (admins only) is enforced by AuthGuard before this page renders.
  const { user } = useCurrentUser();
  const handleLogout = useLogout();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.is_admin;
  const isAuthorizing = !isAdmin;
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pendingQuery = usePendingTransactions(isAdmin);
  const allQuery = useAllTransactions(isAdmin);
  const pendingDeposits: Transaction[] = pendingQuery.data ?? EMPTY_ROWS;
  const userTransactions: Transaction[] = allQuery.data ?? EMPTY_ROWS;
  const loading = allQuery.isPending; // first load only — later refreshes keep showing the old rows
  // Shimmer placeholders for the summary cards until the first load finishes.
  const kpiValue = (content: React.ReactNode) => (loading ? <Skeleton width={90} height={28} radius={8} /> : content);
  const kpiNote = (content: React.ReactNode) => (loading ? <Skeleton width={110} height={12} /> : content);


  const [filter, setFilter] = useState<FilterKey>('pending');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
      isOpen: false,
      title: '',
      message: '',
      type: '', // 'approve' or 'reject'
      data: null,
      inputValue: ''
  });

  const closeConfirmModal = () => setConfirmModal({...confirmModal, isOpen: false});

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Deposits changed: reload the lists here and the stats / badges on every admin page.
  const fetchData = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  useEffect(() => {
    if (user?.is_admin) {
        const socket = connectRealtime(user);

        socket.on('admin_notification', (notif) => {
            console.log("Real-time admin update:", notif);
            if (notif.type === 'NEW_DEPOSIT') {
                // Refresh all stats (including badges) immediately
                fetchData();
            }
        });

        return () => socket.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_admin]);

  // "View" on a pending deposit: open the review modal with the payment screenshot.
  const [proof, setProof] = useState({ url: '', loading: false, error: '' });

  const handleApprove = async (id: number) => {
    const tx = userTransactions.find((t) => t.id === id) || pendingDeposits.find((t) => t.id === id);
    setConfirmModal({
        isOpen: true,
        title: 'Review Deposit',
        message: 'Check the payment screenshot below, then approve or reject.',
        type: 'approve',
        data: id,
        inputValue: '',
        tx,
    });
    if (!tx?.proof_image) {
      setProof({ url: '', loading: false, error: 'No screenshot uploaded' });
      return;
    }
    setProof({ url: '', loading: true, error: '' });
    try {
      const url = await transactionService.getProofUrl(tx.proof_image);
      setProof({ url, loading: false, error: '' });
    } catch (e) {
      setProof({ url: '', loading: false, error: errorMessage(e, 'Could not load screenshot') });
    }
  };

  const handleReject = (id: number) => {
    setConfirmModal({
        isOpen: true,
        title: 'Reject Deposit',
        message: 'Are you sure you want to reject this deposit request?',
        type: 'reject',
        data: id,
        inputValue: ''
    });
  };

  const executeConfirmAction = async () => {
    const { type, data, tx } = confirmModal;
    if (data === null) return;
    setIsActionLoading(true);
    try {
        if (type === 'approve') {
            const amount = Number(tx?.amount);
            if (isNaN(amount) || amount <= 0) {
                toast.error("This deposit has no valid amount.");
                return;
            }
            await transactionService.approveTransaction(data, amount);
            toast.success("Deposit approved and wallet credited.");
        } else if (type === 'reject') {
            await transactionService.rejectTransaction(data);
            toast.success("Deposit request rejected.");
        } else if (type === 'delete') {
            await transactionService.deleteTransaction(data);
            toast.success("Transaction deleted successfully.");
        }
        closeConfirmModal();
        fetchData();
    } catch (e) {
        toast.error("Failed to process transaction.");
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Transaction',
        message: 'Are you sure you want to delete this transaction record? This action cannot be undone.',
        type: 'delete',
        data: id,
        inputValue: ''
    });
  };


  const deposits = useMemo(() => userTransactions.filter((t) => t.type === 'deposit'), [userTransactions]);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const pending = deposits.filter((t) => statusKey(t.status) === 'pending');
    const approved = deposits.filter((t) => statusKey(t.status) === 'approved');
    return {
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      approvedCount: approved.length,
      approvedAmount: sum(approved),
      rejectedCount: deposits.filter((t) => statusKey(t.status) === 'rejected').length,
      todayCount: deposits.filter((t) => new Date(t.created_at).toDateString() === today).length,
    };
  }, [deposits]);

  const counts = useMemo((): Record<FilterKey, number> => ({
    pending: summary.pendingCount,
    approved: summary.approvedCount,
    rejected: summary.rejectedCount,
    all: deposits.length,
  }), [summary, deposits.length]);

  // TanStack Table: status tab → column filter, search box → global filter, "Show more" → page size.
  const statusFilters = useMemo(() => (filter === 'all' ? [] : [{ id: 'status', value: filter }]), [filter]);
  const table = useTable({
    features: listTableFeatures,
    columns: depositColumns,
    data: deposits,
    getRowId: (t) => String(t.id),
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === 'search',
    state: {
      globalFilter: search,
      columnFilters: statusFilters,
      pagination: { pageIndex: 0, pageSize: visible },
    },
  });
  const filteredCount = table.getFilteredRowModel().rows.length;
  const visibleRows = table.getRowModel().rows.map((row) => row.original);

  // A new tab or search starts again from the first PAGE_SIZE rows.
  const changeFilter = (key: FilterKey) => { setFilter(key); setVisible(PAGE_SIZE); };
  const changeSearch = (value: string) => { setSearch(value); setVisible(PAGE_SIZE); };

  if (!mounted || (isAuthorizing && !user)) {
      return (
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)', color: 'var(--t-text)' }}>
              <div className="loader">Loading Admin Panel...</div>
          </div>
      );
  }

  if (!user || !user.is_admin) {
      return null;
  }

  return (
    <div className="admin-layout">
      {/*  SIDEBAR  */}
      <AdminSidebar
        active="transactions"
        user={user}
        pendingDeposits={pendingDeposits.length}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* BACKDROP FOR MOBILE */}
      {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/*  MAIN  */}
      <main className="admin-main-content">
        <AdminHeader
          title="Deposits"
          subtitle="Review payment proofs and approve deposits"
          onMenu={toggleSidebar}
        />

        <div className="atx">
          {/* SUMMARY */}
          <section className="atx-kpis" aria-label="Deposit summary">
            <div className="atx-kpi atx-kpi--warn">
              <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
              <strong>{kpiValue(summary.pendingCount)}</strong>
              <small>{kpiNote(`$${money(summary.pendingAmount)} requested`)}</small>
            </div>
            <div className="atx-kpi atx-kpi--ok">
              <span className="atx-kpi-label"><IconCheck size={15} /> Approved</span>
              <strong>{kpiValue(`$${money(summary.approvedAmount)}`)}</strong>
              <small>{kpiNote(`${summary.approvedCount} deposit${summary.approvedCount === 1 ? '' : 's'}`)}</small>
            </div>
            <div className="atx-kpi">
              <span className="atx-kpi-label"><IconX size={15} /> Rejected</span>
              <strong>{kpiValue(summary.rejectedCount)}</strong>
              <small>{kpiNote('requests')}</small>
            </div>
            <div className="atx-kpi">
              <span className="atx-kpi-label"><IconTransactions size={15} /> Today</span>
              <strong>{kpiValue(summary.todayCount)}</strong>
              <small>{kpiNote(`new request${summary.todayCount === 1 ? '' : 's'}`)}</small>
            </div>
          </section>

          {/* TABLE CARD */}
          <section className="atx-card">
            <div className="atx-toolbar">
              <div className="atx-tabs" role="tablist" aria-label="Filter by status">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={`atx-tab ${filter === f.key ? 'atx-tab--active' : ''}`}
                    onClick={() => changeFilter(f.key)}
                  >
                    {f.label}
                    <span className="atx-tab-count">{loading ? <Skeleton width={14} height={10} /> : counts[f.key]}</span>
                  </button>
                ))}
              </div>

              <label className="atx-search">
                <IconSearch size={16} />
                <input
                  type="search"
                  placeholder="Search name, email or ID…"
                  value={search}
                  onChange={(e) => changeSearch(e.target.value)}
                  aria-label="Search deposits"
                />
              </label>
            </div>

            {loading ? (
              <div className="atx-table-wrap" aria-busy="true">
                <table className="atx-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Requested</th>
                      <th>Method</th>
                      <th className="atx-right">Amount</th>
                      <th>Status</th>
                      <th className="atx-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SkeletonRows rows={6} cols={6} />
                  </tbody>
                </table>
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="atx-empty">
                <IconInbox size={34} />
                <strong>{search ? 'No matching deposits' : filter === 'pending' ? 'All caught up' : 'Nothing here yet'}</strong>
                <span>{search ? 'Try a different name or email.' : filter === 'pending' ? 'There are no deposits waiting for review.' : 'Deposits will appear here as members submit them.'}</span>
              </div>
            ) : (
              <div className="atx-table-wrap">
                <table className="atx-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Requested</th>
                      <th>Method</th>
                      <th className="atx-right">Amount</th>
                      <th>Status</th>
                      <th className="atx-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((tx) => {
                      const memberName = tx.User?.name || `Member #${String(tx.user_id).slice(0, 6)}`;
                      const d = new Date(tx.created_at);
                      return (
                        <tr key={tx.id} className={tx.status === 'pending' ? 'atx-row--pending' : ''}>
                          <td>
                            <div className="atx-member">
                              <span className="atx-avatar">{initials(memberName)}</span>
                              <div>
                                <strong>{memberName}</strong>
                                <small>{tx.User?.email || '—'}</small>
                                {tx.User?.user_id != null && <small>ID: {displayUserId(tx.User.user_id)}</small>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="atx-date">
                              <span>{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <small>{d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</small>
                            </div>
                          </td>
                          <td><span className="atx-chip">{formatMethod(tx.payment_method)}</span></td>
                          <td className="atx-right atx-amount">${money(tx.amount)}</td>
                          <td>
                            <span className={`atx-status atx-status--${statusKey(tx.status)}`}>
                              <i aria-hidden="true" />{statusLabel(tx.status)}
                            </span>
                          </td>
                          <td className="atx-right">
                            <div className="atx-actions">
                              <button
                                type="button"
                                className={tx.status === 'pending' ? 'atx-btn atx-btn--approve' : 'atx-btn'}
                                onClick={() => handleApprove(tx.id)}
                              >
                                <IconImage size={15} /> View
                              </button>
                              <button
                                type="button"
                                className="atx-icon-btn atx-icon-btn--danger"
                                title="Delete record"
                                aria-label="Delete record"
                                onClick={() => handleDelete(tx.id)}
                              >
                                <IconTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredCount > visibleRows.length && (
              <div className="atx-more">
                <button type="button" className="atx-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({filteredCount - visibleRows.length} left)
                </button>
              </div>
            )}
          </section>
        </div>

        {/* CUSTOM CONFIRM/PROMPT MODAL */}
        {confirmModal.isOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: 'var(--t-surface)', padding: 'clamp(1.25rem, 4vw, 2.5rem)', borderRadius: '24px', color: 'var(--t-text)', width: confirmModal.type === 'approve' ? 'min(560px, 94vw)' : 'min(400px, 94vw)', maxHeight: '94vh', overflowY: 'auto', border: '1px solid var(--tw-10)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    {confirmModal.type !== 'approve' && (
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '24px' }}>❌</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{confirmModal.title}</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{confirmModal.message}</p>
                    </div>
                    )}

                    {confirmModal.type === 'approve' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', background: 'var(--tw-03)', border: '1px solid var(--tw-08)', marginBottom: '12px' }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{confirmModal.tx?.User?.name || 'Member'}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--t-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{confirmModal.tx?.User?.email || '—'}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--t-text-muted)' }}>Amount sent</div>
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#16a34a' }}>${money(confirmModal.tx?.amount)}</div>
                                </div>
                            </div>
                            <div style={{ borderRadius: '12px', border: '1px solid var(--tw-10)', background: 'var(--tw-03)', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {proof.loading ? (
                                    <span style={{ color: 'var(--t-text-muted)', fontSize: '0.85rem' }}><span className="btn-spinner dark" /> Loading screenshot…</span>
                                ) : proof.url ? (
                                    <a href={proof.url} target="_blank" rel="noopener noreferrer" title="Open full size" style={{ display: 'block', width: '100%' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proof.url} alt="Payment proof" style={{ display: 'block', width: '100%', maxHeight: '48vh', objectFit: 'contain' }} />
                                    </a>
                                ) : (
                                    <span style={{ color: 'var(--t-text-muted)', fontSize: '0.85rem' }}>{proof.error || 'No screenshot'}</span>
                                )}
                            </div>
                            {proof.url && <p style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', textAlign: 'center', marginTop: '6px' }}>Tap the image to open it full size</p>}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {(confirmModal.type !== 'approve' || confirmModal.tx?.status === 'pending') && (
                        <button 
                            onClick={executeConfirmAction} 
                            disabled={isActionLoading}
                            style={{ flex: 2, background: ['approve', 'reject'].includes(confirmModal.type) ? '#22c55e' : '#dc2626', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: confirmModal.type === 'delete' ? '#fff' : 'var(--t-text)', fontSize: '1rem' }}
                        >
                            {isActionLoading ? <><span className="btn-spinner"></span>Processing...</> : (confirmModal.type === 'approve' ? 'Approve' : confirmModal.type === 'delete' ? 'Yes, Delete' : 'Yes, Reject')}
                        </button>
                        )}
                        {confirmModal.type === 'approve' && confirmModal.tx?.status === 'pending' && (
                            <button
                                type="button"
                                onClick={() => { if (confirmModal.data !== null) handleReject(confirmModal.data); }}
                                disabled={isActionLoading}
                                style={{ flex: 1, background: 'transparent', border: '1.5px solid #ef4444', color: '#dc2626', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}
                            >
                                Reject
                            </button>
                        )}
                        <button
                            className="btn-cancel" onClick={closeConfirmModal}
                            style={{ flex: 1, background: 'var(--admin-bg-main)', border: '1px solid var(--admin-border-color)', color: 'var(--admin-text-main)', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            {confirmModal.type === 'approve' && confirmModal.tx?.status !== 'pending' ? 'Close' : 'Cancel'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Recent Transactions History removed per request */}

        {/* System Log explicitly removed per request */}
      </main>
    </div>
  );
}
