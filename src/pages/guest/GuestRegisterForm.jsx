import React from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function GuestRegisterForm({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  onTogglePassword,
  confirmPassword,
  setConfirmPassword,
  showConfirmPassword,
  onToggleConfirmPassword,
  registerLoading,
  registerError,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="page-enter" style={{ display: 'grid', gap: 14, position: 'relative', zIndex: 1 }}>
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Full name</label>
        <input className="input" required placeholder="Enter your full name..." value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Personal email</label>
        <div className="input-group">
          <Mail size={14} className="input-icon" />
          <input className="input" type="email" required placeholder="Enter email address..." value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Account password</label>
        <div className="input-group">
          <Lock size={14} className="input-icon" />
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Enter security password..."
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
      <div>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Re-enter the password</label>
        <div className="input-group">
          <Lock size={14} className="input-icon" />
          <input
            className="input"
            type={showConfirmPassword ? 'text' : 'password'}
            required
            placeholder="Re-enter password..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={onToggleConfirmPassword}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            title={showConfirmPassword ? "Hide password" : "Show password"}
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
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }} disabled={registerLoading}>
        {registerLoading ? (
          <>
            <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
            Sending...
          </>
        ) : "Register as a Member"}
      </button>
      {registerError && <div style={{ marginTop: 10, color: 'var(--red-400)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>{registerError}</div>}
    </form>
  );
}
