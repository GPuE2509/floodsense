import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NotFound from './pages/common/NotFound';
import { Bell, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import GuestApp from './GuestApp';
import UserApp from './UserApp';
import WorkshopApp from './WorkshopApp';
import VolunteerApp from './VolunteerApp';
import ManagerApp from './ManagerApp';
import Admin from './App';
import { useAuth } from './hooks/useAuth';
import DailyClaimPopup from './components/DailyClaimPopup';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
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

  const [globalToast, setGlobalToast] = useState(null);

  // Override window.alert globally to use Toast notifications
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'System Alert',
          body: String(message),
          isNotification: true,
          showAction: false
        }
      }));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Listen to custom show-toast event
  useEffect(() => {
    const handleShowToast = (e) => {
      if (e.detail) {
        setGlobalToast({
          id: Date.now(),
          title: e.detail.title || (e.detail.type === 'error' ? 'Error' : (e.detail.type === 'success' ? 'Success' : 'System Alert')),
          body: e.detail.body || e.detail.message || '',
          isNotification: e.detail.isNotification !== false,
          webUrl: e.detail.webUrl || null,
          showAction: e.detail.showAction !== false,
          type: e.detail.type || 'info'
        });
      }
    };
    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  // Auto hide global toast
  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

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
      {(() => {
        const ALL_VALID_PATHS = new Set([
          '/', '/forum', '/info', '/leaderboard', '/auth', 
          '/dashboard', '/reports', '/sos', '/notifications', 
          '/invitations', '/rewards', '/profile', '/workshops', 
          '/guidelines', '/shop', '/tasks', '/reviews', '/mechanics', 
          '/volunteer-profile', '/missions', '/logs', '/forum-mod', 
          '/users', '/iot', '/config', '/points', '/sys-notifications', '/system-notifications', 
          '/user-growth', '/operation-logs', '/analytics-report', 
          '/data-retention', '/user-dashboard', '/user-notifications', 
          '/user-forum', '/user-rewards', '/user-guidelines'
        ]);
        return ALL_VALID_PATHS.has(location.pathname) ? renderApp() : <NotFound />;
      })()}
      
      {/* Global Daily Claim Popup */}
      <DailyClaimPopup />

      {/* Global Toast Notification */}
      {globalToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 100000,
          width: 360,
          background: 'rgba(18, 29, 40, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-default, rgba(120,150,175,0.3))',
          boxShadow: 'var(--shadow-lg), 0 0 20px rgba(69, 179, 192, 0.2)',
          borderRadius: 'var(--r-md)',
          padding: '14px 16px',
          display: 'flex',
          gap: 12,
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(120px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: globalToast.type === 'success' ? 'rgba(34,197,94,0.1)' : (globalToast.type === 'error' ? 'rgba(239,68,68,0.1)' : (globalToast.isNotification ? 'rgba(234,179,8,0.1)' : 'rgba(6,182,212,0.1)')),
            border: globalToast.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : (globalToast.type === 'error' ? '1px solid rgba(239,68,68,0.3)' : (globalToast.isNotification ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(6,182,212,0.3)')),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {globalToast.type === 'success' ? (
              <CheckCircle size={16} color="#22c55e" />
            ) : globalToast.type === 'error' ? (
              <XCircle size={16} color="#ef4444" />
            ) : globalToast.isNotification ? (
              <Bell size={16} color="#f59e0b" />
            ) : (
              <MessageSquare size={16} color="var(--cyan-400)" />
            )}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{globalToast.title}</span>
              <button 
                onClick={() => setGlobalToast(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, fontSize: '0.85rem' }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{globalToast.body}</div>
            {globalToast.showAction && (globalToast.webUrl || !globalToast.isNotification) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.68rem', height: 22 }}
                  onClick={() => {
                    setGlobalToast(null);
                    if (globalToast.isNotification && globalToast.webUrl) {
                      navigate(globalToast.webUrl);
                    } else {
                      // Navigate via path directly
                      navigate('/notifications');
                    }
                  }}
                >
                  {globalToast.isNotification ? 'View' : 'Reply'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

