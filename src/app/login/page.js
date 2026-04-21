'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, reset } from '@/redux/slices/authSlice';
import Link from 'next/link';
import '../../styles/login.css';

export default function Login() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { user, token, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isSuccess || token) {
      if (user?.is_admin) {
        router.push('/admin/signals');
      } else {
        router.push('/dashboard');
      }
      dispatch(reset());
    }
  }, [token, user, isError, isSuccess, message, router, dispatch]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="login-container">
      <div className="login-icon">
        <img src="/images/arrow (1).png" className=".logo b" alt="Logo Icon" />
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
              type="email" 
              placeholder="Enter your email" 
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
            <img
              src="/images/eye icon.png"
              id="togglePassword"
              className="input-icon-right"
              style={{ cursor: 'pointer' }}
              onClick={togglePasswordVisibility}
              alt="Toggle Password Visibility"
            />
          </div>
        </div>

        <div className="options">
          <label>
            <input type="checkbox" /> Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="login-btn" id="loginBtn" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>


      

      <div className="footer">
        Don't have an account? <Link href="/register">Sign up</Link>
      </div>
    </div>
  );
}
