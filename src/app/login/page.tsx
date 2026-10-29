'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import authService from '@/services/authService';
import { useSetCurrentUser } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/supabaseClient';
import Link from 'next/link';
import PasswordEye from '@/components/PasswordEye';
import '../../styles/login.css';

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
      // Account exists but email isn't verified yet — send a fresh code and go verify.
      if (/not confirmed/i.test(errorMessage(err, ''))) {
        try { await authService.resendOTP({ email }); } catch {}
        login.reset();
        router.push(`/otp?email=${encodeURIComponent(email)}`);
      }
    }
  };

  return (
    <div className="login-page">
    <div className="login-container">
      <div className="login-icon">
        <Link href="/" aria-label="AsianFX home" title="Home"><img src="/images/logo-mark.png" className="login-logo" alt="AsianFX Signals" width={72} height={72} /></Link>
      </div>

      <h1>Welcome Back</h1>
      <p className="subtext">Sign in to your trading account</p>

      <form onSubmit={handleLogin}>
        {isError && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>{message}</div>}

        <div className="input-group">
          <label>Email</label>
          <div className="input-wrapper">
            <img src="/images/envelope icon.png" className="input-icon" alt="Email Icon" />
            <input
              type="text"
              placeholder="Enter your email" autoComplete="username"
              className="input-box icon-padding"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="input-wrapper">
            {/*  LEFT ICON  */}
            <img src="/images/lock.png" className="input-icon" alt="Lock Icon" />

            {/*  PASSWORD INPUT  */}
            <input
              id="passwordField"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className="input-box icon-padding-right"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/*  RIGHT ICON (EYE TOGGLE)  */}
            <button
              type="button"
              id="togglePassword"
              className="input-icon-right"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'grid', placeItems: 'center', color: showPassword ? 'var(--t-gold)' : 'var(--t-text-muted)' }}
            >
              <PasswordEye visible={showPassword} />
            </button>
          </div>
        </div>

        <div className="options">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="login-btn" id="loginBtn" disabled={isLoading}>
          {isLoading ? <><span className="btn-spinner"></span>Signing In...</> : 'Sign In'}
        </button>
      </form>




      <div className="login-footer">
        Don't have an account? <Link href="/register">Sign up</Link>
      </div>
    </div>
    </div>
  );
}
