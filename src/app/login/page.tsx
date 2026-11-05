'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import authService from '@/services/authService';
import { useSetCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/supabaseClient';
import Link from 'next/link';
import PasswordEye from '@/components/PasswordEye';
import toast from 'react-hot-toast';
import '../../styles/register.css';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const setCurrentUser = useSetCurrentUser();

  // Redirect after login is handled centrally by AuthGuard (honours ?next=) once the user is set.
  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => setCurrentUser(data.user),
  });
  const isLoading = login.isPending;
  const isError = login.isError;
  const message = errorMessage(login.error, 'Login failed');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
    } catch (err) {
      const errMsg = errorMessage(err, '');
      if (/not confirmed/i.test(errMsg)) {
        toast.error('Email not verified. Please verify your 6-digit code.');
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }
    }
  };

  // Same look as the Create Account page (register.css).
  return (
    <div className="register-page-wrapper">
      <div className="register-card">
        <Link href="/" className="back-link auth-back" aria-label="Back to Home" title="Back to Home">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="register-header">
          <div className="register-logo-icon">
            <Link href="/" aria-label="AsianFX home" title="Home" style={{ display: 'block', width: '100%', height: '100%' }}><img src="/images/logo-mark.png" style={{ width: '100%', height: '100%' }} alt="AsianFX Signals" /></Link>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your trading account</p>
        </div>

        {isError && (
          <div style={{
            color: '#fb7185',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid rgba(244, 63, 94, 0.2)'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="register-form">
          <div className="input-field-group">
            <label>Email Address</label>
            <div className="input-field-container">
              <input
                type="email"
                placeholder="name@example.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-field-group">
            <label>Password</label>
            <div className="input-field-container">
              <input
                id="passwordField"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{ color: showPassword ? 'var(--t-gold)' : 'var(--t-text-muted)' }}
              >
                <PasswordEye visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={isLoading}>
            {isLoading ? <><span className="btn-spinner dark"></span>Signing In...</> : 'Sign In'}
          </button>
        </form>

        <div className="register-footer">
          Don&apos;t have an account? <Link href="/register">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
