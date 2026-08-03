import React from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function GuestLoginForm({
  email,
  setEmail,
  password,
  setPassword,
  rememberMe,
  setRememberMe,
  showPassword,
  onTogglePassword,
  onForgotPassword,
  onSubmitLogin,
  onGoogleLogin,
  googleLoading,
  loginLoading,
  loginError,
}) {
  return (
    <form onSubmit={onSubmitLogin} className="page-enter" style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 1 }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email Address</label>
          <div className="input-group">
            <Mail size={14} className="input-icon" />
            <input className="input" placeholder="Enter your login email address..." value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Password</label>
          <div className="input-group">
            <Lock size={14} className="input-icon" />
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingRight: 42 }}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 4, marginBottom: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              style={{ accentColor: 'var(--cyan-400)', width: 14, height: 14, cursor: 'pointer' }}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Remember to log in</span>
          </label>
          <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--cyan-400)', fontSize: '0.78rem', fontWeight: 600, padding: 0, cursor: 'pointer', fontFamily: 'inherit' }} onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>

        <button className="btn btn-primary" type="submit" style={{ marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={loginLoading}>
          {loginLoading ? (
            <>
              <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
              Signing in...
            </>
          ) : "Login Account"}
        </button>

        {loginError && <div style={{ color: 'var(--red-400)', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>{loginError}</div>}

        <div className="flex items-center" style={{ margin: '10px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
          <span style={{ padding: '0 10px', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>or log in with</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
        </div>

        <button className="btn btn-ghost" onClick={onGoogleLogin} disabled={googleLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 38 }}>
          {googleLoading ? <div className="spinner" style={{ marginRight: 8 }} /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8, flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span style={{ fontWeight: 600 }}>{googleLoading ? "Connecting to Google..." : "Sign in to Google"}</span>
        </button>
      </form>
  );
}
