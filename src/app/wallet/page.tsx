'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useAdminStats, useWalletStats } from '@/hooks/queries';
import DepositModal from '@/components/DepositModal';
import ThemeToggle from '@/components/ThemeToggle';
import UserNavbar from '@/components/UserNavbar';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { IconWallet, IconArrowDown, IconArrowUp, IconTrend, IconClock, IconUsers, IconBroadcast } from '@/components/admin/AdminIcons';
import '../../styles/adminTransactions.css';
import '../../styles/memberDashboard.css';
import '../../styles/wallet.css';
import type { AdminStats, WalletStats } from '@/types';

const money = (n: number | string | null | undefined) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Wallet() {
  const router = useRouter();
  const { user, refresh: refreshUserProfile } = useCurrentUser();
  const handleLogout = useLogout();
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = mounted && !!user?.is_admin;

  // Admins get platform stats, members their own wallet stats — both shapes are all-optional.
  const adminStatsQuery = useAdminStats(!!user?.is_admin);
  const walletStatsQuery = useWalletStats(user?.id, !!user && !user.is_admin);
  const stats: (AdminStats & WalletStats) | null =
    (user?.is_admin ? adminStatsQuery.data : walletStatsQuery.data) ?? null;
  const fetchStats = () => (user?.is_admin ? adminStatsQuery.refetch() : walletStatsQuery.refetch());

  // Wallet balance can change elsewhere (deposit approved, signal taken) — reload it on open.
  useEffect(() => {
    if (user) refreshUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const profit = Number(stats?.total_profit || 0);

  // Admins: same admin shell as every other admin page.
  if (isAdmin) {
    return (
      <div className="admin-layout">
        <AdminSidebar
          active="wallet"
          user={user}
          pendingDeposits={stats?.pending_deposits || 0}
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

        <main className="admin-main-content">
          <AdminHeader
            title="Platform Wallet"
            subtitle="Balances, deposits and revenue across all members"
            onMenu={() => setIsSidebarOpen(true)}
          />

          <div className="atx">
            {/* HERO: money currently held in member wallets */}
            <section className="awl-hero">
              <div className="awl-hero-main">
                <span className="awl-hero-label"><IconWallet size={16} /> Total platform balance</span>
                <strong className="awl-hero-value">${money(stats?.platform_balance)}</strong>
                <span className="awl-hero-note">Held in member wallets right now</span>
              </div>
              <div className="awl-hero-side">
                <div>
                  <span><IconUsers size={14} /> Members</span>
                  <strong>{stats?.total_users ?? 0}</strong>
                </div>
                <div>
                  <span>Avg. balance</span>
                  <strong>${money(stats?.total_users ? Number(stats.platform_balance || 0) / stats.total_users : 0)}</strong>
                </div>
              </div>
            </section>

            {/* KPI ROW */}
            <section className="atx-kpis" aria-label="Platform totals">
              <div className="atx-kpi">
                <span className="atx-kpi-label awl-in"><IconArrowDown size={15} /> Deposits received</span>
                <strong>${money(stats?.total_deposit)}</strong>
                <small>{stats?.deposit_count || 0} approved</small>
              </div>
              <div className="atx-kpi">
                <span className="atx-kpi-label awl-out"><IconArrowUp size={15} /> Withdrawals paid</span>
                <strong>${money(stats?.total_withdrawal)}</strong>
                <small>{stats?.withdrawal_count || 0} processed</small>
              </div>
              <div className="atx-kpi atx-kpi--ok">
                <span className="atx-kpi-label"><IconTrend size={15} /> Signal fee revenue</span>
                <strong>${money(stats?.total_profit)}</strong>
                <small>Earned from signal purchases</small>
              </div>
              <button type="button" className={`atx-kpi awl-link ${(stats?.pending_deposits || 0) > 0 ? 'atx-kpi--warn' : ''}`} onClick={() => router.push('/transaction')}>
                <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
                <strong>{stats?.pending_deposits || 0}</strong>
                <small>{(stats?.pending_deposits || 0) > 0 ? 'Review deposits →' : 'All caught up'}</small>
              </button>
            </section>
          </div>
        </main>
      </div>
    );
  }

  // Members: same top navbar as the Signals page.
  return (
    <div className="db-main-layout">
      <UserNavbar active="wallet" user={mounted ? user : null} onLogout={handleLogout} />

      <div className="db-container wallet-page">
        <div className="db-top-bar">
          <div>
            <h1 className="db-page-title">Wallet</h1>
            <p className="db-subtitle">Your balance, deposits and signal spending</p>
          </div>
          <div className="right-actions">
            <button className="deposit" onClick={() => setIsDepositOpen(true)}>Deposit</button>
          </div>
        </div>

        {/* HERO: what the member can spend right now */}
        <section className="awl-hero mwl-hero">
          <div className="awl-hero-main">
            <span className="awl-hero-label"><IconWallet size={16} /> Current wallet balance</span>
            <strong className="awl-hero-value">${money(stats?.balance ?? user?.wallet_balance)}</strong>
            <span className="awl-hero-note">
              {Number(stats?.balance ?? user?.wallet_balance ?? 0) >= 1
                ? `Enough for ${Math.floor(Number(stats?.balance ?? user?.wallet_balance ?? 0))} signal${Math.floor(Number(stats?.balance ?? user?.wallet_balance ?? 0)) === 1 ? '' : 's'} at $1 each`
                : 'Add funds to start taking signals'}
            </span>
          </div>
          <div className="awl-hero-side">
            <div>
              <span>🎁 Free signals</span>
              <strong>{user?.free_signals || 0}</strong>
            </div>
            <div>
              <span><IconClock size={14} /> Signal fee</span>
              <strong>$1.00</strong>
            </div>
          </div>
        </section>

        {/* KPI ROW */}
        <section className="mdb-kpis mwl-kpis" aria-label="Wallet totals">
          <div className="mdb-kpi">
            <span className="mdb-kpi-icon"><IconArrowDown size={18} /></span>
            <div>
              <span className="mdb-kpi-label">Total deposited</span>
              <strong>${money(stats?.total_deposit)}</strong>
              <small className="mwl-muted">{stats?.deposit_count || 0} approved</small>
            </div>
          </div>
          <div className="mdb-kpi">
            <span className="mdb-kpi-icon mwl-icon-purple"><IconArrowUp size={18} /></span>
            <div>
              <span className="mdb-kpi-label">Total withdrawn</span>
              <strong>${money(stats?.total_withdrawal)}</strong>
              <small className="mwl-muted">{stats?.withdrawal_count || 0} processed</small>
            </div>
          </div>
          <div className="mdb-kpi">
            <span className="mdb-kpi-icon mdb-kpi-icon--green"><IconTrend size={18} /></span>
            <div>
              <span className="mdb-kpi-label">Signal profit</span>
              <strong style={{ color: profit < 0 ? '#ef4444' : '#16a34a' }}>{profit < 0 ? '-' : ''}${money(Math.abs(profit))}</strong>
              <small className="mwl-muted">Updated live</small>
            </div>
          </div>
          <div className="mdb-kpi">
            <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconBroadcast size={18} /></span>
            <div>
              <span className="mdb-kpi-label">Spent on signals</span>
              <strong>${money(stats?.total_signal_fees)}</strong>
              <small className="mwl-muted">Free after a Stop Loss</small>
            </div>
          </div>
        </section>
      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => { setIsDepositOpen(false); refreshUserProfile(); fetchStats(); }} />
    </div>
  );
}
