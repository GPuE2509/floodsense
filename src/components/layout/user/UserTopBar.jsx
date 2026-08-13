import React, { useState, useEffect, useRef } from 'react';
import { usePublicBroadcasts } from '../../../hooks/usePublicBroadcasts';
import { Bell, RefreshCw, Wifi, Mail, MapPin, Check, X, Loader, Phone, AlertTriangle, Clock } from 'lucide-react';
import { apiService } from '../../../services/apiService';

const pageTitles = {
  'user-dashboard':     { title: "LIVE MAP & WEATHER", sub: "Monitor alerts, risk zones, and your community activity" },
  'user-reports':       { title: "COMMUNITY REPORT", sub: "Submit flood reports with actual photos and participate in verification" },
  'user-sos':           { title: "SOS & RESCUE CENTER", sub: "Send SOS, track rescue vehicles and manage emergency contacts" },
  'user-notifications': { title: "NOTIFICATIONS & CHAT", sub: "Personal notification center and real-time chat" },
  'user-invitations':   { title: "WORKSHOP INVITATIONS", sub: "Manage your invitations to join workshop staff" },
  'user-forum':         { title: "COMMUNITY FORUM", sub: "Share flood images and exchange response experiences" },
  'user-workshops':     { title: "REPAIR WORKSHOP", sub: "Find the nearest workshop, rate and comment on the service" },
  'user-rewards':       { title: "REWARD POINTS & HONOR", sub: "Track contribution points, score history and rankings" },
  'user-profile':       { title: "PERSONAL PROFILE", sub: "View and update account information, profile picture, and password" },
  'ws-shop':            { title: "SHOP & SERVICES PROFILE", sub: "Manage Workshop information, service list, price list and operating status" },
  'ws-tasks':           { title: "MANAGE VEHICLE REPAIR ORDERS", sub: "Receive applications, assign mobile Workshop Staff and monitor progress visually" },
  'ws-reviews':         { title: "CUSTOMER REVIEWS", sub: "View customer feedback and write thank you/reply letters" },
  'ws-mechanics':       { title: "CAR REPAIR MANAGER", sub: "Approve mobile Workshop Staff' connection requests, coordinate duty schedules and shifts" },
};

export default function UserTopBar({
  activePage,
  collapsed,
  isLoggedIn,
  userName,
  avatarUrl,
  onLogin,
  onLogout,
  onOpenProfile,
  onNavigate,
  role = 'user',
  workshopName = null,
  notifCount = 4,
  onOpenMobileSidebar,
}) {
  const [time, setTime] = useState(new Date());
  const { tickerItems } = usePublicBroadcasts();
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const res = await apiService.get('/workshops/staff/invitations');
        if (res && res.invitations) {
          setInvitations(res.invitations);
        }
      } catch (err) {
        console.error('Failed to fetch invitations:', err);
      }
    };
    fetchInvitations();
  }, []);

  const handleToggleInvites = () => {
    if (onNavigate) {
      onNavigate('user-invitations');
    }
  };

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

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const notifDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutsideNotif = (event) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    if (showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutsideNotif);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideNotif);
    };
  }, [showNotifDropdown]);

  const handleToggleNotifDropdown = async (e) => {
    e.stopPropagation();
    const nextShow = !showNotifDropdown;
    setShowNotifDropdown(nextShow);
    if (nextShow) {
      try {
        const res = await apiService.get('/notifications');
        if (res && res.success && res.data) {
          setRecentNotifs(res.data.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to fetch recent notifications for topbar dropdown:', err);
      }
    }
  };

  const pageInfo = pageTitles[activePage] || pageTitles['user-dashboard'];
  const isWorkshop = role === 'workshop';

  const roleLabel = isWorkshop
    ? `Shop owner · ${workshopName || "Minh Chau Garage"}`
    : "Member";

  const avatarInitial = userName
    ? userName.trim().split(' ').pop().charAt(0).toUpperCase()
    : 'U';

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
    d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, gap: 0, overflow: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px', height: 54, flexShrink: 0, overflow: 'visible' }}>

        {/* Hamburger button — mobile only */}
        {onOpenMobileSidebar && (
          <button
            className="topbar-hamburger-btn"
            onClick={onOpenMobileSidebar}
            title="Open menu"
            aria-label="Open navigation menu"
          >
            <span /><span /><span />
          </button>
        )}
        
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
          <div className="topbar-subtitle" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pageInfo.sub}
          </div>
        </div>

        {/* Clock */}
        <div className="topbar-clock" style={{
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



        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <button 
              className="topbar-btn relative" 
              title="Invitations"
              onClick={handleToggleInvites}
            >
              <Mail size={15} />
              {invitations.length > 0 && <span className="notif-badge">{invitations.length}</span>}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              className="topbar-btn relative"
              title="Notification"
              onClick={() => { if (onNavigate) onNavigate('user-notifications'); }}
            >
              <Bell size={15} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            {showNotifDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: 360,
                maxHeight: 460,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--r-md)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Notifications</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => { setShowNotifDropdown(false); if(onNavigate) onNavigate('user-notifications'); }}>
                    View all
                  </span>
                </div>
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: 360 }}>
                  {recentNotifs.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      No new notifications
                    </div>
                  ) : (
                    recentNotifs.map(n => {
                      const isSos = n.type === 'Emergency_SOS_Contact' || n.type === 'Emergency_SOS_Nearby';
                      const phoneToCopy = n.metadata?.app_params?.phone || (n.body && n.body.match(/(?:SĐT(?: liên hệ)?|SĐT:|Phone:)\s*([0-9+.\- ]+)/i)?.[1]?.trim());
                      return (
                        <div
                          key={n._id || n.id}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-dim)',
                            background: !n.is_read ? 'rgba(6,182,212,0.06)' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4
                          }}
                          onClick={() => {
                            setShowNotifDropdown(false);
                            if (n.metadata?.web_url && onNavigate) {
                              // Navigate if appropriate or open notifications
                              onNavigate('user-notifications');
                            } else if (onNavigate) {
                              onNavigate('user-notifications');
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isSos && <AlertTriangle size={13} color="var(--red-400)" />}
                            <span style={{ fontWeight: !n.is_read ? 700 : 600, fontSize: '0.82rem', color: 'var(--text-primary)', flex: 1 }}>{n.title || 'Notification'}</span>
                            {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan-400)' }} />}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{n.body}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={10} /> {n.created_at ? new Date(n.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          {phoneToCopy && (
                            <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="btn btn-sm"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '0.7rem',
                                  background: 'rgba(239,68,68,0.15)',
                                  color: 'var(--red-400)',
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  borderRadius: 'var(--r-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  width: '100%',
                                  justifyContent: 'center'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(phoneToCopy);
                                }}
                              >
                                <Phone size={11} /> Copy Phone Number: {phoneToCopy}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div
                  style={{ padding: '10px 16px', textAlign: 'center', background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border-dim)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--cyan-400)' }}
                  onClick={() => { setShowNotifDropdown(false); if (onNavigate) onNavigate('user-notifications'); }}
                >
                  View all notifications
                </div>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border-dim)' }} />

          {/* User avatar + info */}
          <div className="topbar-user" role="button" tabIndex={0} onClick={() => onNavigate && onNavigate('user-profile')} style={{ cursor: 'pointer' }}>
            <div className="user-avatar" style={{ background: isWorkshop ? 'var(--green-400)' : 'var(--cyan-400)', ...avatarStyle }}>
              {avatarUrl ? '' : avatarInitial}
            </div>
            <div className="topbar-user-info">
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                {userName || "User"}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
                {roleLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticker */}
      <div style={{
        height: 28,
        background: 'rgba(61,125,176,0.06)',
        borderTop: '1px solid rgba(120,150,175,0.2)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
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
