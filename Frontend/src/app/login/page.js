'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/login.css';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, you'd handle authentication here
    router.push('/dashboard');
  };

  return (
    <div className="login-container">
      <div className="login-icon">
        <img src="/images/arrow (1).png" className=".logo b" alt="Logo Icon" />
      </div>

      <h1>Welcome Back</h1>
      <p className="subtext">Sign in to your trading account</p>

      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Email</label>
          <div className="input-wrapper">
            <img src="/images/envelope icon.png" className="input-icon" alt="Email Icon" />
            <input type="email" placeholder="Enter your email" className="input-box icon-padding" required />
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
          <a href="#">Forgot password?</a>
        </div>
        <button type="submit" className="login-btn" id="loginBtn">
          Sign In
        </button>
      </form>

      <div className="divider">
        <span className="line"></span>
        <span className="text">Or continue with</span>
        <span className="line"></span>
      </div>

      <div className="social">
        <button type="button">
          <img src="/images/google.png" style={{ height: '18px', paddingRight: '10px', marginBottom: '-5px' }} alt="Google Icon" />
          Google
        </button>
        <button type="button">
          <img src="/images/apple.png" style={{ height: '18px', paddingRight: '10px', marginBottom: '-4px' }} alt="Apple Icon" />
          Apple
        </button>
      </div>

      <div className="footer">
        Don't have an account? <a href="/#consultation">Sign up</a>
      </div>
    </div>
  );
}
