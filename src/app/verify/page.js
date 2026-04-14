'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import '../../styles/verify.css';

export default function Verify() {
  const router = useRouter();

  const handleContinue = () => {
    router.push('/otp');
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        <div className="icon-circle">
          <img src="/images/svg (12).png" alt="Verification Icon" />
        </div>
        <h2>Choose Verification Method</h2>
        <p className="subtitle">Select how you'd like to receive your verification code</p>

        {/*  OPTION 1 — Email Verification (Active by default)  */}
        <div className="verify-option active">
          <div className="left">
            <div className="icon">
              <img src="/images/div (1).png" alt="Email Icon" />
            </div>
            <div>
              <h4>Email Verification</h4>
              <p>Receive code via email</p>
            </div>
          </div>
          <div className="radio"></div>
        </div>

        <button className="continue-btn" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
