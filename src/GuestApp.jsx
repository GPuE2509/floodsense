import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GuestSidebar from './components/layout/guest/GuestSidebar';
import GuestTopBar from './components/layout/guest/GuestTopBar';
import AnimatedBackground from './components/background/AnimatedBackground';
import MobileSidebarToggle from './components/layout/MobileSidebarToggle';

const GuestHome = lazy(() => import('./pages/guest/GuestHome'));
const GuestForum = lazy(() => import('./pages/guest/GuestForum'));
const EmergencyGuidelines = lazy(() => import('./pages/common/EmergencyGuidelines'));
const GuestLeaderboard = lazy(() => import('./pages/guest/GuestLeaderboard'));
const GuestAuthPage = lazy(() => import('./pages/guest/GuestAuthPage'));

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
  'guest-home': GuestHome,
  'guest-forum': GuestForum,
  'guest-info': EmergencyGuidelines,
  'guest-leaderboard': GuestLeaderboard,
  'guest-profile': GuestAuthPage,
};

const pathMap = {
  '/': 'guest-home',
  '/forum': 'guest-forum',
  '/info': 'guest-info',
  '/leaderboard': 'guest-leaderboard',
  '/auth': 'guest-profile',
};

const pageToPath = Object.fromEntries(Object.entries(pathMap).map(([k, v]) => [v, k]));

export default function GuestApp({ onLoginToUser, onRegister }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Láº¥y activePage tá»« URL
  const activePage = pathMap[location.pathname] || 'guest-home';

  // Äiá»u hÆ°á»›ng tá»± Ä‘á»™ng náº¿u URL tÃ o lao
  useEffect(() => {
    if (!pathMap[location.pathname]) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  const ActivePage = pages[activePage] || GuestHome;

  const handleNavigate = (page) => {
    const path = pageToPath[page] || '/';
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <AnimatedBackground />
      <MobileSidebarToggle />
      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <GuestSidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
        />

        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <GuestTopBar activePage={activePage} collapsed={sidebarCollapsed} onOpenProfile={() => handleNavigate('guest-profile')} />
          <div className="page-content">
            <Suspense fallback={<PageLoader />}>
              <ActivePage key={activePage} onLoginToUser={onLoginToUser} onRegister={onRegister} onNavigate={handleNavigate} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
}
