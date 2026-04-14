'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../styles/dashboard.css';


export default function Dashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;

  const signals = [
    { symbol: 'XAUUSD', name: 'Gold', type: 'Buy', entry: '2045.50', target: '2065.00', sl: '2038.00', status: 'Active', time: '2 hours ago', icon: '/images/div (13).png', typeIcon: '/images/i (11).png' },
    { symbol: 'XAGUSD', name: 'Silver', type: 'Sell', entry: '24.85', target: '23.50', sl: '25.20', status: 'Hit Target', time: '5 hours ago', icon: '/images/div (14).png', typeIcon: '/images/svg (18).png', statusIcon: '/images/svg (19).png' },
    { symbol: 'EURUSD', name: 'Forex', type: 'Buy', entry: '1.0850', target: '1.0920', sl: '1.0820', status: 'Active', time: '8 hours ago', icon: '/images/div (15).png', typeIcon: '/images/i (11).png' },
    { symbol: 'GBPUSD', name: 'Forex', type: 'Sell', entry: '1.2650', target: '1.2550', sl: '1.2700', status: 'Stop Loss Hit', time: '12 hours ago', icon: '/images/div (16).png', typeIcon: '/images/svg (18).png', statusIcon: '/images/svg (20).png' },
    { symbol: 'XAUUSD', name: 'Gold', type: 'Sell', entry: '2,058.00', target: '2,040.00', sl: '2,068.00', status: 'Closed', time: '1 day ago', icon: '/images/div (17).png', typeIcon: '/images/svg (18).png', statusIcon: '/images/i (12).png' },
    { symbol: 'USDJPY', name: 'Forex', type: 'Buy', entry: '148.50', target: '150.20', sl: '147.80', status: 'Active', time: '1 day ago', icon: '/images/div (18).png', typeIcon: '/images/i (11).png' },
    { symbol: 'XAUUSD', name: 'Gold', type: 'Buy', entry: '148.50', target: '150.20', sl: '147.80', status: 'Active', time: '1 day ago', icon: '/images/div (19).png', typeIcon: '/images/i (11).png' },
  ];

  const totalPages = Math.ceil(signals.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentSignals = signals.slice(startIndex, startIndex + rowsPerPage);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="container-nav">
      <header className="navbar">
        <div className="nav-left">
          <div className="logo">
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
        <div className="hamburger" id="hamburger" onClick={toggleMenu}>☰</div>

        {/*  RIGHT SIDE MENU  */}
        <div className={`nav-right ${isMenuOpen ? 'show' : ''}`} id="mobileMenu">
          <button className="wallet" id="walletBtn" onClick={() => router.push('/wallet')}>
            <img src="/images/i (2).png" alt="Wallet" />
          </button>
          <button className="wallet" onClick={() => router.push('/wallet')}>$100.00</button>
          <img src="/images/i (3).png" alt="Notifications" />
          <img src="/images/img.png" alt="User" onClick={() => router.push('/login')} style={{ cursor: 'pointer', title: 'Login' }} />
        </div>
      </header>

      {/*  MAIN  */}
      <div className="container">
        <div className="top-bar">
          <h1 className="page-title">Trading Signals</h1>

          <div className="right-actions">
            <button className="deposit" onClick={() => router.push('/deposit')}>Deposit</button>
            <button className="deposit" onClick={() => router.push('/admin/signals')}>+ New Signal</button>
            <span className="live-updates">Live Updates</span>
          </div>
        </div>

        <p className="subtitle">Real-time signals for Gold, Silver, and Forex markets</p>

        {/*  STATS  */}
        <div className="stats">
          <div className="card">
            <img src="/images/div (9).png" style={{ marginBottom: "10px" }} alt="Today Icon" />
            <span className="card-label">Today</span>
            <h3>24</h3>
            <p>Active Signals</p>
          </div>

          <div className="card">
            <img src="/images/div (10).png" style={{ marginBottom: "10px" }} alt="Weekly Icon" />
            <span className="card-label">This Week</span>
            <h3>87%</h3>
            <p>Success Rate</p>
          </div>

          <div className="card">
            <img src="/images/div (11).png" style={{ marginBottom: "10px" }} alt="Monthly Icon" />
            <span className="card-label">This Month</span>
            <h3>156</h3>
            <p>Targets Hit</p>
          </div>

          <div className="card">
            <img src="/images/div (12).png" style={{ marginBottom: "10px" }} alt="Total Icon" />
            <span className="card-label">Total</span>
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
              <input type="text" placeholder="Search XAUUSD, XAGUSD..." />
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
              {currentSignals.map((signal, index) => (
                <tr key={index}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={signal.icon} style={{ width: "42px", height: "42px" }} alt={signal.symbol} />
                      <div>
                        <div style={{ fontWeight: "600" }}>{signal.symbol}</div>
                        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{signal.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={signal.type.toLowerCase()}>
                      <img src={signal.typeIcon} alt={signal.type} />
                      {signal.type}
                    </span>
                  </td>
                  <td>{signal.entry}</td>
                  <td className="green">{signal.target}</td>
                  <td className="red">{signal.sl}</td>
                  <td>
                    <span className={`badge status ${signal.status.toLowerCase().includes('hit') ? 'hit' : signal.status.toLowerCase().includes('stop') ? 'loss' : signal.status.toLowerCase().includes('closed') ? 'close' : 'active'}`}>
                      {signal.statusIcon && <img src={signal.statusIcon} alt="status icon" />}
                      {signal.status}
                    </span>
                  </td>
                  <td className="time">{signal.time}</td>
                  <td className="Action"><img src="/images/i (10).png" alt="Action Icon" /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/*  TABLE FOOTER  */}
          <div className="table-footer">
            <div className="showing-text">
              Showing {startIndex + 1}-{Math.min(startIndex + rowsPerPage, signals.length)} of {signals.length} signals
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
