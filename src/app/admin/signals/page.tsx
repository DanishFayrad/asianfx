'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import signalService, { getSignalLevelError } from '../../../services/signalService';
import { serverTimeOffset } from '../../../services/serverTime';
import { connectRealtime } from '../../../services/realtimeService';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useAdminStats, useSignalsDashboard } from '@/hooks/queries';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import Skeleton from '@/components/Skeleton';
import { IconTrash } from '@/components/admin/AdminIcons';
import ConfirmDialog from '@/components/ConfirmDialog';
import '../../../styles/adminSignals.css';
import { errorMessage } from '@/lib/supabaseClient';
import type { Signal } from '@/types';
import { ASSETS as assets, type Asset } from '@/config/assets';
import AssetBadge, { AssetGlyph as AssetIcon } from '@/components/AssetBadge';

/** Cards shown at first in the signals list, and how many more each "Show more" adds. */
const SIGNALS_PAGE = 9;

/** Filter tabs for the signals list. */
const SIGNAL_FILTERS = [
  { key: 'active', label: 'Active', hint: 'Open signals you still need to close' },
  { key: 'recent', label: 'Recent', hint: 'Signals sent in the last 24 hours' },
  { key: 'weekly', label: 'Weekly', hint: 'Signals sent in the last 7 days' },
] as const;
type SignalFilter = typeof SIGNAL_FILTERS[number]['key'];
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** "1:05:09" / "12:30" style countdown until `iso`, from `now`. */
const countdown = (iso: string | null | undefined, now: Date) => {
  const total = Math.max(0, Math.floor((new Date(iso || 0).getTime() - now.getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

export default function AdminSignals() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const handleLogout = useLogout();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.is_admin;
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
  useEffect(() => {
    setMounted(true);
  }, []);


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [type, setType] = useState('Buy');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    entry_price: '',
    target_price: '',
    stop_loss: '',
    signal_type: 'free',
    timer_minutes: '', // New field
    close_minutes: '', // auto-close this many minutes after release
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const signalsQuery = useSignalsDashboard(user?.id, isAdmin);
  const recentSignals: Signal[] = signalsQuery.data?.active_signals ?? [];
  const signalsLoading = signalsQuery.isPending;
  const adminStats = useAdminStats(isAdmin).data ?? null;
  const [liveClientsCount, setLiveClientsCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date(Date.now() + serverTimeOffset)), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Signals list: Active / Recent / Weekly tabs, a page of cards at a time ("Show more" adds the next page).
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('recent');
  const [signalsShown, setSignalsShown] = useState(SIGNALS_PAGE);
  // A signal past its "Close after" time counts as closed even before the database catches up.
  const isSignalOpen = (s: Signal) =>
    s.status === 'Active' && !(s.close_at && new Date(s.close_at).getTime() <= currentTime.getTime());
  const openSignals = recentSignals.filter(isSignalOpen);
  const closedSignals = recentSignals.filter((s) => !isSignalOpen(s));
  const sentSince = (ms: number) => [...openSignals, ...closedSignals]
    .filter((s) => new Date(s.created_at).getTime() >= currentTime.getTime() - ms);
  const signalLists: Record<SignalFilter, Signal[]> = {
    active: openSignals,
    recent: sentSince(DAY_MS),
    weekly: sentSince(WEEK_MS),
  };
  const filteredSignals = signalLists[signalFilter];
  const changeSignalFilter = (key: SignalFilter) => { setSignalFilter(key); setSignalsShown(SIGNALS_PAGE); };

  // Signals or deposits changed: reload the signal list and the admin stats / badges.
  const fetchAllAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ['signals'] });
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  useEffect(() => {
    // 🔒 Security Check: Only Super Admin can access this page
    if (user && !user.is_admin) {
        router.push('/dashboard');
        return;
    }

    // Select default asset
    if (assets.length > 0) setSelectedAsset(assets[1]); // Gold default

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

        socket.on('active_clients_count', (count) => {
            setLiveClientsCount(count);
        });

        return () => socket.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_admin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        close_minutes: formData.close_minutes,
        description: `Signal for ${selectedAsset.name}`,
      };

      const created = await signalService.createSignal(payload);
      if (created.email?.error) toast.error(`Signal sent, but email failed: ${created.email.error}`);
      else if (created.email?.sent) toast.success('Email sent to members');
      setMessage(formData.timer_minutes ? `Signal scheduled for release in ${formData.timer_minutes}m` : 'Signal broadcasted successfully!');
      
      // Reset form
      setFormData({
        entry_price: '',
        target_price: '',
        stop_loss: '',
        signal_type: 'free',
        timer_minutes: '',
        close_minutes: '',
      });
      
      // Refresh recent list
      queryClient.invalidateQueries({ queryKey: ['signals'] });

    } catch (error) {
      console.error("Error creating signal:", error);
      setMessage(errorMessage(error, 'Error posting signal'));
    } finally {
      setLoading(false);
    }
  };

  // Delete asks for confirmation first: the trash button only opens the popup.
  const [signalToDelete, setSignalToDelete] = useState<Signal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteSignal = async () => {
      if (!signalToDelete) return;
      setIsDeleting(true);
      try {
          await signalService.deleteSignal(signalToDelete.id);
          toast.success(`${signalToDelete.symbol} signal deleted`);
          setSignalToDelete(null);
          fetchAllAdminData();
      } catch (e) {
          toast.error("Failed to delete signal");
      } finally {
          setIsDeleting(false);
      }
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
                  <input type="number" step="any" name="entry_price" value={formData.entry_price} onChange={handleChange} placeholder="Enter price" required />
                </label>
                <label>
                  <small className="bsg-win">Take profit</small>
                  <input type="number" step="any" name="target_price" value={formData.target_price} onChange={handleChange} placeholder="Enter price" required />
                </label>
                <label>
                  <small className="bsg-loss">Stop loss</small>
                  <input type="number" step="any" name="stop_loss" value={formData.stop_loss} onChange={handleChange} placeholder="Enter price" required />
                </label>
              </div>
              <p className="bsg-hint">
                {type === 'Buy' ? 'BUY → Take profit above Entry, Stop loss below Entry.' : 'SELL → Take profit below Entry, Stop loss above Entry.'}
              </p>
            </div>

            {/* Release delay and auto-close, side by side */}
            <div className="bsg-timers">
              <label className="bsg-field">
                <span className="bsg-label">Release after (minutes)</span>
                <input type="number" min="0" name="timer_minutes" autoComplete="off" onWheel={(e) => e.currentTarget.blur()} className="bsg-input" value={formData.timer_minutes} onChange={handleChange} placeholder="Enter Time" />
              </label>
              <label className="bsg-field">
                <span className="bsg-label">Close after (minutes)</span>
                <input type="number" min="0" name="close_minutes" autoComplete="off" onWheel={(e) => e.currentTarget.blur()} className="bsg-input" value={formData.close_minutes} onChange={handleChange} placeholder="Enter Time" />
              </label>
            </div>
            <p className="bsg-hint">Close after: the signal closes automatically this many minutes after release. Leave empty to close it yourself.</p>

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
              {Number(formData.close_minutes) > 0 && (
                <p className="bsg-preview-foot">⏱ Closes automatically {formData.close_minutes} min after release</p>
              )}
            </section>


          </div>
        </div>

        {/* RECENT BROADCASTS SECTION */}
        <section className="admin-recent-section">
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
             <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Open &amp; Recent Signals <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--admin-text-muted)' }}>— close every open signal with its result</span></h3>
             <label className="asg-filter">
               <span>Show</span>
               <select
                 value={signalFilter}
                 onChange={(e) => changeSignalFilter(e.target.value as SignalFilter)}
                 aria-label="Filter signals"
                 title={SIGNAL_FILTERS.find((f) => f.key === signalFilter)?.hint}
               >
                 {SIGNAL_FILTERS.map((f) => (
                   <option key={f.key} value={f.key}>
                     {f.label}
                   </option>
                 ))}
               </select>
             </label>
           </div>
           <div className="admin-recent-grid">
              {filteredSignals.slice(0, signalsShown).map((sig, idx) => {
                const isBuy = String(sig.type || '').toLowerCase() === 'buy';
                const isOpen = isSignalOpen(sig);
                const closesSoon = isOpen && !!sig.close_at;
                const locked = isOpen && sig.release_at && new Date(sig.release_at) > currentTime; // closed signals stop counting down
                const statusClass = String(sig.status).includes('Hit') ? 'win' : String(sig.status).includes('Stop') ? 'loss' : 'neutral';
                return (
                  <div key={sig.id || idx} className={`asg-card ${isOpen ? 'asg-card--open' : ''}`}>
                    <div className="asg-top">
                      <AssetBadge symbol={sig.symbol} size={34} />
                      <div className="asg-title">
                        <strong>{sig.symbol}</strong>
                        <small>{new Date(sig.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</small>
                      </div>
                      <span className={`asg-side ${isBuy ? 'asg-side--buy' : 'asg-side--sell'}`}>{isBuy ? 'BUY' : 'SELL'}</span>
                      <button
                        type="button"
                        className="asg-delete"
                        onClick={() => setSignalToDelete(sig)}
                        aria-label={`Delete ${sig.symbol} signal`}
                        title="Delete signal"
                      >
                        <IconTrash size={15} />
                      </button>
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
                      {closesSoon && (
                        <>
                          <span className="asg-dot" aria-hidden="true">•</span>
                          <span className="asg-timer" title="This signal closes automatically">⏱ Closes in {countdown(sig.close_at, currentTime)}</span>
                          <button
                            type="button"
                            className="asg-extend"
                            title="Remove the auto-close timer"
                            onClick={async () => {
                              try {
                                await signalService.removeCloseTimer(sig.id);
                                fetchAllAdminData();
                                toast.success('Auto-close removed');
                              } catch (e) { toast.error(errorMessage(e, 'Failed to remove auto-close')); }
                            }}
                          >✕ Remove</button>
                        </>
                      )}
                      {locked && (
                        <>
                          <span className="asg-dot" aria-hidden="true">•</span>
                          <span className="asg-timer">
                            ⏳ {(() => {
                              const totalSeconds = Math.max(0, Math.floor((new Date(sig.release_at || 0).getTime() - currentTime.getTime()) / 1000));
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
                            {/* Saved as 'TP Hit' / 'Stop Loss' — the database settles members' wins/losses from these. */}
                            {[['TP Hit', 'win', 'Profit Trade'], ['Stop Loss', 'loss', 'Loss Trade']].map(([status, kind, label]) => (
                              <button
                                key={status}
                                type="button"
                                className={`asg-result-btn asg-result-btn--${kind}`}
                                onClick={async () => {
                                  try {
                                    await signalService.updateSignalStatus(sig.id, status);
                                    toast.success(`${sig.symbol} marked as ${label} — find it under Show: Recent`);
                                    fetchAllAdminData();
                                  } catch (e) { toast.error("Failed to update signal"); }
                                }}
                              >{label}</button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <span className={`asg-status asg-status--${statusClass}`}>{statusClass === 'win' ? 'Profit' : statusClass === 'loss' ? 'Loss' : 'Expired'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {signalsLoading && [0, 1].map((i) => (
                <div key={i} className="asg-card" aria-hidden="true">
                  <div className="asg-top">
                    <Skeleton width={44} height={44} radius={12} />
                    <div className="asg-title" style={{ flex: 1, display: 'grid', gap: 6 }}>
                      <Skeleton width="45%" height={16} />
                      <Skeleton width="65%" height={12} />
                    </div>
                  </div>
                  <div className="asg-levels">
                    {[0, 1, 2].map((j) => <div key={j}><Skeleton width="70%" height={20} radius={8} /></div>)}
                  </div>
                  <Skeleton width="40%" height={12} />
                </div>
              ))}
              {!signalsLoading && filteredSignals.length === 0 && (
                <p style={{ color: 'var(--admin-text-muted)' }}>
                  {signalFilter === 'active' ? 'No open signals — every signal has been closed.'
                    : signalFilter === 'weekly' ? 'No signals in the last 7 days.'
                    : 'No recent broadcasts found.'}
                </p>
              )}
           </div>
           {filteredSignals.length > signalsShown && (
             <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
               <button
                 type="button"
                 className="bsg-btn-ghost"
                 onClick={() => setSignalsShown((n) => n + SIGNALS_PAGE)}
               >
                 Show more ({filteredSignals.length - signalsShown} more)
               </button>
             </div>
           )}
        </section>
      </main>

      <ConfirmDialog
        open={!!signalToDelete}
        title="Delete this signal?"
        message={signalToDelete && (
          <>
            <strong>{signalToDelete.symbol} {String(signalToDelete.type || '').toUpperCase()}</strong> will be removed from the list and
            from members&apos; dashboards. This cannot be undone.
          </>
        )}
        busy={isDeleting}
        onConfirm={confirmDeleteSignal}
        onCancel={() => setSignalToDelete(null)}
      />
    </div>
  );
}
