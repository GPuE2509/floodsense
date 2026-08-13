import React from 'react';
import { Loader } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message = 'Are you sure? This action cannot be undone.',
  confirmText,
  cancelText = 'Cancel',
  position = 'fixed',
  type = 'danger',
  variant,
  loading = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const modalType = variant || type;

  // Styling based on type
  let btnBg = '#ef4444'; // default danger red
  let btnHoverBg = '#dc2626';
  let defaultConfirmText = 'Delete';

  if (modalType === 'primary') {
    btnBg = '#3b82f6';
    btnHoverBg = '#2563eb';
    defaultConfirmText = 'Confirm';
  } else if (modalType === 'success') {
    btnBg = '#22c55e';
    btnHoverBg = '#16a34a';
    defaultConfirmText = 'Confirm';
  } else if (modalType === 'warning') {
    btnBg = '#f59e0b';
    btnHoverBg = '#d97706';
    defaultConfirmText = 'Confirm';
  }

  const finalConfirmText = confirmText || defaultConfirmText;
  const finalTitle = title || (modalType === 'danger' ? 'Confirm Delete' : 'Confirm Action');

  return (
    <div style={{
      position,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(8, 13, 22, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 20000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 14,
        width: '90%',
        maxWidth: 400,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        gap: 16
      }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>{finalTitle}</h3>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: btnBg,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              opacity: loading ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = btnHoverBg; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = btnBg; }}
          >
            {loading && <Loader size={14} className="spin" />}
            {loading ? 'Processing...' : finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
