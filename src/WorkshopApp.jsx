import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WorkshopSidebar from './components/layout/workshop/WorkshopSidebar';
import WorkshopTopBar from './components/layout/workshop/WorkshopTopBar';
import AnimatedBackground from './components/background/AnimatedBackground';
import { apiService } from './services/apiService';
import { MessageSquare, Bell } from 'lucide-react';
import MobileSidebarToggle from './components/layout/MobileSidebarToggle';

// ── Workshop-specific pages ──
const WorkshopDashboard = lazy(() => import('./pages/workshop/WorkshopDashboard'));
const WorkshopShop      = lazy(() => import('./pages/workshop/WorkshopShop'));
const WorkshopTasks     = lazy(() => import('./pages/workshop/WorkshopTasks'));
const WorkshopMechanics = lazy(() => import('./pages/workshop/WorkshopMechanics'));
const WorkshopReviews   = lazy(() => import('./pages/workshop/WorkshopReviews'));
const EmergencyGuidelines = lazy(() => import('./pages/common/EmergencyGuidelines'));

// ── Inherited User pages ──
const UserDashboard     = lazy(() => import('./pages/user/UserDashboard'));
const UserReports       = lazy(() => import('./pages/user/UserReports'));
const UserSOS           = lazy(() => import('./pages/user/UserSOS'));
const UserNotifications = lazy(() => import('./pages/user/UserNotifications'));
const UserInvitations   = lazy(() => import('./pages/user/UserInvitations'));
const UserForum         = lazy(() => import('./pages/user/UserForum'));
const GuestLeaderboard       = lazy(() => import('./pages/guest/GuestLeaderboard'));
const UserProfile       = lazy(() => import('./pages/user/UserProfile'));

function PageLoader() {
  return (
    <div style={{ padding: '40px 24px', display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--r-lg)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
}

const pages = {
  // Workshop pages
  'ws-dashboard':  WorkshopDashboard,
  'ws-shop':       WorkshopShop,
  'ws-tasks':      WorkshopTasks,
  'ws-mechanics':  WorkshopMechanics,
  'ws-reviews':    WorkshopReviews,
  // Inherited user pages
  'user-dashboard':     UserDashboard,
  'user-reports':       UserReports,
  'user-sos':           UserSOS,
  'user-notifications': UserNotifications,
  'user-invitations':   UserInvitations,
  'user-forum':         UserForum,
  'user-rewards':       GuestLeaderboard,
  'user-profile':       UserProfile,
  'user-guidelines':    EmergencyGuidelines,
};

const pathMap = {
  // Workshop pages
  '/dashboard': 'ws-dashboard',
  '/shop': 'ws-shop',
  '/tasks': 'ws-tasks',
  '/mechanics': 'ws-mechanics',
  '/reviews': 'ws-reviews',
  // Inherited user pages
  '/user-dashboard': 'user-dashboard',
  '/reports': 'user-reports',
  '/sos': 'user-sos',
  '/notifications': 'user-notifications',
  '/invitations': 'user-invitations',
  '/forum': 'user-forum',
  '/rewards': 'user-rewards',
  '/profile': 'user-profile',
  '/guidelines': 'user-guidelines',
};

const pageToPath = Object.fromEntries(Object.entries(pathMap).map(([k, v]) => [v, k]));

export default function WorkshopApp({ 
  onLogoutToGuest, 
  linkRequests, 
  onApproveLink, 
  onRejectLink,
  workshopName,
  userName: initialUserName,
  avatarUrl: propAvatarUrl,
  isLoggedIn: initialIsLoggedIn = true,
  onAvatarChange,
  onUserNameChange
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shopName, setShopName] = useState(workshopName);

  // Shared user-profile props (passed down to UserProfile)
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);
  const [userName, setUserName] = useState(initialUserName);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);

  // Lấy activePage từ URL
  const activePage = pathMap[location.pathname] || 'ws-dashboard';

  // Điều hướng tự động nếu URL tào lao
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

  useEffect(() => {
    if (workshopName) {
      setShopName(workshopName);
    }
  }, [workshopName]);

  const [activeSOSCount, setActiveSOSCount] = useState(0);

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

  // Background live location updates for workshop staff
  useEffect(() => {
    if (!isLoggedIn) return;

    const lastLocation = { lat: null, lng: null };

    const getCoordsDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // metres
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const updateLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
          });
          const newLat = position.coords.latitude;
          const newLng = position.coords.longitude;

          let shouldUpdate = true;
          if (lastLocation.lat !== null && lastLocation.lng !== null) {
            const dist = getCoordsDistance(lastLocation.lat, lastLocation.lng, newLat, newLng);
            if (dist <= 5) {
              shouldUpdate = false;
            }
          }

          if (shouldUpdate) {
            lastLocation.lat = newLat;
            lastLocation.lng = newLng;
            await apiService.put('/workshops/me/staff/location', { lat: newLat, lng: newLng });
          }
        } catch (gpsErr) {
          console.warn('GPS location update failed:', gpsErr);
        }
      }
    };

    updateLocation();
    const locationInterval = setInterval(updateLocation, 5000);

    return () => {
      clearInterval(locationInterval);
    };
  }, [isLoggedIn]);

  const ActivePage = pages[activePage] || WorkshopDashboard;

  const handleNavigate = (page) => {
    const path = pageToPath[page] || '/dashboard';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    if (onLogoutToGuest) onLogoutToGuest();
  };

  const [globalToast, setGlobalToast] = useState(null);

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => setGlobalToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

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
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WorkshopApp background WebSocket connected');
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

            // Show Toast
            setGlobalToast({
              id: Date.now(),
              title: msg.notification.title,
              body: msg.notification.body,
              isNotification: true,
              webUrl: msg.notification.metadata?.web_url || '/tasks',
              showAction: true
            });
          } else if (msg.type === 'rescue-update' || msg.type === 'rescue_status_update') {
            window.dispatchEvent(new CustomEvent('rescue-update'));
          }
        } catch (err) {
          console.error('Error in background socket message handler:', err);
        }
      };

      socket.onclose = () => {
        console.log('WorkshopApp background WebSocket disconnected, retrying in 5s...');
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

  // Extra props for pages that need them (inherited user pages / mechanics page)
  const extraProps = activePage === 'user-profile'
    ? { 
        avatarUrl, 
        onAvatarChange: (url) => { setAvatarUrl(url); if (onAvatarChange) onAvatarChange(url); }, 
        userName, 
        onUserNameChange: (name) => { setUserName(name); if (onUserNameChange) onUserNameChange(name); }, 
        isLoggedIn, 
        onLogout: handleLogout,
        role: 'workshop'
      }
    : activePage === 'ws-mechanics'
    ? { linkRequests, onApproveLink, onRejectLink }
    : {};

  return (
    <>
      <AnimatedBackground />
      <MobileSidebarToggle />
      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <WorkshopSidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          activeSOSCount={activeSOSCount}
        />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <WorkshopTopBar
            activePage={activePage}
            collapsed={sidebarCollapsed}
            onLogout={handleLogout}
            shopName={shopName}
            onOpenProfile={() => handleNavigate('user-profile')}
            userName={userName}
            avatarUrl={avatarUrl}
            onNavigate={handleNavigate}
          />
          <div className="page-content">
            <Suspense fallback={<PageLoader />}>
              <ActivePage key={activePage} onNavigate={handleNavigate} {...extraProps} />
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
                  handleNavigate(globalToast.isNotification ? 'user-notifications' : 'user-notifications');
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
