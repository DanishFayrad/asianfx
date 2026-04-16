'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import transactionService from '../../services/transactionService';
import '../../styles/transaction.css';

export default function Transaction() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
        if (user?.is_admin) {
            const data = await transactionService.getPendingTransactions();
            setPendingDeposits(data || []);
        } else {
            const data = await transactionService.getUserTransactions();
            setUserTransactions(data || []);
        }
    } catch (e) {
        console.error("Failed to fetch data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleApprove = async (id) => {
    if (window.confirm('Are you sure you want to approve this deposit?')) {
        try {
            await transactionService.approveTransaction(id);
            alert('Deposit approved! Wallet balance updated.');
            fetchData();
        } catch (e) {
            alert('Failed to approve');
        }
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject this deposit?')) {
        try {
            await transactionService.rejectTransaction(id);
            alert('Deposit rejected.');
            fetchData();
        } catch (e) {
            alert('Failed to reject');
        }
    }
  };

  return (
    <div className="layout">
      {/*  SIDEBAR  */}
      <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
          <img src="/images/div (3).png" className="logo-icon" alt="Logo" />
          <span>Asian FX</span>
        </div>

        <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/dashboard'); }}>
          <img src="/images/i (5).png" alt="Dashboard" />
          <span>Dashboard</span>
        </div>

        <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/wallet'); }}>
          <img src="/images/i (2).png" alt="Wallet" />
          <span>Wallet</span>
        </div>

        <div className="menu active" onClick={() => { setIsSidebarOpen(false); router.push('/transaction'); }}>
          <img src="/images/svg (15).png" alt="Transactions" style={{ filter: 'brightness(0) invert(1)' }} />
          <span>Transactions</span>
          {user?.is_admin && pendingDeposits.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', justifyContent: 'center', marginLeft: 'auto' }}>
                {pendingDeposits.length}
            </span>
          )}
        </div>

        {user?.is_admin && (
          <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/admin/signals'); }}>
            <img src="/images/i (11).png" alt="Admin" />
            <span>Admin</span>
          </div>
        )}
      </aside>

      {/* BACKDROP FOR MOBILE */}
      {isSidebarOpen && <div className="backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/*  MAIN  */}
      <main className="main">
        {/*  HEADER  */}
        <div className="header-box">
          <header className="header">
            <div className="hamburger" onClick={toggleSidebar}>
              ☰
            </div>
            <div className="header-left">
              <h2>{user?.is_admin ? 'Admin Control' : 'Transaction History'}</h2>
              <p>{user?.is_admin ? 'Manage user deposits and trades' : 'Track your transactions'}</p>
            </div>

            <div className="header-right">
              <div className="wallet-badge">
                <img src="/images/i (2).png" alt="Wallet" />
              </div>

              <button className="balance" onClick={() => router.push('/wallet')}>${user?.wallet_balance || '0.00'}</button>

              <div className="live">
                <span className="dot"></span> Live
              </div>

              <img src="/images/i (3).png" className="icon" alt="Notifications" />
              <img src="/images/img.png" className="avatar" alt="User" />
            </div>
          </header>
        </div>

        {/* ADMIN PENDING DEPOSITS CARD */}
        {user?.is_admin && pendingDeposits.length > 0 && (
          <div className="card" style={{ marginBottom: '2rem', border: '1px solid #d4af37' }}>
            <div className="card-header">
                <h3 style={{ color: '#d4af37' }}>🔔 Pending Deposit Approvals ({pendingDeposits.length})</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Proof</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pendingDeposits.map(tx => (
                        <tr key={tx.id}>
                            <td>
                                <div><strong>{tx.User?.name}</strong></div>
                                <small style={{ color: 'var(--text-muted)' }}>{tx.User?.email}</small>
                            </td>
                            <td className="profit">${tx.amount}</td>
                            <td>{tx.payment_method}</td>
                            <td>
                                <button 
                                    onClick={() => window.open(tx.proof_image, '_blank')} 
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border-color)', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                                >View Proof</button>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleApprove(tx.id)} style={{ background: '#22c55e', color: 'black', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Approve & Activate</button>
                                    <button onClick={() => handleReject(tx.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Reject</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}

        {/*  HISTORY CARD  */}
        <div className="card">
          <div className="card-header">
            <h3>{user?.is_admin ? 'System Log' : 'Transaction History'}</h3>
            <div className="filters">
              <select><option>All Types</option></select>
              <input type="date" className="date-input" />
              <button className="filter-btn">Filter</button>
            </div>
          </div>
          {/* Rest of history table as user sees it */}
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
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : (user?.is_admin ? [] : userTransactions || []).length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No transactions found</td></tr>
              ) : (user?.is_admin ? [] : userTransactions || []).map(tx => (
                <tr key={tx.id}>
                    <td className="date">
                        {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <small>{new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                    </td>
                    <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="type-icon" style={{ 
                                width: '32px', 
                                height: '32px', 
                                background: 'rgba(255,255,255,0.1)', 
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img src={tx.type === 'deposit' ? "/images/i (2).png" : "/images/div (19).png"} style={{ width: '18px' }} alt={tx.type} />
                            </div>
                            <div><div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{tx.type}</div></div>
                        </div>
                    </td>
                    <td className={tx.type === 'deposit' ? 'profit' : ''}>
                        {tx.type === 'deposit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </td>
                    <td className={tx.status}>
                        <span style={{ 
                            textTransform: 'capitalize', 
                            color: tx.status === 'approved' ? '#22c55e' : tx.status === 'pending' ? '#eab308' : '#ef4444' 
                        }}>
                            {tx.status}
                        </span>
                    </td>
                    <td className="view">View</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="footer">
            <span>Showing records</span>
            <div className="pagination">
              <button>Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
