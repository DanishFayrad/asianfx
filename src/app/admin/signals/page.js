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

      <div className="container admin-container">
        <h1 className="page-title">Create New Signal</h1>
        <p className="subtitle">Fill the details below to broadcast a signal to all users instantly.</p>

        <div className="filters-card admin-card">
          {/* Signal Type Toggle */}
          <div className="type-toggle">
            <button 
              onClick={() => setType('Buy')}
              className={`type-btn buy-type ${type === 'Buy' ? 'active' : ''}`}
            >
              BUY (GREEN)
            </button>
            <button 
              onClick={() => setType('Sell')}
              className={`type-btn sell-type ${type === 'Sell' ? 'active' : ''}`}
            >
              SELL (RED)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="filter-item">
              <label>Symbol (e.g. XAUUSD)</label>
              <div className="input-icon">
                <input 
                  type="text" 
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="XAUUSD"
                  className="admin-input"
                  required
                />
              </div>
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
                className="admin-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="filter-item">
                <label>Stop Loss (SL)</label>
                <input 
                  type="number" 
                  step="any"
                  name="stop_loss"
                  value={formData.stop_loss}
                  onChange={handleChange}
                  placeholder="0.0000"
                  className="admin-input"
                  required
                />
              </div>
              <div className="filter-item">
                <label>Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any"
                  name="target_price"
                  value={formData.target_price}
                  onChange={handleChange}
                  placeholder="0.0000"
                  className="admin-input"
                  required
                />
              </div>
            </div>

            <div className="filter-item">
              <label>Signal Category</label>
              <select 
                name="signal_type"
                value={formData.signal_type}
                className="admin-select"
                onChange={handleChange}
              >
                <option value="free">Free Signal</option>
                <option value="premium">Premium Signal</option>
              </select>
            </div>

            {message && <p className={`status-msg ${message.includes('success') ? 'success' : 'error'}`}>{message}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="post-btn"
            >
              {loading ? 'Broadcasting...' : 'POST SIGNAL NOW'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
