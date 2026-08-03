import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function GuestOtpPanel({
  email,
  otpValues,
  otpError,
  registerError,
  otpCountdown,
  registerLoading,
  serverMessage,
  onBack,
  onOtpChange,
  onOtpKeyDown,
  onVerify,
  onResend,
}) {
  return (
    <div className="page-enter animate-fade-in" style={{ display: 'grid', gap: 20, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: -10 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', padding: '8px 10px', borderRadius: 'var(--r-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#fff' }}
        >
          <ArrowLeft size={16} />
          <span style={{ fontSize: '0.8rem' }}>Come back</span>
        </button>
      </div>

      <div className="alert-banner info" style={{ margin: 0, padding: '16px 18px' }}>
        <ShieldCheck size={18} color="var(--cyan-400)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {serverMessage || `An authentication OTP code has been sent to the email ${email}. Enter the code to activate the account.`}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          {otpValues.map((value, index) => (
            <input
              key={index}
              id={`otp-field-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value}
              onChange={(e) => onOtpChange(e.target.value, index)}
              onKeyDown={(e) => onOtpKeyDown(e, index)}
              className="input"
              style={{ width: 42, height: 42, textAlign: 'center', fontSize: '1rem', lineHeight: 1.2, padding: 0 }}
            />
          ))}
        </div>
        {otpError && <div style={{ color: 'var(--red-400)', fontSize: '0.85rem', textAlign: 'center' }}>Please enter the correct 6-digit OTP code.</div>}
        {registerError && <div style={{ color: 'var(--red-400)', fontSize: '0.85rem', textAlign: 'center' }}>{registerError}</div>}
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center' }} onClick={onVerify}>
            Confirm OTP
          </button>
          <button
            className="btn btn-ghost"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: otpCountdown > 0 ? 0.55 : 1, cursor: otpCountdown > 0 || registerLoading ? 'not-allowed' : 'pointer', pointerEvents: otpCountdown > 0 || registerLoading ? 'none' : 'auto' }}
            onClick={onResend}
            disabled={otpCountdown > 0 || registerLoading}
          >
            {registerLoading ? (
              <>
                <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                Sending...
              </>
            ) : `Resend OTP ${otpCountdown > 0 ? `(${otpCountdown}s)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
