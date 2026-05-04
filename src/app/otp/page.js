'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { reset } from '@/redux/slices/authSlice';
import authService from '@/services/authService';
import toast from 'react-hot-toast';
import '../../styles/otp.css';

function OtpClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const email = searchParams.get('email');
    
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            toast.error('Email is missing. Please register again.');
            router.push('/register');
        }
    }, [email, router]);

    const handleChange = (index, value) => {
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
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyOTP({ email, otp: otpString });
            toast.success('Email verified successfully! You can now login.');
            dispatch(reset());
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
        <div className="otp-container">
            <div className="otp-card">
                <div className="icon-circle">
                    <img src="/images/i.png" alt="Info" />
                </div>

                <h2>Account<br />Verification</h2>

                <p className="subtitle">
                    Enter the 6-digit code sent to <br />
                    <strong>{email}</strong>
                </p>

                <div className="otp-inputs">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={(e) => {
                                e.preventDefault();
                                const paste = e.clipboardData.getData('text');
                                handleChange(index, paste);
                            }}
                        />
                    ))}
                </div>

                <button 
                    className="verify-btn" 
                    onClick={handleVerify} 
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? (
                        <div className="btn-spinner"></div>
                    ) : (
                        <>
                            <img src="/images/svg (13).png" alt="Verify" />
                            Verify Code
                        </>
                    )}
                </button>

                <div className="action-link" onClick={handleResend} style={{ cursor: 'pointer' }}>
                    <img src="/images/i (1).png" alt="Resend" />
                    <span>Resend Code</span>
                </div>

                <div className="divider"><span>OR</span></div>

                <div className="action-link" onClick={() => router.push('/login')} style={{ cursor: 'pointer' }}>
                    <img src="/images/i@3x.png" alt="Back" />
                    <span>Back to Login</span>
                </div>

                <div className="secure-box">
                    <img src="/images/svg (14).png" alt="Secure" />
                    <div>
                        <strong>Secured Connection</strong>
                        <p>Your account security is protected with industry-standard encryption</p>
                    </div>
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
                    <p style={{ color: 'white', marginTop: '20px' }}>Loading verification page...</p>
                </div>
            </div>
        }>
            <OtpClient />
        </Suspense>
    );
}
