'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../../styles/dashboard.css';

export default function AdminSignals() {
  const router = useRouter();
  const [type, setType] = useState('Buy'); // 'Buy' or 'Sell'
  const [formData, setFormData] = useState({
    symbol: 'XAUUSD',
    entry_price: '',
    stop_loss: '',
    target_price: '',
    signal_type: 'free',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/signals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          type: type,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Signal posted and broadcasted successfully!');
        setFormData({
          symbol: 'XAUUSD',
          entry_price: '',
          stop_loss: '',
          target_price: '',
          signal_type: 'free',
        });
      } else {
        setMessage(data.message || 'Error posting signal');
      }
    } catch (error) {
      setMessage('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-nav">
      <header className="navbar">
        <div className="nav-left">
          <div className="logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
            <div className="logo-box">
              <img src="/images/i (9).png" alt="Logo" />
            </div>
            <span>TradePro Admin</span>
          </div>
        </div>
      </header>

      <div className="container" style={{ maxWidth: '600px', marginTop: '20px' }}>
        <h1 className="page-title">Create New Signal</h1>
        <p className="subtitle">Fill the details below to broadcast a signal to all users instantly.</p>

        <div className="filters-card" style={{ flexDirection: 'column', gap: '20px', padding: '30px' }}>
          {/* Signal Type Toggle */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <button 
              onClick={() => setType('Buy')}
              style={{ 
                flex: 1, 
                padding: '15px', 
                borderRadius: '10px', 
                border: 'none',
                background: type === 'Buy' ? '#22c55e' : '#1A2332',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                cursor: 'pointer',
                transition: '0.3s'
              }}
            >
              BUY (GREEN)
            </button>
            <button 
              onClick={() => setType('Sell')}
              style={{ 
                flex: 1, 
                padding: '15px', 
                borderRadius: '10px', 
                border: 'none',
                background: type === 'Sell' ? '#ef4444' : '#1A2332',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                cursor: 'pointer',
                transition: '0.3s'
              }}
            >
              SELL (RED)
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="filter-item">
              <label>Symbol (e.g. XAUUSD)</label>
              <input 
                type="text" 
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                placeholder="XAUUSD"
                style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', color: 'white' }}
                required
              />
            </div>

            <div className="filter-item">
              <label>Entry Price</label>
              <input 
                type="number" 
                step="any"
                name="entry_price"
                value={formData.entry_price}
                onChange={handleChange}
                placeholder="0.0000"
                style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', color: 'white' }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div className="filter-item" style={{ flex: 1 }}>
                <label>Stop Loss (SL)</label>
                <input 
                  type="number" 
                  step="any"
                  name="stop_loss"
                  value={formData.stop_loss}
                  onChange={handleChange}
                  placeholder="0.0000"
                  style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', color: 'white' }}
                  required
                />
              </div>
              <div className="filter-item" style={{ flex: 1 }}>
                <label>Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any"
                  name="target_price"
                  value={formData.target_price}
                  onChange={handleChange}
                  placeholder="0.0000"
                  style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', color: 'white' }}
                  required
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Signal Category</label>
              <select 
                name="signal_type"
                value={formData.signal_type}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '8px', color: 'white' }}
              >
                <option value="free">Free Signal</option>
                <option value="premium">Premium Signal</option>
              </select>
            </div>

            {message && <p style={{ color: message.includes('success') ? '#22c55e' : '#ef4444', textAlign: 'center' }}>{message}</p>}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '15px', 
                borderRadius: '8px', 
                border: 'none', 
                background: '#d4af37', 
                color: 'black', 
                fontWeight: 'bold', 
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Broadcasting...' : 'POST SIGNAL NOW'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
