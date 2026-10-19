'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import signalService, { getSignalLevelError } from '../../../services/signalService';
import authService from '../../../services/authService';
import transactionService from '../../../services/transactionService';
import { serverTimeOffset, updateServerTimeOffset } from '../../../services/serverTime';
import { logout } from '../../../redux/slices/authSlice';
import { connectRealtime } from '../../../services/realtimeService';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle';
import AdminSidebar from '../../../components/AdminSidebar';
import '../../../styles/adminSignals.css';

// Asset badge drawn as SVG so each market has its own symbol (₿, Au, Ag).
const AssetIcon = ({ glyph }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="13" fill="rgba(0,0,0,0.12)" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
    <text x="14" y="14.5" textAnchor="middle" dominantBaseline="central" fontSize={glyph.length > 1 ? 11 : 16} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">{glyph}</text>
  </svg>
);

export default function AdminSignals() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [type, setType] = useState('Buy');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    entry_price: '',
    target_price: '',
    stop_loss: '',
    signal_type: 'free',
    timer_minutes: '', // New field
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentSignals, setRecentSignals] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [liveClientsCount, setLiveClientsCount] = useState(0);
  const [globalTimerMinutes, setGlobalTimerMinutes] = useState('');
  const [signalRequests, setSignalRequests] = useState([]);
  const [activeGlobalTimer, setActiveGlobalTimer] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmModal, setConfirmModal] = useState({
      isOpen: false,
      title: '',
      message: '',
      type: '', 
      data: null
  });

  const closeConfirmModal = () => setConfirmModal({...confirmModal, isOpen: false});

  const executeConfirmAction = async () => {
    const { type, data } = confirmModal;
    setLoading(true);
    try {
        if (type === 'approve_request') {
            await signalService.approveSignalRequest(data);
            toast.success("Request approved");
        } else if (type === 'clear_timer') {
            await signalService.clearGlobalTimer();
            toast.success("Global timer cleared");
        }
        closeConfirmModal();
        fetchAllAdminData();
    } catch (e) {
        toast.error(e.response?.data?.message || "Action failed");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date(Date.now() + serverTimeOffset)), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Mock Assets data to match screenshot
  const assets = [
    { id: 1, name: 'Bitcoin', symbol: 'BTCUSDT', displaySymbol: 'BTC/USDT', iconColor: '#F7931A', glyph: '₿' },
    { id: 2, name: 'Gold', symbol: 'XAUUSD', displaySymbol: 'XAU/USD', iconColor: '#C9A227', glyph: 'Au' },
    { id: 3, name: 'Silver', symbol: 'XAGUSD', displaySymbol: 'XAG/USD', iconColor: '#8A9099', glyph: 'Ag' },
  ];

  const fetchAllAdminData = async () => {
    try {
        const data = await signalService.getSignalsDashboard();
        setRecentSignals(data.active_signals || []);
        
        if (user?.is_admin) {
            const stats = await transactionService.getAdminStats();
            setAdminStats(stats);
            
            const timerData = await signalService.getGlobalTimer();
            if (timerData.server_time) {
                updateServerTimeOffset(timerData.server_time);
            }
            setActiveGlobalTimer(timerData.expires_at);

            const requests = await signalService.getSignalRequests();
            setSignalRequests(requests);
        }
    } catch (e) {
        console.error("Failed to fetch admin data", e);
    }
  };

  useEffect(() => {
    // 🔒 Security Check: Only Super Admin can access this page
    if (user && !user.is_admin) {
        router.push('/dashboard');
        return;
    }

    // Select default asset
    if (assets.length > 0) setSelectedAsset(assets[1]); // Gold default
    
    fetchAllAdminData();

    // Set up Real-time listener for badges
    if (user?.is_admin) {
        const socket = connectRealtime(user);

        socket.on('connect', () => {
            console.log("Admin realtime connected");
        });

        socket.on('admin_notification', (notif) => {
            console.log("Admin page real-time update:", notif);
            fetchAllAdminData();
        });

        socket.on('signal_request', () => {
            fetchAllAdminData();
        });

        socket.on('active_clients_count', (count) => {
            setLiveClientsCount(count);
        });

        socket.on('global_timer_update', (data) => {
            if (data.server_time) updateServerTimeOffset(data.server_time);
            setActiveGlobalTimer(data.expires_at);
        });

        return () => socket.disconnect();
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {} finally {
      dispatch(logout());
      router.push('/login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!selectedAsset) {
        setMessage('Please select a trading asset');
        setLoading(false);
        return;
    }

    try {
      const payload = {
        symbol: selectedAsset.symbol,
        type: type,
        entry_price: parseFloat(formData.entry_price),
        target_price: parseFloat(formData.target_price),
        stop_loss: parseFloat(formData.stop_loss),
        signal_type: formData.signal_type,
        timer_minutes: formData.timer_minutes,
        description: `Signal for ${selectedAsset.name}`,
      };

      const created = await signalService.createSignal(payload);
      if (created.email?.error) toast.error(`Signal sent, but email failed: ${created.email.error}`);
      else if (created.email?.sent) toast.success(`Email sent to ${created.email.sent} member(s)`);
      setMessage(formData.timer_minutes ? `Signal scheduled for release in ${formData.timer_minutes}m` : 'Signal broadcasted successfully!');
      
      // Reset form
      setFormData({
        entry_price: '',
        target_price: '',
        stop_loss: '',
        signal_type: 'free',
        timer_minutes: '',
      });
      
      // Refresh recent list
      const data = await signalService.getSignalsDashboard();
      setRecentSignals(data.active_signals || []);

    } catch (error) {
      console.error("Error creating signal:", error);
      setMessage(error.response?.data?.message || 'Error posting signal');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGlobalTimer = async () => {
      if (!globalTimerMinutes) return;
      try {
          setLoading(true);
          await signalService.setGlobalTimer(globalTimerMinutes);
          toast.success(`Global timer set for ${globalTimerMinutes} minutes`);
          setGlobalTimerMinutes('');
          fetchAllAdminData();
      } catch (e) {
          toast.error(e.response?.data?.message || "Failed to set global timer");
      } finally {
          setLoading(false);
      }
  };

  const handleClearGlobalTimer = () => {
      setConfirmModal({
          isOpen: true,
          title: 'Clear Global Timer',
          message: 'Are you sure you want to stop the active countdown timer? This will hide the banner for all users.',
          type: 'clear_timer'
      });
  };

  const handleApproveRequest = (id) => {
      setConfirmModal({
          isOpen: true,
          title: 'Approve Signal Access',
          message: 'Grant this user access to the upcoming signal?',
          type: 'approve_request',
          data: id
      });
  };

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <AdminSidebar
        active="signals"
        user={mounted ? user : null}
        pendingDeposits={adminStats?.pending_deposits || 0}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* BACKDROP */}
      {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="admin-main-content">
        <header className="admin-top-navbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="admin-btn-hamburger" onClick={toggleSidebar}>☰</button>
            <div>
              <h2 className="admin-page-title">Signal Creation</h2>
              <p className="admin-subtitle">Broadcast new signals</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ThemeToggle />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--admin-success)' }}>
               <div style={{ width: '8px', height: '8px', background: 'var(--admin-success)', borderRadius: '50%', boxShadow: '0 0 8px var(--admin-success)' }}></div>
               <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-success)' }}>{liveClientsCount} active on web</span>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="admin-purchase-grid">
          {/* ASSET SELECTION (LEFT) */}
          <section>
             <div className="admin-asset-header">
                <div>
                   <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Select Trading Asset</h3>
                   <p className="admin-subtitle" style={{ marginTop: 0 }}>Choose the asset to broadcast</p>
                </div>
             </div>

             <div className="admin-search">
                <img src="/images/svg (17).png" style={{ position: 'absolute', left: '12px', top: '14px', width: '20px' }} alt="Search" />
                <input type="text" placeholder="Search coins or forex..." />
             </div>

             <div className="admin-asset-grid">
                {assets.map(asset => (
                  <div 
                    key={asset.id} 
                    className={`admin-asset-card ${selectedAsset?.id === asset.id ? 'active' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="admin-asset-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="admin-asset-icon-box" style={{ background: asset.iconColor }}>
                           <AssetIcon glyph={asset.glyph} />
                        </div>
                        <div>
                           <div style={{ fontWeight: 600 }}>{asset.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{asset.displaySymbol}</div>
                        </div>
                      </div>
                      <div className="admin-check-circle">
                         {selectedAsset?.id === asset.id && <img src="/images/i (11).png" style={{ width: '14px', filter: 'invert(1)' }} alt="Checked" />}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </section>

          {/* SIGNAL CONFIGURATION SUMMARY (RIGHT) */}
          <aside>
             <div className="admin-summary-card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Signal Configuration</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '1rem' }}>
                   <span style={{ color: 'var(--admin-text-muted)' }}>Selected Asset</span>
                   <strong>{selectedAsset?.name || '---'}</strong>
                </div>

                <div className="admin-type-toggle">
                    <div 
                        className={`admin-type-btn buy ${type === 'Buy' ? 'active' : ''}`}
                        onClick={() => setType('Buy')}
                    >BUY</div>
                    <div 
                        className={`admin-type-btn sell ${type === 'Sell' ? 'active' : ''}`}
                        onClick={() => setType('Sell')}
                    >SELL</div>
                </div>

                <div className="admin-form-group">
                    <label>Entry Price</label>
                    <input 
                        type="number" 
                        step="any"
                        name="entry_price"
                        className="admin-form-input" 
                        value={formData.entry_price}
                        onChange={handleChange}
                        placeholder="e.g. 2350.50" 
                        required 
                    />
                </div>

                <div className="admin-form-group">
                    <label>Target Price (TP)</label>
                    <input 
                        type="number" 
                        step="any"
                        name="target_price"
                        className="admin-form-input" 
                        value={formData.target_price}
                        onChange={handleChange}
                        placeholder="e.g. 2360.00" 
                        required 
                    />
                </div>

                <div className="admin-form-group">
                    <label>Stop Loss (SL)</label>
                    <input 
                        type="number" 
                        step="any"
                        name="stop_loss"
                        className="admin-form-input" 
                        value={formData.stop_loss}
                        onChange={handleChange}
                        placeholder="e.g. 2340.00" 
                        required 
                    />
                </div>
                
                <div className="admin-form-group">
                    <label>Category</label>
                    <select 
                        name="signal_type" 
                        className="admin-form-input"
                        value={formData.signal_type}
                        onChange={handleChange}
                    >
                        <option value="free">Free Signal</option>
                        <option value="premium">Premium Signal</option>
                    </select>
                </div>

                <div className="admin-form-group">
                    <label>Release Countdown (Minutes)</label>
                    <input 
                        type="number" 
                        name="timer_minutes"
                        className="admin-form-input" 
                        value={formData.timer_minutes}
                        onChange={handleChange}
                        placeholder="e.g. 5 or 8 minutes" 
                    />
                    <small style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem' }}>Leave blank for instant broadcast</small>
                </div>

                {message && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: message.includes('success') ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
                        {message}
                    </div>
                )}

                {getSignalLevelError({ type, ...formData }) && (
                    <div role="alert" style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '8px 10px' }}>
                        {getSignalLevelError({ type, ...formData })}
                    </div>
                )}

                <button type="submit" className="admin-btn-broadcast" disabled={loading || !!getSignalLevelError({ type, ...formData })}>
                   {loading ? <><span className="btn-spinner dark"></span>Processing...</> : (
                       <>
                        <img src="/images/svg (13).png" style={{ height: '18px', filter: 'invert(1)' }} alt="Broadcast" />
                        Broadcast Signal
                       </>
                   )}
                </button>
                
                <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                   ⓘ Signals are instantly broadcasted to all active clients.
                </p>
              </div>
          </aside>
        </form>

        {/* NEW GLOBAL TIMER & REQUESTS SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            {/* GLOBAL TIMER CARD */}
            <section className="admin-summary-card" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>⌛</span> Next Signal Countdown
                </h3>
                <p className="admin-subtitle">Set a breaking news style timer for all users</p>
                
                {activeGlobalTimer ? (
                    <div style={{ background: 'rgba(var(--t-accent-rgb), 0.1)', border: '1px solid var(--t-accent)', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--t-gold)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '5px' }}>Active Timer</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--t-gold)', fontFamily: 'monospace' }}>
                            {(() => {
                                const totalSeconds = Math.max(0, Math.floor((new Date(activeGlobalTimer) - currentTime) / 1000));
                                const mins = Math.floor(totalSeconds / 60);
                                const secs = totalSeconds % 60;
                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                            })()}
                        </div>
                        <button 
                            onClick={handleClearGlobalTimer}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 15px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontSize: '0.8rem' }}
                        >Stop Timer</button>
                    </div>
                ) : (
                    <div className="admin-form-group">
                        <label>Timer Duration (Minutes)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="number" 
                                className="admin-form-input" 
                                value={globalTimerMinutes}
                                onChange={(e) => setGlobalTimerMinutes(e.target.value)}
                                placeholder="e.g. 10" 
                            />
                            <button 
                                onClick={handleSetGlobalTimer}
                                className="admin-btn-broadcast" 
                                style={{ margin: 0, whiteSpace: 'nowrap', width: 'auto', padding: '0 20px' }}
                                disabled={loading || !globalTimerMinutes}
                            >
                                {loading ? <><span className="btn-spinner dark"></span>Starting...</> : 'Start Countdown'}
                            </button>
                        </div>
                    </div>
                )}
                <small style={{ color: 'var(--admin-text-muted)' }}>ⓘ Setting this timer will clear all previous signal requests.</small>
            </section>

            {/* SIGNAL REQUESTS CARD */}
            <section className="admin-summary-card" style={{ margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📥</span> Signal Access Requests
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {signalRequests.length === 0 ? (
                        <p style={{ color: 'var(--admin-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No pending requests</p>
                    ) : (
                        signalRequests.map(req => (
                            <div key={req.id} style={{ background: 'var(--tw-03)', border: '1px solid var(--admin-border-color)', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{req.User?.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>Wallet: ${req.User?.wallet_balance}</div>
                                </div>
                                <div>
                                    {req.status === 'pending' ? (
                                        <button 
                                            onClick={() => handleApproveRequest(req.id)}
                                            style={{ background: 'var(--admin-success)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                        >Approve</button>
                                    ) : (
                                        <span style={{ color: 'var(--admin-success)', fontSize: '0.75rem', fontWeight: 600 }}>Approved ✅</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>

        {/* RECENT BROADCASTS SECTION */}
        <section className="admin-recent-section">
           <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Open &amp; Recent Signals <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--admin-text-muted)' }}>— close every open signal with its result</span></h3>
           <div className="admin-recent-grid">
              {[...recentSignals.filter(s => s.status === 'Active'), ...recentSignals.filter(s => s.status !== 'Active').slice(0, 3)].map((sig, idx) => {
                const isBuy = String(sig.type || '').toLowerCase() === 'buy';
                const isOpen = sig.status === 'Active';
                const locked = sig.release_at && new Date(sig.release_at) > currentTime;
                const statusClass = String(sig.status).includes('Hit') ? 'win' : String(sig.status).includes('Stop') ? 'loss' : 'neutral';
                return (
                  <div key={sig.id || idx} className={`asg-card ${isOpen ? 'asg-card--open' : ''}`}>
                    <div className="asg-top">
                      <span className="asg-icon">{sig.symbol.includes('XAU') ? 'XAU' : sig.symbol.includes('XAG') ? 'XAG' : sig.symbol.includes('BTC') ? '₿' : 'FX'}</span>
                      <div className="asg-title">
                        <strong>{sig.symbol}</strong>
                        <small>{new Date(sig.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small>
                      </div>
                      <span className={`asg-side ${isBuy ? 'asg-side--buy' : 'asg-side--sell'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
                    </div>

                    <div className="asg-levels">
                      <div><small>Entry</small><b>{sig.entry_price ?? '—'}</b></div>
                      <div><small>Target</small><b className="asg-win">{sig.target_price ?? '—'}</b></div>
                      <div><small>Stop loss</small><b className="asg-loss">{sig.stop_loss ?? '—'}</b></div>
                    </div>

                    <div className="asg-meta">
                      <span>{sig.total_taken || 0} purchased</span>
                      <span className="asg-dot" aria-hidden="true">•</span>
                      <span>{sig.target_user_id ? 'Private' : 'Broadcast'}</span>
                      {locked && (
                        <>
                          <span className="asg-dot" aria-hidden="true">•</span>
                          <span className="asg-timer">
                            ⏳ {(() => {
                              const totalSeconds = Math.max(0, Math.floor((new Date(sig.release_at) - currentTime) / 1000));
                              return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
                            })()}
                          </span>
                          <button
                            type="button"
                            className="asg-extend"
                            onClick={async () => {
                              try {
                                await signalService.extendSignalTimer(sig.id, 2);
                                fetchAllAdminData();
                                toast.success("Timer extended by 2 minutes");
                              } catch (e) { toast.error("Failed to extend timer"); }
                            }}
                          >+2 min</button>
                        </>
                      )}
                    </div>

                    {/* Close the signal with its result — settles every member who took it. */}
                    <div className="asg-result">
                      {isOpen ? (
                        <>
                          <span className="asg-result-label">Close with result:</span>
                          <div className="asg-result-btns">
                            {[['TP Hit', 'win'], ['Stop Loss', 'loss'], ['Closed', 'neutral']].map(([label, kind]) => (
                              <button
                                key={label}
                                type="button"
                                className={`asg-result-btn asg-result-btn--${kind}`}
                                onClick={async () => {
                                  try {
                                    await signalService.updateSignalStatus(sig.id, label);
                                    toast.success(`${sig.symbol} marked as ${label}`);
                                    fetchAllAdminData();
                                  } catch (e) { toast.error("Failed to update signal"); }
                                }}
                              >{label}</button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className={`asg-status asg-status--${statusClass}`}>{sig.status}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {recentSignals.length === 0 && (
                <p style={{ color: 'var(--admin-text-muted)' }}>No recent broadcasts found.</p>
              )}
           </div>
        </section>
        {/* CUSTOM CONFIRM MODAL */}
        {confirmModal.isOpen && (
            <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="admin-modal-content" style={{ background: 'var(--t-surface)', padding: '2.5rem', borderRadius: '24px', color: 'var(--t-text)', width: '400px', border: '1px solid var(--tw-10)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: confirmModal.type === 'approve_request' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '24px' }}>{confirmModal.type === 'approve_request' ? '✅' : '⚠️'}</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{confirmModal.title}</h2>
                        <p style={{ color: 'var(--t-text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{confirmModal.message}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={executeConfirmAction} 
                            disabled={loading}
                            style={{ flex: 2, background: confirmModal.type === 'approve_request' ? 'var(--admin-success)' : 'var(--admin-danger)', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: 'var(--t-text)', fontSize: '1rem' }}
                        >
                            {loading ? <><span className="btn-spinner"></span>Processing...</> : (confirmModal.type === 'approve_request' ? 'Confirm Approval' : 'Yes, Stop Timer')}
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
      </main>
    </div>
  );
}
