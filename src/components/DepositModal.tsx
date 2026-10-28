'use client';

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import transactionService from '../services/transactionService';
import { errorMessage } from '@/lib/supabaseClient';

export default function DepositModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [depositAmount, setDepositAmount] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProofViewOpen, setIsProofViewOpen] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const walletAddress = "TA199GDmT2ybpMKdHwZkjMgo2awuk1N1fV";
  

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Wallet address copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      toast.error(errorMessage(err, 'Failed to submit deposit request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDepositAmount('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setIsProofViewOpen(false);
    onClose();
  };

  const clearScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    setIsProofViewOpen(false);
    if (proofInputRef.current) proofInputRef.current.value = '';
  };


  // Same look as the Deposit modal on the Signals (dashboard) page.
  const label = { display: 'block', fontSize: '0.85rem', color: 'var(--t-text-muted)', marginBottom: '0.75rem', fontWeight: 600 };
  const field = { width: '100%', background: 'var(--tw-03)', border: '1px solid var(--tw-10)', borderRadius: '12px', color: 'var(--t-text)', fontSize: '0.85rem', padding: '12px', outline: 'none' };

  return (
    <div
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--t-surface)', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid var(--tw-10)', padding: 'clamp(1.5rem, 5vw, 2.5rem)', position: 'relative', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)', color: 'var(--t-text)' }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--tw-05)', border: 'none', color: 'var(--t-text)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', color: 'var(--t-text)' }}>Deposit Funds</h2>
        <p style={{ color: 'var(--t-text-muted)', textAlign: 'center', fontSize: '0.9rem', marginBottom: '2rem' }}>Transfer USDT and upload payment proof below.</p>

        {/* Binance address */}
        <div style={{ background: 'var(--tw-03)', border: '1px solid var(--tw-10)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--t-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Send USDT to this <strong>Binance</strong> address:</p>
          <div
            onClick={handleCopy}
            title="Click to copy"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--t-bg)', padding: '10px 10px 10px 14px', borderRadius: '8px', border: '1px dashed var(--t-accent)', marginBottom: '0.75rem', cursor: 'pointer' }}
          >
            <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all', fontSize: '0.9rem', fontWeight: 600, color: 'var(--t-text)', textAlign: 'left', userSelect: 'all' }}>
              {walletAddress}
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              style={{ flexShrink: 0, background: copied ? '#22c55e' : 'var(--btn-primary)', color: copied ? '#fff' : '#111', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '0.7rem', color: 'var(--t-text-muted)' }}>
            <span>Network: <strong>TRC20</strong></span>
            <span>•</span>
            <span>Asset: <strong>USDT</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Amount Sent (USDT)</label>
            <input
              type="number"
              min="5"
              step="any"
              required
              placeholder="Min $5"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              style={field}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={label}>Upload Payment Proof (Screenshot)</label>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/*"
              required={!screenshot}
              onChange={handleFileChange}
              style={field}
            />
            {screenshotPreview && (
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--t-text-muted)', marginBottom: '0.5rem' }}>Preview:</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={screenshotPreview}
                  alt="Proof Preview"
                  style={{ height: '140px', width: 'auto', borderRadius: '12px', border: '2px solid var(--t-accent)', padding: '4px', background: 'rgba(0,0,0,0.5)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsProofViewOpen(true)}
                    style={{ background: 'var(--btn-primary)', color: '#111', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                  >View</button>
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    aria-label="Remove screenshot"
                    title="Remove screenshot"
                    style={{ background: 'var(--tw-05)', color: 'var(--t-text)', border: '1px solid var(--tw-10)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !screenshot}
            style={{ width: '100%', background: 'var(--btn-primary)', color: 'var(--t-on-accent)', border: 'none', padding: '1.25rem', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
          >
            {isSubmitting ? <><span className="btn-spinner dark"></span>Processing...</> : 'I Have Paid'}
          </button>
        </form>
      </div>

      {isProofViewOpen && screenshotPreview && (
        <div
          onClick={(e) => { e.stopPropagation(); setIsProofViewOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsProofViewOpen(false); }}
            aria-label="Close image"
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshotPreview}
            alt="Proof full view"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px' }}
          />
        </div>
      )}
    </div>
  );
}
