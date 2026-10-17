'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setUser } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import transactionService from '../../services/transactionService';
import DepositModal from '@/components/DepositModal';
import ThemeToggle from '@/components/ThemeToggle';
import UserNavbar from '@/components/UserNavbar';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { IconWallet, IconArrowDown, IconArrowUp, IconTrend, IconClock, IconUsers } from '@/components/admin/AdminIcons';
import '../../styles/adminTransactions.css';
import '../../styles/wallet.css';

const money = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Wallet() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  const isAdmin = mounted && !!user?.is_admin;

  const fetchStats = async () => {
    try {
      const data = user?.is_admin
        ? await transactionService.getAdminStats()
        : await transactionService.getWalletStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to fetch wallet stats", e);
    }
  };

  const refreshUserProfile = async () => {
    try {
      const freshUser = await authService.getProfile();
      dispatch(setUser(freshUser));
    } catch (e) {
      console.error("Failed to refresh profile", e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      refreshUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const profit = Number(stats?.total_profit || 0);

  const content = (
    <>
      <div className="cards">
        <div className="card total">
          <div className="card-top">
            <img src="/images/div (4).png" alt="" />
            <div className="badge">
              <span className="dot"></span> {isAdmin ? 'PLATFORM' : 'PERSONAL'}
            </div>
          </div>
          <p className="wallet-label">{isAdmin ? 'Total Platform Balance' : 'Current Wallet Balance'}</p>
          <h3 className="wallet-amount wallet-amount--big">
            ${money(isAdmin ? stats?.platform_balance : (stats?.balance ?? user?.wallet_balance))}
          </h3>
          {!isAdmin && user?.free_signals > 0 && (
            <small style={{ color: 'var(--t-gold)', fontWeight: 600 }}>
              🎁 {user.free_signals} free signal credit{user.free_signals > 1 ? 's' : ''}
            </small>
          )}
        </div>

        <div className="card">
          <div className="card-top">
            <img src="/images/div (5).png" alt="" />
          </div>
          <p className="wallet-label">{isAdmin ? 'Platform Deposits' : 'Total Deposited'}</p>
          <h3 className="wallet-amount">${money(stats?.total_deposit)}</h3>
          <small style={{ color: 'var(--t-gold)', fontWeight: 600 }}>{stats?.deposit_count || 0} approved</small>
        </div>

        <div className="card">
          <div className="card-top">
            <img src="/images/div (6).png" alt="" />
          </div>
          <p className="wallet-label">{isAdmin ? 'Platform Withdrawals' : 'Total Withdrawn'}</p>
          <h3 className="wallet-amount">${money(stats?.total_withdrawal)}</h3>
          <small style={{ color: 'var(--t-text-muted)' }}>{stats?.withdrawal_count || 0} processed</small>
        </div>

        <div className="card profit">
          <div className="card-top">
            <img src="/images/div (7).png" alt="" />
          </div>
          <p className="wallet-label">{isAdmin ? 'Signal Fee Revenue' : 'My Total Signal Profit'}</p>
          <h3 className="wallet-amount" style={{ color: profit >= 0 ? 'var(--success)' : '#ef4444' }}>
            {profit < 0 ? '-' : ''}${money(Math.abs(profit))}
          </h3>
          <small style={{ color: 'var(--t-text-muted)' }}>Updated live</small>
        </div>

        {!isAdmin && (
          <div className="card">
            <div className="card-top">
              <div className="wallet-fee-icon">💰</div>
            </div>
            <p className="wallet-label">Amount Spent on Signals</p>
            <h3 className="wallet-amount" style={{ color: 'var(--t-gold)' }}>${money(stats?.total_signal_fees)}</h3>
            <small style={{ color: 'var(--t-text-muted)' }}>$1 per signal · free after a Stop Loss</small>
          </div>
        )}
      </div>
    </>
  );

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
              <button type="button" className={`atx-kpi awl-link ${stats?.pending_deposits > 0 ? 'atx-kpi--warn' : ''}`} onClick={() => router.push('/transaction')}>
                <span className="atx-kpi-label"><IconClock size={15} /> Awaiting review</span>
                <strong>{stats?.pending_deposits || 0}</strong>
                <small>{stats?.pending_deposits > 0 ? 'Review deposits →' : 'All caught up'}</small>
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

        {content}
      </div>

      <DepositModal isOpen={isDepositOpen} onClose={() => { setIsDepositOpen(false); refreshUserProfile(); fetchStats(); }} />
    </div>
  );
}
