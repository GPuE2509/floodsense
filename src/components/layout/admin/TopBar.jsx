import React, { useState, useEffect } from 'react';
import { usePublicBroadcasts } from '../../../hooks/usePublicBroadcasts';
import { Bell, RefreshCw, Settings, Wifi, ShieldCheck, Globe2 } from 'lucide-react';

const pageTitles = {
  'community-reports':  { title: "REVIEW COMMUNITY REPORTS",    sub: "Manage & verify flood reports from residents" },
  'system-config':      { title: "SYSTEM CONFIGURATION",     sub: "Alarm thresholds, data storage and system modules" },

  'forum-moderation':   { title: "FORUM MODERATION",   sub: "Manage content, pinned posts and violating posts" },
  'user-management':    { title: "USER & IOT DEVICE MANAGEMENT", sub: "Manage accounts, device lifecycles, and IoT status" },
  'iot-management':     { title: "IOT DEVICE MANAGEMENT", sub: "Manage connection and status of IoT sensors" },
  'incident-processing-logs': { title: "INCIDENT PROCESSING LOGS", sub: "Structured event logs tracking lifecycle of accidents and rescue sessions" },
  'points-management':  { title: "SCORE MANAGEMENT", sub: "Adjust and verify contribution points" },
};

export default function TopBar({ activePage, collapsed, onOpenProfile, onNavigate, userName = 'Admin', avatarUrl = '' }) {
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

    let ws;
    let timer;
    const connectWs = () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const wsUrl = backendUrl.replace('http', 'ws').replace('/api', '');
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.type === 'MAP_UPDATE' ||
            msg.type === 'rescue-update' ||
            msg.type === 'notification' ||
            msg.type === 'sos' ||
            msg.type === 'sos_update' ||
            msg.type === 'rescue_session_updated' ||
            msg.type === 'incident_report_updated'
          ) {
            window.dispatchEvent(new CustomEvent('map-update'));
            window.dispatchEvent(new CustomEvent('sos-update'));
            window.dispatchEvent(new CustomEvent('rescue-update'));
            window.dispatchEvent(new CustomEvent('incident-update'));
            setUnreadCount(prev => prev + 1);
          }
        } catch (err) {}
      };
      ws.onclose = () => {
        timer = setTimeout(connectWs, 3000);
      };
    };
    connectWs();

    return () => {
      window.removeEventListener('unread-count-changed', handleUpdate);
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const pageInfo = pageTitles[activePage] || pageTitles['community-reports'] || { title: "DASHBOARD", sub: "Administration Panel" };

  const avatarInitial = userName ? userName.slice(0, 2).toUpperCase() : 'AD';
  const avatarStyle = avatarUrl
    ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent', fontSize: 0 }
    : {};

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmtTime = (d) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const fmtDate = (d) =>
    d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0 }}>

      {/* ── Main topbar row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', height: 54, flexShrink: 0 }}>

        {/* Page title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'var(--cyan-400)',
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}>
            {pageInfo.title}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageInfo.sub}
          </div>
        </div>

        {/* Live clock block */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '5px 14px',
          background: 'rgba(61,125,176,0.08)',
          border: '1px solid rgba(120,150,175,0.25)',
          borderRadius: 'var(--r-md)',
        }}>
          <div className="live-indicator">
            <div className="live-dot" />
            LIVE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
            {fmtTime(time)}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-dim)' }} />
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {fmtDate(time)}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="topbar-user" role="button" tabIndex={0} onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
            <div className="user-avatar" style={{ ...avatarStyle }}>
              {avatarUrl ? '' : avatarInitial}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>{userName || 'Admin'}</div>
              <div style={{ fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Super Admin</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert ticker strip ── */}
      <div style={{
        height: 28,
        background: 'rgba(61,125,176,0.06)',
        borderTop: '1px solid rgba(120,150,175,0.2)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Label */}
        <div style={{
          padding: '0 14px',
          background: 'linear-gradient(135deg, rgba(61,125,176,0.25), rgba(69,179,192,0.12))',
          borderRight: '1px solid rgba(120,150,175,0.25)',
          height: '100%',
          display: 'flex', alignItems: 'center', gap: 6,
          flexShrink: 0,
        }}>
          <div className="live-dot" style={{ width: 6, height: 6 }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', fontWeight: 700, color: 'var(--cyan-400)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
            NEW INFORMATION
          </span>
        </div>

        {/* Scrolling content */}
        <div className="ticker-wrap" style={{ paddingLeft: 12 }}>
          <div className="ticker-content" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tickerItems.map((item, i) => (
              <span key={i} style={{ marginRight: 60 }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
