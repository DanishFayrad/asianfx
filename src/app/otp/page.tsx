'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import authService from '@/services/authService';
import { authKeys } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import '../../styles/otp.css';
import { errorMessage } from '@/lib/supabaseClient';

const OTP_LIFETIME_MS = 2 * 60 * 1000;

function OtpClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const email = searchParams.get('email');
    
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    // The code is valid for 2 minutes; the timer restarts whenever a new code is sent.
    const [expiresAt, setExpiresAt] = useState(() => Date.now() + OTP_LIFETIME_MS);
    const [now, setNow] = useState(() => Date.now());
    const secondsLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
    const expired = secondsLeft === 0;
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (expired) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [expired, expiresAt]);

    useEffect(() => {
        if (!email) {
            toast.error('Email is missing. Please register again.');
            router.push('/register');
        }
    }, [email, router]);

    const handleChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste
            const pastedData = value.slice(0, 6).split('');
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                if (index + i < 6) newOtp[index + i] = char;
            });
            setOtp(newOtp);
            // Focus last pasted or last input
            const lastIndex = Math.min(index + pastedData.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter the full 6-digit code');
            return;
        }
        if (expired) {
            toast.error('This code has expired. Please request a new one.');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyOTP({ email: email || '', otp: otpString });
            toast.success('Email verified! Welcome to AsianFX.');
            // Verifying signs the member in — load their profile before opening the dashboard.
            await queryClient.refetchQueries({ queryKey: authKeys.user });
            router.push('/dashboard');
        } catch (error) {
            toast.error(errorMessage(error, 'Verification failed. Incorrect OTP.'));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resending) return;
        setResending(true);
        try {
            await authService.resendOTP({ email: email || '' });
            toast.success('New verification code sent to your email!');
            setOtp(['', '', '', '', '', '']);
            const t = Date.now();
            setNow(t);
            setExpiresAt(t + OTP_LIFETIME_MS);
            inputRefs.current[0]?.focus();
        } catch (error) {
            toast.error(errorMessage(error, 'Failed to resend code'));
        } finally {
            setResending(false);
        }
    };

    const timerText = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

    return (
        <div className="otp-container">
            <div className="otp-card">
                <Link href="/" className="otp-logo" aria-label="AsianFX home" title="Home">
                    <img src="/images/logo-mark.png" alt="AsianFX" width={56} height={56} />
                </Link>

                <h2 className="otp-title">Verify your email</h2>
                <p className="otp-subtitle">
                    Enter the 6-digit code we sent to<br />
                    <strong>{email}</strong>
                </p>

                <div className="otp-inputs">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            aria-label={`Digit ${index + 1}`}
                            maxLength={1}
                            value={digit}
                            className={digit ? 'filled' : ''}
                            onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={(e) => {
                                e.preventDefault();
                                const paste = e.clipboardData.getData('text').replace(/\D/g, '');
                                handleChange(index, paste);
                            }}
                        />
                    ))}
                </div>

                <p className={`otp-timer${expired ? ' expired' : secondsLeft <= 30 ? ' warn' : ''}`} aria-live="polite">
                    {expired
                        ? 'Code expired. Please request a new one.'
                        : <>Code expires in <span className="num">{timerText}</span></>}
                </p>

                <button
                    className="verify-btn"
                    onClick={handleVerify}
                    disabled={loading || expired || otp.join('').length !== 6}
                >
                    {loading ? <><span className="btn-spinner dark"></span>Verifying…</> : 'Verify Code'}
                </button>

                <p className="otp-resend">
                    Didn&apos;t get the code?{' '}
                    <button type="button" onClick={handleResend} disabled={resending}>
                        {resending ? 'Sending…' : 'Resend code'}
                    </button>
                </p>

                <div className="otp-footer">
                    <Link href="/login">← Back to Login</Link>
                    <span className="otp-secure">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                        Secured connection
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function Otp() {
    return (
        <Suspense fallback={
            <div className="otp-container">
                <div className="otp-card" style={{ textAlign: 'center', padding: '50px' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ color: 'var(--t-text)', marginTop: '20px' }}>Loading verification page...</p>
                </div>
            </div>
        }>
            <OtpClient />
        </Suspense>
    );
}
