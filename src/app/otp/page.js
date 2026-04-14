import React from 'react';
import '../../styles/otp.css';


export default function Otp() {
    return (
        <>
<div className="otp-container">

  <div className="otp-card">

    <div className="icon-circle">
      <img src="/images/i.png" />
    </div>

    {/*  Heading forced into 2 lines  */}
    <h2>Two-Factor<br />Authentication</h2>

    {/*  Subtitle forced into 2 lines  */}
    <p className="subtitle">
      Enter the 6-digit code from your
      authenticator <br />app
    </p>

    <div className="otp-inputs">
      <input maxlength="1" />
      <input maxlength="1" />
      <input maxlength="1" />
      <input maxlength="1" />
      <input maxlength="1" />
      <input maxlength="1" />
    </div>

    <button className="verify-btn">
      <img src="/images/svg (13).png" />
      Verify Code
    </button>

    {/*  Resend  */}
    <div className="action-link">
      <img src="/images/i (1).png" />
      <span>Resend Code</span>
    </div>

    <div className="divider"><span>OR</span></div>

    {/*  Backup  */}
    <div className="action-link">
      <img src="/images/i@3x.png" />
      <span>Use Backup Code</span>
    </div>

    <div className="secure-box">
      <img src="/images/svg (14).png" />
      <div>
        <strong>Secured Connection</strong>
        <p>Your account security is protected with industry-standard encryption</p>
      </div>
    </div>

  </div>

</div>
        </>
    );
}
