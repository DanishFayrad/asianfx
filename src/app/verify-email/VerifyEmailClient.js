'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import authService from '../../services/authService';
import toast from 'react-hot-toast';
import '../../styles/forgotPassword.css';

export default function VerifyEmailClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get('email');
    
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(emailFromQuery || '');

    useEffect(() => {
        if (!emailFromQuery && !email) {
            toast.error('Email is missing. Please register again.');
            router.push('/register');
        }
    }, [emailFromQuery, email, router]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.verifyOTP({ email, otp });
            toast.success('Email verified successfully! You can now login.');
            router.push('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Verification failed. Incorrect OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await authService.resendOTP({ email });
            toast.success('New verification code sent to your email!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend code');
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="logo-section">
                    <div className="logo-circle">
                        <img src="/images/envelope icon.png" alt="Email" style={{ width: '30px', filter: 'invert(1)' }} />
                    </div>
                    <h1 className="title">Verify Email</h1>
                    <p className="subtitle">We've sent a 6-digit verification code to <br/><strong>{email}</strong></p>
                </div>

                <form onSubmit={handleVerify}>
                    <div className="form-group">
                        <label>Verification Code</label>
                        <input 
                            type="text" 
                            className="input-box" 
                            placeholder="Enter 6-digit code" 
                            maxLength="6"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required 
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify & Activate'}
                    </button>
                    
                    <button 
                        type="button" 
                        className="back-to-login" 
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-dim)' }}
                        onClick={handleResend}
                    >
                        Didn't receive a code? <span style={{ color: 'var(--primary-gold)' }}>Resend</span>
                    </button>
                </form>

                <div className="back-to-login">
                    <Link href="/login">← Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
