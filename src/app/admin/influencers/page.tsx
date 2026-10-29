'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import Skeleton from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useAdminStats, useInfluencerApplications, useInfluencers } from '@/hooks/queries';
import influencerService from '@/services/influencerService';
import { displayUserId } from '@/lib/memberId';
import { errorMessage } from '@/lib/supabaseClient';
import type { InfluencerApplication, Profile } from '@/types';
import '@/styles/adminSignals.css';
import '@/styles/adminShell.css';

const DEFAULT_PERCENT = 10;
const money = (n: number | string | null | undefined) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Admin: review influencer applications and set each influencer's commission percentage. */
export default function AdminInfluencersPage() {
    // Access (admins only) is enforced by AuthGuard before this page renders.
    const { user } = useCurrentUser();
    const handleLogout = useLogout();
    const queryClient = useQueryClient();
    const isAdmin = !!user?.is_admin;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const applicationsQuery = useInfluencerApplications(isAdmin);
    const influencersQuery = useInfluencers(isAdmin);
    const pendingDeposits = useAdminStats(isAdmin).data?.pending_deposits || 0;

    const applications = applicationsQuery.data ?? [];
    const pending = applications.filter((a) => a.status === 'pending');
    const reviewed = applications.filter((a) => a.status !== 'pending');
    const influencers = influencersQuery.data ?? [];

    // Percent typed per application / per influencer, before it is saved.
    const [percents, setPercents] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [toRemove, setToRemove] = useState<Profile | null>(null);

    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'influencers'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    };

    const run = async (key: string, action: () => Promise<{ message: string }>) => {
        setBusy(key);
        try {
            const { message } = await action();
            toast.success(message);
            refresh();
        } catch (e) {
            toast.error(errorMessage(e, 'Action failed'));
        } finally {
            setBusy(null);
        }
    };

    const percentFor = (key: string, fallback: number) => percents[key] ?? String(fallback);
    const parsePercent = (value: string) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0 || n > 100) {
            toast.error('Enter a commission between 0.01 and 100');
            return null;
        }
        return n;
    };

    const approve = (app: InfluencerApplication) => {
        const n = parsePercent(percentFor(`app-${app.id}`, DEFAULT_PERCENT));
        if (n !== null) run(`app-${app.id}`, () => influencerService.approve(app.id, n));
    };
    const saveRate = (inf: Profile) => {
        const n = parsePercent(percentFor(`inf-${inf.id}`, Number(inf.commission_percent || 0)));
        if (n !== null) run(`inf-${inf.id}`, () => influencerService.setCommission(inf.id, n));
    };

    if (!user || !user.is_admin) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-bg)', color: 'var(--t-text)' }}>
                <div className="loader">Loading Admin Panel...</div>
            </div>
        );
    }

    return (
        <div className="admin-layout">
            <AdminSidebar
                active="influencers"
                user={user}
                pendingDeposits={pendingDeposits}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="admin-main-content">
                <AdminHeader
                    title="Influencers"
                    subtitle="Approve influencer applications and set each one's commission on referred deposits"
                    onMenu={() => setIsSidebarOpen(true)}
                />

                <div className="ifa">
                    {/* PENDING APPLICATIONS */}
                    <section className="ifa-card">
                        <div className="ifa-head">
                            <h2>Applications to review</h2>
                            <span className="ifa-count">{applicationsQuery.isPending ? '…' : pending.length}</span>
                        </div>
                        {applicationsQuery.isPending ? (
                            <div className="ifa-list">{[0, 1].map((i) => <Skeleton key={i} block height={88} radius={12} />)}</div>
                        ) : pending.length === 0 ? (
                            <p className="ifa-empty">No new applications. Members apply from the Refer &amp; Earn card on their dashboard.</p>
                        ) : (
                            <div className="ifa-list">
                                {pending.map((app) => {
                                    const key = `app-${app.id}`;
                                    return (
                                        <div key={app.id} className="ifa-item">
                                            <div className="ifa-info">
                                                <strong>{app.full_name}</strong>
                                                <small>
                                                    {app.User?.email || '—'}
                                                    {app.User?.user_id != null && <> · ID {displayUserId(app.User.user_id)}</>}
                                                    {' · '}Applied {fmtDate(app.created_at)}
                                                </small>
                                                <div className="ifa-tags">
                                                    <span>{app.platform}</span>
                                                    {app.followers != null && <span>{app.followers.toLocaleString()} followers</span>}
                                                    {app.phone && <span>{app.phone}</span>}
                                                    <a href={app.profile_url} target="_blank" rel="noopener noreferrer">Open profile ↗</a>
                                                </div>
                                                {app.message && <p className="ifa-msg">{app.message}</p>}
                                            </div>
                                            <div className="ifa-actions">
                                                <label className="ifa-percent" title="Commission on every deposit their referrals make">
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        max={100}
                                                        step="0.01"
                                                        value={percentFor(key, DEFAULT_PERCENT)}
                                                        onChange={(e) => setPercents((p) => ({ ...p, [key]: e.target.value }))}
                                                        aria-label="Commission percent"
                                                    />
                                                    <span>%</span>
                                                </label>
                                                <button type="button" className="ifa-btn ifa-btn--ok" disabled={busy === key} onClick={() => approve(app)}>
                                                    {busy === key ? '…' : 'Approve'}
                                                </button>
                                                <button type="button" className="ifa-btn ifa-btn--no" disabled={busy === key} onClick={() => run(key, () => influencerService.reject(app.id))}>
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* APPROVED INFLUENCERS */}
                    <section className="ifa-card">
                        <div className="ifa-head">
                            <h2>Active influencers</h2>
                            <span className="ifa-count">{influencersQuery.isPending ? '…' : influencers.length}</span>
                        </div>
                        {influencersQuery.isPending ? (
                            <div className="ifa-list">{[0, 1].map((i) => <Skeleton key={i} block height={64} radius={12} />)}</div>
                        ) : influencers.length === 0 ? (
                            <p className="ifa-empty">No approved influencers yet.</p>
                        ) : (
                            <div className="ifa-list">
                                {influencers.map((inf) => {
                                    const key = `inf-${inf.id}`;
                                    return (
                                        <div key={inf.id} className="ifa-item">
                                            <div className="ifa-info">
                                                <strong>{inf.name || inf.email}</strong>
                                                <small>{inf.email} · ID {displayUserId(inf.user_id)}</small>
                                                <div className="ifa-tags">
                                                    <span>{inf.referral_count || 0} referrals</span>
                                                    <span>${money(inf.total_referral_deposits)} referred deposits</span>
                                                    <span>${money(inf.affiliate_balance)} commission earned</span>
                                                </div>
                                            </div>
                                            <div className="ifa-actions">
                                                <label className="ifa-percent" title="Commission on every deposit their referrals make">
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        max={100}
                                                        step="0.01"
                                                        value={percentFor(key, Number(inf.commission_percent || 0))}
                                                        onChange={(e) => setPercents((p) => ({ ...p, [key]: e.target.value }))}
                                                        aria-label="Commission percent"
                                                    />
                                                    <span>%</span>
                                                </label>
                                                <button type="button" className="ifa-btn ifa-btn--ok" disabled={busy === key} onClick={() => saveRate(inf)}>
                                                    {busy === key ? '…' : 'Save'}
                                                </button>
                                                <button type="button" className="ifa-btn ifa-btn--no" disabled={busy === key} onClick={() => setToRemove(inf)}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* HISTORY */}
                    {reviewed.length > 0 && (
                        <section className="ifa-card">
                            <div className="ifa-head"><h2>Reviewed applications</h2></div>
                            <div className="ifa-list">
                                {reviewed.slice(0, 20).map((app) => (
                                    <div key={app.id} className="ifa-item ifa-item--done">
                                        <div className="ifa-info">
                                            <strong>{app.full_name}</strong>
                                            <small>{app.User?.email || '—'} · {app.platform} · {fmtDate(app.created_at)}</small>
                                        </div>
                                        <span className={`ifa-status ifa-status--${app.status}`}>
                                            {app.status === 'approved' ? `Approved · ${Number(app.commission_percent || 0)}%` : 'Rejected'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>

            <ConfirmDialog
                open={!!toRemove}
                title="Remove this influencer?"
                message={toRemove && (
                    <><strong>{toRemove.name || toRemove.email}</strong> will stop earning commission on new deposits. Commission already earned stays in their balance.</>
                )}
                confirmLabel="Yes, remove"
                busy={!!toRemove && busy === `inf-${toRemove.id}`}
                onConfirm={async () => {
                    const inf = toRemove;
                    if (!inf) return;
                    await run(`inf-${inf.id}`, () => influencerService.setCommission(inf.id, 0));
                    setToRemove(null);
                }}
                onCancel={() => setToRemove(null)}
            />
        </div>
    );
}
