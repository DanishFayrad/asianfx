'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/wallet.css';

export default function Wallet() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="layout">
      {/*  Sidebar  */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="logo">
          <img src="/images/div (3).png" className="logo-icon" alt="Wallet Logo" />
          <span>Wallet</span>
        </div>

        <div className="menu active" onClick={() => router.push('/wallet')}>
          <img src="/images/i (5).png" alt="Dashboard" />
          <span>Dashboard</span>
        </div>

        <div className="menu" onClick={() => router.push('/transaction')}>
          <img src="/images/svg (15).png" alt="Transactions" />
          <span>Transactions</span>
        </div>
      </aside>

      {/*  🔥 HEADER OUTSIDE MAIN  */}
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
            <div className="wallet-badge">
              <img src="/images/i (2).png" alt="Wallet Icon" />
            </div>

            <button className="balance" onClick={() => router.push('/wallet')}>$100.00</button>

            <div className="live">
              <span className="dot"></span> Live
            </div>

            <img src="/images/i (3).png" className="icon" alt="Notifications" />
            <img src="/images/img.png" className="avatar" alt="User Profile" />
          </div>
        </header>
      </div>

      {/*  Main  */}
      <main className="main">
        {/*  CARDS  */}
        <div className="cards">
          <div className="card total">
            <div className="card-top">
              <img src="/images/div (4).png" alt="Balance Icon" />
              <span className="badge">
                <span className="dot"></span> Live
              </span>
            </div>
            <p>Total Balance</p>
            <h3>$124,580.50</h3>
            <span className="growth">
              <img src="/images/svg (16).png" className="trend-icon" alt="Trend" />
              +12.5%
            </span>
          </div>

          <div className="card">
            <div className="card-top">
              <img src="/images/div (5).png" alt="Deposit Icon" />
            </div>
            <p>Total Deposit</p>
            <h3>$98,420.00</h3>
            <small>45 transactions</small>
          </div>

          <div className="card">
            <div className="card-top">
              <img src="/images/div (6).png" alt="Withdrawal Icon" />
            </div>
            <p>Total Withdrawal</p>
            <h3>$52,340.00</h3>
            <small>28 transactions</small>
          </div>

          <div className="card profit">
            <div className="card-top">
              <img src="/images/div (7).png" alt="Profit Icon" />
            </div>
            <p>Total Profit</p>
            <h3>$78,500.50</h3>
            <small>+63.2% ROI</small>
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
