'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import signalService from '../../../services/signalService';
import authService from '../../../services/authService';
import { logout } from '../../../redux/slices/authSlice';
import '../../../styles/adminSignals.css';

export default function AdminSignals() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [type, setType] = useState('Buy');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    entry_price: '',
    target_price: '',
    stop_loss: '',
    signal_type: 'free',
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recentSignals, setRecentSignals] = useState([]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Mock Assets data to match screenshot
  const assets = [
    { id: 1, name: 'Bitcoin', symbol: 'BTCUSDT', displaySymbol: 'BTC/USDT', iconColor: '#F7931A', icon: '/images/div (14).png' },
    { id: 2, name: 'Gold', symbol: 'XAUUSD', displaySymbol: 'XAU/USD', iconColor: '#FFD700', icon: '/images/div (15).png' },
    { id: 3, name: 'Silver', symbol: 'XAGUSD', displaySymbol: 'XAG/USD', iconColor: '#C0C0C0', icon: '/images/div (16).png' },
  ];

  useEffect(() => {
    // 🔒 Security Check: Only Super Admin can access this page
    if (user && !user.is_admin) {
        router.push('/dashboard');
        return;
    }

    // Select default asset
    if (assets.length > 0) setSelectedAsset(assets[1]); // Gold default
    
    // Fetch recent broadcasts if we want to show history, using dashboard endpoint
    const fetchRecent = async () => {
        try {
            const data = await signalService.getSignalsDashboard();
            setRecentSignals(data.active_signals || []);
        } catch (e) {
            console.error("Failed to fetch recent", e);
        }
    };
    fetchRecent();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {} finally {
      dispatch(logout());
      router.push('/login');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!selectedAsset) {
        setMessage('Please select a trading asset');
        setLoading(false);
        return;
    }

    try {
      const payload = {
        symbol: selectedAsset.symbol,
        type: type,
        entry_price: parseFloat(formData.entry_price),
        target_price: parseFloat(formData.target_price),
        stop_loss: parseFloat(formData.stop_loss),
        signal_type: formData.signal_type,
        description: `Signal for ${selectedAsset.name}`,
      };

      await signalService.createSignal(payload);
      setMessage('Signal broadcasted successfully!');
      
      // Reset form
      setFormData({
        entry_price: '',
        target_price: '',
        stop_loss: '',
        signal_type: 'free',
      });
      
      // Refresh recent list
      const data = await signalService.getSignalsDashboard();
      setRecentSignals(data.active_signals || []);

    } catch (error) {
      console.error("Error creating signal:", error);
      setMessage(error.response?.data?.message || 'Error posting signal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'show' : ''}`}>
        <div className="admin-logo">
          <div className="logo-box">
             <img src="/images/i (9).png" alt="Logo" style={{ height: '24px' }} />
          </div>
          <span>AsianFX Admin</span>
        </div>

        <nav className="admin-nav">
          <Link href="/dashboard" className="admin-item" onClick={() => setIsSidebarOpen(false)}>
             <img src="/images/i (5).png" alt="Dashboard" style={{ filter: 'brightness(0) invert(1)', width: '20px' }} /> User Dashboard
          </Link>
          <Link href="/admin/signals" className="admin-item active" onClick={() => setIsSidebarOpen(false)}>
             <img src="/images/i (11).png" alt="Broadcast" style={{ filter: 'brightness(0) invert(1)', width: '20px' }} /> Broadcast Signal
          </Link>
          <Link href="/wallet" className="admin-item" onClick={() => setIsSidebarOpen(false)}>
             <img src="/images/i (2).png" alt="Wallet" style={{ filter: 'brightness(0) invert(1)', width: '20px' }} /> Wallet
          </Link>
          <Link href="/transaction" className="admin-item" onClick={() => setIsSidebarOpen(false)}>
             <img src="/images/svg (15).png" alt="Transactions" style={{ filter: 'brightness(0) invert(1)', width: '20px' }} /> Transactions
          </Link>
        </nav>

        <div className="admin-footer">
          <img src="/images/img.png" alt="Profile" className="admin-avatar" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.name || 'Administrator'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>Admin Account</span>
          </div>
        </div>
      </aside>

      {/* BACKDROP */}
      {isSidebarOpen && <div className="admin-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <main className="admin-main-content">
        <header className="admin-top-navbar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="admin-btn-hamburger" onClick={toggleSidebar}>☰</button>
            <div>
              <h2 className="admin-page-title">Signal Creation</h2>
              <p className="admin-subtitle">Broadcast new signals</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div className="admin-balance-card">
               <span style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>Status</span>
               <strong style={{ fontSize: '1rem', color: 'var(--admin-success)' }}>System Online</strong>
            </div>
            
            <button 
                onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid var(--admin-danger)', color: 'var(--admin-danger)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
                Log Out
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="admin-purchase-grid">
          {/* ASSET SELECTION (LEFT) */}
          <section>
             <div className="admin-asset-header">
                <div>
                   <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Select Trading Asset</h3>
                   <p className="admin-subtitle" style={{ marginTop: 0 }}>Choose the asset to broadcast</p>
                </div>
             </div>

             <div className="admin-search">
                <img src="/images/svg (17).png" style={{ position: 'absolute', left: '12px', top: '14px', width: '20px' }} alt="Search" />
                <input type="text" placeholder="Search coins or forex..." />
             </div>

             <div className="admin-asset-grid">
                {assets.map(asset => (
                  <div 
                    key={asset.id} 
                    className={`admin-asset-card ${selectedAsset?.id === asset.id ? 'active' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="admin-asset-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="admin-asset-icon-box" style={{ background: asset.iconColor }}>
                           <img src={asset.icon} alt={asset.name} style={{ width: '28px' }} />
                        </div>
                        <div>
                           <div style={{ fontWeight: 600 }}>{asset.name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{asset.displaySymbol}</div>
                        </div>
                      </div>
                      <div className="admin-check-circle">
                         {selectedAsset?.id === asset.id && <img src="/images/i (11).png" style={{ width: '14px', filter: 'invert(1)' }} alt="Checked" />}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </section>

          {/* SIGNAL CONFIGURATION SUMMARY (RIGHT) */}
          <aside>
             <div className="admin-summary-card">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Signal Configuration</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '1rem' }}>
                   <span style={{ color: 'var(--admin-text-muted)' }}>Selected Asset</span>
                   <strong>{selectedAsset?.name || '---'}</strong>
                </div>

                <div className="admin-type-toggle">
                    <div 
                        className={`admin-type-btn buy ${type === 'Buy' ? 'active' : ''}`}
                        onClick={() => setType('Buy')}
                    >BUY</div>
                    <div 
                        className={`admin-type-btn sell ${type === 'Sell' ? 'active' : ''}`}
                        onClick={() => setType('Sell')}
                    >SELL</div>
                </div>

                <div className="admin-form-group">
                    <label>Entry Price</label>
                    <input 
                        type="number" 
                        step="any"
                        name="entry_price"
                        className="admin-form-input" 
                        value={formData.entry_price}
                        onChange={handleChange}
                        placeholder="e.g. 2350.50" 
                        required 
                    />
                </div>

                <div className="admin-form-group">
                    <label>Target Price (TP)</label>
                    <input 
                        type="number" 
                        step="any"
                        name="target_price"
                        className="admin-form-input" 
                        value={formData.target_price}
                        onChange={handleChange}
                        placeholder="e.g. 2360.00" 
                        required 
                    />
                </div>

                <div className="admin-form-group">
                    <label>Stop Loss (SL)</label>
                    <input 
                        type="number" 
                        step="any"
                        name="stop_loss"
                        className="admin-form-input" 
                        value={formData.stop_loss}
                        onChange={handleChange}
                        placeholder="e.g. 2340.00" 
                        required 
                    />
                </div>
                
                <div className="admin-form-group">
                    <label>Category</label>
                    <select 
                        name="signal_type" 
                        className="admin-form-input"
                        value={formData.signal_type}
                        onChange={handleChange}
                    >
                        <option value="free">Free Signal</option>
                        <option value="premium">Premium Signal</option>
                    </select>
                </div>

                {message && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: message.includes('success') ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
                        {message}
                    </div>
                )}

                <button type="submit" className="admin-btn-broadcast" disabled={loading}>
                   {loading ? 'Processing...' : (
                       <>
                        <img src="/images/svg (13).png" style={{ height: '18px', filter: 'invert(1)' }} alt="Broadcast" />
                        Broadcast Signal
                       </>
                   )}
                </button>
                
                <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)', textAlign: 'center', marginTop: '1rem' }}>
                   ⓘ Signals are instantly broadcasted to all active clients.
                </p>
             </div>
          </aside>
        </form>

        {/* RECENT BROADCASTS SECTION */}
        <section className="admin-recent-section">
           <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Recent Broadcasts</h3>
           <div className="admin-recent-grid">
              {recentSignals.slice(0, 3).map((sig, idx) => (
                <div key={sig.id || idx} className="admin-recent-card">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: sig.symbol.includes('ETH') ? '#627EEA' : sig.symbol.includes('BTC') ? '#F7931A' : '#FFD700', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <img src={sig.symbol.includes('XAU') ? '/images/div (15).png' : sig.symbol.includes('XAG') ? '/images/div (16).png' : '/images/div (13).png'} alt={sig.symbol} style={{ width: '24px' }} />
                      </div>
                      <div>
                         <h4 style={{ fontSize: '1rem', marginBottom: '2px' }}>{sig.symbol}</h4>
                         <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)' }}>{new Date(sig.created_at).toLocaleTimeString()} ago</p>
                      </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: sig.type === 'Buy' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: sig.type === 'Buy' ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
                        {sig.type}
                      </span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '8px' }}>
                         Entry: ${sig.entry_price}
                      </div>
                   </div>
                </div>
              ))}
              {recentSignals.length === 0 && (
                <p style={{ color: 'var(--admin-text-muted)' }}>No recent broadcasts found.</p>
              )}
           </div>
        </section>
      </main>
    </div>
  );
}
