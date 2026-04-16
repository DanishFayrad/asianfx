'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import signalService from '../../services/signalService';
import authService from '../../services/authService';
import { logout } from '../../redux/slices/authSlice';
import '../../styles/dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState({ active_signals: 0, success_rate: 0, total_signals: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const rowsPerPage = 6;
  
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

  useEffect(() => {
    fetchSignals();
    document.body.classList.add('dashboard-body');
    return () => document.body.classList.remove('dashboard-body');
  }, []);

  const handleTakeSignal = async (signal) => {
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
            <Link className="active" href="#">Signals</Link>
          </nav>
        </div>

        {/*  HAMBURGER  */}
        <div className="hamburger" id="hamburger" onClick={toggleMenu}>
          {isMenuOpen ? '✕' : '☰'}
        </div>

        {/*  RIGHT SIDE MENU (Mobile + Desktop)  */}
        <div className={`db-nav-right ${isMenuOpen ? 'show' : ''}`} id="mobileMenu">
          <nav className="mobile-only-nav">
             <Link className="active" href="#" onClick={() => setIsMenuOpen(false)}>Signals</Link>
          </nav>
          <div className="db-nav-actions">
            <button className="wallet" id="walletBtn" onClick={() => { setIsMenuOpen(false); router.push('/wallet'); }}>
              <img src="/images/i (2).png" alt="Wallet" />
              <span>${user?.wallet_balance || '100.00'}</span>
            </button>
            <div className="db-nav-icons">
              <img src="/images/i (3).png" alt="Notifications" />
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

      {/*  MAIN  */}
      <div className="db-container">
        <div className="db-top-bar">
          <h1 className="db-page-title">Trading Signals</h1>

          <div className="right-actions">
            <button className="deposit" onClick={() => router.push('/deposit')}>Deposit</button>
            {user?.is_admin && (
              <button className="deposit" onClick={() => router.push('/admin/signals')}>+ New Signal</button>
            )}
            <span className="live-updates">Live Updates</span>
          </div>
        </div>

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
