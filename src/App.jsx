import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/admin/Sidebar';
import TopBar from './components/layout/admin/TopBar';
import AnimatedBackground from './components/background/AnimatedBackground';


const CommunityReports = lazy(() => import('./pages/admin/CommunityReports'));
const SystemConfig     = lazy(() => import('./pages/admin/SystemConfig'));
const UserManagement   = lazy(() => import('./pages/admin/UserManagement'));
const IotDeviceManagement = lazy(() => import('./pages/admin/IotDeviceManagement'));
const ForumModeration  = lazy(() => import('./pages/admin/ForumModeration'));

const UserProfile      = lazy(() => import('./pages/user/UserProfile'));

const IncidentProcessingLogs = lazy(() => import('./pages/common/IncidentProcessingLogs'));

const PointsManagement  = lazy(() => import('./pages/admin/PointsManagement'));
const UserNotifications = lazy(() => import('./pages/user/UserNotifications'));
const SystemNotifications = lazy(() => import('./pages/admin/SystemNotifications'));
const UserGrowthMetrics = lazy(() => import('./pages/admin/UserGrowthMetrics'));
const OperationLogs = lazy(() => import('./pages/admin/OperationLogs'));
const ManagerGuidelines = lazy(() => import('./pages/manager/ManagerGuidelines'));
const AnalyticsReport = lazy(() => import('./pages/admin/AnalyticsReport'));
const DataRetentionConfig = lazy(() => import('./pages/admin/DataRetentionConfig'));


function PageLoader() {
  return (
    <div style={{ padding: '40px 24px', display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--r-lg)' }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        <div className="skeleton" style={{ height: 440, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 440, borderRadius: 'var(--r-lg)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--r-lg)' }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 'var(--r-lg)' }} />
      </div>
    </div>
  );
}

const pages = {

  'community-reports':  CommunityReports,
  'system-config':      SystemConfig,
  'user-management':    UserManagement,
  'iot-management':     IotDeviceManagement,
  'forum-moderation':   ForumModeration,


  'incident-processing-logs': IncidentProcessingLogs,
  'points-management': PointsManagement,
  'system-notifications': SystemNotifications,
  'admin-profile':      UserProfile,
  'admin-notifications': UserNotifications,
  'user-growth-metrics': UserGrowthMetrics,
  'operation-logs':      OperationLogs,
  'manage-guidelines':  ManagerGuidelines,
  'analytics-report':   AnalyticsReport,
  'data-retention':     DataRetentionConfig,
};

const pathMap = {

  '/reports': 'community-reports',
  '/config': 'system-config',
  '/users': 'user-management',
  '/iot': 'iot-management',
  '/forum-mod': 'forum-moderation',


  '/logs': 'incident-processing-logs',
  '/points': 'points-management',
  '/sys-notifications': 'system-notifications',
  '/profile': 'admin-profile',
  '/notifications': 'admin-notifications',
  '/system-notifications': 'system-notifications',
  '/user-growth': 'user-growth-metrics',
  '/operation-logs': 'operation-logs',
  '/guidelines': 'manage-guidelines',
  '/analytics-report': 'analytics-report',
  '/data-retention': 'data-retention',
};

const pageToPath = Object.fromEntries(Object.entries(pathMap).map(([k, v]) => [v, k]));

import { useAuth } from './hooks/useAuth';

export default function App({ 
  userName: propUserName = 'Admin', 
  avatarUrl: propAvatarUrl = '', 
  onAvatarChange, 
  onUserNameChange 
}) {
  const { logout, setUserName: setGlobalUserName, setAvatarUrl: setGlobalAvatarUrl } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userName, setUserName] = useState(propUserName);
  const [avatarUrl, setAvatarUrl] = useState(propAvatarUrl);

  // Lấy activePage từ URL
  const activePage = pathMap[location.pathname] || 'community-reports';

  // Điều hướng tự động nếu URL tào lao
  useEffect(() => {
    if (!pathMap[location.pathname]) {
      navigate('/reports', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    setUserName(propUserName);
  }, [propUserName]);

  useEffect(() => {
    setAvatarUrl(propAvatarUrl);
  }, [propAvatarUrl]);

  const ActivePage = pages[activePage] || CommunityReports;

  const handleNavigate = (page) => {
    const path = pageToPath[page] || '/reports';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const extraProps = activePage === 'admin-profile'
    ? { 
        avatarUrl, 
        onAvatarChange: (newUrl) => {
          setAvatarUrl(newUrl);
          if (onAvatarChange) onAvatarChange(newUrl);
          if (setGlobalAvatarUrl) setGlobalAvatarUrl(newUrl);
        }, 
        userName, 
        onUserNameChange: (newName) => {
          setUserName(newName);
          if (onUserNameChange) onUserNameChange(newName);
          if (setGlobalUserName) setGlobalUserName(newName);
        }, 
        isLoggedIn: true, 
        onLogout: logout, 
        role: 'admin' 
      }
    : {};

  return (
    <>
      {/* ── Animated rain + city background ── */}
      <AnimatedBackground />

      {/* ── App shell ── */}
      <div className="app-layout" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box' }}>
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
          userName={userName}
          avatarUrl={avatarUrl}
        />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <TopBar activePage={activePage} collapsed={sidebarCollapsed} onOpenProfile={() => handleNavigate('admin-profile')} onNavigate={handleNavigate} userName={userName} avatarUrl={avatarUrl} />
          <div className="page-content">
            <Suspense fallback={<PageLoader />}>
              <ActivePage key={activePage} {...extraProps} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
}

