'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import signalService from '../../../services/signalService';
import '../../../styles/dashboard.css';

export default function AdminSignals() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [type, setType] = useState('Buy'); // 'Buy' or 'Sell'
  const [formData, setFormData] = useState({
    symbol: 'XAUUSD',
    entry_price: '',
    stop_loss: '',
    target_price: '',
    signal_type: 'free',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    if (!user?.is_admin) {
      router.push('/dashboard');
    }
    document.body.classList.add('dashboard-body');
    return () => document.body.classList.remove('dashboard-body');
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...formData,
        type: type,
        // Convert to numbers for consistency
        entry_price: parseFloat(formData.entry_price),
        target_price: parseFloat(formData.target_price),
        stop_loss: parseFloat(formData.stop_loss),
      };

      await signalService.createSignal(payload);
      setMessage('Signal posted and broadcasted successfully!');
      setFormData({
        symbol: 'XAUUSD',
        entry_price: '',
        stop_loss: '',
        target_price: '',
        signal_type: 'free',
        description: '',
      });
    } catch (error) {
      console.error("Error creating signal:", error);
      setMessage(error.response?.data?.message || 'Error posting signal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="db-main-layout">
      <header className="db-navbar">
        <div className="db-nav-left">
          <div className="db-logo" onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
            <div className="logo-box">
              <img src="/images/i (9).png" alt="Logo" />
            </div>
            <span>TradePro Admin</span>
          </div>
        </div>
        <div style={{ marginRight: '1.5rem' }}>
            <button className="deposit" onClick={() => router.push('/dashboard')}>Back to Dashboard</button>
        </div>
      </header>

      <div className="db-container admin-container">
        <h1 className="db-page-title">Create New Signal</h1>
        <p className="db-subtitle">Fill the details below to broadcast a signal to all users instantly.</p>

        <div className="db-filters-card admin-card">
          {/* Signal Type Toggle */}
          <div className="type-toggle">
            <button 
              type="button"
              onClick={() => setType('Buy')}
              className={`type-btn buy-type ${type === 'Buy' ? 'active' : ''}`}
            >
              BUY (GREEN)
            </button>
            <button 
              type="button"
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

            <div className="form-row">
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
              <label>Description (Optional)</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Market analysis or notes..."
                className="admin-input"
                style={{ minHeight: '80px', paddingTop: '10px' }}
              />
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
