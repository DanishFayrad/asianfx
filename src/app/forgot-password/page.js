'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import authService from '../../services/authService';
import { logout } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';
import '../../styles/forgotPassword.css';

export default function ForgotPassword() {
    const router = useRouter();
    const dispatch = useDispatch();
    const [step, setStep] = useState(1); // 1: Email, 2: Reset
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.forgotPassword({ email });
            toast.success('Reset code sent to your email!');
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (newPassword.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            await authService.resetPassword({ email, otp: otp.trim(), newPassword });
            // Verifying the code briefly signs the user in; clear it so /login doesn't bounce to the dashboard.
            dispatch(logout());
            toast.success('Password reset successfully! Please login with your new password.');
            router.push('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Reset failed. Check your OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="logo-section">
                    <div className="logo-circle">
                        <img src="/images/logo-mark.svg" alt="" style={{ width: '34px' }} />
                    </div>
                    <h1 className="title">Reset Password</h1>
                    <div className="step-indicator">
                        <div className={`step-dot ${step === 1 ? 'active' : ''}`}></div>
                        <div className={`step-dot ${step === 2 ? 'active' : ''}`}></div>
                    </div>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOTP}>
                        <p className="subtitle">Enter the email associated with your account and we'll send you a 6-digit verification code.</p>
                        
                        <div className="form-group">
                            <label>Email Address</label>
                            <input 
                                type="email" 
                                className="input-box" 
                                placeholder="name@example.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <p className="subtitle">Enter the 6-digit code sent to <strong>{email}</strong> and your new password.</p>
                        
                        <div className="form-group">
                            <label>Verification Code</label>
                            <input 
                                type="text" 
                                className="input-box" 
                                placeholder="Enter the code from your email"
                                maxLength="8"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <input 
                                type="password" 
                                className="input-box" 
                                placeholder="Min 6 characters" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>Confirm Password</label>
                            <input 
                                type="password" 
                                className="input-box" 
                                placeholder="Repeat your new password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required 
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Resetting...' : 'Update Password'}
                        </button>

                        <button
                            type="button"
                            disabled={loading}
                            style={{ background: 'transparent', border: 'none', color: 'var(--t-gold)', marginTop: '1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'block', width: '100%' }}
                            onClick={async () => {
                                try {
                                    await authService.forgotPassword({ email });
                                    toast.success('A new code has been sent to your email.');
                                } catch (error) {
                                    toast.error(error.response?.data?.message || 'Could not resend code. Please wait a minute and try again.');
                                }
                            }}
                        >
                            Didn&apos;t get the code? Resend
                        </button>

                        <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', marginTop: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', display: 'block', width: '100%' }}
                            onClick={() => setStep(1)}
                        >
                            Back to email entry
                        </button>
                    </form>
                )}

                <div className="back-to-login">
                    <Link href="/login">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
