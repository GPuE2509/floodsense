import React from 'react';
import CommunityForum from '../../components/forum/CommunityForum';

export default function UserForum() {
  return (
    <div className="page-enter">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Community discussion forum</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Share actual flood images, exchange response experiences and ask and answer questions with the community
          </p>
        </div>
      </div>

      {/* Render the premium Facebook feed engine */}
      <CommunityForum role="user" />
    </div>
  );
}
