'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import signalService from '../../services/signalService';
import authService from '../../services/authService';
import { logout } from '../../redux/slices/authSlice';
import transactionService from '../../services/transactionService';
import notificationService from '../../services/notificationService';
import { setUser } from '../../redux/slices/authSlice';
import { connectRealtime } from '../../services/realtimeService';
import toast from 'react-hot-toast';
import { serverTimeOffset, updateServerTimeOffset } from '../../services/serverTime';
import ThemeToggle from '@/components/ThemeToggle';
import UserNavbar from '@/components/UserNavbar';
import { IconBroadcast, IconTrend, IconClock, IconWallet, IconUsers } from '@/components/admin/AdminIcons';
import '../../styles/memberDashboard.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminDashboardStats from '../../components/AdminDashboardStats';
import AdminUsersTable from '../../components/AdminUsersTable';
import '../../styles/dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);
  
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
        const errorMsg = e.response?.data?.message || 'Failed to submit deposit request';
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
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotification, setAdminNotification] = useState(null);
  const [userNotification, setUserNotification] = useState(null);
  const [signalBanner, setSignalBanner] = useState(null);
  const [activePendingDeposit, setActivePendingDeposit] = useState(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [globalTimer, setGlobalTimer] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [isSignalAlertOpen, setIsSignalAlertOpen] = useState(false);
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [isGlobalTimerHidden, setIsGlobalTimerHidden] = useState(false);
  const [rejectedSignalIds, setRejectedSignalIds] = useState([]);
  
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
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setScreenshot(file);
        setScreenshotPreview(URL.createObjectURL(file));
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [signals, setSignals] = useState([]);
  const [signalHistory, setSignalHistory] = useState([]);
  const [stats, setStats] = useState({ active_signals: 0, success_rate: 0, total_signals: 0, total_users: 0, platform_balance: '0', pending_deposits: 0 });
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const rowsPerPage = 6;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
      try {
          const data = await notificationService.getMyNotifications();
          setNotifications(data || []);
          setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (e) {
          console.error("Failed to fetch notifications", e);
      }
  };

  useEffect(() => {
    if (!user) return;

    // Connect to Supabase Realtime
    const socket = connectRealtime(user);
    
    socket.on('connect', () => {
        console.log("Socket connected:", socket.id);
        socket.emit('join', user.id);
        if (user.is_admin) {
            socket.emit('join_admin');
        }

    });

    socket.on('notification', (notif) => {
        
        console.log("New real-time notification:", notif);
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        
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
        setGlobalTimer(data.expires_at);
        if (!data.expires_at) setRequestStatus(null);
    });

    socket.on('admin_notification', (notif) => {
        if (user.is_admin) {
            console.log("New admin notification:", notif);
            setAdminNotification(`🔔 New Deposit Request! User #${notif.transaction.user_id} uploaded proof for $${notif.transaction.amount}`);
            
            // Instantly update the stats for the banner
            setAdminStats(prev => ({
                ...prev,
                pending_deposits: (prev?.pending_deposits || 0) + 1
            }));
            
            // Also trigger a full refresh to be sure
            fetchAllData();
        }
    });

    fetchNotifications();

    return () => {
        socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [signalIdToDelete, setSignalIdToDelete] = useState(null);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const data = await signalService.getSignalsDashboard();
      setSignals(data.active_signals || []);
      setStats(prev => ({ ...prev, ...data.stats }));
      
      if (user && !user.is_admin) {
          try {
              const historyData = await signalService.getUserSignalHistory(user.id || user.user_id);
              setSignalHistory(historyData || []);
          } catch (e) {
              console.error("Failed to fetch signal history", e);
          }
      }

      if (user?.is_admin) {
        const aStats = await transactionService.getAdminStats();
        setAdminStats(aStats);

        try {
          setUsersLoading(true);
          const usersList = await transactionService.getAllUsers();
          setAdminUsers(Array.isArray(usersList) ? usersList : []);
        } catch (e) {
          console.error("Failed to fetch users list", e);
        } finally {
          setUsersLoading(false);
        }
      }
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!signalIdToDelete) return;
    // Members only hide a signal from their own list; deleting is admin-only.
    if (!user?.is_admin) {
        setRejectedSignalIds(prev => [...prev, signalIdToDelete]);
        toast.success("Signal hidden");
        setIsDeleteModalOpen(false);
        setSignalIdToDelete(null);
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

  const handleDeleteSignal = (id) => {
    setSignalIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const fetchAllData = async () => {
    setLoading(true);
    await refreshUserProfile();
    await fetchSignals();
    await fetchNotifications();
    await checkPendingDeposit();
    
    // Fetch Global Timer
    try {
        const timerData = await signalService.getGlobalTimer();
        if (timerData.server_time) updateServerTimeOffset(timerData.server_time);
        setGlobalTimer(timerData.expires_at);
        setRequestStatus(timerData.requestStatus);
    } catch (e) { console.error(e); }

    setLoading(false);
  };

  const refreshUserProfile = async () => {
    try {
        const freshUser = await authService.getProfile();
        dispatch(setUser(freshUser));
    } catch (e) {
        console.error("Failed to refresh profile", e);
    }
  };

  const checkPendingDeposit = async () => {
    if (user?.is_admin) {
        try {
            const pending = await transactionService.getPendingTransactions();
            if (pending && pending.length > 0) {
                setAdminNotification(`🔔 You have ${pending.length} new deposit request(s) waiting for approval!`);
            } else {
                setAdminNotification(null);
            }
        } catch (e) { console.error(e); }
    } else {
        try {
            const { count } = await transactionService.getGlobalTransactionCount();
            setTransactionCount(count);
            
            const transactions = await transactionService.getUserTransactions();
            const pending = transactions.find(t => t.type === 'deposit' && t.status === 'pending');
            if (pending) {
                setActivePendingDeposit(pending);
            } else {
                setActivePendingDeposit(null);
            }
        } catch (e) { console.error(e); }
    }
  };

  useEffect(() => {
    fetchAllData();
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

  const [signalToTake, setSignalToTake] = useState(null);
  const [isTakeSignalModalOpen, setIsTakeSignalModalOpen] = useState(false);

  const formatCountdown = (releaseAt) => {
    const totalSeconds = Math.max(0, Math.floor((new Date(releaseAt).getTime() - currentTime.getTime()) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTakeSignal = async (signal) => {
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
    if (!signalToTake) return;
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
      toast.error(error.response?.data?.message || "Error taking signal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAccess = async () => {
      try {
          setIsSubmitting(true);
          const response = await signalService.requestSignalAccess();
          toast.success(response.message);
          setRequestStatus('pending');
      } catch (e) {
          toast.error(e.response?.data?.message || "Failed to send request");
      } finally {
          setIsSubmitting(false);
      }
  };

  const getSymbolIcon = (symbol) => {
    if (symbol.includes('XAU')) return '/images/div (13).png';
    if (symbol.includes('XAG')) return '/images/div (14).png';
    return '/images/div (15).png';
  };

  const getSymbolName = (symbol) => {
    if (symbol.includes('XAU')) return 'Gold';
    if (symbol.includes('XAG')) return 'Silver';
    return 'Forex';
  };

  const getTypeIcon = (type) => {
    return type.toLowerCase() === 'buy' ? '/images/i (11).png' : '/images/svg (18).png';
  };

  const filteredSignals = signals.filter(s => 
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !rejectedSignalIds.includes(s.id)
  );

  const totalPages = Math.ceil(filteredSignals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentSignals = filteredSignals.slice(startIndex, startIndex + rowsPerPage);

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
          <header className="admin-top-navbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="admin-btn-hamburger" onClick={toggleMenu}>☰</button>
              <div>
                <h2 className="admin-page-title">Admin Dashboard</h2>
                <p className="admin-subtitle">Global Platform Overview & Business Analytics</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ThemeToggle />
              <button
                onClick={() => router.push('/admin/signals')}
                style={{ background: 'var(--admin-primary)', color: 'var(--t-on-accent)', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                + New Signal
              </button>
            </div>
          </header>

          {adminNotification && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '12px 16px', margin: '0 2rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontWeight: 600 }}>{adminNotification}</span>
              <button onClick={() => router.push('/transaction')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Review Now</button>
              <button onClick={() => setAdminNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
      {mounted && user?.is_admin && adminNotification && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid #ef4444', padding: '10px 1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>{adminNotification}</span>
            <button onClick={() => router.push('/transaction')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Review Now</button>
            <button onClick={() => setAdminNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
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
                    background: 'var(--t-accent)', 
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
                        style={{ marginLeft: 'auto', background: '#eab308', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
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
                    <div style={{ background: 'var(--t-bg)', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--primary)', marginBottom: '0.75rem' }}>
                       {/* / {transactionCount % 4 === 3 ? "TNK1ngQW59zsu5iHntaGKiuUJ9PmSYJYtS" : "TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV"} */}
                       TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV
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
                    accept="image/*"
                    className="amount-input" 
                    style={{ fontSize: '0.85rem', padding: '12px' }}
                    onChange={handleFileChange}
                />
                {screenshotPreview && (
                  <div style={{ marginTop: '1rem', textAlign: 'center' }}>
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
                                <strong>{stats.total_signals ?? 0}</strong>
                            </div>
                        </div>
                        <div className="mdb-kpi">
                            <span className="mdb-kpi-icon mdb-kpi-icon--green"><IconTrend size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Hit target</span>
                                <strong>{stats.success_rate ?? 0}%</strong>
                            </div>
                        </div>
                        <div className="mdb-kpi">
                            <span className="mdb-kpi-icon mdb-kpi-icon--live"><IconClock size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Active now</span>
                                <strong>{stats.active_signals ?? 0}</strong>
                            </div>
                        </div>
                        <button type="button" className="mdb-kpi mdb-kpi--wallet" onClick={() => router.push('/wallet')}>
                            <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconWallet size={18} /></span>
                            <div>
                                <span className="mdb-kpi-label">Wallet balance</span>
                                <strong>${mounted ? Number(user?.wallet_balance || 0).toFixed(2) : '0.00'}</strong>
                                {mounted && user?.free_signals > 0 && (
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
                                    onClick={() => {
                                        const baseUrl = window.location.origin.includes('localhost') ? 'https://www.asianfxsignals.com' : window.location.origin;
                                        navigator.clipboard.writeText(`${baseUrl}/register?ref=${user?.referral_code}`);
                                        toast.success('Link copied!');
                                    }}
                                >Copy link</button>
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
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading signals...</td></tr>
                                        ) : currentSignals.length === 0 ? (
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No active signals found.</td></tr>
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
                                                            const canHide = user?.is_admin || (signal.target_user_id !== null && signal.target_user_id !== undefined);
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
                                                                            Take · {user?.free_signals > 0 ? 'FREE' : '$1'}
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
                                    <button className="page-btn prev" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>‹</button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button key={i + 1} className={`page-number ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                                    ))}
                                    <button className="page-btn next" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>›</button>
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {signalHistory.map((history, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <img src={getSymbolIcon(history.Signal?.symbol || '')} style={{ width: "32px", height: "32px" }} alt={history.Signal?.symbol} />
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
                                                        {history.result}
                                                    </span>
                                                </td>
                                                <td className="time">{new Date(history.taken_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* STICKY SIDEBAR FOR GLOBAL TIMER */}
                {mounted && !user?.is_admin && globalTimer && !isGlobalTimerHidden && (
                    <aside className="db-sidebar-column">
                        {(() => {
                            const [mins, secs] = formatCountdown(globalTimer).split(':');
                            return (
                                <div className="gtm">
                                    <div className="gtm-head">
                                        <span className="gtm-icon"><IconClock size={18} /></span>
                                        <div>
                                            <small>Next signal</small>
                                            <strong>Gold · XAU/USD</strong>
                                        </div>
                                        <span className="gtm-soon"><i aria-hidden="true" /> Soon</span>
                                    </div>

                                    <div className="gtm-time" aria-label={`${mins} minutes ${secs} seconds left`}>
                                        <div><b>{mins.padStart(2, '0')}</b><small>min</small></div>
                                        <span aria-hidden="true">:</span>
                                        <div><b>{secs}</b><small>sec</small></div>
                                    </div>

                                    {!requestStatus ? (
                                        <>
                                            <p className="gtm-note">Request access now so you can take this signal the moment it&apos;s released.</p>
                                            <button type="button" className="gtm-btn" onClick={handleRequestAccess} disabled={isSubmitting}>
                                                {isSubmitting ? <><span className="btn-spinner dark"></span>Sending…</> : 'Request access'}
                                            </button>
                                        </>
                                    ) : requestStatus === 'pending' ? (
                                        <div className="gtm-status gtm-status--pending">⏳ Request pending — waiting for admin</div>
                                    ) : (
                                        <div className="gtm-status gtm-status--granted">✓ Access granted</div>
                                    )}
                                </div>
                            );
                        })()}
                    </aside>
                )}
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
                                {user?.free_signals > 0 ? `FREE (${user.free_signals} credit${user.free_signals > 1 ? 's' : ''})` : '$1.00'}
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
                            style={{ flex: 2, background: 'var(--primary)', border: 'none', padding: '14px', borderRadius: '12px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontWeight: 700, color: 'var(--t-on-accent)', fontSize: '1rem' }}
                        >
                            {isSubmitting ? 'Processing...' : 'Take Signal'}
                        </button>
                        <button 
                            onClick={() => setIsTakeSignalModalOpen(false)} 
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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>{user?.is_admin ? 'Delete Signal?' : 'Hide Signal?'}</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>{user?.is_admin ? 'Are you sure you want to remove this signal? This action cannot be undone.' : 'This removes the signal from your list only.'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            onClick={() => { setIsDeleteModalOpen(false); setSignalIdToDelete(null); }}
                            style={{ flex: 1, background: 'var(--tw-05)', color: 'var(--t-text)', border: '1px solid var(--tw-10)', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
                        >Cancel</button>
                        <button 
                            onClick={confirmDelete}
                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}
                        >Yes, Delete</button>
                    </div>
                </div>
            </div>
        )}

        {/* PREMIUM SIGNAL ALERT POPUP */}
        {isSignalAlertOpen && incomingSignal && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
                <div className="signal-alert-card" style={{ 
                    background: 'linear-gradient(180deg, var(--t-surface-2) 0%, var(--t-surface) 100%)', 
                    padding: '2.5rem', 
                    borderRadius: '32px', 
                    color: 'var(--t-text)', 
                    width: '450px', 
                    border: '1px solid rgba(var(--t-accent-rgb), 0.3)', 
                    boxShadow: '0 0 50px rgba(var(--t-accent-rgb), 0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    {/* Decorative element */}
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(var(--t-accent-rgb), 0.05)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
                    
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ 
                            background: 'rgba(var(--t-accent-rgb), 0.1)', 
                            width: '80px', 
                            height: '80px', 
                            borderRadius: '24px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 1.5rem',
                            border: '1px solid rgba(var(--t-accent-rgb), 0.2)',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                        }}>
                            <img src={getSymbolIcon(incomingSignal.symbol)} style={{ width: '40px' }} alt="Symbol" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>New Signal Alert!</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
                            An exclusive trading opportunity for <strong>{incomingSignal.symbol}</strong> is now live.
                        </p>
                    </div>

                    <div style={{ 
                        background: 'rgba(0, 0, 0, 0.3)', 
                        padding: '1.5rem', 
                        borderRadius: '20px', 
                        marginBottom: '2rem', 
                        border: '1px solid var(--tw-05)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '15px'
                    }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid var(--tw-10)' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--t-text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '5px' }}>Action</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: incomingSignal.type.toLowerCase() === 'buy' ? '#22c55e' : '#ef4444' }}>{incomingSignal.type.toUpperCase()}</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--t-text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '5px' }}>Entry</span>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{incomingSignal.entry_price ?? '🔒 Locked'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                            onClick={() => {
                                setIsSignalAlertOpen(false);
                                setIsGlobalTimerHidden(true); // Hide the global timer banner for this user
                                handleTakeSignal(incomingSignal);
                            }} 
                            style={{ 
                                width: '100%', 
                                background: 'var(--t-accent)', 
                                color: 'var(--t-on-accent)', 
                                border: 'none', 
                                padding: '16px', 
                                borderRadius: '16px', 
                                cursor: 'pointer', 
                                fontWeight: 800, 
                                fontSize: '1.1rem',
                                transition: '0.3s',
                                boxShadow: '0 10px 20px rgba(var(--t-accent-rgb), 0.2)'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            YES, I WANT TO TAKE IT
                        </button>
                        <button 
                            onClick={() => {
                                if (incomingSignal) {
                                    setRejectedSignalIds(prev => [...prev, incomingSignal.id]);
                                }
                                setIsSignalAlertOpen(false);
                            }} 
                            style={{ 
                                width: '100%', 
                                background: 'transparent', 
                                border: '1px solid var(--tw-10)', 
                                color: 'var(--t-text-muted)', 
                                padding: '14px', 
                                borderRadius: '16px', 
                                cursor: 'pointer', 
                                fontWeight: 600,
                                fontSize: '1rem'
                            }}
                        >
                            Reject Signal
                        </button>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--tw-30)', marginTop: '1.5rem' }}>
                        You can still access this signal from your dashboard anytime.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
