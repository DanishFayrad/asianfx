'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setUser } from '../../redux/slices/authSlice';
import authService from '../../services/authService';
import transactionService from '../../services/transactionService';
import '../../styles/wallet.css';

export default function Wallet() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
        setLoading(true);
        let data;
        if (user?.is_admin) {
            data = await transactionService.getAdminStats();
        } else {
            data = await transactionService.getWalletStats();
        }
        setStats(data);
    } catch (e) {
        console.error("Failed to fetch wallet stats", e);
    } finally {
        setLoading(false);
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

  return (
    <div className="layout">
      {/*  Sidebar  */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="logo">
          <img src="/images/div (3).png" className="logo-icon" alt="Wallet Logo" />
          <span>AsianFX</span>
        </div>

        <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/dashboard'); }}>
          <img src="/images/i (5).png" alt="Dashboard" />
          <span>Dashboard</span>
        </div>

        <div className="menu active" onClick={() => { setIsSidebarOpen(false); router.push('/wallet'); }}>
          <img src="/images/i (2).png" alt="Wallet" style={{ height: '20px', filter: 'brightness(0) invert(1)' }} />
          <span>Wallet</span>
        </div>

        {user?.is_admin && (
          <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/transaction'); }}>
            <img src="/images/svg (15).png" alt="Transactions" />
            <span>Transactions</span>
          </div>
        )}
        
        {user?.is_admin && (
          <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/admin/signals'); }}>
            <img src="/images/i (11).png" alt="Admin" style={{ height: '20px', filter: 'brightness(0) invert(1)' }} />
            <span>Admin</span>
          </div>
        )}

        <div className="menu" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#ef4444' }}>
            <img src="/images/arrow (1).png" alt="Logout" style={{ filter: 'invert(1) sepia(1) saturate(5) hue-rotate(-50deg)' }} />
            <span>Logout</span>
        </div>
      </aside>

      {/* BACKDROP FOR MOBILE */}
      {isSidebarOpen && <div className="backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/*  Main  */}
      <main className="main">
        {/*  🔥 HEADER INSIDE MAIN  */}
        <div className="header-box">
          <header className="header">
            <div className="hamburger" onClick={toggleSidebar}>
              ☰
            </div>
            <div className="header-left">
              <h2>Wallet Overview</h2>
              <p>Track your financial performance</p>
            </div>

            <div className="header-right">


              <div className="live">
                <span className="dot"></span> Live
              </div>


              <div style={{ position: 'relative' }}>
                {user?.profile_image ? (
                  <img 
                    src={user.profile_image} 
                    className="avatar" 
                    alt="User" 
                    onClick={toggleProfile} 
                    style={{ cursor: 'pointer', border: isProfileOpen ? '2px solid var(--primary)' : '2px solid transparent', width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div 
                    onClick={toggleProfile}
                    className="avatar"
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

                {/* Profile Dropdown */}
                {isProfileOpen && (
                    <div className="profile-dropdown show" style={{ 
                        position: 'absolute', 
                        top: '50px', 
                        right: '0', 
                        width: '240px', 
                        background: '#111827', 
                        border: '1px solid rgba(212,175,55,0.3)', 
                        borderRadius: '12px', 
                        padding: '1.25rem', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        zIndex: 3000
                    }}>
                        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.name || 'Trader'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.email}</div>
                        </div>
                        <button 
                            onClick={handleLogout} 
                            style={{ 
                                width: '100%', 
                                padding: '10px', 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: '1px solid #ef4444', 
                                color: '#ef4444', 
                                borderRadius: '8px', 
                                cursor: 'pointer', 
                                fontWeight: 700,
                                fontSize: '0.85rem'
                            }}
                        >Log Out</button>
                    </div>
                )}
              </div>
            </div>
          </header>
        </div>
        {/*  CARDS  */}
        <div className="cards">
          <div className="card total">
            <div className="card-top">
              <img src="/images/div (4).png" alt="Balance Icon" />
              <span className="badge">
                <span className="dot"></span> Live
              </span>
            </div>
            <p>{user?.is_admin ? 'Total Platform Balance' : 'My Total Balance'}</p>
            <h3>${user?.is_admin ? stats?.platform_balance || '0' : stats?.balance?.toLocaleString() || '0'}</h3>
            <span className="growth">
              <img src="/images/svg (16).png" className="trend-icon" alt="Trend" />
              Live
            </span>
          </div>

          <div className="card">
            <div className="card-top">
              <img src="/images/div (5).png" alt="Deposit Icon" />
            </div>
            <p>Total Deposit</p>
            <h3>${stats?.total_deposit?.toLocaleString() || '0'}</h3>
            <small>{stats?.deposit_count || 0} transactions</small>
          </div>

          <div className="card">
            <div className="card-top">
              <img src="/images/div (6).png" alt="Withdrawal Icon" />
            </div>
            <p>Total Withdrawal</p>
            <h3>${stats?.total_withdrawal?.toLocaleString() || '0'}</h3>
            <small>{stats?.withdrawal_count || 0} transactions</small>
          </div>

          <div className="card profit">
            <div className="card-top">
              <img src="/images/div (7).png" alt="Profit Icon" />
            </div>
            <p>{user?.is_admin ? 'Platform ROI' : 'Total Profit'}</p>
            <h3>${stats?.total_profit?.toLocaleString() || '0'}</h3>
            <small>Live Metrics</small>
          </div>
        </div>

        {/*  LOSS  */}
        <div className="loss-card">
          <div className="card-top">
            <img src="/images/div (8).png" alt="Loss Icon" />
          </div>
          <p>Total Loss</p>
          <h3>$22,160.00</h3>
          <span className="loss">-17.8% ROI</span>
        </div>

        {/*  BOTTOM  */}
        <div className="bottom">
          {/*  LEFT  */}
          <div className="graph-box">
            <div className="box-header">
              <h4>Profit & Loss Overview</h4>
              <img src="/images/i (6).png" className="box-icon" alt="Information" />
            </div>

            <div className="graph">
              {/*  Graph Placeholder  */}
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #444', borderRadius: '8px' }}>
                Profit & Loss Graph
              </div>
            </div>

            <div className="mini-cards">
              <div className="mini green">
                <span>
                  <img src="/images/i (7).png" className="mini-icon" alt="Profit Trades" />
                  Profit Trades
                </span>
                <h5>142</h5>
                <small>71% Win Rate</small>
              </div>

              <div className="mini red">
                <span>
                  <img src="/images/i (8).png" className="mini-icon" alt="Loss Trades" />
                  Loss Trades
                </span>
                <h5>58</h5>
                <small>29% Loss Rate</small>
              </div>
            </div>
          </div>

          {/*  RIGHT  */}
          <div className="graph-box big">
            <div className="box-header">
              <h4>Trade Performance</h4>
              <div className="tabs">
                <span className="active">7D</span>
                <span>30D</span>
                <span>90D</span>
              </div>
            </div>

            <div className="stats">
              <div className="stat dark">
                <p>Total Trades</p>
                <h3>200</h3>
                <small>
                  <img src="/images/Frame.png" className="small-icon" alt="Trend Icon" />
                  +18 this week
                </small>
              </div>

              <div className="stat green">
                <p>Winning Trades</p>
                <h3>142</h3>
                <div className="bar green-bar"></div>
              </div>

              <div className="stat red">
                <p>Losing Trades</p>
                <h3>58</h3>
                <div className="bar red-bar"></div>
              </div>
            </div>

            <div className="graph">
              {/*  Graph Placeholder  */}
              <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #444', borderRadius: '8px' }}>
                Trade Performance Graph
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
