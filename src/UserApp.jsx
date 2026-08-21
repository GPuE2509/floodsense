import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from './components/layout/user/UserSidebar';
import UserTopBar from './components/layout/user/UserTopBar';
import AnimatedBackground from './components/background/AnimatedBackground';
import { apiService } from './services/apiService';
import { MessageSquare, Bell } from 'lucide-react';
import MobileSidebarToggle from './components/layout/MobileSidebarToggle';

const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserReports = lazy(() => import('./pages/user/UserReports'));
const UserSOS = lazy(() => import('./pages/user/UserSOS'));
const UserNotifications = lazy(() => import('./pages/user/UserNotifications'));
const UserInvitations = lazy(() => import('./pages/user/UserInvitations'));
const UserForum = lazy(() => import('./pages/user/UserForum'));
const GuestLeaderboard = lazy(() => import('./pages/guest/GuestLeaderboard'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserWorkshops = lazy(() => import('./pages/user/UserWorkshops'));
const EmergencyGuidelines = lazy(() => import('./pages/common/EmergencyGuidelines'));

// Workshop pages
const WorkshopShop = lazy(() => import('./pages/workshop/WorkshopShop'));
const WorkshopTasks = lazy(() => import('./pages/workshop/WorkshopTasks'));
const WorkshopReviews = lazy(() => import('./pages/workshop/WorkshopReviews'));
const WorkshopMechanics = lazy(() => import('./pages/workshop/WorkshopMechanics'));

function PageLoader() {
  return (
    <div style={{ padding: '40px 24px', display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 360, borderRadius: 'var(--r-lg)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
}

const pages = {
  'user-dashboard': UserDashboard,
  'user-reports': UserReports,
  'user-sos': UserSOS,
  'user-notifications': UserNotifications,
  'user-invitations': UserInvitations,
  'user-forum': UserForum,
  'user-rewards': GuestLeaderboard,
  'user-profile': UserProfile,
  'user-workshops': UserWorkshops,
  'user-guidelines': EmergencyGuidelines,
  'ws-shop': WorkshopShop,
  'ws-tasks': WorkshopTasks,
  'ws-reviews': WorkshopReviews,
  'ws-mechanics': WorkshopMechanics,
};

const pathMap = {
  '/dashboard': 'user-dashboard',
  '/reports': 'user-reports',
  '/sos': 'user-sos',
  '/notifications': 'user-notifications',
  '/invitations': 'user-invitations',
  '/forum': 'user-forum',
  '/rewards': 'user-rewards',
  '/profile': 'user-profile',
  '/workshops': 'user-workshops',
  '/guidelines': 'user-guidelines',
  '/shop': 'ws-shop',
  '/tasks': 'ws-tasks',
  '/reviews': 'ws-reviews',
  '/mechanics': 'ws-mechanics',
};

const pageToPath = Object.fromEntries(Object.entries(pathMap).map(([k, v]) => [v, k]));

export default function UserApp({ 
  onLogoutToGuest, 
  role = 'user', 
  workshopName = null, 
  userName: initialUserName = 'User', 
  avatarUrl: propAvatarUrl = '',
  onAvatarChange,
  onUserNameChange,
  onRoleUpgrade, 
  pendingRequest, 
  onCancelUpgrade,
  pendingLinkRequest,
  onLinkWorkshop,
  onCancelLinkRequest,
  onUnlinkWorkshop,
  linkRequests = [],
  onApproveLink,
  onRejectLink,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);
  const [userName, setUserName] = useState(initialUserName);

  // Láº¥y activePage tá»« URL
  const activePage = pathMap[location.pathname] || 'user-dashboard';

  // Äiá»u hÆ°á»›ng tá»± Ä‘á»™ng náº¿u URL tÃ o lao
  useEffect(() => {
    if (!pathMap[location.pathname]) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (initialUserName) {
      setUserName(initialUserName);
    }
  }, [initialUserName]);

  useEffect(() => {
    setAvatarUrl(propAvatarUrl);
  }, [propAvatarUrl]);

  const ActivePage = pages[activePage] || UserDashboard;

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    setIsLoggedIn(false);
    if (onLogoutToGuest) onLogoutToGuest();
  };

  const handleOpenProfile = () => handleNavigate('user-profile');

  const handleNavigate = (page, options) => {
    const path = pageToPath[page] || '/dashboard';
    navigate(path, options);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const [activeSOSCount, setActiveSOSCount] = useState(0);
  const [globalToast, setGlobalToast] = useState(null);

  const fetchActiveSOSCount = async () => {
    try {
      const res = await apiService.get('/rescue/active');
      if (res && res.success && res.data) {
        setActiveSOSCount(1);
      } else {
        setActiveSOSCount(0);
      }
    } catch (err) {
      console.error('Failed to fetch active SOS count:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchActiveSOSCount();
      window.addEventListener('rescue-update', fetchActiveSOSCount);
      window.addEventListener('rescue-status-update', fetchActiveSOSCount);
    }
    return () => {
      window.removeEventListener('rescue-update', fetchActiveSOSCount);
      window.removeEventListener('rescue-status-update', fetchActiveSOSCount);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchInitialUnreadCount = async () => {
      try {
        const notifsRes = await apiService.get('/notifications');
        let notifUnread = 0;
        if (notifsRes && notifsRes.success && notifsRes.data) {
          notifUnread = notifsRes.data.filter(n => !n.is_read).length;
        }

        const convsRes = await apiService.get('/chat/conversations');
        let chatUnread = 0;
        if (convsRes && convsRes.success && convsRes.data) {
          chatUnread = convsRes.data.reduce((acc, c) => acc + (c.unread || 0), 0);
        }

        const totalUnread = notifUnread + chatUnread;
        localStorage.setItem('total_unread_count', totalUnread);
        window.dispatchEvent(new CustomEvent('unread-count-changed', { detail: { count: totalUnread } }));
      } catch (err) {
        console.error('Failed to fetch initial unread notifications count:', err);
      }
    };
    fetchInitialUnreadCount();
  }, [isLoggedIn]);

  useEffect(() => {
    const isNotificationsPage = activePage === 'user-notifications';
    if (isNotificationsPage || !isLoggedIn) return;

    let socket;
    let retryTimer;

    const connect = () => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsUrl = isLocal ? 'ws://localhost:5000' : (import.meta.env.VITE_WS_URL || 'wss://floodsenseapi.onrender.com');
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('UserApp background WebSocket connected');
        const registerUser = async () => {
          try {
            const res = await apiService.get('/auth/profile');
            if (res && res.user && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'register',
                userId: res.user._id,
                userName: res.user.full_name,
                role: res.user.role,
                avatarUrl: res.user.avatar_url || ''
              }));

               // Fetch conversations to initialize unread count from database
               const notifsRes = await apiService.get('/notifications');
               let notifUnread = 0;
               if (notifsRes && notifsRes.success && notifsRes.data) {
                 notifUnread = notifsRes.data.filter(n => !n.is_read).length;
               }

               const convsRes = await apiService.get('/chat/conversations');
               let chatUnread = 0;
               if (convsRes && convsRes.success && convsRes.data) {
                 chatUnread = convsRes.data.reduce((acc, c) => acc + (c.unread || 0), 0);
               }

               const totalUnread = notifUnread + chatUnread;
               localStorage.setItem('total_unread_count', totalUnread);
               window.dispatchEvent(new CustomEvent('unread-count-changed', { detail: { count: totalUnread } }));
            }
          } catch (err) {
            console.error('Background socket auth check failed:', err);
          }
        };
        registerUser();
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'MAP_UPDATE' || msg.type === 'rescue_status_update') {
            window.dispatchEvent(new CustomEvent('rescue-update'));
          }

          if (msg.type === 'chat') {
            // Update unread count in localStorage and dispatch event
            const cached = localStorage.getItem('total_unread_count');
            const currentCount = cached ? parseInt(cached, 10) : 0;
            const newCount = currentCount + 1;
            localStorage.setItem('total_unread_count', newCount);
            window.dispatchEvent(new CustomEvent('unread-count-changed', { detail: { count: newCount } }));

            // Show Toast
            setGlobalToast({
              id: Date.now(),
              title: `New message from ${msg.senderName}`,
              body: msg.text,
              isNotification: false
            });
          } else if (msg.type === 'notification') {
            // Update unread count in localStorage and dispatch event
            const cached = localStorage.getItem('total_unread_count');
            const currentCount = cached ? parseInt(cached, 10) : 0;
            const newCount = currentCount + 1;
            localStorage.setItem('total_unread_count', newCount);
            window.dispatchEvent(new CustomEvent('unread-count-changed', { detail: { count: newCount } }));

            // Trigger real-time rescue status updates on front-end
            if (msg.notification.reference_type === 'rescue_sessions') {
              window.dispatchEvent(new CustomEvent('rescue-update', { detail: msg.notification }));
            }

            // Show Toast
             setGlobalToast({
               id: Date.now(),
               title: msg.notification.title,
               body: msg.notification.body,
               isNotification: true,
               webUrl: msg.notification.metadata?.web_url || '/forum',
               showAction: true
             });
            if (msg.notification?.reference_type === 'rescue_sessions') {
              window.dispatchEvent(new CustomEvent('rescue-status-update'));
            }
          }
        } catch (err) {
          console.error('Error in background socket message handler:', err);
        }
      };

      socket.onclose = () => {
        console.log('UserApp background WebSocket disconnected, retrying in 5s...');
        retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activePage, isLoggedIn]);

  return (
    <>
      <AnimatedBackground />
      <MobileSidebarToggle />
      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <UserSidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          role={role}
          activeSOSCount={activeSOSCount}
        />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <UserTopBar
            activePage={activePage}
            collapsed={sidebarCollapsed}
            isLoggedIn={isLoggedIn}
            userName={userName}
            avatarUrl={avatarUrl}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onOpenProfile={handleOpenProfile}
            onNavigate={handleNavigate}
            role={role}
            workshopName={workshopName}
          />
          <div className="page-content">
            <Suspense fallback={<PageLoader />}>
              <ActivePage
                key={activePage}
                avatarUrl={avatarUrl}
                onAvatarChange={(newUrl) => {
                  setAvatarUrl(newUrl);
                  if (onAvatarChange) onAvatarChange(newUrl);
                }}
                userName={userName}
                onUserNameChange={(name) => {
                  setUserName(name);
                  if (onUserNameChange) onUserNameChange(name);
                }}
                isLoggedIn={isLoggedIn}
                onLogin={handleLogin}
                onLogout={handleLogout}
                role={role}
                workshopName={workshopName}
                onRoleUpgrade={onRoleUpgrade}
                pendingRequest={pendingRequest}
                onCancelUpgrade={onCancelUpgrade}
                pendingLinkRequest={pendingLinkRequest}
                onLinkWorkshop={onLinkWorkshop}
                onCancelLinkRequest={onCancelLinkRequest}
                onUnlinkWorkshop={onUnlinkWorkshop}
                             onApproveLink={onApproveLink}
                onRejectLink={onRejectLink}
                onNavigate={handleNavigate}
              />
            </Suspense>
          </div>
        </main>
      </div>
      {globalToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
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
            background: globalToast.isNotification ? 'rgba(234,179,8,0.1)' : 'rgba(6,182,212,0.1)',
            border: globalToast.isNotification ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(6,182,212,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {globalToast.isNotification ? (
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                className="btn btn-primary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.68rem', height: 22 }}
                onClick={() => {
                  setGlobalToast(null);
                  handleNavigate('user-notifications');
                }}
              >
                {globalToast.isNotification ? 'View' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
