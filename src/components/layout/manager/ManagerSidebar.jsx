import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Settings, Users,
  MessageSquare, HeadphonesIcon, ChevronLeft, ChevronRight,
  Waves, Shield, Activity, AlertTriangle, ClipboardList, Bell, Cpu, History, Trophy, Megaphone, ShieldPlus, FileDown
} from 'lucide-react';

const navItems = [
  {
    section: "SYSTEM MANAGEMENT",
    items: [
      { id: 'community-reports', label: "Report Review", icon: FileText, badge: null },
      { id: 'system-notifications', label: "Dispatch System Notifications", icon: Megaphone, badge: null },
      { id: 'manage-guidelines', label: "Manage Emergency Guidelines", icon: ShieldPlus, badge: null },
      { id: 'system-config', label: "System Configuration", icon: Settings, badge: null },
      { id: 'user-management', label: "Accounts & Devices", icon: Users, badge: null },
      { id: 'iot-management', label: "IoT Devices", icon: Cpu, badge: null },
      { id: 'incident-processing-logs', label: "Incident Processing Logs", icon: History, badge: null },
    ],
  },
  {
    section: "COMMUNITY",
    items: [
      { id: 'forum-moderation', label: "Forum Moderation", icon: MessageSquare, badge: null },
      { id: 'points-management', label: "Score Management", icon: Trophy, badge: null },
    ],
  },
  {
    section: "INTEGRATION & OPS",
    items: [
      { id: 'analytics-report',  label: 'Export Center',       icon: FileDown, badge: null },
    ],
  },
];

export default function ManagerSidebar({ activePage, onNavigate, collapsed, onToggleCollapse }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [pendingReports, setPendingReports] = useState(0);
  const [forumModerationCount, setForumModerationCount] = useState(0);
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const apiRoot = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    fetch(`${apiRoot}/api/incident-reports`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const count = data.data.filter(r => r.moderation_status === 'Pending').length;
          setPendingReports(count);
        }
      })
      .catch(err => console.error(err));

    fetch(`${apiRoot}/api/forum/moderation-stats`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setForumModerationCount(data.data.total);
        }
      })
      .catch(err => console.error(err));

    fetch(`${apiRoot}/api/auth/admin/role-requests`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.requests) {
          const count = data.requests.filter(r => r.status === 'pending').length;
          setPendingUsersCount(count);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setUnreadCount(e.detail.count);
      }
    };
    window.addEventListener('unread-count-changed', handleUpdate);
    return () => window.removeEventListener('unread-count-changed', handleUpdate);
  }, []);
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">Operations · Manager</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : ''}
                >
                  <Icon size={17} className="nav-item-icon" />
                  <span className="nav-item-label">{item.label}</span>
                  {item.id === 'manager-notifications'
                    ? (unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>)
                    : item.id === 'community-reports'
                      ? (pendingReports > 0 && <span className="nav-badge">{pendingReports}</span>)
                      : item.id === 'forum-moderation'
                        ? (forumModerationCount > 0 && <span className="nav-badge">{forumModerationCount}</span>)
                        : item.id === 'user-management'
                          ? (pendingUsersCount > 0 && <span className="nav-badge">{pendingUsersCount}</span>)
                          : (item.badge && <span className="nav-badge">{item.badge}</span>)}
                </button>
              );
            })}
          </div>
        ))}


      </nav>

      <div className="sidebar-footer">
        <button className="collapse-btn" onClick={onToggleCollapse}>
          {collapsed
            ? <ChevronRight size={16} color="var(--text-muted)" />
            : <>
                <ChevronLeft size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 600, letterSpacing: '0.06em' }}>COLLAPSE</span>
              </>
          }
        </button>
      </div>
    </aside>
  );
}
