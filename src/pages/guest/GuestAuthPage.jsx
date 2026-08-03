import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, LogIn, Mail, Lock, ArrowLeft } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../config/FirebaseConfig';
import GuestLoginForm from './GuestLoginForm';
import GuestRegisterForm from './GuestRegisterForm';
import GuestOtpPanel from './GuestOtpPanel';
import GuestForgotForm from './GuestForgotForm';
import GuestPendingModal from './GuestPendingModal';

const OTP_RESEND_BLOCK_KEY = 'guest_otp_resend_block_until';
const OTP_EXPIRES_KEY_PREFIX = 'guest_otp_expires_until_';
const OTP_RESEND_MAX_SECONDS = 60;

export default function GuestAuthPage({ onLoginToUser }) {
  const [activeTab, setActiveTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [regStep, setRegStep] = useState('form');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [otpError, setOtpError] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingResendLimitReached, setPendingResendLimitReached] = useState(false);
  const [pendingRegisterAgainAt, setPendingRegisterAgainAt] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoginError('');
    setRegisterError('');
    setServerMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowRegisterConfirmPassword(false);
  };

  const getOtpEmailKey = (value) => `${OTP_EXPIRES_KEY_PREFIX}${(value || email).trim().toLowerCase()}`;
  const setResendBlockUntil = (timestamp) => {
    if (timestamp) localStorage.setItem(OTP_RESEND_BLOCK_KEY, String(timestamp));
    else localStorage.removeItem(OTP_RESEND_BLOCK_KEY);
  };
  const syncOtpCooldownFromStorage = () => {
    const storedUntil = Number(localStorage.getItem(OTP_RESEND_BLOCK_KEY) || 0);
    const remaining = Math.max(0, Math.ceil((storedUntil - Date.now()) / 1000));
    setOtpCountdown(remaining);
    return remaining;
  };
  const formatDuration = (totalSeconds) => {
    const seconds = Math.max(0, totalSeconds || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours} hour ${String(minutes).padStart(2, '0')} minute ${String(secs).padStart(2, '0')} second`;
  };

  useEffect(() => {
    let timer;
    if ((regStep === 'otp' || showPendingModal) && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [regStep, showPendingModal, otpCountdown]);

  useEffect(() => {
    const syncFromStorage = () => {
      if (regStep === 'otp' || showPendingModal) syncOtpCooldownFromStorage();
    };
    syncFromStorage();
    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, [regStep, showPendingModal]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const normalizedName = name.replace(/\s+/g, ' ').trim();
    if (!normalizedName || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      alert("Please fill in all registration information!");
      return;
    }
    if (/\s/.test(password) || /\s/.test(confirmPassword)) {
      setRegisterError("Password must not contain spaces.");
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError("Password and re-entered password must be the same.");
      return;
    }

    setRegisterError('');
    setServerMessage('');
    setRegisterLoading(true);
    try {
      const response = await apiService.post('/auth/register', {
        email: email.trim(),
        password,
        confirmPassword,
        full_name: normalizedName,
      });

      if (response.isPending) {
        setPendingEmail(email.trim());
        setPendingResendLimitReached(Boolean(response.resend_limit_reached));
        setPendingRegisterAgainAt(response.can_register_again_at || '');
        if (response.resend_limit_reached) {
          setRegisterError(response.message || "This email has reached the OTP resending limit. You can resubscribe using this email after the next 24 hours.");
        } else {
          setRegisterError('');
          setServerMessage(response.message || "The email already exists and is awaiting authentication. Please check your email or resend OTP to verify your account.");
        }
        syncOtpCooldownFromStorage();
        setShowPendingModal(true);
        return;
      }

      setServerMessage(response.message || "Registered successfully. Please check your email to verify your account.");
      const resendAvailableAt = response.otp_resend_available_at ? new Date(response.otp_resend_available_at).getTime() : Date.now() + OTP_RESEND_MAX_SECONDS * 1000;
      const expiresAt = response.otp_expires_at ? new Date(response.otp_expires_at).getTime() : Date.now() + 2 * 60 * 1000;
      setResendBlockUntil(resendAvailableAt);
      localStorage.setItem(getOtpEmailKey(email.trim()), String(expiresAt));
      setOtpCountdown(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
      setOtpValues(['', '', '', '', '', '']);
      setRegStep('otp');
    } catch (error) {
      const data = error.response?.data || {};
      if (error.response?.status === 409 && data.isPending) {
        setPendingEmail(email.trim());
        setPendingResendLimitReached(Boolean(data.resend_limit_reached));
        setPendingRegisterAgainAt(data.can_register_again_at || '');
        if (data.resend_limit_reached) {
          setRegisterError(data.message || "This email has reached the OTP resending limit. You can resubscribe using this email after the next 24 hours.");
        } else {
          setRegisterError('');
          setServerMessage(data.message || "The email already exists and is awaiting authentication. Please check your email or resend OTP to verify your account.");
        }
        syncOtpCooldownFromStorage();
        setShowPendingModal(true);
      } else {
        setRegisterError(error.message || "Registration failed. Please try again.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setServerMessage('');
    setLoginLoading(true);

    try {
      const response = await apiService.post('/auth/login', {
        email: email.trim(),
        password,
        rememberMe,
      });

      if (response?.token) {
        if (rememberMe) {
          localStorage.setItem('auth_token', response.token);
          if (response.refreshToken) localStorage.setItem('refresh_token', response.refreshToken);
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
        } else {
          sessionStorage.setItem('auth_token', response.token);
          if (response.refreshToken) sessionStorage.setItem('refresh_token', response.refreshToken);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      }

      setServerMessage(response.message || "Log in successfully.");
      if (onLoginToUser) {
        onLoginToUser(response.user || { role: response.role }, rememberMe);
      }
    } catch (error) {
      const data = error.response?.data || {};
      if (error.response?.status === 403 && data.isPending) {
        setPendingEmail(email.trim());
        setPendingResendLimitReached(Boolean(data.resend_limit_reached));
        setPendingRegisterAgainAt(data.can_register_again_at || '');
        setLoginError(data.message || "Unverified account.");
        syncOtpCooldownFromStorage();
        setShowPendingModal(true);
      } else {
        setLoginError(data.message || error.message || "Login failed. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || registerLoading) return;

    try {
      setRegisterError('');
      setOtpError(false);
      setRegisterLoading(true);
      const response = await apiService.post('/auth/resend-otp', { email: email.trim() });
      setServerMessage(response.message || "A new OTP code has been sent to your email.");
      const resendAvailableAt = response.otp_resend_available_at ? new Date(response.otp_resend_available_at).getTime() : Date.now() + OTP_RESEND_MAX_SECONDS * 1000;
      const expiresAt = response.otp_expires_at ? new Date(response.otp_expires_at).getTime() : Date.now() + 2 * 60 * 1000;
      setResendBlockUntil(resendAvailableAt);
      localStorage.setItem(getOtpEmailKey(email.trim()), String(expiresAt));
      setOtpCountdown(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
      setOtpValues(['', '', '', '', '', '']);
    } catch (error) {
      const retryAfter = error.response?.data?.retry_after_seconds;
      if (retryAfter) {
        const nextAvailableAt = Date.now() + retryAfter * 1000;
        setResendBlockUntil(nextAvailableAt);
        setOtpCountdown(retryAfter);
      }
      setRegisterError(error.message || "Resend OTP failed. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleContinueVerify = () => {
    setShowPendingModal(false);
    setPendingResendLimitReached(false);
    setPendingRegisterAgainAt('');
    setRegisterError('');
    setLoginError('');
    syncOtpCooldownFromStorage();
    setOtpValues(['', '', '', '', '', '']);
    setRegStep('otp');
    setServerMessage("Enter the previously sent OTP code to authenticate your account.");
  };

  const handleResendFromPending = async () => {
    if (otpCountdown > 0 || registerLoading) return;
    setRegisterLoading(true);
    try {
      const response = await apiService.post('/auth/resend-otp', { email: pendingEmail });
      setShowPendingModal(false);
      setPendingResendLimitReached(false);
      setPendingRegisterAgainAt('');
      setServerMessage(response.message || "A new OTP code has been sent to your email.");
      setRegisterError('');
      setLoginError('');
      const resendAvailableAt = response.otp_resend_available_at ? new Date(response.otp_resend_available_at).getTime() : Date.now() + OTP_RESEND_MAX_SECONDS * 1000;
      const expiresAt = response.otp_expires_at ? new Date(response.otp_expires_at).getTime() : Date.now() + 2 * 60 * 1000;
      setResendBlockUntil(resendAvailableAt);
      localStorage.setItem(getOtpEmailKey(pendingEmail), String(expiresAt));
      setOtpCountdown(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
      setOtpValues(['', '', '', '', '', '']);
      setRegStep('otp');
      setEmail(pendingEmail);
    } catch (error) {
      const data = error.response?.data || {};
      const retryAfter = data.retry_after_seconds;
      if (retryAfter) {
        const nextAvailableAt = Date.now() + retryAfter * 1000;
        setResendBlockUntil(nextAvailableAt);
        setOtpCountdown(retryAfter);
      }
      if (data.resend_limit_reached) {
        setPendingResendLimitReached(true);
        setPendingRegisterAgainAt(data.can_register_again_at || '');
        setLoginError('');
      } else {
        setRegisterError(data.message || error.message || "Resend OTP failed. Please try again.");
      }
      setShowPendingModal(true);
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => {
    if (!showPendingModal || !pendingResendLimitReached || !pendingRegisterAgainAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(pendingRegisterAgainAt).getTime() - Date.now()) / 1000));
      setOtpCountdown(remaining);
      if (remaining <= 0) {
        setPendingResendLimitReached(false);
        setPendingRegisterAgainAt('');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [showPendingModal, pendingResendLimitReached, pendingRegisterAgainAt]);

  const handleOtpChange = (value, index) => {
    if (value && isNaN(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1);
    setOtpValues(newOtp);
    setOtpError(false);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-field-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-field-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpValues.join('');
    if (code.length < 6) {
      setOtpError(true);
      setRegisterError('');
      return;
    }

    setOtpError(false);
    try {
      const resp = await apiService.post('/auth/verify', { email: email.trim(), otp: code });
      setServerMessage(resp.message || "Authentication successful. The account has been activated and switched to the User role.");
      setRegisterError('');
      setOtpError(false);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => {
        setActiveTab('login');
        setRegStep('form');
      }, 1400);
    } catch (err) {
      setOtpError(false);
      setRegisterError(err.message || "Authentication failed.");
    }
  };

  const handleLoginClick = () => onLoginToUser && onLoginToUser();
  const handleGoogleLogin = async () => {
    setLoginError('');
    setServerMessage('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      if (!idToken) {
        throw new Error('Failed to retrieve ID Token from Firebase.');
      }

      const response = await apiService.post('/auth/google-login', { idToken });

      if (response?.token) {
        localStorage.setItem('auth_token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('refresh_token', response.refreshToken);
        }
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
      }

      setServerMessage(response.message || "Google Login successful.");
      if (onLoginToUser) {
        onLoginToUser(response.user || { role: response.role }, true);
      }
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      const data = error.response?.data || {};
      setLoginError(data.message || error.message || "Google Sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 540, margin: '40px auto 0' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 6 }}>
          {regStep === 'otp' ? "Verify your account" : activeTab === 'login' ? "Login to the portal" : "Register for a system account"}
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {regStep === 'otp' ? `An authentication OTP code has been sent to the email address: ${email}` : activeTab === 'login' ? "Log in to your account to access newsletters, SOS rescue, and community connections." : "Become an official member to submit SOS reports, monitor relief, and interact with the forum."}
        </p>
      </div>

      <div className="card p-6" style={{ position: 'relative', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(6,182,212,0.08), transparent 60%)', pointerEvents: 'none' }} />

        {regStep === 'form' ? (
          <>
            {activeTab !== 'forgot' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'rgba(18,29,40,0.4)', padding: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', marginBottom: 20, position: 'relative', zIndex: 1 }}>
                <button
                  className="tab-btn"
                style={{
                  background: activeTab === 'login' ? 'linear-gradient(135deg, rgba(61,125,176,0.18) 0%, rgba(69,179,192,0.1) 100%)' : 'transparent',
                  color: activeTab === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: activeTab === 'login' ? '1px solid rgba(120, 150, 175, 0.35)' : 'none',
                  boxShadow: activeTab === 'login' ? '0 4px 12px rgba(6,182,212,0.1)' : 'none',
                  borderRadius: 'var(--r-sm)',
                  padding: '8px 0',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
                onClick={() => handleTabChange('login')}
              >
                <LogIn size={13} style={{ marginRight: 6 }} /> Log in
              </button>

              <button
                className="tab-btn"
                style={{
                  background: activeTab === 'register' ? 'linear-gradient(135deg, rgba(61,125,176,0.18) 0%, rgba(69,179,192,0.1) 100%)' : 'transparent',
                  color: activeTab === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: activeTab === 'register' ? '1px solid rgba(120, 150, 175, 0.35)' : 'none',
                  boxShadow: activeTab === 'register' ? '0 4px 12px rgba(6,182,212,0.1)' : 'none',
                  borderRadius: 'var(--r-sm)',
                  padding: '8px 0',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
                onClick={() => handleTabChange('register')}
              >
                <UserPlus size={13} style={{ marginRight: 6 }} /> Register
              </button>
            </div>
            )}

            {activeTab === 'login' && (
              <GuestLoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              showPassword={showLoginPassword}
              onTogglePassword={() => setShowLoginPassword((prev) => !prev)}
              onForgotPassword={() => {
                handleTabChange('forgot');
              }}
                onSubmitLogin={handleLoginSubmit}
              onGoogleLogin={handleGoogleLogin}
              googleLoading={googleLoading}
              loginLoading={loginLoading}
              loginError={loginError}
            />
            )}

            {activeTab === 'register' && (
              <GuestRegisterForm
                name={name}
                setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showPassword={showRegisterPassword}
              onTogglePassword={() => setShowRegisterPassword((prev) => !prev)}
              showConfirmPassword={showRegisterConfirmPassword}
              onToggleConfirmPassword={() => setShowRegisterConfirmPassword((prev) => !prev)}
              registerLoading={registerLoading}
              registerError={registerError}
              onSubmit={handleRegisterSubmit}
            />
            )}

            {activeTab === 'forgot' && (
              <GuestForgotForm onBack={() => handleTabChange('login')} />
            )}
          </>
        ) : regStep === 'otp' ? (
          <GuestOtpPanel
            email={email}
            otpValues={otpValues}
            otpError={otpError}
            registerError={registerError}
            otpCountdown={otpCountdown}
            registerLoading={registerLoading}
            serverMessage={serverMessage}
            onBack={() => {
              setRegStep('form');
              setOtpValues(['', '', '', '', '', '']);
              setOtpError(false);
              setRegisterError('');
              setLoginError('');
              setServerMessage('');
            }}
            onOtpChange={handleOtpChange}
            onOtpKeyDown={handleOtpKeyDown}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        ) : (
          <div className="page-enter animate-fade-in" style={{ display: 'grid', gap: 20, position: 'relative', zIndex: 1 }}>
            <div className="alert-banner info" style={{ margin: 0, padding: '16px 18px' }}>
              <ShieldCheck size={18} color="var(--cyan-400)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {serverMessage || `Registered successfully! A confirmation email has been sent ${email}. Please check your email to activate your account.`}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <button className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center' }} onClick={() => { handleTabChange('login'); setRegStep('form'); }} disabled={registerLoading}>
                Go to the login page
              </button>
            </div>
          </div>
        )}
      </div>

      <GuestPendingModal
        show={showPendingModal}
        pendingEmail={pendingEmail}
        pendingResendLimitReached={pendingResendLimitReached}
        otpCountdown={otpCountdown}
        formatDuration={formatDuration}
        registerError={loginError || registerError}
        onClose={() => setShowPendingModal(false)}
        onContinueVerify={handleContinueVerify}
        onResendFromPending={handleResendFromPending}
        registerLoading={registerLoading}
      />
    </div>
  );
}
