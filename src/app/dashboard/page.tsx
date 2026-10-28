'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import signalService from '../../services/signalService';
import transactionService from '../../services/transactionService';
import { connectRealtime } from '../../services/realtimeService';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import {
  queryKeys, useAdminStats, useAdminUsers, useGlobalTimer, useMyTransactions,
  usePendingTransactions, useSignalHistory, useSignalsDashboard,
} from '@/hooks/queries';
import toast from 'react-hot-toast';
import { serverTimeOffset, updateServerTimeOffset } from '../../services/serverTime';
import ThemeToggle from '@/components/ThemeToggle';
import UserNavbar from '@/components/UserNavbar';
import { IconBroadcast, IconTrend, IconClock, IconWallet, IconUsers } from '@/components/admin/AdminIcons';
import '../../styles/memberDashboard.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminDashboardStats from '../../components/AdminDashboardStats';
import AdminUsersTable from '../../components/AdminUsersTable';
import Skeleton, { SkeletonRows } from '@/components/Skeleton';
import '../../styles/dashboard.css';
import { errorMessage } from '@/lib/supabaseClient';
import type { GlobalTimer, Notification, Signal, SignalHistoryItem } from '@/types';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import { basicTableFeatures, EMPTY_ROWS, listTableFeatures } from '@/lib/tables';

// TanStack Table columns. The search box matches the signal symbol; rows render their own markup.
const signalColumnHelper = createColumnHelper<typeof listTableFeatures, Signal>();
const signalColumns = signalColumnHelper.columns([
  signalColumnHelper.accessor('symbol', { id: 'search' }),
]);
const historyColumnHelper = createColumnHelper<typeof basicTableFeatures, SignalHistoryItem>();
const historyColumns = historyColumnHelper.columns([
  historyColumnHelper.accessor((h) => h.Signal?.symbol ?? '', { id: 'symbol' }),
]);

export default function Dashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, refresh: refreshUserProfile } = useCurrentUser();
  const handleLogout = useLogout();
  const isAdmin = !!user?.is_admin;
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
  
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deposit') === 'true') {
        setIsDepositModalOpen(true);
      }
    }
  }, []);
  
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) < 5) {
      toast.error('Minimum deposit amount is $5');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload a proof of payment screenshot');
      return;
    }
    
    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('amount', depositAmount);
        formData.append('payment_method', paymentMethod);
        formData.append('proof_image', screenshot);
        
        await transactionService.requestDeposit(formData);
        toast.success('Deposit request submitted successfully!');
        setIsDepositModalOpen(false);
        setDepositAmount('');
        setScreenshot(null);
        setScreenshotPreview(null);
        window.location.reload(); // Reload to show pending banner
    } catch (e) {
        console.error(e);
        const errorMsg = errorMessage(e, 'Failed to submit deposit request');
        toast.error(errorMsg);
    } finally {
        setIsSubmitting(false);
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  // Same label as DepositModal — deposits are USDT on the TRC20 network.
  const paymentMethod = 'USDT_TRC20';
  const [depositStep, setDepositStep] = useState(1); // 1: Info, 2: Payment Details
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);
  const [userNotification, setUserNotification] = useState<Notification | null>(null);
  const [signalBanner, setSignalBanner] = useState<Notification | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSignalAlertOpen, setIsSignalAlertOpen] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState<Partial<Signal> | null>(null);
  const [isGlobalTimerHidden, setIsGlobalTimerHidden] = useState(false);
  const [rejectedSignalIds, setRejectedSignalIds] = useState<number[]>([]);
  
  // Persist rejected signals
  useEffect(() => {
    const saved = localStorage.getItem('rejectedSignalIds');
    if (saved) {
      try { setRejectedSignalIds(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rejectedSignalIds', JSON.stringify(rejectedSignalIds));
  }, [rejectedSignalIds]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date(Date.now() + serverTimeOffset)), 1000); // Tick every 1s for real-time countdown
    return () => clearInterval(timer);
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setScreenshot(file);
        setScreenshotPreview(URL.createObjectURL(file));
    }
  };
  const proofInputRef = useRef<HTMLInputElement>(null);
  const clearScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (proofInputRef.current) proofInputRef.current.value = '';
  };
  const [isProofViewOpen, setIsProofViewOpen] = useState(false);
  const viewScreenshot = () => {
    if (screenshotPreview) setIsProofViewOpen(true);
  };
  // ---- Server data (TanStack Query) ----
  const signalsQuery = useSignalsDashboard(user?.id);
  const signals: Signal[] = signalsQuery.data?.active_signals ?? EMPTY_ROWS;
  const loading = signalsQuery.isPending;
  const signalHistoryQuery = useSignalHistory(user?.id, !!user && !isAdmin);
  const signalHistory: SignalHistoryItem[] = signalHistoryQuery.data ?? EMPTY_ROWS;
  const historyLoading = signalHistoryQuery.isPending;
  const adminStats = useAdminStats(isAdmin).data ?? null;
  const adminUsersQuery = useAdminUsers(isAdmin);
  const adminUsers = adminUsersQuery.data ?? [];
  const usersLoading = adminUsersQuery.isPending;
  const pendingDepositsQuery = usePendingTransactions(isAdmin);
  // A member's own deposit that is still waiting for review (shown in the activation notice).
  const myTransactions = useMyTransactions(user?.id, !!user && !isAdmin).data;
  const activePendingDeposit = myTransactions?.find((t) => t.type === 'deposit' && t.status === 'pending') ?? null;
  const globalTimerQuery = useGlobalTimer(user?.id);
  const globalTimer = globalTimerQuery.data?.expires_at ?? null;
  const requestStatus = globalTimerQuery.data?.requestStatus ?? null;
  const updateGlobalTimer = (patch: Partial<GlobalTimer>) =>
    queryClient.setQueryData<GlobalTimer>(queryKeys.globalTimer(user?.id), (old) => ({ expires_at: null, ...old, ...patch }));

  // Admin banner: a live "new deposit" message, otherwise how many deposits are waiting for approval.
  const [pendingNoticeDismissed, setPendingNoticeDismissed] = useState(false);
  const pendingCount = pendingDepositsQuery.data?.length ?? 0;
  const adminBanner = adminNotification
    ?? (!pendingNoticeDismissed && pendingCount > 0 ? `🔔 You have ${pendingCount} new deposit request(s) waiting for approval!` : null);
  const dismissAdminBanner = () => {
    setAdminNotification(null);
    setPendingNoticeDismissed(true);
  };

  // Member KPIs come from the signals this user has taken, not the platform-wide broadcast stats.
  const myWins = signalHistory.filter((h) => h.result === 'win').length;
  const myLosses = signalHistory.filter((h) => h.result === 'loss').length;
  const myKpi = {
    total: signalHistory.length,
    active: signalHistory.length - myWins - myLosses,
    rate: myWins + myLosses ? Math.round((100 * myWins) / (myWins + myLosses)) : 0,
  };
  const [addressCopied, setAddressCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const DEPOSIT_ADDRESS = 'TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV';
  const copyDepositAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEPOSIT_ADDRESS);
      setAddressCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please select and copy it manually.');
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const rowsPerPage = 6;

  useEffect(() => {
    if (!user) return;

    // Connect to Supabase Realtime
    const socket = connectRealtime(user);
    
    socket.on('connect', () => {
        console.log("Realtime connected");
        socket.emit('join', user.id);
        if (user.is_admin) {
            socket.emit('join_admin');
        }

    });

    socket.on('notification', (notif) => {
        
        console.log("New real-time notification:", notif);

        // If it's payment approval, refresh profile
        if (notif.type === 'payment_approval') {
            refreshUserProfile();
            toast.success(notif.message, { duration: 6000 });
        }

        if (notif.type === 'signal') {
            fetchSignals();
            setSignalBanner(notif);
            
            // Trigger the new Premium Alert Popup
            if (notif.signal) {
                setIncomingSignal(notif.signal);
                setIsSignalAlertOpen(true);
            }

            let toastMsg = '📈 ' + (notif.title || 'New Signal Available!');
            if (notif.signal?.release_at && new Date(notif.signal.release_at).getTime() > new Date().getTime()) {
                const mins = Math.max(1, Math.ceil((new Date(notif.signal.release_at).getTime() - new Date().getTime()) / 60000));
                toastMsg += ` (Unlocks in ${mins}m)`;
            }

            toast(toastMsg, {
                style: {
                    background: 'var(--primary)',
                    color: 'var(--t-on-accent)',
                    fontWeight: 700
                },
                duration: 6000
            });
        }

        // Show a temporary alert or badge
        setUserNotification(notif);
        setTimeout(() => setUserNotification(null), 10000); // Hide after 10s
    });

    socket.on('signal_timer_updated', (data) => {
        console.log("Timer updated for signal:", data.signal_id);
        fetchAllData(); // Refresh to get new timestamps
    });

    socket.on('global_timer_update', (data) => {
        console.log("Global timer update:", data);
        if (data.server_time) updateServerTimeOffset(data.server_time);
        updateGlobalTimer(data.expires_at
          ? { expires_at: data.expires_at }
          : { expires_at: null, requestStatus: null });
    });

    socket.on('admin_notification', (notif) => {
        if (user.is_admin) {
            console.log("New admin notification:", notif);
            setAdminNotification(`🔔 New Deposit Request! User #${notif.transaction.user_id} uploaded proof for $${notif.transaction.amount}`);

            // Refresh stats, badges and lists
            fetchAllData();
        }
    });

    return () => {
        socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_admin]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [signalIdToDelete, setSignalIdToDelete] = useState<number | null>(null);

  // Signals changed: reload the signal list, the member's history and the admin stats / members.
  const fetchSignals = () => {
    queryClient.invalidateQueries({ queryKey: ['signals'] });
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const confirmDelete = async () => {
    if (!signalIdToDelete) return;
    // Members only remove a signal from their own dashboard; deleting is admin-only.
    if (!user?.is_admin) {
        const id = signalIdToDelete;
        try {
            await signalService.hideSignal(id);
            setRejectedSignalIds(prev => [...prev, id]);
            fetchSignals(); // the hidden signal also drops out of the history
            toast.success("Signal removed from your list");
            setIsDeleteModalOpen(false);
            setSignalIdToDelete(null);
        } catch (error) {
            toast.error(errorMessage(error, "Failed to remove signal"));
        }
        return;
    }
    try {
        await signalService.deleteSignal(signalIdToDelete);
        toast.success("Signal removed");
        setIsDeleteModalOpen(false);
        setSignalIdToDelete(null);
        fetchSignals();
    } catch (error) {
        toast.error("Failed to remove signal");
    }
  };

  const handleDeleteSignal = (id: number) => {
    setSignalIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Reload everything shown on this page (profile, signals, deposits, countdown, admin stats).
  const fetchAllData = () => {
    refreshUserProfile();
    queryClient.invalidateQueries({ queryKey: ['signals'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['globalTimer'] });
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  useEffect(() => {
    // The queries load themselves; just make sure the wallet balance is fresh.
    refreshUserProfile();
    document.body.classList.add('dashboard-body');

    // Realtime handles instant updates; this is just a safety-net refresh,
    // skipped while the tab is in the background.
    const interval = setInterval(() => {
      if (!document.hidden) fetchAllData();
    }, 60000);

    return () => {
        document.body.classList.remove('dashboard-body');
        clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [signalToTake, setSignalToTake] = useState<Partial<Signal> | null>(null);
  const [isTakeSignalModalOpen, setIsTakeSignalModalOpen] = useState(false);

  const formatCountdown = (releaseAt: string | null | undefined) => {
    const totalSeconds = Math.max(0, Math.floor((new Date(releaseAt || 0).getTime() - currentTime.getTime()) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTakeSignal = async (signal: Partial<Signal>) => {
    if (!user?.is_active && !user?.is_admin) {
        toast.error('Your account is not active for signals. Please complete a deposit and wait for admin approval.');
        setIsDepositModalOpen(true);
        return;
    }
    setIsGlobalTimerHidden(true); // Hide global timer as the user is now interacting with a live signal
    setSignalToTake(signal);
    setIsTakeSignalModalOpen(true);
  };

  const confirmTakeSignal = async () => {
    if (!signalToTake || signalToTake.id == null || !user) return;
    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.id || user.user_id,
        signal_id: signalToTake.id,
        taken_price: signalToTake.entry_price,
        invested_amount: 1.0,
      };
      const response = await signalService.takeSignal(payload);
      toast.success(response.message || "Signal taken successfully!");
      setIsTakeSignalModalOpen(false);
      fetchSignals();
      refreshUserProfile(); // wallet balance / free credits changed
    } catch (error) {
      toast.error(errorMessage(error, "Error taking signal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async () => {
      try {
          setIsSubmitting(true);
          const response = await signalService.requestSignalAccess();
          toast.success(response.message);
          updateGlobalTimer({ requestStatus: 'pending' });
      } catch (e) {
          toast.error(errorMessage(e, "Failed to send request"));
      } finally {
          setIsSubmitting(false);
      }
  };

  const getSymbolIcon = (symbol: string = '') => {
    if (symbol.includes('XAU')) return '/images/div (13).png';
    if (symbol.includes('XAG')) return '/images/div (14).png';
    return '/images/div (15).png';
  };

  const getSymbolName = (symbol: string = '') => {
    if (symbol.includes('XAU')) return 'Gold';
    if (symbol.includes('XAG')) return 'Silver';
    return 'Forex';
  };

  const getTypeIcon = (type: string = '') => {
    return type.toLowerCase() === 'buy' ? '/images/i (11).png' : '/images/svg (18).png';
  };

  // Live signals table (TanStack Table): hidden signals are left out, the symbol search is the
  // global filter, and the table pages the rows (rowsPerPage per page).
  const listedSignals = useMemo(
    () => signals.filter((s) => !rejectedSignalIds.includes(s.id)),
    [signals, rejectedSignalIds],
  );
  const signalsTable = useTable({
    features: listTableFeatures,
    columns: signalColumns,
    data: listedSignals,
    getRowId: (s) => String(s.id),
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageIndex: 0, pageSize: rowsPerPage } },
    state: { globalFilter: searchTerm },
  });
  const filteredSignals = signalsTable.getFilteredRowModel().rows;
  const currentSignals = signalsTable.getRowModel().rows.map((row) => row.original);
  const totalPages = signalsTable.getPageCount();
  const currentPage = signalsTable.state.pagination.pageIndex + 1;
  const startIndex = signalsTable.state.pagination.pageIndex * rowsPerPage;

  // "My Purchased Signals" table — rendered from the table's row model.
  const historyTable = useTable({
    features: basicTableFeatures,
    columns: historyColumns,
    data: signalHistory,
    getRowId: (h) => String(h.id),
  });
  const historyRows = historyTable.getRowModel().rows.map((row) => row.original);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Admins get the unified admin shell (sidebar) instead of the user top-navbar.
  if (mounted && user?.is_admin) {
    return (
      <div className="admin-layout">
        <AdminSidebar
          active="dashboard"
          user={user}
          pendingDeposits={adminStats?.pending_deposits || 0}
          onLogout={handleLogout}
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
        />

        {isMenuOpen && <div className="admin-backdrop" onClick={() => setIsMenuOpen(false)}></div>}

        <main className="admin-main-content">
          <AdminHeader
            title="Admin Dashboard"
            subtitle="Platform overview, money and members at a glance"
            onMenu={toggleMenu}
          >
            <button type="button" className="adb-new" onClick={() => router.push('/admin/signals')}>+ New signal</button>
          </AdminHeader>

          <div className="atx">
            {adminBanner && (
              <div className="adb-alert" role="status">
                <span className="adb-alert-dot" aria-hidden="true" />
                <span>{adminBanner}</span>
                <button type="button" className="adb-alert-btn" onClick={() => router.push('/transaction')}>Review now</button>
                <button type="button" className="adb-alert-close" onClick={dismissAdminBanner} aria-label="Dismiss">✕</button>
              </div>
            )}

            <AdminDashboardStats adminStats={adminStats} onNav={(p) => router.push(p)} />
            <AdminUsersTable users={adminUsers} loading={usersLoading} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="db-main-layout">
      <UserNavbar active="signals" user={mounted ? user : null} onLogout={handleLogout} />

      {/* NOTIFICATION BARS */}
      {mounted && user?.is_admin && adminBanner && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid #ef4444', padding: '10px 1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>{adminBanner}</span>
            <button onClick={() => router.push('/transaction')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Review Now</button>
            <button onClick={dismissAdminBanner} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {mounted && !user?.is_admin && userNotification && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderBottom: '1px solid #22c55e', padding: '10px 1rem', color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>{userNotification.message || (typeof userNotification === 'string' ? userNotification : 'New Update Available!')}</span>
            <button onClick={() => setUserNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {mounted && !user?.is_admin && signalBanner && (
        <div style={{ background: 'rgba(var(--t-accent-rgb), 0.15)', borderBottom: '2px solid var(--t-accent)', padding: '12px 1rem', color: 'var(--t-gold)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', zIndex: 1100, position: 'relative' }}>
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📈</span> 
                {signalBanner.title}: {signalBanner.message}
                {signalBanner.signal?.release_at && new Date(signalBanner.signal.release_at).getTime() > currentTime.getTime() && (
                  <span style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '6px', marginLeft: '10px', border: '1px solid var(--t-accent)', display: 'inline-flex', alignItems: 'center', gap: '5px', animation: 'pulse 2s infinite' }}>
                    <span style={{ fontSize: '1.1rem' }}>⌛</span>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>{formatCountdown(signalBanner.signal.release_at)}</span>
                  </span>
                )}
            </span>
            <button 
                onClick={() => {
                    setSignalBanner(null);
                    const tableElement = document.querySelector('.table-box');
                    if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
                }} 
                style={{ 
                    background: 'var(--btn-primary)', 
                    color: 'var(--t-on-accent)', 
                    border: 'none', 
                    padding: '5px 15px', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontSize: '0.8rem', 
                    fontWeight: 700 
                }}
            >
                View Details
            </button>
            <button onClick={() => setSignalBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--t-gold)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
      )}

      {/*  MAIN  */}
      <div className="db-container">
        <div className="db-top-bar">
          <div>
            <h1 className="db-page-title">Trading Signals</h1>
            <p className="db-subtitle">Real-time signals for Gold, Silver, Forex and Crypto markets</p>
          </div>

          <div className="right-actions">
            {mounted && !user?.is_admin && globalTimer && !isGlobalTimerHidden && (
              <div className="gtm-chip">
                <span>Next signal in</span>
                <b>{formatCountdown(globalTimer)}</b>
                {!requestStatus && (
                  <button type="button" className="gtm-chip-btn" onClick={handleRequestAccess} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending…' : 'Request access'}
                  </button>
                )}
                {requestStatus && requestStatus !== 'pending' && <span className="gtm-chip-ok">✓ Access</span>}
              </div>
            )}
            {mounted && !user?.is_admin && (
                <button className="deposit" onClick={() => setIsDepositModalOpen(true)}>Deposit</button>
            )}
            {mounted && user?.is_admin && (
              <button className="deposit" onClick={() => router.push('/admin/signals')}>+ New Signal</button>
            )}
          </div>
        </div>


        {/* INACTIVE NOTICE */}
        {mounted && !user?.is_admin && !user?.is_active && (
            <div style={{ 
                background: 'rgba(234, 179, 8, 0.1)', 
                border: '1px solid #eab308', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{ fontSize: '2rem' }}>⚠️</div>
                <div>
                    <h3 style={{ color: '#eab308', marginBottom: '4px' }}>Account Activation Required</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        To receive and take signals, you must have an active deposit. 
                        {activePendingDeposit ? " Your deposit is currently being reviewed." : " Please make a deposit to activate your account."}
                    </p>
                </div>
                {!activePendingDeposit && (
                    <button 
                        onClick={() => setIsDepositModalOpen(true)}
                        style={{ marginLeft: 'auto', background: 'var(--btn-primary)', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >Activate Now</button>
                )}
            </div>
        )}

        {/* DEPOSIT MODAL */}
        {isDepositModalOpen && (
          <div className="modal-overlay" onClick={() => { setIsDepositModalOpen(false); setScreenshotPreview(null); }}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => { setIsDepositModalOpen(false); setScreenshotPreview(null); }}>✕</button>
              
              <h2 className="modal-title">Deposit Funds</h2>
              <p className="modal-desc">Transfer USDT and upload payment proof below.</p>

              {/* Binance Address Instruction */}
              <div style={{ background: 'var(--tw-03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Send USDT to this <strong>Binance</strong> address:</p>
                    {/* / {transactionCount % 4 === 3 ? "TNK1ngQW59zsu5iHntaGKiuUJ9PmSYJYtS" : "TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV"} */}
                    <div
                      onClick={copyDepositAddress}
                      title="Click to copy"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--t-bg)', padding: '10px 10px 10px 14px', borderRadius: '8px', border: '1px dashed var(--primary)', marginBottom: '0.75rem', cursor: 'pointer' }}
                    >
                      <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all', fontSize: '0.9rem', fontWeight: 600, color: 'var(--t-text)', textAlign: 'left', userSelect: 'all' }}>
                        {DEPOSIT_ADDRESS}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyDepositAddress(); }}
                        style={{ flexShrink: 0, background: addressCopied ? '#22c55e' : 'var(--btn-primary)', color: addressCopied ? '#fff' : '#111', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        {addressCopied ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Network: <strong>TRC20</strong></span>
                        <span>•</span>
                        <span>Asset: <strong>USDT</strong></span>
                    </div>
                </div>
              </div>

              <div className="amount-input-group" style={{ marginBottom: '1rem' }}>
                <label>Amount Sent (USDT)</label>
                <input 
                    type="number" 
                    className="amount-input" 
                    placeholder="Min $5"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{ fontSize: '0.85rem', padding: '12px' }}
                />
              </div>

              {/* Proof Upload */}
              <div className="amount-input-group">
                <label>Upload Payment Proof (Screenshot)</label>
                <input 
                    type="file"
                    ref={proofInputRef}
                    accept="image/*"
                    className="amount-input"
                    style={{ fontSize: '0.85rem', padding: '12px' }}
                    onChange={handleFileChange}
                />
                {screenshotPreview && (
                  <div style={{ marginTop: '1rem', textAlign: 'center', position: 'relative' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Preview:</p>
                    <img
                      src={screenshotPreview}
                      alt="Proof Preview"
                      style={{
                        height: '140px',
                        width: 'auto',
                        borderRadius: '12px',
                        border: '2px solid var(--primary)',
                        padding: '4px',
                        background: 'rgba(0,0,0,0.5)'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.6rem' }}>
                      <button
                        type="button"
                        onClick={viewScreenshot}
                        style={{ background: 'var(--btn-primary)', color: '#111', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                      >View</button>
                      <button
                        type="button"
                        onClick={clearScreenshot}
                        aria-label="Remove screenshot"
                        title="Remove screenshot"
                        style={{ background: 'var(--tw-05)', color: 'var(--text-main, #111)', border: '1px solid var(--border-color)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                className="btn-deposit" 
                onClick={handleDeposit}
                disabled={isSubmitting || !screenshot}
              >
                {isSubmitting ? <><span className="btn-spinner dark"></span>Processing...</> : 'I Have Paid'}
              </button>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem' }}>
                ⭐ Super Admin will verify and credit your wallet shortly.
              </p>
            </div>
          </div>
        )}

        {isProofViewOpen && screenshotPreview && (
          <div
            onClick={() => setIsProofViewOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }}
          >
            <button
              type="button"
              onClick={() => setIsProofViewOpen(false)}
              aria-label="Close image"
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >✕</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotPreview}
              alt="Proof full view"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }}
            />
          </div>
        )}

        {mounted && user?.is_admin ? (
            <AdminDashboardStats adminStats={adminStats} onNav={(p) => router.push(p)} />
        ) : (
            <div className="db-content-flex-wrapper">
                <div className="db-main-content-column" style={{ flex: 1, minWidth: 0 }}>
                    {/* KPI ROW */}
                    <section className="mdb-kpis" aria-label="Your overview">
                        <div className="mdb-kpi">
                            <span className="mdb-kpi-icon"><IconBroadcast size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Total signals</span>
                                <strong>{historyLoading ? <Skeleton width={44} height={24} radius={8} /> : myKpi.total}</strong>
                            </div>
                        </div>
                        <div className="mdb-kpi">
                            <span className="mdb-kpi-icon mdb-kpi-icon--green"><IconTrend size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Hit target</span>
                                <strong>{historyLoading ? <Skeleton width={56} height={24} radius={8} /> : `${myKpi.rate}%`}</strong>
                            </div>
                        </div>
                        <div className="mdb-kpi">
                            <span className="mdb-kpi-icon mdb-kpi-icon--live"><IconClock size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Active now</span>
                                <strong>{historyLoading ? <Skeleton width={44} height={24} radius={8} /> : myKpi.active}</strong>
                            </div>
                        </div>
                        <button type="button" className="mdb-kpi mdb-kpi--wallet" onClick={() => router.push('/wallet')}>
                            <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconWallet size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Wallet balance</span>
                                <strong>${mounted ? Number(user?.wallet_balance || 0).toFixed(2) : '0.00'}</strong>
                                {mounted && (user && user.free_signals > 0) && (
                                    <small>🎁 {user.free_signals} free signal{user.free_signals > 1 ? 's' : ''}</small>
                                )}
                            </div>
                        </button>
                    </section>

                    {/* REFER & EARN */}
                    <section className="mdb-refer">
                        <div className="mdb-refer-main">
                            <div className="mdb-refer-head">
                                <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconUsers size={18} /></span>
                                <div>
                                    <h3>Refer &amp; Earn</h3>
                                    <p>Earn <strong>30%</strong> commission on every deposit your friends make.</p>
                                </div>
                            </div>
                            <div className="mdb-refer-link">
                                <input
                                    readOnly
                                    aria-label="Your referral link"
                                    value={mounted ? `${window.location.origin.includes('localhost') ? 'https://www.asianfxsignals.com' : window.location.origin}/register?ref=${user?.referral_code || ''}` : ''}
                                    onFocus={(e) => e.target.select()}
                                />
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const baseUrl = window.location.origin.includes('localhost') ? 'https://www.asianfxsignals.com' : window.location.origin;
                                        try {
                                            await navigator.clipboard.writeText(`${baseUrl}/register?ref=${user?.referral_code}`);
                                            setLinkCopied(true);
                                            toast.success('Link copied!');
                                            setTimeout(() => setLinkCopied(false), 2000);
                                        } catch {
                                            toast.error('Could not copy — please select and copy it manually.');
                                        }
                                    }}
                                    style={linkCopied ? { background: '#22c55e', color: '#fff' } : undefined}
                                >{linkCopied ? 'Copied ✓' : 'Copy link'}</button>
                            </div>
                        </div>

                        <div className="mdb-refer-stats">
                            <div>
                                <span>Referrals</span>
                                <strong>{mounted ? (user?.referral_count || 0) : 0}</strong>
                            </div>
                            <div>
                                <span>Their deposits</span>
                                <strong>${mounted ? Number(user?.total_referral_deposits || 0).toFixed(2) : '0.00'}</strong>
                            </div>
                            <div className="mdb-refer-commission">
                                <span>Your commission</span>
                                <strong>${mounted ? Number(user?.affiliate_balance || 0).toFixed(2) : '0.00'}</strong>
                                <button type="button" onClick={() => toast.error('Minimum withdrawal is $10')}>Withdraw</button>
                            </div>
                        </div>
                    </section>

                    <div className="mdb-section-head">
                        <h2>Live signals</h2>
                        <span>Take a signal to unlock its Entry, Take Profit &amp; Stop Loss — then place the trade yourself in your own broker account.</span>
                    </div>

                    {/*  TABLE - only for normal users */}
                    {!user?.is_admin && (
                        <div className="table-box">
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Type</th>
                                            <th>Entry</th>
                                            <th>Target</th>
                                            <th>Stop Loss</th>
                                            <th>Status</th>
                                            <th>Time</th>
                                            <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <SkeletonRows rows={4} cols={8} />
                                        ) : currentSignals.length === 0 ? (
                                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                                                {user?.is_active && (Number(user?.wallet_balance || 0) >= 1 || Number(user?.free_signals || 0) > 0)
                                                    ? 'No active signals found.'
                                                    : <>Signals are sent only to members with balance in their wallet.{' '}
                                                        <button type="button" onClick={() => setIsDepositModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--t-gold)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}>Deposit now</button>{' '}
                                                        to start receiving signals.</>}
                                            </td></tr>
                                        ) : (
                                            currentSignals.map((signal, index) => (
                                                <tr key={signal.id || index} className="sig-row">
                                                    <td className="sig-cell-symbol">
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <img src={getSymbolIcon(signal.symbol)} style={{ width: "42px", height: "42px" }} alt={signal.symbol} />
                                                            <div>
                                                                <div style={{ fontWeight: "600" }}>{signal.symbol}</div>
                                                                <div style={{ fontSize: "12px", color: "var(--t-text-muted)", marginTop: "2px" }}>{getSymbolName(signal.symbol)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="sig-cell-type">
                                                        <span className={signal.type.toLowerCase()}>
                                                            <img src={getTypeIcon(signal.type)} alt={signal.type} />
                                                            {signal.type}
                                                        </span>
                                                    </td>
                                                    {signal.entry_price == null ? (
                                                        <td colSpan={3} className="sig-cell-locked" style={{ color: 'var(--t-text-muted)', fontSize: '0.85rem' }}>
                                                            🔒 Take this signal to unlock Entry, TP &amp; SL
                                                        </td>
                                                    ) : (
                                                        <>
                                                            <td className="sig-cell-level" data-label="Entry">{signal.entry_price}</td>
                                                            <td className="green sig-cell-level" data-label="Target">{signal.target_price}</td>
                                                            <td className="red sig-cell-level" data-label="Stop loss">{signal.stop_loss}</td>
                                                        </>
                                                    )}
                                                    <td className="sig-cell-status">
                                                        <span className={`db-badge status ${signal.status.toLowerCase().includes('hit') ? 'hit' : signal.status.toLowerCase().includes('stop') ? 'loss' : signal.status.toLowerCase().includes('closed') ? 'close' : 'active'}`}>
                                                            {signal.status}
                                                        </span>
                                                    </td>
                                                    <td className="time sig-cell-time">
                                                        {signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() 
                                                            ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>Release In</span>
                                                                    <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>{formatCountdown(signal.release_at)}</span>
                                                                </div>
                                                            )
                                                            : new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        }
                                                    </td>
                                                    <td className="Action">
                                                        {(() => {
                                                            const owned = signal.purchased || signalHistory.some(h => h.signal_id === signal.id);
                                                            const locked = signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime();
                                                            const canHide = true; // admin: delete · member: remove from own list
                                                            return (
                                                                <div className="sig-actions">
                                                                    {owned ? (
                                                                        <span className="sig-owned">✓ Purchased</span>
                                                                    ) : locked ? (
                                                                        <button
                                                                            type="button"
                                                                            className="sig-btn sig-btn--locked"
                                                                            title="This signal unlocks when the countdown ends"
                                                                            onClick={() => toast.error(`This signal is locked. Please wait ${formatCountdown(signal.release_at)} more.`)}
                                                                        >
                                                                            🔒 {formatCountdown(signal.release_at)}
                                                                        </button>
                                                                    ) : (
                                                                        <button type="button" className="sig-btn sig-btn--take" onClick={() => handleTakeSignal(signal)}>
                                                                            Take · {(user && user.free_signals > 0) ? 'FREE' : '$1'}
                                                                        </button>
                                                                    )}
                                                                    {canHide && (
                                                                        <button
                                                                            type="button"
                                                                            className="sig-hide"
                                                                            onClick={() => handleDeleteSignal(signal.id)}
                                                                            title={user?.is_admin ? 'Delete signal' : 'Hide from my list'}
                                                                            aria-label={user?.is_admin ? 'Delete signal' : 'Hide from my list'}
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="table-footer">
                                <div className="showing-text">
                                    Showing {filteredSignals.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + rowsPerPage, filteredSignals.length)} of {filteredSignals.length} signals
                                </div>
                                <div className="pagination">
                                    <button className="page-btn prev" onClick={() => signalsTable.previousPage()} disabled={!signalsTable.getCanPreviousPage()}>‹</button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button key={i + 1} className={`page-number ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => signalsTable.setPageIndex(i)}>{i + 1}</button>
                                    ))}
                                    <button className="page-btn next" onClick={() => signalsTable.nextPage()} disabled={!signalsTable.getCanNextPage()}>›</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MY PURCHASED SIGNALS SECTION */}
                    {!user?.is_admin && signalHistory.length > 0 && (
                        <div className="table-box" style={{ marginTop: '2.5rem' }}>
                            <h3 style={{ padding: '1.5rem', margin: 0, color: 'var(--t-text)', borderBottom: '1px solid var(--tw-05)' }}>My Purchased Signals</h3>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Symbol</th>
                                            <th>Type</th>
                                            <th>Taken Price</th>
                                            <th>Invested</th>
                                            <th>Result</th>
                                            <th>Date</th>
                                            <th style={{ textAlign: 'right' }} aria-label="Remove"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyRows.map((history, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <img src={getSymbolIcon(history.Signal?.symbol || '')} style={{ width: "32px", height: "32px" }} alt={history.Signal?.symbol ?? ''} />
                                                        <div style={{ fontWeight: "600" }}>{history.Signal?.symbol}</div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={history.Signal?.type?.toLowerCase() || ''}>
                                                        {history.Signal?.type}
                                                    </span>
                                                </td>
                                                <td>{history.taken_price}</td>
                                                <td>${history.invested_amount}</td>
                                                <td>
                                                    <span className={`db-badge status ${history.result === 'win' ? 'hit' : history.result === 'loss' ? 'loss' : 'active'}`}>
                                                        {history.result === 'win' ? 'Profit' : history.result === 'loss' ? 'Loss' : history.result}
                                                    </span>
                                                </td>
                                                <td className="time">{new Date(history.taken_at).toLocaleDateString()}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {history.signal_id && (
                                                        <button
                                                            type="button"
                                                            className="sig-hide"
                                                            onClick={() => { if (history.signal_id != null) handleDeleteSignal(history.signal_id); }}
                                                            title="Remove from my list"
                                                            aria-label="Remove from my list"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        )}

        {/* TAKE SIGNAL CONFIRMATION MODAL */}
        {isTakeSignalModalOpen && signalToTake && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: 'var(--t-surface)', padding: '2.5rem', borderRadius: '24px', color: 'var(--t-text)', width: '400px', border: '1px solid var(--tw-10)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(var(--t-accent-rgb), 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <img src={getSymbolIcon(signalToTake.symbol)} style={{ width: '32px' }} alt="Symbol" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Signal</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Are you sure you want to take <strong>{signalToTake.symbol}</strong> signal?
                        </p>
                    </div>

                    <div style={{ background: 'var(--tw-03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--tw-05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--t-text-dim)' }}>Entry / TP / SL</span>
                            <span style={{ fontWeight: 700 }}>
                                {signalToTake.entry_price == null
                                    ? '🔒 Unlocked after you take it'
                                    : signalToTake.entry_price + ' / ' + signalToTake.target_price + ' / ' + signalToTake.stop_loss}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--t-text-dim)' }}>Signal Fee</span>
                            <span style={{ fontWeight: 700, color: 'var(--t-gold)' }}>
                                {(user && user.free_signals > 0) ? `FREE (${user.free_signals} credit${user.free_signals > 1 ? 's' : ''})` : '$1.00'}
                            </span>
                        </div>
                    </div>

                    <p style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--t-text-muted)', background: 'rgba(var(--t-accent-rgb), 0.08)', border: '1px solid rgba(var(--t-accent-rgb), 0.3)', borderRadius: '12px', padding: '10px 12px', marginBottom: '1.25rem', textAlign: 'left' }}>
                        <span aria-hidden="true">ℹ️</span>
                        <span><strong style={{ color: 'var(--t-text)' }}>You trade on your own behalf.</strong> Taking a signal unlocks its levels — you then open and manage the trade yourself in your own broker account.</span>
                    </p>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={confirmTakeSignal} 
                            disabled={isSubmitting}
                            style={{ flex: 2, background: 'var(--btn-primary)', border: 'none', padding: '14px', borderRadius: '12px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontWeight: 700, color: 'var(--t-on-accent)', fontSize: '1rem' }}
                        >
                            {isSubmitting ? 'Processing...' : 'Take Signal'}
                        </button>
                        <button 
                            className="btn-cancel" onClick={() => setIsTakeSignalModalOpen(false)} 
                            style={{ flex: 1, background: 'var(--tw-05)', border: '1px solid var(--tw-10)', color: 'var(--t-text)', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {isDeleteModalOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: 'var(--t-surface)', padding: '2.5rem', borderRadius: '24px', color: 'var(--t-text)', width: '400px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '2.5rem', color: '#ef4444' }}>⚠️</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{user?.is_admin ? 'Delete Signal?' : 'Remove Signal?'}</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>{user?.is_admin ? 'Are you sure you want to remove this signal? This action cannot be undone.' : 'This removes the signal from your dashboard. It will not come back.'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            className="btn-cancel" onClick={() => { setIsDeleteModalOpen(false); setSignalIdToDelete(null); }}
                            style={{ flex: 1, background: 'var(--tw-05)', color: 'var(--t-text)', border: '1px solid var(--tw-10)', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
                        >Cancel</button>
                        <button 
                            onClick={confirmDelete}
                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}
                        >{user?.is_admin ? 'Yes, Delete' : 'Yes, Remove'}</button>
                    </div>
                </div>
            </div>
        )}

        {/* PREMIUM SIGNAL ALERT POPUP */}
        {isSignalAlertOpen && incomingSignal && (
            <div className="nsa-overlay" onClick={() => setIsSignalAlertOpen(false)}>
                {(() => {
                    const side = (incomingSignal.type || '').toLowerCase() === 'sell' ? 'sell' : 'buy';
                    const lockedUntil = incomingSignal.release_at && new Date(incomingSignal.release_at) > currentTime
                        ? incomingSignal.release_at : null;
                    const isFree = !!user && user.free_signals > 0;
                    const lockIcon = (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                    );
                    return (
                        <div className="nsa-card" role="dialog" aria-modal="true" aria-labelledby="nsa-title" onClick={(e) => e.stopPropagation()}>
                            <div className="nsa-head">
                                <span className="nsa-badge"><i aria-hidden="true" /> New signal</span>
                                {/* Close without rejecting — the signal stays available on the dashboard */}
                                <button type="button" className="nsa-close" onClick={() => setIsSignalAlertOpen(false)} aria-label="Close alert" title="Close">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="nsa-pair">
                                <span className="nsa-pair-icon">
                                    <img src={getSymbolIcon(incomingSignal.symbol)} alt="" />
                                </span>
                                <div className="nsa-pair-text">
                                    <h2 id="nsa-title">{incomingSignal.symbol}</h2>
                                    <small>{getSymbolName(incomingSignal.symbol)}</small>
                                </div>
                                <span className={`nsa-side nsa-side--${side}`}>{side.toUpperCase()}</span>
                            </div>

                            <div className="nsa-levels">
                                {[['Entry', incomingSignal.entry_price], ['Take profit', incomingSignal.target_price], ['Stop loss', incomingSignal.stop_loss]].map(([label, value]) => (
                                    <div key={String(label)}>
                                        <small>{label}</small>
                                        {value != null ? <b>{value}</b> : <b className="nsa-locked">{lockIcon} Locked</b>}
                                    </div>
                                ))}
                            </div>

                            <p className="nsa-note">
                                {lockedUntil
                                    ? <>Unlocks in <b>{formatCountdown(lockedUntil)}</b>. Take it now to see the levels the moment it opens.</>
                                    : <>Take this signal to unlock Entry, Take Profit and Stop Loss, then place the trade in your own broker account.</>}
                            </p>

                            <button
                                type="button"
                                className="nsa-take"
                                onClick={() => {
                                    setIsSignalAlertOpen(false);
                                    setIsGlobalTimerHidden(true); // Hide the global timer banner for this user
                                    handleTakeSignal(incomingSignal);
                                }}
                            >
                                Take signal · {isFree ? 'FREE' : '$1'}
                            </button>

                            <p className="nsa-foot">You can still find this signal on your dashboard.</p>
                        </div>
                    );
                })()}
            </div>
        )}
      </div>
    </div>
  );
}
