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
          <header className="admin-top-navbar">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button className="admin-btn-hamburger" onClick={() => setIsSidebarOpen(true)}>☰</button>
              <div>
                <h2 className="admin-page-title">Platform Wallet</h2>
                <p className="admin-subtitle">Balances, deposits and revenue across all members</p>
              </div>
            </div>
            <ThemeToggle />
          </header>
          <div className="wallet-page" style={{ padding: '2rem' }}>{content}</div>
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
