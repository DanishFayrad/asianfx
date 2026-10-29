'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import authService from '@/services/authService';
import { errorMessage } from '@/lib/supabaseClient';
import Link from 'next/link';
import { PhoneInput, defaultCountries, parseCountry, type PhoneInputRefType } from 'react-international-phone';
import PasswordEye from '@/components/PasswordEye';
import 'react-international-phone/style.css';
import '../../styles/register.css';

/** Every country (same list as the phone field), sorted by name, for the Country dropdown. */
const COUNTRIES = defaultCountries.map((c) => parseCountry(c)).sort((a, b) => a.name.localeCompare(b.name));

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

  // Phone (react-international-phone): stored with its country code, e.g. "+923001234567".
  // The country field follows the chosen phone country until the member edits it themselves.
  const [phoneHasNumber, setPhoneHasNumber] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [countryTouched, setCountryTouched] = useState(false);
  const phoneRef = useRef<PhoneInputRefType>(null);

  const onPhoneChange = (value: string, meta: { country: { name: string; dialCode: string }; inputValue: string }) => {
    setPhoneHasNumber(meta.inputValue.replace(/\D/g, '').length > meta.country.dialCode.length);
    setPhoneError('');
    setFormData((prev) => ({
      ...prev,
      phone: value,
      country: countryTouched ? prev.country : meta.country.name,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!phoneHasNumber) {
      setPhoneError('Please enter your phone number.');
      return;
    }
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
            <Link href="/" aria-label="AsianFX home" title="Home" style={{ display: 'block', width: '100%', height: '100%' }}><img src="/images/logo-mark.png" style={{ width: '100%', height: '100%' }} alt="AsianFX Signals" /></Link>
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
                <PhoneInput
                  ref={phoneRef}
                  className="reg-phone"
                  defaultCountry="pk"
                  value={phone}
                  onChange={onPhoneChange}
                  inputProps={{ 'aria-label': 'Phone number', autoComplete: 'tel' }}
                />
                {phoneError && <small className="reg-phone-error">{phoneError}</small>}
              </div>
            </div>

            <div className="input-field-group">
              <label>Country</label>
              <div className="input-field-container">
                <select
                  name="country"
                  className="reg-country"
                  value={country}
                  onChange={(e) => {
                    setCountryTouched(true);
                    onChange(e);
                    // No number typed yet → switch the phone field to the same country's code.
                    const picked = COUNTRIES.find((c) => c.name === e.target.value);
                    if (picked && !phoneHasNumber) phoneRef.current?.setCountry(picked.iso2);
                  }}
                  required
                >
                  <option value="" disabled>Select country</option>
                  {COUNTRIES.map((c) => <option key={c.iso2} value={c.name}>{c.name}</option>)}
                </select>
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
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{ color: showPassword ? 'var(--t-gold)' : 'var(--t-text-muted)' }}
              >
                <PasswordEye visible={showPassword} />
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

