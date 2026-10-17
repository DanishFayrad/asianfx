'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import transactionService from '../services/transactionService';

export default function DepositModal({ isOpen, onClose }) {
  const [depositAmount, setDepositAmount] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletAddress = "TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV";
  const quickAmounts = [10, 25, 50, 100, 250, 500];

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Wallet address copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) < 5) {
      toast.error('Minimum deposit amount is $5');
      return;
    }
    if (!screenshot) {
      toast.error('Please upload a screenshot of your transaction proof');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', depositAmount);
      formData.append('payment_method', 'USDT_TRC20');
      formData.append('proof_image', screenshot);

      await transactionService.requestDeposit(formData);
      toast.success('Deposit request submitted! Admin will verify and credit your wallet.');
      handleClose();
    } catch (err) {
      console.error("Deposit submit failed:", err);
      toast.error(err.response?.data?.message || 'Failed to submit deposit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDepositAmount('');
    setScreenshot(null);
    setScreenshotPreview(null);
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div 
        className="deposit-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, var(--t-surface) 0%, var(--t-surface) 100%)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '24px',
          border: '1px solid rgba(var(--t-accent-rgb), 0.3)',
          padding: '30px 26px',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(var(--t-accent-rgb), 0.1)',
          color: 'var(--t-text)',
          fontFamily: 'inherit'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
          type="button"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--tw-05)',
            border: '1px solid var(--tw-10)',
            color: 'var(--t-text-muted)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--tw-05)';
            e.currentTarget.style.color = 'var(--t-text-muted)';
            e.currentTarget.style.borderColor = 'var(--tw-10)';
          }}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(var(--t-accent-rgb), 0.25), rgba(var(--t-accent-rgb), 0.05))',
            border: '1px solid rgba(var(--t-accent-rgb), 0.4)',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '26px' }}>💰</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--t-text)', letterSpacing: '-0.3px' }}>
            Deposit Funds
          </h2>
          <p style={{ color: 'var(--t-text-muted)', fontSize: '0.88rem', margin: 0, lineHeight: 1.4 }}>
            Transfer USDT and upload payment screenshot proof below
          </p>
        </div>

        {/* Binance / USDT TRC20 Wallet Box */}
        <div style={{
          background: 'var(--tw-03)',
          border: '1px solid rgba(var(--t-accent-rgb), 0.25)',
          borderRadius: '16px',
          padding: '16px 18px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--t-text-muted)', fontWeight: 600 }}>USDT Deposit Address:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ background: 'rgba(var(--t-accent-rgb), 0.15)', color: 'var(--t-gold)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                TRC20
              </span>
              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                BINANCE
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#090d16',
            border: '1px dashed rgba(var(--t-accent-rgb), 0.4)',
            borderRadius: '10px',
            padding: '10px 14px',
            gap: '8px'
          }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#facc15',
              wordBreak: 'break-all',
              fontWeight: 600
            }}>
              {walletAddress}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: copied ? '#22c55e' : 'var(--t-accent)',
                color: '#000000',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
              }}
            >
              {copied ? 'Copied! ✓' : 'Copy'}
            </button>
          </div>

          <p style={{ margin: '8px 0 0 0', fontSize: '0.72rem', color: 'var(--t-text-dim)', textAlign: 'center' }}>
            ⚠️ Only send USDT via TRC20 network to this address. Minimum deposit is $5.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--t-text)', fontWeight: 600, marginBottom: '8px' }}>
              Amount Sent (USDT)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '14px', color: 'var(--t-gold)', fontWeight: 800, fontSize: '1.2rem' }}>$</span>
              <input
                type="number"
                min="5"
                step="any"
                required
                placeholder="5.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--tw-03)',
                  border: '1px solid var(--tw-10)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 34px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--t-text)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--t-accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--tw-10)'}
              />
            </div>

            {/* Quick Amount Chips */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDepositAmount(amt.toString())}
                  style={{
                    background: depositAmount === amt.toString() ? 'rgba(var(--t-accent-rgb), 0.25)' : 'var(--tw-05)',
                    border: depositAmount === amt.toString() ? '1px solid var(--t-accent)' : '1px solid var(--tw-10)',
                    color: depositAmount === amt.toString() ? '#facc15' : '#cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Screenshot Upload */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--t-text)', fontWeight: 600, marginBottom: '8px' }}>
              Upload Payment Proof (Screenshot)
            </label>
            <div style={{
              border: '2px dashed rgba(var(--t-accent-rgb), 0.3)',
              borderRadius: '14px',
              padding: '18px',
              textAlign: 'center',
              background: 'var(--tw-02)',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept="image/*"
                required={!screenshot}
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
              />
              {screenshotPreview ? (
                <div>
                  <img
                    src={screenshotPreview}
                    alt="Proof Preview"
                    style={{
                      maxHeight: '120px',
                      borderRadius: '10px',
                      border: '1px solid var(--t-accent)',
                      marginBottom: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                    }}
                  />
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>
                    ✓ Screenshot attached: {screenshot?.name} (Click to change)
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>📷</div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--t-text)' }}>
                    Click or drag & drop payment proof
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--t-text-dim)' }}>
                    PNG, JPG, JPEG up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #facc15 0%, var(--t-accent) 100%)',
              color: 'var(--t-on-accent)',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(var(--t-accent-rgb), 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!isSubmitting) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isSubmitting ? (
              <>⏳ Submitting Request...</>
            ) : (
              <>⚡ I Have Paid &amp; Submit Proof</>
            )}
          </button>
        </form>

        <p style={{ color: 'var(--t-text-dim)', fontSize: '0.72rem', textAlign: 'center', margin: '16px 0 0 0' }}>
          ⭐ Admin will verify your transaction and credit your account balance.
        </p>
      </div>
    </div>
  );
}
