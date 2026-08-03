import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Settings, Users,
  MessageSquare, HeadphonesIcon, ChevronLeft, ChevronRight,
  Waves, Shield, Activity, AlertTriangle, Truck, History, Layers, Key, Smartphone, Trophy, Bell, Cpu, TrendingUp, Megaphone, ShieldPlus, FileDown, Archive
} from 'lucide-react';

const navItems = [
  {
    section: "SYSTEM MANAGEMENT",
    items: [
      { id: 'community-reports', label: "Report Review", icon: FileText, badge: null },
      { id: 'system-notifications', label: "Dispatch System Notifications", icon: Megaphone, badge: null },

      { id: 'manage-guidelines', label: "Manage Emergency Guidelines", icon: ShieldPlus, badge: null },
      { id: 'system-config',     label: "System Configuration",  icon: Settings, badge: null },

      { id: 'user-management',   label: "User Management", icon: Users, badge: null },
      { id: 'user-growth-metrics', label: 'User Growth Metrics', icon: TrendingUp, badge: null },
      { id: 'iot-management',    label: "IoT Devices", icon: Cpu, badge: null },
      { id: 'incident-processing-logs', label: "Incident Processing Logs", icon: History, badge: null },
      { id: 'operation-logs',    label: 'Operation Logs', icon: History, badge: null },
    ],
  },
  {
    section: "COMMUNITY",
    items: [
      { id: 'forum-moderation',  label: "Forum Moderation", icon: MessageSquare, badge: null },
      { id: 'points-management', label: "Score Management", icon: Trophy, badge: null },

    ],
  },
  {
    section: "INTEGRATION & OPS",
    items: [
      { id: 'analytics-report',  label: 'Export Center',           icon: FileDown,    badge: null },
      { id: 'data-retention',    label: 'Data Retention & Archives', icon: Archive,   badge: null },

    ],
  },
];

export default function Sidebar({ activePage, onNavigate, collapsed, onToggleCollapse }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/incident-reports')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const count = data.data.filter(r => r.moderation_status === 'Pending').length;
          setPendingReports(count);
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

      {/* ── Logo / Branding ── */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">GOV · Command Center</div>
        </div>
      </div>

      {/* ── Alert Level Strip ── */}
      {/* ── Navigation ── */}
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
                  {item.id === 'admin-notifications'
                    ? (unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>)
                    : item.id === 'community-reports'
                      ? (pendingReports > 0 && <span className="nav-badge">{pendingReports}</span>)
                      : (item.badge && <span className="nav-badge">{item.badge}</span>)}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
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
