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
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../constants/apiConstants';
import '../../styles/dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleDeposit = async () => {
    if (!screenshot) {
      toast.error('Please upload a proof of payment screenshot');
      return;
    }
    
    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('amount', 0);
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

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [depositStep, setDepositStep] = useState(1); // 1: Info, 2: Payment Details
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotification, setAdminNotification] = useState(null);
  const [userNotification, setUserNotification] = useState(null);
  const [signalBanner, setSignalBanner] = useState(null);
  const [activePendingDeposit, setActivePendingDeposit] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); // Tick every 1s for real-time countdown
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
  const [stats, setStats] = useState({ active_signals: 0, success_rate: 0, total_signals: 0, total_users: 0, platform_balance: '0', pending_deposits: 0 });
  const [adminStats, setAdminStats] = useState(null);
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

    // Connect to socket
    const socket = io(API_BASE_URL);
    
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
            
            let toastMsg = '📈 ' + (notif.title || 'New Signal Available!');
            if (notif.signal?.release_at && new Date(notif.signal.release_at).getTime() > new Date().getTime()) {
                const mins = Math.max(1, Math.ceil((new Date(notif.signal.release_at).getTime() - new Date().getTime()) / 60000));
                toastMsg += ` (Unlocks in ${mins}m)`;
            }

            toast(toastMsg, {
                style: {
                    background: 'var(--primary)',
                    color: 'black',
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
  }, [user]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [signalIdToDelete, setSignalIdToDelete] = useState(null);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const data = await signalService.getSignalsDashboard();
      setSignals(data.active_signals || []);
      setStats(prev => ({ ...prev, ...data.stats }));
      
      if (user?.is_admin) {
        const aStats = await transactionService.getAdminStats();
        setAdminStats(aStats);
      }
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!signalIdToDelete) return;
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

    // Auto-refresh every 30 seconds to keep data fresh
    const interval = setInterval(fetchAllData, 30000);

    return () => {
        document.body.classList.remove('dashboard-body');
        clearInterval(interval);
    }
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
    } catch (error) {
      toast.error(error.response?.data?.message || "Error taking signal");
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
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase())
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

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    if (isMenuOpen) setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isProfileOpen) setIsProfileOpen(false);
  };

  return (
    <div className="db-main-layout">
      <header className="db-navbar">
        <div className="db-nav-left">
          <div className="db-logo">
            <div className="logo-box">
                <img src="/images/i (9).png" alt="Logo" />
            </div>
            <span>AsianFX</span>
          </div>

          <nav>
            <Link className="active" href="/dashboard">Signals</Link>
            <Link href="/wallet">Wallet</Link>
            {mounted && user?.is_admin && (
              <Link href="/transaction" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Transactions
                {adminStats?.pending_deposits > 0 && (
                  <span className="nav-badge">{adminStats.pending_deposits}</span>
                )}
              </Link>
            )}
            {mounted && user?.is_admin && <Link href="/admin/signals">Admin</Link>}
          </nav>
        </div>

        {/*  HAMBURGER  */}
        <div className="hamburger" id="hamburger" onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </div>

        {/*  RIGHT SIDE MENU (Mobile + Desktop)  */}
        <div className={`db-nav-right ${isMenuOpen ? 'show' : ''}`} id="mobileMenu">
          <nav className="mobile-only-nav">
             <Link className="active" href="/dashboard" onClick={() => setIsMenuOpen(false)}>Signals</Link>
             <Link href="/wallet" onClick={() => setIsMenuOpen(false)}>Wallet</Link>
             {mounted && user?.is_admin && (
               <Link href="/transaction" onClick={() => setIsMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 Transactions
                 {adminStats?.pending_deposits > 0 && (
                   <span className="nav-badge">{adminStats.pending_deposits}</span>
                 )}
               </Link>
             )}
             {mounted && user?.is_admin && <Link href="/admin/signals" onClick={() => setIsMenuOpen(false)}>Admin</Link>}
          </nav>
          <div className="db-nav-actions">
            {/* Wallet Balance Removed as requested */}
            <div className="db-nav-icons">
              <div className="db-nav-icons">
                {user?.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    alt="User" 
                    onClick={toggleProfile} 
                    style={{ cursor: 'pointer', borderRadius: '50%', border: isProfileOpen ? '2px solid var(--primary)' : '2px solid transparent', width: '40px', height: '40px', objectFit: 'cover' }} 
                  />
                ) : (
                  <div 
                    onClick={toggleProfile}
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: 'rgba(212, 175, 55, 0.1)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      border: isProfileOpen ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)' 
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Profile Dropdown */}
              <div className={`profile-dropdown ${isProfileOpen ? 'show' : ''}`}>
                <div className="dropdown-user-info">
                  <span className="user-name">{mounted ? (user?.name || 'Trader') : 'Trader'}</span>
                  <span className="user-email">{mounted ? user?.email : ''}</span>
                  <span className="user-id">ID: #{mounted ? (user?.user_id || user?.id || '---') : '---'}</span>
                </div>
                
                <div className="dropdown-balance">
                  <span>Wallet Balance</span>
                  <strong>${mounted ? (user?.wallet_balance || '0.00') : '0.00'}</strong>
                </div>
                
                <button className="logout-btn" onClick={handleLogout}>
                   <img src="/images/arrow (1).png" style={{ height: '14px', filter: 'invert(1)' }} alt="Logout" />
                   Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

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
        <div style={{ background: 'rgba(212, 175, 55, 0.15)', borderBottom: '2px solid #d4af37', padding: '12px 1rem', color: '#d4af37', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', zIndex: 1100, position: 'relative' }}>
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📈</span> 
                {signalBanner.title}: {signalBanner.message}
                {signalBanner.signal?.release_at && new Date(signalBanner.signal.release_at).getTime() > currentTime.getTime() && (
                  <span style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: '6px', marginLeft: '10px', border: '1px solid #d4af37', display: 'inline-flex', alignItems: 'center', gap: '5px', animation: 'pulse 2s infinite' }}>
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
                    background: '#d4af37', 
                    color: 'black', 
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
            <button onClick={() => setSignalBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
      )}

      {/*  MAIN  */}
      <div className="db-container">
        <div className="db-top-bar">
          <h1 className="db-page-title">Trading Signals</h1>

          <div className="right-actions">
            {mounted && !user?.is_admin && (
                <button className="deposit" onClick={() => setIsDepositModalOpen(true)}>Deposit</button>
            )}
            {mounted && user?.is_admin && (
              <button className="deposit" onClick={() => router.push('/admin/signals')}>+ New Signal</button>
            )}
          </div>
        </div>

        {/* UPCOMING SIGNAL PERSISTENT BANNER */}
        {mounted && !user?.is_admin && signals.filter(s => s.release_at && new Date(s.release_at).getTime() > currentTime.getTime()).length > 0 && (
          <div style={{ 
            background: 'linear-gradient(135.4deg, rgba(212, 175, 55, 0.1) 10%, rgba(212, 175, 55, 0.05) 90%)', 
            border: '1px solid rgba(212, 175, 55, 0.3)', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.05, transform: 'rotate(-15deg)', pointerEvents: 'none' }}>⌛</div>
            
            <div style={{ background: 'rgba(212, 175, 55, 0.2)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
              ⌛
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span style={{ color: '#d4af37', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Upcoming Alert</span>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d4af37', boxShadow: '0 0 10px #d4af37' }}></span>
              </div>
              <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>
                Next Signal Release: <span style={{ color: '#d4af37' }}>{signals.filter(s => s.release_at && new Date(s.release_at).getTime() > currentTime.getTime()).sort((a,b) => new Date(a.release_at) - new Date(b.release_at))[0]?.symbol}</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                A professional entry signal is being analyzed. Stay tuned to take your trade at the release time.
              </p>
            </div>

            <div style={{ textAlign: 'right', padding: '0 1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 600 }}>COUNTDOWN</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#d4af37', fontFamily: 'monospace', letterSpacing: '2px', textShadow: '0 0 20px rgba(212, 175, 55, 0.3)' }}>
                {formatCountdown(signals.filter(s => s.release_at && new Date(s.release_at).getTime() > currentTime.getTime()).sort((a,b) => new Date(a.release_at) - new Date(b.release_at))[0]?.release_at)}
              </div>
              <button 
                onClick={() => {
                  const tableElement = document.querySelector('.table-box');
                  if (tableElement) tableElement.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ background: '#d4af37', color: 'black', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', marginTop: '10px', fontSize: '0.8rem', width: '100%' }}
              >
                JOIN TRADE
              </button>
            </div>
          </div>
        )}

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
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Send USDT to this <strong>Binance</strong> address:</p>
                    <div style={{ background: 'black', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--primary)', marginBottom: '0.75rem' }}>
                        TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <span>Network: <strong>TRC20</strong></span>
                        <span>•</span>
                        <span>Asset: <strong>USDT</strong></span>
                    </div>
                </div>
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
                {isSubmitting ? 'Processing Transaction...' : 'I Have Paid'}
              </button>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem' }}>
                ⭐ Super Admin will verify and credit your wallet shortly.
              </p>
            </div>
          </div>
        )}

        {mounted && user?.is_admin ? (
            <p className="db-subtitle">Global Platform Overview & Business Analytics</p>
        ) : (
            <p className="db-subtitle">Real-time signals for Gold, Silver, and Forex markets</p>
        )}

        {mounted && user?.is_admin ? (
            /* PREMIUM ADMIN BUSINESS DASHBOARD */
            <div className="admin-business-suite" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="db-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                    <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #a78bfa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="db-card-label" style={{ color: '#a78bfa' }}>GLOBAL BALANCE</span>
                            <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '4px', borderRadius: '6px' }}>💰</div>
                        </div>
                        <h3>${adminStats?.platform_balance || '0.00'}</h3>
                        <p style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Users Wallet Total</span>
                            <span style={{ color: '#22c55e' }}>ONLINE</span>
                        </p>
                    </div>

                    <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #22c55e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="db-card-label" style={{ color: '#22c55e' }}>TOTAL REVENUE</span>
                            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '4px', borderRadius: '6px' }}>📈</div>
                        </div>
                        <h3>${adminStats?.total_deposit || '0.00'}</h3>
                        <p>Accumulated Deposits</p>
                    </div>

                    <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="db-card-label" style={{ color: '#f59e0b' }}>PENDING ACTION</span>
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '4px', borderRadius: '6px' }}>⏳</div>
                        </div>
                        <h3>{adminStats?.pending_deposits || 0}</h3>
                        <p>Awaiting Verification</p>
                    </div>

                    <div className="db-card admin-kpi" style={{ borderLeft: '4px solid #60a5fa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span className="db-card-label" style={{ color: '#60a5fa' }}>PLATFORM PROFIT</span>
                            <div style={{ background: 'rgba(96, 165, 250, 0.1)', padding: '4px', borderRadius: '6px' }}>💎</div>
                        </div>
                        <h3>${adminStats?.total_profit || '0.00'}</h3>
                        <p>Net Earnings</p>
                    </div>
                </div>

                {/* QUICK NAV GRID FOR ADMIN */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '20px', alignItems: 'center', cursor: 'pointer', transition: '0.3s' }} onClick={() => router.push('/transaction')}>
                         <div style={{ background: '#ef4444', color: 'white', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>💵</div>
                         <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Transaction Desk</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Approve deposits & send signals</p>
                         </div>
                         <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>{adminStats?.pending_deposits || 0} Alert</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '20px', alignItems: 'center', cursor: 'pointer', transition: '0.3s' }} onClick={() => router.push('/admin/signals')}>
                         <div style={{ background: '#d4af37', color: 'black', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📢</div>
                         <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Global Center</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Manage signals & market trends</p>
                         </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '20px', alignItems: 'center', cursor: 'pointer', transition: '0.3s' }}>
                         <div style={{ background: '#3b82f6', color: 'white', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👥</div>
                         <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Users Matrix</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{adminStats?.total_users || 0} Registered Members</p>
                         </div>
                    </div>
                </div>
            </div>
        ) : (
            <>
            <div className="db-stats">
              <div className="db-card">
                <img src="/images/div (9).png" style={{ marginBottom: "10px" }} alt="Stat Icon" />
                <span className="db-card-label">Overall</span>
                <h3>{stats.total_signals}</h3>
                <p>Total Signals</p>
              </div>

              <div className="db-card">
                <img src="/images/div (10).png" style={{ marginBottom: "10px" }} alt="Stat Icon" />
                <span className="db-card-label">Success</span>
                <h3>{stats.success_rate}%</h3>
                <p>Success Rate</p>
              </div>

              <div className="db-card">
                <img src="/images/div (11).png" style={{ marginBottom: "10px" }} alt="Stat Icon" />
                <span className="db-card-label">Now</span>
                <h3>{stats.active_signals}</h3>
                <p>Active Signals</p>
              </div>

              <div className="db-card">
                <img src="/images/div (12).png" style={{ marginBottom: "10px" }} alt="Stat Icon" />
                <span className="db-card-label">Total</span>
                <h3>{stats.total_signals}</h3>
                <p>Total Signals</p>
              </div>
            </div>

            {/* REFERRAL / AFFILIATE SECTION */}
            <div className="affiliate-center" style={{ 
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0, 0, 0, 0.3) 100%)', 
                border: '1px solid rgba(212, 175, 55, 0.2)', 
                borderRadius: '24px', 
                padding: '2rem', 
                marginBottom: '2.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '120px', opacity: 0.03, pointerEvents: 'none' }}>🤝</div>
                
                <div className="affiliate-info">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                      <div style={{ background: '#d4af37', color: 'black', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💰</div>
                      <h3 style={{ color: 'white', margin: 0, fontSize: '1.4rem' }}>Refer & Earn</h3>
                   </div>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                      Invite your community to AsianFX and earn <strong>$0.30</strong> for every signal they take. Build your passive income stream today!
                   </p>
                   
                   <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#d4af37', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Your Referral Link</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                         <input 
                            readOnly 
                            value={mounted ? `${window.location.origin}?ref=${user?.referral_code || ''}` : ''} 
                            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                         />
                         <button 
                            onClick={() => {
                                const link = `${window.location.origin}?ref=${user?.referral_code}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Link copied!');
                            }}
                            style={{ background: '#d4af37', color: 'black', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                         >COPY</button>
                      </div>
                   </div>
                </div>

                <div className="affiliate-stats-card" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '20px', padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <span style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Affiliate Balance</span>
                   <h2 style={{ fontSize: '2.5rem', margin: '10px 0', color: 'white' }}>${mounted ? (user?.affiliate_balance || '0.00') : '0.00'}</h2>
                   <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Earnings from your referred community</p>
                   <button 
                      style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid #d4af37', color: '#d4af37', padding: '8px 20px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => toast.error('Minimum withdrawal for affiliate balance is $10')}
                   >Withdraw Profits</button>
                </div>
            </div>
            </>
        )}

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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading signals...</td></tr>
              ) : currentSignals.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No active signals found.</td></tr>
              ) : (
                currentSignals.map((signal, index) => (
                  <tr key={signal.id || index}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={getSymbolIcon(signal.symbol)} style={{ width: "42px", height: "42px" }} alt={signal.symbol} />
                        <div>
                          <div style={{ fontWeight: "600" }}>{signal.symbol}</div>
                          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{getSymbolName(signal.symbol)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={signal.type.toLowerCase()}>
                        <img src={getTypeIcon(signal.type)} alt={signal.type} />
                        {signal.type}
                      </span>
                    </td>
                    <td>{signal.entry_price}</td>
                    <td className="green">{signal.target_price}</td>
                    <td className="red">{signal.stop_loss}</td>
                    <td>
                      <span className={`db-badge status ${signal.status.toLowerCase().includes('hit') ? 'hit' : signal.status.toLowerCase().includes('stop') ? 'loss' : signal.status.toLowerCase().includes('closed') ? 'close' : 'active'}`}>
                        {signal.status}
                      </span>
                    </td>
                     <td className="time">
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
                      <td className="Action" style={{ verticalAlign: 'middle', padding: '12px 0' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '18px', justifyContent: 'center', minHeight: '42px' }}>
                         <div style={{ position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           {/* ALWAYS SHOW IMAGE BUTTON */}
                           <img 
                            src="/images/i (10).png" 
                            alt="Take Signal" 
                            title={signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() ? `Unlocks in ${formatCountdown(signal.release_at)}` : "Take Signal"} 
                            style={{ 
                              cursor: signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() ? 'not-allowed' : 'pointer',
                              opacity: signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() ? 0.25 : 1,
                              filter: signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() ? 'grayscale(1) brightness(0.5)' : 'none',
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: 'scale(1)'
                            }} 
                            onMouseOver={(e) => { 
                                if (!(signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime())) {
                                    e.currentTarget.style.transform = 'scale(1.15)';
                                    e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(212, 175, 55, 0.6))';
                                }
                            }}
                            onMouseOut={(e) => { 
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.filter = 'none';
                            }}
                            onClick={() => {
                              if (signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime()) {
                                  toast.error(`This signal is locked. Please wait ${formatCountdown(signal.release_at)} more.`);
                                  return;
                              }
                              handleTakeSignal(signal);
                            }}
                           />
                           
                           {/* OVERLAY TIMER IF SCHEDULED */}
                           {signal.release_at && new Date(signal.release_at).getTime() > currentTime.getTime() && (
                              <div style={{ 
                                  position: 'absolute', 
                                  top: '50%', 
                                  left: '50%', 
                                  transform: 'translate(-50%, -50%)',
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  border: '1px solid #d4af37',
                                  borderRadius: '6px',
                                  padding: '2px 6px',
                                  pointerEvents: 'none',
                                  whiteSpace: 'nowrap',
                                  zIndex: 10,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                              }}>
                                  <div style={{ fontSize: '10px', color: '#d4af37', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                                      {formatCountdown(signal.release_at)}
                                  </div>
                              </div>
                           )}
                         </div>

                         {/* DELETE BUTTON - Only show for Admin OR if it's a Private Signal (targeted) */}
                         {(user?.is_admin || (signal.target_user_id !== null && signal.target_user_id !== undefined)) && (
                            <button 
                                onClick={() => handleDeleteSignal(signal.id)}
                                style={{ 
                                    background: 'rgba(239, 68, 68, 0.05)', 
                                    border: '1px solid rgba(239, 68, 68, 0.15)', 
                                    color: '#f87171', 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '10px', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.1rem',
                                    padding: 0,
                                    transition: 'all 0.25s ease',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseOver={(e) => { 
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                    e.currentTarget.style.borderColor = '#ef4444';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => { 
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                                    e.currentTarget.style.color = '#f87171';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                                title="Remove Signal"
                            >
                                <span style={{ position: 'relative', top: '-1px', fontWeight: 'bold' }}>×</span>
                            </button>
                         )}
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
         </div>

          {/*  TABLE FOOTER  */}
          <div className="table-footer">
            <div className="showing-text">
              Showing {filteredSignals.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + rowsPerPage, filteredSignals.length)} of {filteredSignals.length} signals
            </div>

            <div className="pagination">
              <button className="page-btn prev" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`page-number ${currentPage === i + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="page-btn next" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}>›</button>
            </div>
          </div>
        </div>
        )}

        {/* TAKE SIGNAL CONFIRMATION MODAL */}
        {isTakeSignalModalOpen && signalToTake && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: '#0f172a', padding: '2.5rem', borderRadius: '24px', color: 'white', width: '400px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <img src={getSymbolIcon(signalToTake.symbol)} style={{ width: '32px' }} alt="Symbol" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Confirm Signal</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Are you sure you want to take <strong>{signalToTake.symbol}</strong> signal?
                        </p>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b' }}>Entry Price</span>
                            <span style={{ fontWeight: 700 }}>{signalToTake.entry_price}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Investment</span>
                            <span style={{ fontWeight: 700, color: '#d4af37' }}>$5.00</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={confirmTakeSignal} 
                            disabled={isSubmitting}
                            style={{ flex: 2, background: 'var(--primary)', border: 'none', padding: '14px', borderRadius: '12px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1, fontWeight: 700, color: 'black', fontSize: '1rem' }}
                        >
                            {isSubmitting ? 'Processing...' : 'Take Signal'}
                        </button>
                        <button 
                            onClick={() => setIsTakeSignalModalOpen(false)} 
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
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
                <div className="modal-content" style={{ background: '#0f172a', padding: '2.5rem', borderRadius: '24px', color: 'white', width: '400px', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.1)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '2.5rem', color: '#ef4444' }}>⚠️</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Delete Signal?</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6' }}>Are you sure you want to remove this signal? This action cannot be undone.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button 
                            onClick={() => { setIsDeleteModalOpen(false); setSignalIdToDelete(null); }}
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' }}
                        >Cancel</button>
                        <button 
                            onClick={confirmDelete}
                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)' }}
                        >Yes, Delete</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
