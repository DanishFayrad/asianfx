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
import { io } from 'socket.io-client';
import '../../styles/dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [dbUser, setDbUser] = useState(user);
  
  const handleDeposit = async () => {
    if (!screenshot) {
      alert('Please upload a proof of payment screenshot');
      return;
    }
    
    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('amount', depositAmount);
        formData.append('payment_method', paymentMethod);
        formData.append('proof_image', screenshot);
        
        await transactionService.requestDeposit(formData);
        alert('Deposit request submitted! Super Admin will review it shortly.');
        setIsDepositModalOpen(false);
        setDepositAmount('');
        setScreenshot(null);
        setScreenshotPreview(null);
        router.push('/transaction'); // Redirect to history page
    } catch (e) {
        console.error(e);
        const errorMsg = e.response?.data?.message || 'Failed to submit deposit request';
        alert(errorMsg);
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
  const [activePendingDeposit, setActivePendingDeposit] = useState(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        setScreenshot(file);
        setScreenshotPreview(URL.createObjectURL(file));
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState({ active_signals: 0, success_rate: 0, total_signals: 0 });
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
    const socket = io('http://localhost:5000');
    
    socket.emit('join', user.id);

    socket.on('notification', (notif) => {
        console.log("New real-time notification:", notif);
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show a temporary alert or badge
        setUserNotification(notif);
        setTimeout(() => setUserNotification(null), 10000); // Hide after 10s
    });

    fetchNotifications();

    return () => {
        socket.disconnect();
    };
  }, [user]);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const data = await signalService.getSignalsDashboard();
      setSignals(data.active_signals || []);
      setStats(data.stats || { active_signals: 0, success_rate: 0, total_signals: 0 });
    } catch (error) {
      console.error("Error fetching signals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
        const data = await authService.getProfile();
        setDbUser(data);
    } catch (e) {
        console.error("Failed to fetch profile", e);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchProfile();
    document.body.classList.add('dashboard-body');

    const checkNotifications = async () => {
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
                // Fetch user's own transactions (I'll add this endpoint to service)
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

    checkNotifications();
    const interval = setInterval(checkNotifications, 10000); // Check every 10s

    return () => {
        document.body.classList.remove('dashboard-body');
        clearInterval(interval);
    }
  }, [user]);

  const handleTakeSignal = async (signal) => {
    if (!dbUser?.is_active) {
        alert('Your account is not active for signals. Please complete a deposit and wait for admin approval.');
        setIsDepositModalOpen(true);
        return;
    }
    if (!window.confirm(`Are you sure you want to take ${signal.symbol} signal for $5.00?`)) return;
    try {
      const payload = {
        user_id: user.id || user.user_id, // Depending on auth response structure
        signal_id: signal.id,
        taken_price: signal.entry_price,
        invested_amount: 5.0, // Default amount mentioned in landing page
      };
      const response = await signalService.takeSignal(payload);
      alert(response.message || "Signal taken successfully!");
      fetchSignals(); // Refresh data
    } catch (error) {
      console.error("Error taking signal:", error);
      alert(error.response?.data?.message || "Error taking signal");
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
            <span>TradePro</span>
          </div>

          <nav>
            <Link className="active" href="/dashboard">Signals</Link>
            <Link href="/wallet">Wallet</Link>
            <Link href="/transaction">Transactions</Link>
            {user?.is_admin && <Link href="/admin/signals">Admin</Link>}
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
             <Link href="/transaction" onClick={() => setIsMenuOpen(false)}>Transactions</Link>
             {user?.is_admin && <Link href="/admin/signals" onClick={() => setIsMenuOpen(false)}>Admin</Link>}
          </nav>
          <div className="db-nav-actions">
            <button className="wallet" id="walletBtn" onClick={() => { setIsMenuOpen(false); router.push('/wallet'); }}>
              <img src="/images/i (2).png" alt="Wallet" />
              <span>${user?.wallet_balance || '100.00'}</span>
            </button>
            <div className="db-nav-icons">
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}>
                <img src="/images/i (3).png" alt="Notifications" style={{ marginBottom: 0 }} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', border: '2px solid var(--bg-card)' }}>
                    {unreadCount}
                  </span>
                )}

                {/* NOTIFICATIONS DROPDOWN */}
                {isNotificationsOpen && (
                  <div className="profile-dropdown show" style={{ width: '320px', right: '0', padding: '0', maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Notifications</span>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer' }} onClick={async (e) => {
                          e.stopPropagation();
                          // Handle clear all if needed
                      }}>Recent</span>
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No notifications</div>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: n.is_read ? 'transparent' : 'rgba(212, 175, 55, 0.05)', cursor: 'default' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <strong style={{ fontSize: '13px', color: n.type === 'payment_approval' ? 'var(--success)' : 'var(--primary)' }}>{n.title}</strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(n.created_at || Date.now()).toLocaleTimeString()}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <img 
                src="/images/img.png" 
                alt="User" 
                onClick={toggleProfile} 
                style={{ cursor: 'pointer', borderRadius: '50%', border: isProfileOpen ? '2px solid var(--primary)' : '2px solid transparent' }} 
              />
              
              {/* Profile Dropdown */}
              <div className={`profile-dropdown ${isProfileOpen ? 'show' : ''}`}>
                <div className="dropdown-user-info">
                  <span className="user-name">{user?.name || 'Trader'}</span>
                  <span className="user-email">{user?.email}</span>
                  <span className="user-id">ID: #{user?.user_id || user?.id || '---'}</span>
                </div>
                
                <div className="dropdown-balance">
                  <span>Wallet Balance</span>
                  <strong>${user?.wallet_balance || '0.00'}</strong>
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
      {user?.is_admin && adminNotification && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid #ef4444', padding: '10px 1rem', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>{adminNotification}</span>
            <button onClick={() => router.push('/transaction')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Review Now</button>
            <button onClick={() => setAdminNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {!user?.is_admin && userNotification && (
        <div style={{ background: 'rgba(34, 197, 94, 0.1)', borderBottom: '1px solid #22c55e', padding: '10px 1rem', color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>{userNotification}</span>
            <button onClick={() => setUserNotification(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {!user?.is_admin && activePendingDeposit && (
        <div style={{ background: 'rgba(212, 175, 55, 0.1)', borderBottom: '1px solid #d4af37', padding: '10px 1rem', color: '#d4af37', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 1000, position: 'relative' }}>
            <span style={{ fontWeight: 600 }}>🗓️ Status: Your deposit of ${activePendingDeposit.amount} is currently Pending Review.</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>Admin Reviewing...</span>
        </div>
      )}

      {/*  MAIN  */}
      <div className="db-container">
        <div className="db-top-bar">
          <h1 className="db-page-title">Trading Signals</h1>

          <div className="right-actions">
            <button className="deposit" onClick={() => setIsDepositModalOpen(true)}>Deposit</button>
            {user?.is_admin && (
              <button className="deposit" onClick={() => router.push('/admin/signals')}>+ New Signal</button>
            )}
            <span className="live-updates">Live Updates</span>
          </div>
        </div>

        {/* INACTIVE NOTICE */}
        {!user?.is_admin && !dbUser?.is_active && (
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

              {/* Amount Input */}
              <div className="amount-input-group">
                <label>Investment Amount (USD)</label>
                <div className="amount-input-wrapper">
                  <span className="currency">$</span>
                  <input 
                    type="number" 
                    className="amount-input" 
                    placeholder="100.00" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Binance Address Instruction */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Send USDT to this <strong>Binance</strong> address:</p>
                    <div style={{ background: 'black', padding: '12px', borderRadius: '8px', wordBreak: 'break-all', fontSize: '0.85rem', color: 'var(--primary)', border: '1px dashed var(--primary)', marginBottom: '0.75rem' }}>
                        TXbinanceAddressSAMPLE123456789
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
                disabled={isSubmitting || !screenshot || !depositAmount}
              >
                {isSubmitting ? 'Processing Transaction...' : 'I Have Paid'}
              </button>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center', marginTop: '1.5rem' }}>
                ⭐ Super Admin will verify and credit your wallet shortly.
              </p>
            </div>
          </div>
        )}

        <p className="db-subtitle">Real-time signals for Gold, Silver, and Forex markets</p>

        {/*  STATS  */}
        <div className="db-stats">
          <div className="db-card">
            <img src="/images/div (9).png" style={{ marginBottom: "10px" }} alt="Today Icon" />
            <span className="db-card-label">Overall</span>
            <h3>{stats.total_signals}</h3>
            <p>Total Signals</p>
          </div>

          <div className="db-card">
            <img src="/images/div (10).png" style={{ marginBottom: "10px" }} alt="Weekly Icon" />
            <span className="db-card-label">Success</span>
            <h3>{stats.success_rate}%</h3>
            <p>Success Rate</p>
          </div>

          <div className="db-card">
            <img src="/images/div (11).png" style={{ marginBottom: "10px" }} alt="Monthly Icon" />
            <span className="db-card-label">Now</span>
            <h3>{stats.active_signals}</h3>
            <p>Active Signals</p>
          </div>

          <div className="db-card">
            <img src="/images/div (12).png" style={{ marginBottom: "10px" }} alt="Total Icon" />
            <span className="db-card-label">Total</span>
            <h3>$24.5K</h3>
            <p>Total Profit</p>
          </div>
        </div>

        {/*  FILTERS  */}
        <div className="filters-card">
          <div className="filter-item">
            <label>Search Symbol</label>
            <div className="input-icon">
              <span> <img src="/images/svg (17).png" alt="Search" /></span>
              <input 
                type="text" 
                placeholder="Search XAUUSD, XAGUSD..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Type</label>
            <select>
              <option>All Types</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Status</label>
            <select>
              <option>All Status</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Sort By</label>
            <select>
              <option>Latest First</option>
            </select>
          </div>
        </div>

        {/*  TABLE  */}
        <div className="table-box">
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
                    <td className="time">{new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="Action">
                       <img 
                        src="/images/i (10).png" 
                        alt="Take Signal" 
                        title="Take Signal" 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => handleTakeSignal(signal)}
                       />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

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
      </div>
    </div>
  );
}
