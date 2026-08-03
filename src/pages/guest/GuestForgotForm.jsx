import React, { useState, useEffect } from 'react';
import { CheckCircle2, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function GuestForgotForm({ onBack }) {
  const [step, setStep] = useState('input_email');
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loadingAction, setLoadingAction] = useState(null);
  const loading = loadingAction !== null;
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (step === 'input_otp' && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpCountdown]);

  useEffect(() => {
    if (step === 'input_otp' && email) {
      const emailKey = email.trim().toLowerCase();
      const storedUntil = Number(localStorage.getItem(`guest_forgot_otp_block_until_${emailKey}`) || 0);
      const remaining = Math.max(0, Math.ceil((storedUntil - Date.now()) / 1000));
      setOtpCountdown(remaining);
    }
  }, [step, email]);

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim() || loading || otpCountdown > 0) return;

    setLoadingAction('send');
    setError('');
    try {
      await apiService.post('/auth/forgot-password', { email: email.trim() });
      
      const emailKey = email.trim().toLowerCase();
      const nextAvailableAt = Date.now() + 60 * 1000;
      localStorage.setItem(`guest_forgot_otp_block_until_${emailKey}`, String(nextAvailableAt));
      setOtpCountdown(60);
      
      setStep('input_otp');
    } catch (err) {
      const data = err.response?.data;
      if (data?.retry_after_seconds) {
        const nextAvailableAt = Date.now() + data.retry_after_seconds * 1000;
        localStorage.setItem(`guest_forgot_otp_block_until_${email.trim().toLowerCase()}`, String(nextAvailableAt));
        setOtpCountdown(data.retry_after_seconds);
      }
      setError(data?.message || err.message || "Error sending request.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOtpChange = (val, idx) => {
    if (val && isNaN(val)) return;
    const newVals = [...otpValues];
    newVals[idx] = val.substring(val.length - 1);
    setOtpValues(newVals);
    setError('');
    if (val && idx < 5) {
      const nextInput = document.getElementById(`forgot-otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpValues[idx] && idx > 0) {
      const prevInput = document.getElementById(`forgot-otp-${idx - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setError("Please enter all 6 OTP numbers.");
      return;
    }
    setLoadingAction('verify');
    setError('');
    try {
      const res = await apiService.post('/auth/verify-reset-otp', { email: email.trim(), otp: code });
      setResetToken(res.resetToken);
      setStep('input_new_password');
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP authentication failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("The re-entered password does not match.");
      return;
    }
    setLoadingAction('reset');
    setError('');
    try {
      await apiService.post('/auth/reset-password', {
        email: email.trim(),
        resetToken,
        newPassword
      });
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Password change failed.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="page-enter animate-fade-in" style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 16 }}>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={onBack} disabled={loading} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: 0 }}>
          <ArrowLeft size={14} /> Return to login
        </button>
      </div>

      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Password Recovery</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          {step === 'input_email' && "Please enter your registered email address. The system will send an authentication code (OTP) to restore the account."}
          {step === 'input_otp' && `The 6-digit verification code has been sent ${email}. The code is valid for 5 minutes.`}
          {step === 'input_new_password' && "Authentication successful. Please reset a new password for your account."}
          {step === 'success' && "Complete the password recovery process."}
        </p>
      </div>

      {step === 'input_email' && (
        <form onSubmit={handleSendEmail} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Registered email</label>
            <div className="input-group">
              <Mail size={14} className="input-icon" />
              <input className="input" type="email" required placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
            </div>
          </div>
          {error && <div style={{ color: 'var(--red-400)', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={loading}>
            {loadingAction === 'send' ? (
              <>
                <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                Processing...
              </>
            ) : "Send confirmation code"}
          </button>
        </form>
      )}

      {step === 'input_otp' && (
        <form onSubmit={handleVerifyOtp} style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {otpValues.map((v, i) => (
              <input
                key={i}
                id={`forgot-otp-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="input"
                value={v}
                onChange={(e) => handleOtpChange(e.target.value, i)}
                onKeyDown={(e) => handleOtpKeyDown(e, i)}
                disabled={loading}
                style={{
                  width: 42, height: 42, textAlign: 'center', fontSize: '1rem', lineHeight: 1.2, padding: 0
                }}
              />
            ))}
          </div>
          {error && <div style={{ color: 'var(--red-400)', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}
          <div style={{ display: 'grid', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={loading}>
              {loadingAction === 'verify' ? (
                <>
                  <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                  Verifying...
                </>
              ) : "Confirm OTP"}
            </button>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={handleSendEmail} 
              disabled={loading || otpCountdown > 0} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: otpCountdown > 0 ? 0.55 : 1, cursor: otpCountdown > 0 || loading ? 'not-allowed' : 'pointer', pointerEvents: otpCountdown > 0 || loading ? 'none' : 'auto' }}
            >
              {loadingAction === 'send' && step === 'input_otp' ? (
                <>
                  <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                  Sending...
                </>
              ) : `Resend OTP ${otpCountdown > 0 ? `(${otpCountdown}s)` : ''}`}
            </button>
          </div>
        </form>
      )}

      {step === 'input_new_password' && (
        <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>New password</label>
            <div className="input-group">
              <Lock size={14} className="input-icon" />
              <input className="input" type={showPassword ? 'text' : 'password'} required placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Re-enter the new password</label>
            <div className="input-group">
              <Lock size={14} className="input-icon" />
              <input className="input" type={showConfirmPassword ? 'text' : 'password'} required placeholder="Re-enter the password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={{ color: 'var(--red-400)', fontSize: '0.8rem', fontWeight: 600 }}>{error}</div>}
          
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={loading}>
            {loadingAction === 'reset' ? (
              <>
                <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                Changing password...
              </>
            ) : "Confirm password change"}
          </button>
        </form>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={24} color="var(--green-400)" style={{ margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Change Password Successfully</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: 24 }}>
            Account <strong>{email}</strong> New password has been set successfully. You can now log in with your new password.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} onClick={onBack}>
            Go to the login page
          </button>
        </div>
      )}
    </div>
  );
}
