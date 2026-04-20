'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import transactionService from '../../services/transactionService';
import signalService from '../../services/signalService';
import authService from '../../services/authService';
import { setUser, logout } from '../../redux/slices/authSlice';
import { io } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../constants/apiConstants';
import '../../styles/transaction.css';

export default function Transaction() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
     const checkAuth = async () => {
         if (user) {
             if (!user.is_admin) {
                 router.push('/dashboard');
             } else {
                 setIsAuthorizing(false);
             }
         } else if (token) {
             // Token exists but no Redux user? Fetch it
             try {
                const profile = await authService.getProfile();
                dispatch(setUser(profile));
             } catch (e) {
                console.error("Session expired", e);
                router.push('/login');
             }
         } else {
             // No token? Login
             router.push('/login');
         }
     };
     
     checkAuth();
  }, [user, token, router, dispatch]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal for sending signal
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [signalData, setSignalData] = useState({
    symbol: 'XAUUSD',
    type: 'buy',
    entry_price: '',
    target_price: '',
    stop_loss: '',
    signal_type: 'premium',
    description: ''
  });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState({
      isOpen: false,
      title: '',
      message: '',
      type: '', // 'approve' or 'reject'
      data: null,
      inputValue: ''
  });

  const closeConfirmModal = () => setConfirmModal({...confirmModal, isOpen: false});

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
        if (user?.is_admin) {
            const data = await transactionService.getPendingTransactions();
            setPendingDeposits(data || []);
            const allTxs = await transactionService.getAllTransactions();
            setUserTransactions(allTxs || []);
        }
    } catch (e) {
        console.error("Failed to fetch data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (user?.is_admin) {
        const socket = io(API_BASE_URL);
        socket.emit('join_admin');

        socket.on('admin_notification', (notif) => {
            console.log("Real-time admin update:", notif);
            if (notif.type === 'NEW_DEPOSIT') {
                setPendingDeposits(prev => [notif.transaction, ...prev]);
                // Refresh all stats (including badges) immediately
                fetchData();
            }
        });

        return () => socket.disconnect();
    }
  }, [user]);

  const handleApprove = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Approve Deposit',
        message: 'Please enter the confirmed amount in USD:',
        type: 'approve',
        data: id,
        inputValue: '100.00'
    });
  };

  const handleReject = (id) => {
    setConfirmModal({
        isOpen: true,
        title: 'Reject Deposit',
        message: 'Are you sure you want to reject this deposit request?',
        type: 'reject',
        data: id,
        inputValue: ''
    });
  };

  const executeConfirmAction = async () => {
    const { type, data, inputValue } = confirmModal;
    setIsActionLoading(true);
    try {
        if (type === 'approve') {
            const parsedAmount = parseFloat(inputValue);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                toast.error("Please enter a valid amount.");
                return;
            }
            await transactionService.approveTransaction(data, parsedAmount);
            toast.success("Deposit approved and wallet credited.");
            
            const tx = pendingDeposits.find(t => t.id === data);
            const userObj = tx?.User || {id: tx?.user_id, name: 'User #' + tx?.user_id};
            openSignalModal(userObj);
        } else if (type === 'reject') {
            await transactionService.rejectTransaction(data);
            toast.success("Deposit request rejected.");
        }
        closeConfirmModal();
        fetchData();
    } catch (e) {
        toast.error("Failed to process transaction.");
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction record? This action cannot be undone.")) {
      try {
        await transactionService.deleteTransaction(id);
        toast.success("Transaction deleted successfully.");
        fetchData();
      } catch (e) {
        toast.error("Failed to delete transaction.");
      }
    }
  };

  const openSignalModal = (userObj) => {
    setTargetUser(userObj);
    setIsSignalModalOpen(true);
  };

  const handleSendSignal = async () => {
    try {
        const payload = {
            ...signalData,
            target_user_id: targetUser.id
        };
        await signalService.createSignal(payload);
        toast.success(`Signal sent successfully to ${targetUser.name}`);
        setIsSignalModalOpen(false);
    } catch (e) {
        console.error(e);
        alert('Failed to send signal');
    }
  };

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

  if (!mounted || (isAuthorizing && !user)) {
      return (
          <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d14', color: 'white' }}>
              <div className="loader">Loading Admin Panel...</div>
          </div>
      );
  }

  if (!user || !user.is_admin) {
      return null;
  }

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
          {pendingDeposits.length > 0 && (
            <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', justifyContent: 'center', marginLeft: 'auto' }}>
                {pendingDeposits.length}
            </span>
          )}
        </div>

        <div className="menu" onClick={() => { setIsSidebarOpen(false); router.push('/admin/signals'); }}>
            <img src="/images/i (11).png" alt="Admin" />
            <span>Admin</span>
        </div>

        <div className="menu" onClick={handleLogout} style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#ef4444' }}>
            <img src="/images/arrow (1).png" alt="Logout" style={{ filter: 'invert(1) sepia(1) saturate(5) hue-rotate(-50deg)' }} />
            <span>Logout</span>
        </div>
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
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{mounted ? user?.name : ''}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{mounted ? user?.email : ''}</div>
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

        {/* ADMIN PENDING DEPOSITS CARD */}
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(212,175,55,0.3)' }}>
          <div className="card-header">
              <h3 style={{ color: '#d4af37' }}>🔔 Pending Deposit Approvals</h3>
          </div>
          <div className="table-box" style={{ padding: '1rem', overflowX: 'auto' }}>
              {pendingDeposits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <img src="/images/svg (15).png" style={{ width: '40px', opacity: 0.2, marginBottom: '1rem' }} alt="Empty" />
                      <p>Currently, there are no pending deposit requests to approve.</p>
                  </div>
              ) : (
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '15px' }}>Date</th>
                            <th style={{ padding: '15px' }}>User</th>
                            <th style={{ padding: '15px' }}>Amount</th>
                            <th style={{ padding: '15px' }}>Proof</th>
                            <th style={{ padding: '15px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingDeposits.map(tx => (
                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '15px' }}>
                                    {new Date(tx.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ color: 'white', fontWeight: 'bold' }}>{tx.User?.name || 'User #' + tx.user_id}</div>
                                    <small style={{ color: 'var(--text-muted)' }}>{tx.User?.email || 'N/A'}</small>
                                </td>
                                <td style={{ padding: '15px', color: '#22c55e', fontWeight: 'bold' }}>${tx.amount}</td>
                                <td style={{ padding: '15px' }}>
                                    <button 
                                        onClick={() => {
                                            const url = tx.proof_image;
                                            if (url?.startsWith('data:') || url?.startsWith('http')) {
                                                window.open(url, '_blank');
                                            } else {
                                                window.open(`${BACKEND_URL}${url}`, '_blank');
                                            }
                                        }} 
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                                    >View Image</button>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <button onClick={() => handleApprove(tx.id)} style={{ background: '#22c55e', color: 'black', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Approve</button>
                                        <button onClick={() => handleReject(tx.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Reject</button>
                                        <button onClick={() => openSignalModal(tx.User || {id: tx.user_id, name: 'User ' + tx.user_id})} style={{ background: 'var(--primary)', color: 'black', border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Send Signal</button>
                                        <button onClick={() => handleDelete(tx.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              )}
          </div>
        </div>

        {/* ALL TRANSACTIONS HISTORY (ADMIN ONLY) */}
        <div className="card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="card-header">
              <h3>📜 All Transactions History</h3>
          </div>
          <div className="table-box" style={{ padding: '1rem', overflowX: 'auto' }}>
              {userTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <p>No transaction history found.</p>
                  </div>
              ) : (
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Date</th>
                            <th style={{ padding: '12px' }}>User</th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th style={{ padding: '12px' }}>Amount</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Method</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {userTransactions.map(tx => (
                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                    {new Date(tx.created_at || Date.now()).toLocaleString()}
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                    <div>{tx.User?.name || 'User #' + tx.user_id}</div>
                                    <small style={{ opacity: 0.5 }}>{tx.User?.email}</small>
                                </td>
                                <td style={{ padding: '12px', textTransform: 'capitalize', fontSize: '13px' }}>{tx.type}</td>
                                <td style={{ padding: '12px', fontWeight: 700, color: tx.type === 'deposit' ? '#22c55e' : '#ef4444', fontSize: '13px' }}>
                                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                    <span style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '4px', 
                                        fontSize: '11px', 
                                        fontWeight: 700,
                                        background: tx.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : tx.status === 'pending' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: tx.status === 'approved' ? '#22c55e' : tx.status === 'pending' ? '#eab308' : '#ef4444',
                                        border: `1px solid ${tx.status === 'approved' ? '#22c55e' : tx.status === 'pending' ? '#eab308' : '#ef4444'}`
                                    }}>
                                        {tx.status?.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>{tx.payment_method || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>
                                    <button 
                                        onClick={() => handleDelete(tx.id)}
                                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                                    >Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              )}
          </div>
        </div>

        {/* SIGNAL MODAL */}
        {isSignalModalOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                <div className="modal-content" style={{ background: '#0f172a', padding: '2.5rem', borderRadius: '20px', color: 'white', width: '450px', border: '1px solid #d4af37', boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <img src="/images/i (11).png" style={{ width: '30px', filter: 'invert(1)' }} alt="Signal" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', color: '#d4af37' }}>Send Private Signal</h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Recipient: <strong>{targetUser?.name}</strong></p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Symbol</label>
                                <input style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '10px', outline: 'none' }} value={signalData.symbol} onChange={(e) => setSignalData({...signalData, symbol: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Signal Type</label>
                                <select style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '10px', outline: 'none' }} value={signalData.signal_type} onChange={(e) => setSignalData({...signalData, signal_type: e.target.value})}>
                                    <option value="premium">💎 Premium</option>
                                    <option value="free">🌐 Free</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Order Type</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setSignalData({...signalData, type: 'buy'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: signalData.type === 'buy' ? '2px solid #10b981' : '1px solid #334155', background: signalData.type === 'buy' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: signalData.type === 'buy' ? '#10b981' : 'white', cursor: 'pointer', fontWeight: 700 }}>BUY</button>
                                <button onClick={() => setSignalData({...signalData, type: 'sell'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: signalData.type === 'sell' ? '2px solid #ef4444' : '1px solid #334155', background: signalData.type === 'sell' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: signalData.type === 'sell' ? '#ef4444' : 'white', cursor: 'pointer', fontWeight: 700 }}>SELL</button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Entry</label>
                                <input placeholder="1.234" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '10px', borderRadius: '8px' }} value={signalData.entry_price} onChange={(e) => setSignalData({...signalData, entry_price: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>TP</label>
                                <input placeholder="1.250" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '10px', borderRadius: '8px' }} value={signalData.target_price} onChange={(e) => setSignalData({...signalData, target_price: e.target.value})} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>SL</label>
                                <input placeholder="1.220" style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '10px', borderRadius: '8px' }} value={signalData.stop_loss} onChange={(e) => setSignalData({...signalData, stop_loss: e.target.value})} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '1rem' }}>
                            <button onClick={handleSendSignal} style={{ flex: 2, background: '#d4af37', border: 'none', padding: '14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, color: 'black', fontSize: '1rem', transition: '0.3s' }}>Broadcast Signal</button>
                            <button onClick={() => setIsSignalModalOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', color: 'white', padding: '14px', borderRadius: '10px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* CUSTOM CONFIRM/PROMPT MODAL */}
        {confirmModal.isOpen && (
            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <div className="modal-content" style={{ background: '#0f172a', padding: '2.5rem', borderRadius: '24px', color: 'white', width: '400px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: confirmModal.type === 'approve' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <span style={{ fontSize: '24px' }}>{confirmModal.type === 'approve' ? '✅' : '❌'}</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{confirmModal.title}</h2>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5' }}>{confirmModal.message}</p>
                    </div>

                    {confirmModal.type === 'approve' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Amount (USD)</label>
                            <input 
                                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '14px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, outline: 'none', textAlign: 'center' }} 
                                value={confirmModal.inputValue} 
                                onChange={(e) => setConfirmModal({...confirmModal, inputValue: e.target.value})}
                                autoFocus
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={executeConfirmAction} 
                            style={{ flex: 2, background: confirmModal.type === 'approve' ? '#22c55e' : '#ef4444', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: 'white', fontSize: '1rem' }}
                        >
                            {confirmModal.type === 'approve' ? 'Confirm Approval' : 'Yes, Reject'}
                        </button>
                        <button 
                            onClick={closeConfirmModal} 
                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '14px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* System Log explicitly removed per request */}
      </main>
    </div>
  );
}
