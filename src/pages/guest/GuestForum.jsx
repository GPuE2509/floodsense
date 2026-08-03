import React from 'react';
import CommunityForum from '../../components/forum/CommunityForum';

export default function GuestForum({ onNavigate }) {
  return (
    <div className="page-enter">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Community forum</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Exchange experiences in flood prevention and real-time traffic status updates
            </p>
          </div>
          <div className="alert-banner info" style={{ margin: 0, padding: '8px 14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              💡 Status: <strong>Guest (View only)</strong>. Log in to comment.
            </span>
          </div>
        </div>
      </div>

      {/* Render the premium Facebook feed engine */}
      <CommunityForum 
        role="guest" 
        onRedirectToRegister={() => onNavigate && onNavigate('guest-profile')} 
      />
    </div>
  );
}
