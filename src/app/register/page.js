'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, reset } from '@/redux/slices/authSlice';
import Link from 'next/link';
import '../../styles/login.css';

export default function Register() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
  });

  const { name, email, password, phone, country } = formData;

  const { isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  useEffect(() => {
    if (isSuccess) {
      router.push('/login');
      dispatch(reset());
    }

    if (isError) {
      // Error is displayed in the UI
    }
  }, [isSuccess, isError, message, router, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(registerUser(formData));
  };

  return (
    <div className="login-container">
      <div className="login-icon">
        <img src="/images/arrow (1).png" style={{ width: '24px' }} alt="Logo Icon" />
      </div>

      <h1>Create Account</h1>
      <p className="subtext">Join our trading community today</p>

      <form onSubmit={handleSubmit}>
        {isError && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>{message}</div>}
        {isSuccess && <div style={{ color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>Successfully registered! Redirecting to login...</div>}

        <div className="input-group">
          <label>Full Name</label>
          <div className="input-wrapper">
            <input 
              type="text" 
              name="name"
              placeholder="Enter your full name" 
              className="input-box icon-padding" 
              value={name}
              onChange={onChange}
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Email</label>
          <div className="input-wrapper">
            <input 
              type="email" 
              name="email"
              placeholder="Enter your email" 
              className="input-box icon-padding" 
              value={email}
              onChange={onChange}
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <div className="input-wrapper">
            <input 
              type="tel" 
              name="phone"
              placeholder="Enter your phone number" 
              className="input-box icon-padding" 
              value={phone}
              onChange={onChange}
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Country</label>
          <div className="input-wrapper">
            <input 
              type="text" 
              name="country"
              placeholder="Enter your country" 
              className="input-box icon-padding" 
              value={country}
              onChange={onChange}
              required 
            />
          </div>
        </div>

        <div className="input-group">
          <label>Password</label>
          <div className="input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Create a password"
              className="input-box icon-padding-right"
              value={password}
              onChange={onChange}
              required
            />
            <img
              src="/images/eye icon.png"
              className="input-icon-right"
              style={{ cursor: 'pointer' }}
              onClick={togglePasswordVisibility}
              alt="Toggle Password"
            />
          </div>
        </div>

        <button type="submit" className="login-btn" style={{ marginTop: '20px' }} disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
