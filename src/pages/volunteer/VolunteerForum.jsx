import React from 'react';
import CommunityForum from '../../components/forum/CommunityForum';

export default function VolunteerForum() {
  return (
    <div className="page-enter">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Volunteer Forum</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Communication channel to share real-life rescue experiences and specialized professional skills exclusively for volunteers
          </p>
        </div>
      </div>

      {/* Render the premium Facebook feed engine */}
      <CommunityForum role="volunteer" />
    </div>
  );
}
