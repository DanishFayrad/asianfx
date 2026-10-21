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
import AdminHeader from '@/components/admin/AdminHeader';
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
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
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
        <AdminHeader
          title="Broadcast Signal"
          subtitle="Create a signal, run a countdown and manage access requests"
          onMenu={toggleSidebar}
        >
          <span className="bsg-online" title="Members on the site right now">
            <i aria-hidden="true" /> {liveClientsCount} online
          </span>
        </AdminHeader>

        <div className="bsg">
          {/* ---------- NEW SIGNAL FORM ---------- */}
          <form onSubmit={handleSubmit} className="bsg-card bsg-form">
            <div className="bsg-card-head">
              <h2>New signal</h2>
              <p>Sent to every member instantly, or when the countdown ends.</p>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Asset</span>
              <div className="bsg-assets">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`bsg-asset ${selectedAsset?.id === asset.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                    aria-pressed={selectedAsset?.id === asset.id}
                  >
                    <span className="bsg-asset-icon" style={{ background: asset.iconColor }}><AssetIcon glyph={asset.glyph} /></span>
                    <span className="bsg-asset-text">
                      <strong>{asset.name}</strong>
                      <small>{asset.displaySymbol}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Direction</span>
              <div className="bsg-dir">
                <button type="button" className={`bsg-dir-btn bsg-dir-btn--buy ${type === 'Buy' ? 'is-active' : ''}`} onClick={() => setType('Buy')}>▲ Buy</button>
                <button type="button" className={`bsg-dir-btn bsg-dir-btn--sell ${type === 'Sell' ? 'is-active' : ''}`} onClick={() => setType('Sell')}>▼ Sell</button>
              </div>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Price levels</span>
              <div className="bsg-levels">
                <label>
                  <small>Entry</small>
                  <input type="number" step="any" name="entry_price" value={formData.entry_price} onChange={handleChange} placeholder="2350.50" required />
                </label>
                <label>
                  <small className="bsg-win">Take profit</small>
                  <input type="number" step="any" name="target_price" value={formData.target_price} onChange={handleChange} placeholder={type === 'Buy' ? '2360.00' : '2340.00'} required />
                </label>
                <label>
                  <small className="bsg-loss">Stop loss</small>
                  <input type="number" step="any" name="stop_loss" value={formData.stop_loss} onChange={handleChange} placeholder={type === 'Buy' ? '2344.00' : '2356.00'} required />
                </label>
              </div>
              <p className="bsg-hint">
                {type === 'Buy' ? 'BUY → Take profit above Entry, Stop loss below Entry.' : 'SELL → Take profit below Entry, Stop loss above Entry.'}
              </p>
            </div>

            <div className="bsg-row2">
              <label className="bsg-field">
                <span className="bsg-label">Category</span>
                <select name="signal_type" className="bsg-input" value={formData.signal_type} onChange={handleChange}>
                  <option value="free">Free signal</option>
                  <option value="premium">Premium signal</option>
                </select>
              </label>
              <label className="bsg-field">
                <span className="bsg-label">Release after (minutes)</span>
                <input type="number" min="0" name="timer_minutes" className="bsg-input" value={formData.timer_minutes} onChange={handleChange} placeholder="Blank = instant" />
              </label>
            </div>

            {getSignalLevelError({ type, ...formData }) && (
              <div role="alert" className="bsg-alert bsg-alert--error">{getSignalLevelError({ type, ...formData })}</div>
            )}
            {message && (
              <div role="status" className={`bsg-alert ${/success|scheduled/i.test(message) ? 'bsg-alert--ok' : 'bsg-alert--error'}`}>{message}</div>
            )}

            <button type="submit" className="bsg-submit" disabled={loading || !!getSignalLevelError({ type, ...formData })}>
              {loading ? <><span className="btn-spinner dark"></span>Broadcasting…</> : (formData.timer_minutes ? `Schedule signal (${formData.timer_minutes} min)` : 'Broadcast signal now')}
            </button>
          </form>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div className="bsg-side">
            {/* Live preview of what members will see */}
            <section className="bsg-card bsg-preview" aria-label="Preview">
              <div className="bsg-card-head">
                <h2>Preview</h2>
                <p>How the signal appears to members after they take it</p>
              </div>
              <div className="bsg-preview-top">
                <span className="bsg-asset-icon" style={{ background: selectedAsset?.iconColor || 'var(--t-accent)' }}><AssetIcon glyph={selectedAsset?.glyph || '?'} /></span>
                <div className="bsg-asset-text">
                  <strong>{selectedAsset?.displaySymbol || 'Choose an asset'}</strong>
                  <small>{selectedAsset?.name || '—'} · {formData.signal_type === 'premium' ? 'Premium' : 'Free'}</small>
                </div>
                <span className={`bsg-pill ${type === 'Buy' ? 'bsg-pill--buy' : 'bsg-pill--sell'}`}>{type.toUpperCase()}</span>
              </div>
              <div className="bsg-preview-levels">
                <div><small>Entry</small><b>{formData.entry_price || '—'}</b></div>
                <div><small>Target</small><b className="bsg-win">{formData.target_price || '—'}</b></div>
                <div><small>Stop</small><b className="bsg-loss">{formData.stop_loss || '—'}</b></div>
              </div>
              <p className="bsg-preview-foot">
                {formData.timer_minutes ? `⏳ Locked for ${formData.timer_minutes} min after broadcast` : '⚡ Available instantly after broadcast'}
              </p>
            </section>

            {/* Global countdown */}
            <section className="bsg-card">
              <div className="bsg-card-head">
                <h2>Next signal countdown</h2>
                <p>Shows a countdown box on every member&apos;s dashboard</p>
              </div>
              {activeGlobalTimer ? (
                <div className="bsg-timer">
                  <span className="bsg-timer-label">Running</span>
                  <b>
                    {(() => {
                      const totalSeconds = Math.max(0, Math.floor((new Date(activeGlobalTimer) - currentTime) / 1000));
                      return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
                    })()}
                  </b>
                  <button type="button" className="bsg-btn-ghost bsg-btn-ghost--danger" onClick={handleClearGlobalTimer}>Stop timer</button>
                </div>
              ) : (
                <div className="bsg-inline">
                  <input type="number" min="1" className="bsg-input" value={globalTimerMinutes} onChange={(e) => setGlobalTimerMinutes(e.target.value)} placeholder="Minutes, e.g. 10" />
                  <button type="button" className="bsg-btn" onClick={handleSetGlobalTimer} disabled={loading || !globalTimerMinutes}>
                    {loading ? 'Starting…' : 'Start'}
                  </button>
                </div>
              )}
              <p className="bsg-hint">Starting a timer clears all previous access requests.</p>
            </section>

            {/* Access requests */}
            <section className="bsg-card">
              <div className="bsg-card-head bsg-card-head--row">
                <h2>Access requests</h2>
                <span className="bsg-count">{signalRequests.filter((r) => r.status === 'pending').length} pending</span>
              </div>
              {signalRequests.length === 0 ? (
                <p className="bsg-empty">No requests yet. Members can request access while a countdown is running.</p>
              ) : (
                <ul className="bsg-requests">
                  {signalRequests.map((req) => (
                    <li key={req.id}>
                      <div>
                        <strong>{req.User?.name || 'Member'}</strong>
                        <small>Wallet: ${Number(req.User?.wallet_balance || 0).toFixed(2)}</small>
                      </div>
                      {req.status === 'pending' ? (
                        <button type="button" className="bsg-btn bsg-btn--sm" onClick={() => handleApproveRequest(req.id)}>Approve</button>
                      ) : (
                        <span className="bsg-pill bsg-pill--buy">Approved</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
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
                            className="btn-cancel" onClick={closeConfirmModal} 
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
