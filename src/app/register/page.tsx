'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import authService from '@/services/authService';
import { errorMessage } from '@/lib/supabaseClient';
import Link from 'next/link';
import '../../styles/register.css';

export default function Register() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    country: '',
    referral_code: '',
  });

  useEffect(() => {
    // Check URL first
    const urlParams = new URLSearchParams(window.location.search);
    const refFromUrl = urlParams.get('ref');
    
    if (refFromUrl) {
      setFormData(prev => ({ ...prev, referral_code: refFromUrl }));
      localStorage.setItem('referral_code', refFromUrl); // Also save for future
    } else {
      // Fallback to localStorage
      const storedRef = localStorage.getItem('referral_code');
      if (storedRef) {
        setFormData(prev => ({ ...prev, referral_code: storedRef }));
      }
    }
  }, []);

  const { name, email, password, phone, country } = formData;

  // After signing up, go verify the email with the code Supabase sent.
  const register = useMutation({
    mutationFn: authService.register,
    onSuccess: (_data, variables) => router.push(`/otp?email=${encodeURIComponent(variables.email)}`),
  });
  const isLoading = register.isPending;
  const isError = register.isError;
  const message = errorMessage(register.error, 'Registration failed');

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    register.mutate(formData);
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-card">
        <Link href="/" className="back-link" style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--t-text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
           ← Back to Home
        </Link>

        <div className="register-header">
          <div className="register-logo-icon">
            <img src="/images/logo-mark.png" style={{ width: '100%', height: '100%' }} alt="AsianFX Signals" />
          </div>
          <h1>Create Account</h1>
          <p>Start your professional trading journey</p>
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

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-field-group">
            <label>Full Name</label>
            <div className="input-field-container">
              <input 
                type="text" 
                name="name"
                placeholder="Enter your full name" 
                value={name}
                onChange={onChange}
                required 
              />
            </div>
          </div>

          <div className="input-field-group">
            <label>Email Address</label>
            <div className="input-field-container">
              <input 
                type="email" 
                name="email"
                placeholder="name@example.com" 
                value={email}
                onChange={onChange}
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="input-field-group">
              <label>Phone Number</label>
              <div className="input-field-container">
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="+1 (555) 000-0000" 
                  value={phone}
                  onChange={onChange}
                  required 
                />
              </div>
            </div>

            <div className="input-field-group">
              <label>Country</label>
              <div className="input-field-container">
                <input 
                  type="text" 
                  name="country"
                  placeholder="e.g. United States" 
                  value={country}
                  onChange={onChange}
                  required 
                />
              </div>
            </div>
          </div>

          <div className="input-field-group">
            <label>Password</label>
            <div className="input-field-container">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={password}
                onChange={onChange}
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
              >
                <img
                  src="/images/eye icon.png"
                  style={{ width: '18px', filter: 'invert(1)' }}
                  alt="Toggle"
                />
              </button>
            </div>
          </div>

          <div className="input-field-group">
            <label>Referral Code (Optional)</label>
            <div className="input-field-container">
              <input 
                type="text" 
                name="referral_code"
                placeholder="Enter referral code" 
                value={formData.referral_code}
                onChange={onChange}
              />
            </div>
          </div>

          <button type="submit" className="signup-submit-btn" disabled={isLoading}>
            {isLoading ? <><span className="btn-spinner dark"></span>Creating Account...</> : 'Create Account'}
          </button>
        </form>

        <div className="register-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

