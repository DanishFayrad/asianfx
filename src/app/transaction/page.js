'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import transactionService from '../../services/transactionService';
import signalService, { getSignalLevelError } from '../../services/signalService';
import authService from '../../services/authService';
import { setUser, logout } from '../../redux/slices/authSlice';
import { connectRealtime } from '../../services/realtimeService';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import AdminSidebar, { initials } from '../../components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { IconCheck, IconX, IconClock, IconImage, IconSend, IconTrash, IconSearch, IconInbox, IconTransactions } from '@/components/admin/AdminIcons';
import '../../styles/adminSignals.css';
import '../../styles/adminTransactions.css';

const PAGE_SIZE = 25;
const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];
const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusKey = (st) => (st === 'approved' || st === 'completed' ? 'approved' : st === 'pending' ? 'pending' : 'rejected');
const statusLabel = (st) => ({ approved: 'Approved', pending: 'Pending', rejected: 'Rejected' }[statusKey(st)]);
const formatMethod = (m) => (!m ? '—' : m.toUpperCase().replace(/_/g, ' '));

export default function Transaction() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
     const checkAuth = async () => {
         if (user) {
             if (!user.is_admin) {
                 router.push('/dashboard');
             } else {
                 setIsAuthorizing(false);
             }
         } else if (token) {
             // Token exists but no Redux user? Fetch it
             try {
                const profile = await authService.getProfile();
                dispatch(setUser(profile));
             } catch (e) {
                console.error("Session expired", e);
                router.push('/login');
             }
         } else {
             // No token? Login
             router.push('/login');
         }
     };
     
     checkAuth();
  }, [user, token, router, dispatch]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal for sending signal
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [signalData, setSignalData] = useState({
    symbol: 'XAUUSD',
    type: 'buy',
    entry_price: '',
    target_price: '',
    stop_loss: '',
    signal_type: 'premium',
    description: '',
    releaseMinutes: ''
  });

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState({
      isOpen: false,
      title: '',
      message: '',
      type: '', // 'approve' or 'reject'
      data: null,
      inputValue: ''
  });

  const closeConfirmModal = () => setConfirmModal({...confirmModal, isOpen: false});

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
        if (user?.is_admin) {
            const data = await transactionService.getPendingTransactions();
            setPendingDeposits(data || []);
            const allTxs = await transactionService.getAllTransactions();
            setUserTransactions(allTxs || []);
        }
    } catch (e) {
        console.error("Failed to fetch data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

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
  }, [user]);

  const handleApprove = (id) => {
    const tx = userTransactions.find((t) => t.id === id) || pendingDeposits.find((t) => t.id === id);
    setConfirmModal({
        isOpen: true,
        title: 'Approve Deposit',
        message: 'Check the payment proof, then enter the amount you actually received (USD):',
        type: 'approve',
        data: id,
        inputValue: '',                      // starts at 0 — admin types the confirmed amount
        requestedAmount: tx?.amount ?? null,   // what the member said they sent (shown as a hint)
    });
  };

  const handleReject = (id) => {
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
    const { type, data, inputValue } = confirmModal;
    setIsActionLoading(true);
    try {
        if (type === 'approve') {
            const parsedAmount = parseFloat(inputValue);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                toast.error("Please enter a valid amount.");
                return;
            }
            await transactionService.approveTransaction(data, parsedAmount);
            toast.success("Deposit approved and wallet credited.");
            
            const tx = pendingDeposits.find(t => t.id === data);
            const userObj = tx?.User ? { ...tx.User, id: tx.user_id } : { id: tx?.user_id, name: 'Member' };
            openSignalModal(userObj);
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

  const handleDelete = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Delete Transaction',
        message: 'Are you sure you want to delete this transaction record? This action cannot be undone.',
        type: 'delete',
        data: id,
        inputValue: ''
    });
  };

  const openSignalModal = (userObj) => {
    setTargetUser(userObj);
    setIsSignalModalOpen(true);
  };

  const handleSendSignal = async () => {
    try {
        setLoading(true);
        const payload = {
            ...signalData,
            target_user_id: targetUser.id,
            timer_minutes: signalData.releaseMinutes || null
        };

        const created = await signalService.createSignal(payload);
        toast.success(`Signal sent successfully to ${targetUser.name}`);
        if (created.email?.error) toast.error(`Email not sent: ${created.email.error}`);
        else if (created.email?.sent) toast.success(`Email sent to ${targetUser.name}`);
        setIsSignalModalOpen(false);
    } catch (e) {
        console.error(e);
        toast.error(e.response?.data?.message || 'Failed to send signal');
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      dispatch(logout());
      router.push('/login');
    }
  };

  const deposits = useMemo(() => userTransactions.filter((t) => t.type === 'deposit'), [userTransactions]);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const sum = (list) => list.reduce((acc, t) => acc + Number(t.amount || 0), 0);
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

  const counts = useMemo(() => ({
    pending: summary.pendingCount,
    approved: summary.approvedCount,
    rejected: summary.rejectedCount,
    all: deposits.length,
  }), [summary, deposits.length]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deposits.filter((t) =>
      (filter === 'all' || statusKey(t.status) === filter) &&
      (!q || [t.User?.name, t.User?.email].some((v) => (v || '').toLowerCase().includes(q))));
  }, [deposits, filter, search]);

  const visibleRows = filteredRows.slice(0, visible);

  useEffect(() => { setVisible(PAGE_SIZE); }, [filter, search]);

  const openProof = async (tx) => {
    // Open the tab synchronously so the popup isn't blocked, then point it at the signed URL.
    const win = window.open('', '_blank');
    try {
      const url = await transactionService.getProofUrl(tx.proof_image);
      if (win) win.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      if (win) win.close();
      toast.error(e.response?.data?.message || 'Could not open proof');
    }
  };

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
          subtitle="Review payment proofs, approve deposits and send private signals"
          onMenu={toggleSidebar}
        />

        <div className="atx">
          {/* SUMMARY */}
          <section className="atx-kpis" aria-label="Deposit summary">
            <div className="atx-kpi atx-kpi--warn">
              <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
              <strong>{summary.pendingCount}</strong>
              <small>${money(summary.pendingAmount)} requested</small>
            </div>
            <div className="atx-kpi atx-kpi--ok">
              <span className="atx-kpi-label"><IconCheck size={15} /> Approved</span>
              <strong>${money(summary.approvedAmount)}</strong>
              <small>{summary.approvedCount} deposit{summary.approvedCount === 1 ? '' : 's'}</small>
            </div>
            <div className="atx-kpi">
              <span className="atx-kpi-label"><IconX size={15} /> Rejected</span>
              <strong>{summary.rejectedCount}</strong>
              <small>requests</small>
            </div>
            <div className="atx-kpi">
              <span className="atx-kpi-label"><IconTransactions size={15} /> Today</span>
              <strong>{summary.todayCount}</strong>
              <small>new request{summary.todayCount === 1 ? '' : 's'}</small>
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
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                    <span className="atx-tab-count">{counts[f.key]}</span>
                  </button>
                ))}
              </div>

              <label className="atx-search">
                <IconSearch size={16} />
                <input
                  type="search"
                  placeholder="Search name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search deposits"
                />
              </label>
            </div>

            {loading && deposits.length === 0 ? (
              <div className="atx-empty"><span className="btn-spinner dark" /> Loading deposits…</div>
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
                              {tx.status === 'pending' && (
                                <>
                                  <button type="button" className="atx-btn atx-btn--approve" onClick={() => handleApprove(tx.id)}>
                                    <IconCheck size={15} /> Approve
                                  </button>
                                  <button type="button" className="atx-btn atx-btn--reject" onClick={() => handleReject(tx.id)}>
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className="atx-icon-btn"
                                title="View payment proof"
                                aria-label="View payment proof"
                                disabled={!tx.proof_image}
                                onClick={() => openProof(tx)}
                              >
                                <IconImage size={16} />
                              </button>
                              <button
                                type="button"
                                className="atx-icon-btn"
                                title="Send private signal"
                                aria-label="Send private signal"
                                onClick={() => openSignalModal(tx.User ? { ...tx.User, id: tx.user_id } : { id: tx.user_id, name: memberName })}
                              >
                                <IconSend size={16} />
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

            {filteredRows.length > visibleRows.length && (
              <div className="atx-more">
                <button type="button" className="atx-btn" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Show more ({filteredRows.length - visibleRows.length} left)
                </button>
              </div>
            )}
          </section>
        </div>

        {/* SIGNAL MODAL */}
        {isSignalModalOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                <div className="modal-content" style={{ background: 'var(--t-surface)', padding: '2.5rem', borderRadius: '20px', color: 'var(--t-text)', width: '450px', border: '1px solid var(--t-accent)', boxShadow: '0 0 50px rgba(var(--t-accent-rgb), 0.2)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(var(--t-accent-rgb), 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <img src="/images/i (11).png" style={{ width: '30px', filter: 'invert(1)' }} alt="Signal" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--t-gold)' }}>Send Private Signal</h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Recipient: <strong>{targetUser?.name}</strong></p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Symbol</label>
                                <input style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '12px', borderRadius: '10px', outline: 'none' }} value={signalData.symbol} onChange={(e) => setSignalData({...signalData, symbol: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Signal Type</label>
                                <select style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '12px', borderRadius: '10px', outline: 'none' }} value={signalData.signal_type} onChange={(e) => setSignalData({...signalData, signal_type: e.target.value})}>
                                    <option value="premium">💎 Premium</option>
                                    <option value="free">🌐 Free</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Order Type</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setSignalData({...signalData, type: 'buy'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: signalData.type === 'buy' ? '2px solid #10b981' : '1px solid var(--t-input-border)', background: signalData.type === 'buy' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: signalData.type === 'buy' ? '#10b981' : 'var(--t-text)', cursor: 'pointer', fontWeight: 700 }}>BUY</button>
                                <button onClick={() => setSignalData({...signalData, type: 'sell'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: signalData.type === 'sell' ? '2px solid #ef4444' : '1px solid var(--t-input-border)', background: signalData.type === 'sell' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: signalData.type === 'sell' ? '#ef4444' : 'var(--t-text)', cursor: 'pointer', fontWeight: 700 }}>SELL</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', marginBottom: '4px', display: 'block' }}>Entry</label>
                                <input placeholder="1.234" style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '10px', borderRadius: '8px' }} value={signalData.entry_price} onChange={(e) => setSignalData({...signalData, entry_price: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', marginBottom: '4px', display: 'block' }}>TP</label>
                                <input placeholder="1.250" style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '10px', borderRadius: '8px' }} value={signalData.target_price} onChange={(e) => setSignalData({...signalData, target_price: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'var(--t-text-muted)', marginBottom: '4px', display: 'block' }}>SL</label>
                                <input placeholder="1.220" style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '10px', borderRadius: '8px' }} value={signalData.stop_loss} onChange={(e) => setSignalData({...signalData, stop_loss: e.target.value})} />
                            </div>
                        </div>


                        {getSignalLevelError(signalData) && (
                            <div role="alert" style={{ fontSize: '0.8rem', color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 10px' }}>
                                {getSignalLevelError(signalData)}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '15px', marginTop: '0.5rem' }}>
                            <button onClick={handleSendSignal} disabled={loading || !!getSignalLevelError(signalData)} style={{ opacity: getSignalLevelError(signalData) ? 0.5 : 1, flex: 2, background: 'var(--t-accent)', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, color: 'var(--t-on-accent)', fontSize: '1rem', transition: '0.3s' }}>
                                {loading ? <><span className="btn-spinner dark"></span>Sending...</> : 'Broadcast Signal'}
                            </button>
                            <button onClick={() => setIsSignalModalOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* CUSTOM CONFIRM/PROMPT MODAL */}
        {confirmModal.isOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: 'var(--t-surface)', padding: '2.5rem', borderRadius: '24px', color: 'var(--t-text)', width: '400px', border: '1px solid var(--tw-10)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: confirmModal.type === 'approve' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '24px' }}>{confirmModal.type === 'approve' ? '✅' : '❌'}</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{confirmModal.title}</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{confirmModal.message}</p>
                    </div>

                    {confirmModal.type === 'approve' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--t-text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Amount (USD)</label>
                            <input 
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                style={{ width: '100%', background: 'var(--t-surface-2)', border: '1px solid var(--t-input-border)', color: 'var(--t-text)', padding: '14px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, outline: 'none', textAlign: 'center' }} 
                                value={confirmModal.inputValue} 
                                onChange={(e) => setConfirmModal({...confirmModal, inputValue: e.target.value})}
                                autoFocus
                            />
                            {confirmModal.requestedAmount != null && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px', fontSize: '0.82rem', color: 'var(--t-text-muted)' }}>
                                    <span>Member says they sent: <strong style={{ color: 'var(--t-text)' }}>${Number(confirmModal.requestedAmount).toFixed(2)}</strong></span>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmModal({ ...confirmModal, inputValue: Number(confirmModal.requestedAmount).toFixed(2) })}
                                        style={{ background: 'transparent', border: '1px solid var(--tw-15)', color: 'var(--t-gold)', borderRadius: '8px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                                    >Use this</button>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={executeConfirmAction} 
                            disabled={isActionLoading}
                            style={{ flex: 2, background: confirmModal.type === 'approve' ? '#22c55e' : '#ef4444', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: 'var(--t-text)', fontSize: '1rem' }}
                        >
                            {isActionLoading ? <><span className="btn-spinner"></span>Processing...</> : (confirmModal.type === 'approve' ? 'Confirm Approval' : confirmModal.type === 'delete' ? 'Yes, Delete' : 'Yes, Reject')}
                        </button>
                        <button 
                            onClick={closeConfirmModal} 
                            style={{ flex: 1, background: 'var(--tw-05)', border: '1px solid var(--tw-10)', color: 'var(--t-text)', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Cancel
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
