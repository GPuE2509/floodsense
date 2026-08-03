import React, { useState } from 'react';
import GuestApp from './GuestApp';
import UserApp from './UserApp';
import WorkshopApp from './WorkshopApp';
import VolunteerApp from './VolunteerApp';
import ManagerApp from './ManagerApp';
import Admin from './App';
import { useAuth } from './hooks/useAuth';
import DailyClaimPopup from './components/DailyClaimPopup';

export default function AppShell() {
  const {
    isLoggedIn,
    role,
    userName,
    setUserName,
    workshopName,
    avatarUrl,
    setAvatarUrl,
    roleRequests,
    linkRequests,
    login,
    register,
    loginToUser,
    logout,
    upgradeRole,
    cancelUpgrade,
    approveRequest,
    rejectRequest,
    linkWorkshop,
    cancelLinkRequest,
    unlinkWorkshop,
    approveLink,
    rejectLink
  } = useAuth();

  const handleLogout = logout;
  const handleRoleUpgrade = upgradeRole;
  const handleCancelUpgrade = cancelUpgrade;
  const handleApproveRequest = approveRequest;
  const handleRejectRequest = rejectRequest;
  const handleLinkWorkshop = linkWorkshop;
  const handleCancelLinkRequest = cancelLinkRequest;
  const handleUnlinkWorkshop = unlinkWorkshop;
  const handleApproveLink = approveLink;
  const handleRejectLink = rejectLink;
  const handleLoginToUser = loginToUser;
  const handleRegister = register;

  // Render the appropriate App based on current role state
  const renderApp = () => {
    const pendingRequest = roleRequests.find(req => req.userName === userName && req.status === 'pending');
    const pendingLinkRequest = linkRequests.find(req => req.userName === userName && req.status === 'pending');

    switch (role) {
      case 'user':
        return (
          <UserApp
            onLogoutToGuest={handleLogout}
            role="user"
            userName={userName}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onUserNameChange={setUserName}
            onRoleUpgrade={handleRoleUpgrade}
            pendingRequest={pendingRequest}
            onCancelUpgrade={handleCancelUpgrade}
            pendingLinkRequest={pendingLinkRequest}
            onLinkWorkshop={handleLinkWorkshop}
            onCancelLinkRequest={handleCancelLinkRequest}
            onUnlinkWorkshop={handleUnlinkWorkshop}
          />
        );

      case 'workshop':
        return (
          <WorkshopApp
            isLoggedIn={isLoggedIn}
            onLogoutToGuest={handleLogout}
            workshopName={workshopName}
            userName={userName}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onUserNameChange={setUserName}
            linkRequests={linkRequests}
            onApproveLink={handleApproveLink}
            onRejectLink={handleRejectLink}
          />
        );
      case 'volunteer':
        return (
          <VolunteerApp
            onLogoutToGuest={handleLogout}
          />
        );
      case 'manager':
        return (
          <ManagerApp
            onLogoutToGuest={handleLogout}
            roleRequests={roleRequests}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            userName={userName}
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
            onUserNameChange={setUserName}
          />
        );
      case 'admin':
        return (
          <Admin 
            userName={userName} 
            avatarUrl={avatarUrl}
            onAvatarChange={setAvatarUrl}
          />
        );
      case 'guest':
      default:
        return (
          <GuestApp
            onLoginToUser={handleLoginToUser}
            onRegister={handleRegister}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* ── Active Application ── */}
      {renderApp()}
      
      {/* Global Daily Claim Popup */}
      <DailyClaimPopup />
    </div>
  );
}

