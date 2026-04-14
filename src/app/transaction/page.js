'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../styles/transaction.css';

export default function Transaction() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="layout">
      {/*  SIDEBAR  */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="logo">
          <img src="/images/div (3).png" className="logo-icon" alt="Wallet Logo" />
          <span>Wallet</span>
        </div>

        <div className="menu" onClick={() => router.push('/wallet')}>
          <img src="/images/i (5).png" alt="Dashboard" />
          <span>Dashboard</span>
        </div>

        <div className="menu active" onClick={() => router.push('/transaction')}>
          <img src="/images/svg (15).png" alt="Transactions" />
          <span>Transactions</span>
        </div>
      </aside>

      {/*  MAIN  */}
      <main className="main">
        {/*  HEADER  */}
        <div className="header-box">
          <header className="header">
            <div className="hamburger" onClick={toggleSidebar}>
              ☰
            </div>
            <div className="header-left">
              <h2>Transaction History</h2>
              <p>Track your transactions</p>
            </div>

            <div className="header-right">
              <div className="wallet-badge">
                <img src="/images/i (2).png" alt="Wallet" />
              </div>

              <button className="balance" onClick={() => router.push('/wallet')}>$100.00</button>

              <div className="live">
                <span className="dot"></span> Live
              </div>

              <img src="/images/i (3).png" className="icon" alt="Notifications" />
              <img src="/images/img.png" className="avatar" alt="User" onClick={() => router.push('/login')} style={{ cursor: 'pointer', title: 'Login' }} />
            </div>
          </header>
        </div>

        {/*  CARD  */}
        <div className="card">
          <div className="card-header">
            <h3>Transaction History</h3>

            <div className="filters">
              <select>
                <option>All Types</option>
              </select>

              <input type="date" className="date-input" placeholder="mm/dd/yyyy" />

              <button className="filter-btn">Filter</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="date">
                  Dec 28, 2024
                  <small>10:32 AM</small>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/images/div (19).png" style={{ width: '29px', height: '42px' }} alt="Trade" />
                    <div>
                      <div style={{ fontWeight: '600' }}>Trade</div>
                    </div>
                  </div>
                </td>
                <td className="profit">+$2,450.00</td>
                <td className="completed">Completed</td>
                <td className="view">View</td>
              </tr>

              <tr>
                <td className="date">
                  Dec 27, 2024
                  <small>03:15 PM</small>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/images/arrow purple.png" style={{ width: '29px', height: '42px' }} alt="Withdrawal" />
                    <div>
                      <div style={{ fontWeight: '600' }}>Withdrawal</div>
                    </div>
                  </div>
                </td>
                <td className="loss">-$5,000.00</td>
                <td className="pending">Pending</td>
                <td className="view">View</td>
              </tr>

              <tr>
                <td className="date">
                  Dec 26, 2024
                  <small>11:48 AM</small>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/images/arrow blue.png" style={{ width: '29px', height: '42px' }} alt="Deposit" />
                    <div>
                      <div style={{ fontWeight: '600' }}>Deposit</div>
                    </div>
                  </div>
                </td>
                <td className="profit">+$10,000.00</td>
                <td className="completed">Completed</td>
                <td className="view">View</td>
              </tr>

              <tr>
                <td className="date">
                  Dec 25, 2024
                  <small>09:22 AM</small>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/images/arrow green.png" style={{ width: '29px', height: '42px' }} alt="Trade" />
                    <div>
                      <div style={{ fontWeight: '600' }}>Trade</div>
                    </div>
                  </div>
                </td>
                <td className="loss">-$1,320.00</td>
                <td className="completed">Completed</td>
                <td className="view">View</td>
              </tr>
            </tbody>
          </table>

          <div className="footer">
            <span>Showing 1-4 of 200 transactions</span>

            <div className="pagination">
              <button>Previous</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <button>Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
