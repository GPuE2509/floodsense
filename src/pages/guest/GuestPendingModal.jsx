import React from 'react';
import { X, ShieldAlert } from 'lucide-react';

export default function GuestPendingModal({
  show,
  pendingEmail,
  pendingResendLimitReached,
  otpCountdown,
  formatDuration,
  registerError,
  onClose,
  onContinueVerify,
  onResendFromPending,
  registerLoading,
}) {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,18,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card p-6 page-enter" style={{ maxWidth: 420, width: '90%', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(6,182,212,0.2)' }}>
        <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Account Awaiting Verification</div>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ShieldAlert size={20} color="var(--orange-400)" />
            </div>

            {pendingResendLimitReached ? (
              <>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Resend Limit Reached</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                  You can re-register by email <strong>{pendingEmail}</strong> after the next 24 hours.
                </p>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--orange-400)' }}>
                  {otpCountdown > 0 ? `Still ${formatDuration(otpCountdown)}` : "Updating..."}
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Registered Email</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
                  {registerError ? <strong>{registerError}</strong> : <>Email <strong>{pendingEmail}</strong> already exists and is awaiting authentication. Please check your email to get the OTP code or resend a new OTP.</>}
                </p>
              </>
            )}
          </div>

          {!pendingResendLimitReached && (
            <div style={{ display: 'grid', gap: 10 }}>
              <button className="btn btn-primary" style={{ display: 'flex', justifyContent: 'center' }} onClick={onContinueVerify} disabled={registerLoading}>
                Continue Verification
              </button>
              <button
                className="btn btn-ghost"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: otpCountdown > 0 ? 0.55 : 1, cursor: otpCountdown > 0 || registerLoading ? 'not-allowed' : 'pointer', pointerEvents: otpCountdown > 0 || registerLoading ? 'none' : 'auto' }}
                onClick={onResendFromPending}
                disabled={otpCountdown > 0 || registerLoading}
              >
                {registerLoading ? (
                  <>
                    <div className="spinner" style={{ marginRight: 8, width: 14, height: 14, borderLeftColor: 'currentColor', borderBottomColor: 'currentColor' }} />
                    Sending...
                  </>
                ) : "Resend OTP"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
