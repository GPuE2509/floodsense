import React, { useState } from 'react';
import GuestApp from './GuestApp.jsx';
import UserApp from './UserApp.jsx';
import VolunteerApp from './VolunteerApp.jsx';

/**
 * RoleRouter – switches between the available app shells based on the current role.
 *
 * Roles:
 *  • 'guest'   – Public / unauthenticated view
 *  • 'user'    – Authenticated citizen user
 *  • 'volunteer'  – Volunteer Volunteer (Tình nguyện viên cứu hộ)
 */
export default function RoleRouter() {
  const [role, setRole] = useState('guest');

  const handleLoginToUser    = () => setRole('user');
  const handleLoginToVolunteer  = () => setRole('volunteer');
  const handleLogoutToGuest  = () => setRole('guest');

  if (role === 'user') {
    return <UserApp onLogoutToGuest={handleLogoutToGuest} />;
  }

  if (role === 'volunteer') {
    return <VolunteerApp onLogoutToGuest={handleLogoutToGuest} />;
  }

  // Guest – pass both login handlers so GuestApp can choose role
  return (
    <GuestApp
      onLoginToUser={handleLoginToUser}
      onLoginToVolunteer={handleLoginToVolunteer}
    />
  );
}
