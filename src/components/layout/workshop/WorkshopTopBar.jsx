import React, { useState, useEffect } from 'react';
import { usePublicBroadcasts } from '../../../hooks/usePublicBroadcasts';
import { Bell, RefreshCw, Wifi, LogOut, Wrench } from 'lucide-react';

const pageTitles = {
  // Workshop pages
  'ws-dashboard':  { title: 'WORKSHOP DASHBOARD',         sub: "Overview of workshop & today's orders" },
  'ws-shop':       { title: "SHOP & SERVICES PROFILE",      sub: "Manage Workshop information, services and prices" },
  'ws-tasks':      { title: "MANAGE VEHICLE REPAIR ORDERS",         sub: "Receive and process requests for mobile vehicle repair" },
  'ws-mechanics':  { title: "CAR REPAIR MANAGER",         sub: "List of Workshop Staff, shifts and performance" },
  'ws-reviews':    { title: "CUSTOMER REVIEWS",        sub: "Service feedback & comment management" },
  // Inherited User pages
  'user-dashboard':     { title: 'USER FLOOD DASHBOARD',  sub: "Monitor warnings and personal risk zones" },
  'user-reports':       { title: "COMMUNITY REPORT",    sub: "Submit flood reports and community verification" },
  'user-sos':           { title: 'EMERGENCY SOS CENTER',  sub: "Send SOS, rescue tracking and emergency contact" },
  'user-notifications': { title: "NOTIFICATIONS & CHAT",      sub: "Real-time notifications and chat" },
  'user-forum':         { title: "COMMUNITY FORUM",   sub: "Share experiences and interact" },
  'user-rewards':       { title: 'REWARDS & POINTS',       sub: "Contribution points and honor board" },
  'user-profile':       { title: "PERSONAL PROFILE",         sub: "Update account information" },
};

export default function WorkshopTopBar({ activePage, collapsed, onLogout, shopName, onOpenProfile, userName, avatarUrl, onNavigate }) {
  const [time, setTime] = useState(new Date());
  const { tickerItems } = usePublicBroadcasts();
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setUnreadCount(e.detail.count);
      }
    };
    window.addEventListener('unread-count-changed', handleUpdate);
    return () => window.removeEventListener('unread-count-changed', handleUpdate);
  }, []);

  const pageInfo = pageTitles[activePage] || pageTitles['ws-dashboard'];
  const isWsPage = activePage.startsWith('ws-');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmtTime = (d) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtDate = (d) =>
    d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const avatarInitial = userName
    ? userName.trim().split(' ').pop().charAt(0).toUpperCase()
    : (shopName ? shopName.slice(0, 2).toUpperCase() : 'GC');

  const avatarStyle = avatarUrl
    ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' }
    : {};

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', height: 54, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: isWsPage ? '#f59e0b' : 'var(--cyan-400)',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}>
            {pageInfo.title}
          </div>
          <div className="topbar-subtitle" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageInfo.sub}
          </div>
        </div>

        <div className="topbar-clock" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '5px 14px',
          background: 'rgba(61,125,176,0.08)',
          border: '1px solid rgba(120,150,175,0.25)',
          borderRadius: 'var(--r-md)',
        }}>
          <div className="live-indicator"><div className="live-dot" />LIVE</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            {fmtTime(time)}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-dim)' }} />
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {fmtDate(time)}
          </div>
        </div>



        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            className="topbar-btn relative" 
            title="Notification"
            onClick={() => onNavigate && onNavigate('user-notifications')}
          >
            <Bell size={15} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          <div style={{ width: 1, height: 24, background: 'var(--border-dim)' }} />

          <div className="topbar-user" role="button" tabIndex={0} onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', ...avatarStyle }}>
              {avatarUrl ? '' : avatarInitial}
            </div>
            <div className="topbar-user-info">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)' }}>
                {shopName || (userName ? `${userName}'s Garage` : "Your Garage")}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                Car workshop
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div style={{
        height: 28,
        background: 'rgba(217,119,6,0.04)',
        borderTop: '1px solid rgba(217,119,6,0.15)',
        display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          padding: '0 14px',
          background: 'linear-gradient(135deg, rgba(217,119,6,0.2), rgba(245,158,11,0.1))',
          borderRight: '1px solid rgba(217,119,6,0.2)',
          height: '100%', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        }}>
          <div className="live-dot" style={{ width: 6, height: 6, background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', fontWeight: 700, color: 'var(--cyan-400)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            NEW INFORMATION
          </span>
        </div>
        <div className="ticker-wrap" style={{ paddingLeft: 12 }}>
          <div className="ticker-content" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tickerItems.map((item, i) => (
              <span key={i} style={{ marginRight: 60 }}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
