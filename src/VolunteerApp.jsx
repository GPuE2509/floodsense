import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VolunteerSidebar from './components/layout/volunteer/VolunteerSidebar';
import VolunteerTopBar from './components/layout/volunteer/VolunteerTopBar';
import AnimatedBackground from './components/background/AnimatedBackground';
import { apiService } from './services/apiService';
import { MessageSquare, Bell } from 'lucide-react';
import MobileSidebarToggle from './components/layout/MobileSidebarToggle';

import { useAuth } from './hooks/useAuth';

const VolunteerDashboard = lazy(() => import('./pages/volunteer/VolunteerDashboard'));
const VolunteerMissions = lazy(() => import('./pages/volunteer/VolunteerMissions'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const VolunteerProfile = lazy(() => import('./pages/volunteer/VolunteerProfile'));
const GuestLeaderboard = lazy(() => import('./pages/guest/GuestLeaderboard'));
const VolunteerNotifications = lazy(() => import('./pages/volunteer/VolunteerNotifications'));
const VolunteerForum = lazy(() => import('./pages/volunteer/VolunteerForum'));
const EmergencyGuidelines = lazy(() => import('./pages/common/EmergencyGuidelines'));

// User Pages
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserReports = lazy(() => import('./pages/user/UserReports'));
const UserSOS = lazy(() => import('./pages/user/UserSOS'));
const UserNotifications = lazy(() => import('./pages/user/UserNotifications'));
const UserInvitations = lazy(() => import('./pages/user/UserInvitations'));
const UserForum = lazy(() => import('./pages/user/UserForum'));

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
  'volunteer-dashboard': VolunteerDashboard,
  'volunteer-missions': VolunteerMissions,
  'volunteer-rewards': GuestLeaderboard,
  'volunteer-notifications': UserNotifications,
  'volunteer-forum': VolunteerForum,
  'user-profile': UserProfile,
  'volunteer-profile': VolunteerProfile,
  'volunteer-guidelines': EmergencyGuidelines,
  // User pages
  'user-dashboard': UserDashboard,
  'user-reports': UserReports,
  'user-sos': UserSOS,
  'user-notifications': UserNotifications,
  'user-invitations': UserInvitations,
  'user-forum': UserForum,
  'user-rewards': GuestLeaderboard,
  'user-guidelines': EmergencyGuidelines,
};

const pathMap = {
  '/dashboard': 'volunteer-dashboard',
  '/missions': 'volunteer-missions',
  '/profile': 'user-profile',
  '/rewards': 'volunteer-rewards',
  '/notifications': 'volunteer-notifications',
  '/forum': 'volunteer-forum',
  '/guidelines': 'volunteer-guidelines',
  '/volunteer-profile': 'volunteer-profile',
  // User paths
  '/user-dashboard': 'user-dashboard',
  '/reports': 'user-reports',
  '/sos': 'user-sos',
  '/user-notifications': 'user-notifications',
  '/invitations': 'user-invitations',
  '/user-forum': 'user-forum',
  '/user-rewards': 'user-rewards',
  '/user-guidelines': 'user-guidelines',
};

const pageToPath = Object.fromEntries(Object.entries(pathMap).map(([k, v]) => [v, k]));

export default function VolunteerApp({ onLogoutToGuest }) {
  const { logout, userName, setUserName, avatarUrl, setAvatarUrl } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Láº¥y activePage tá»« URL
  const activePage = pathMap[location.pathname] || 'volunteer-dashboard';

  const [isVolunteerActive, setIsVolunteerActive] = useState(false);

  useEffect(() => {
    let intervalId = null;
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

    const runSingleTick = async () => {
      try {
        let volunteer = null;

        // If volunteer is active, try to fetch location and update it
        if (isVolunteerActive && navigator.geolocation) {
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
              const res = await apiService.put('/volunteers/me/location', { lat: newLat, lng: newLng });
              if (res && res.volunteer) {
                volunteer = res.volunteer;
              }
            }
          } catch (gpsErr) {
            // Ignore GPS fail, will fallback to status check
          }
        }

        // If location was not updated, run regular status check
        if (!volunteer) {
          const res = await apiService.get('/volunteers/me');
          if (res && res.volunteer) {
            volunteer = res.volunteer;
          }
        }

        if (volunteer) {
          const status = volunteer.status;
          const isActive = (status === 'Approved' || status === 'Available' || status === 'Busy');
          setIsVolunteerActive(isActive);
        }
      } catch (err) {
        console.error('Error in volunteer background tick:', err);
        if (err.message && (err.message.includes('Unauthorized') || err.message.includes('re-authenticate'))) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    runSingleTick();
    intervalId = setInterval(runSingleTick, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isVolunteerActive]);

  // Äiá»u hÆ°á»›ng tá»± Ä‘á»™ng náº¿u URL tÃ o lao
  useEffect(() => {
    if (!pathMap[location.pathname]) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  const ActivePage = pages[activePage] || VolunteerDashboard;

  const handleNavigate = (page) => {
    const path = pageToPath[page] || '/dashboard';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    if (onLogoutToGuest) onLogoutToGuest();
  };

  const [pendingSOSCount, setPendingSOSCount] = useState(0);

  const fetchSOSCount = async () => {
    try {
      const res = await apiService.get('/rescue');
      if (res && res.success && res.data) {
        const count = res.data.filter(item => item.status === 'Pending').length;
        setPendingSOSCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch pending SOS count:', err);
    }
  };

  useEffect(() => {
    fetchSOSCount();
    window.addEventListener('rescue-update', fetchSOSCount);
    return () => window.removeEventListener('rescue-update', fetchSOSCount);
  }, []);


  useEffect(() => {
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
  }, []);

  useEffect(() => {
    const isNotificationsPage = activePage === 'volunteer-notifications';
    if (isNotificationsPage) return;

    let socket;
    let retryTimer;

    const connect = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('VolunteerApp background WebSocket connected');
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
          if (msg.type === 'rescue_status_update') {
            if (msg.status === 'Cancelled' || msg.status === 'Completed') {
              window.dispatchEvent(new CustomEvent('active-mission-terminated', {
                detail: { status: msg.status }
              }));
            }
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

            // Show Toast
            const isRescueSession = msg.notification.type === 'Emergency_SOS_Nearby' || msg.notification.reference_type === 'rescue_sessions';
            setGlobalToast({
              id: Date.now(),
              title: msg.notification.title,
              body: msg.notification.body,
              isNotification: true,
              webUrl: isRescueSession ? '/missions' : (msg.notification.metadata?.web_url || '/forum'),
              referenceId: msg.notification.reference_id,
              showAction: true
            });

            if (isRescueSession) {
              window.dispatchEvent(new CustomEvent('rescue-update'));
            }
          }
        } catch (err) {
          console.error('Error in background socket message handler:', err);
        }
      };

      socket.onclose = () => {
        console.log('VolunteerApp background WebSocket disconnected, retrying in 5s...');
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
  }, [activePage]);

  const extraProps = activePage === 'user-profile'
    ? {
      avatarUrl,
      onAvatarChange: setAvatarUrl,
      userName,
      onUserNameChange: setUserName,
      isLoggedIn: true,
      onLogout: handleLogout,
      role: 'volunteer',
    }
    : {};

  return (
    <>
      <AnimatedBackground />
      <MobileSidebarToggle />
      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <VolunteerSidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          userName={userName}
          avatarUrl={avatarUrl}
          pendingSOSCount={pendingSOSCount}
        />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <VolunteerTopBar
            activePage={activePage}
            collapsed={sidebarCollapsed}
            onLogout={handleLogout}
            userName={userName}
            avatarUrl={avatarUrl}
            onOpenProfile={() => handleNavigate('user-profile')}
            onNavigate={handleNavigate}
          />
          <div className="page-content">
            <Suspense fallback={<PageLoader />}>
              <ActivePage key={activePage} onNavigate={handleNavigate} {...extraProps} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
}
