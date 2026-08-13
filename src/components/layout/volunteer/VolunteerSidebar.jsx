import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShieldAlert, Bell, MessageSquare,
  UserCheck, Trophy, ChevronLeft, ChevronRight,
  Waves, Heart, Map, ClipboardList, ShieldPlus, FileText,
} from 'lucide-react';
import { apiService } from '../../../services/apiService';

const navItems = [
  {
    section: "OVERVIEW",
    items: [
      { id: 'volunteer-dashboard', label: "Live Map & Weather", icon: LayoutDashboard, badge: null },
    ],
  },
  {
    section: "VOLUNTEER",
    items: [
      { id: 'volunteer-missions', label: "Request SOS", icon: ShieldAlert, badge: null },
      { id: 'volunteer-profile',  label: "Volunteer profile",       icon: UserCheck, badge: null },
    ],
  },
  {
    section: "User",
    items: [
      { id: 'user-reports',       label: "Community reporting",        icon: FileText,        badge: null   },
      { id: 'user-sos',           label: "SOS & Rescue",             icon: ShieldAlert,     badge: null   },
      { id: 'volunteer-notifications', label: "Notifications & Chat", icon: Bell, badge: null },
      { id: 'volunteer-forum',         label: "Community forum",       icon: MessageSquare,   badge: null },
      { id: 'volunteer-guidelines',    label: "Emergency Guidelines", icon: ShieldPlus, badge: null },
      { id: 'volunteer-rewards',  label: "Honor board",   icon: Trophy, badge: null },
    ],
  },
];

export default function VolunteerSidebar({ activePage, onNavigate, collapsed, onToggleCollapse, pendingSOSCount = 0 }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  const [config, setConfig] = useState(null);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setUnreadCount(e.detail.count);
      }
    };
    window.addEventListener('unread-count-changed', handleUpdate);
    return () => window.removeEventListener('unread-count-changed', handleUpdate);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res && res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch system config in VolunteerSidebar:', err);
      }
    };
    fetchConfig();
  }, []);

  const filterItems = (items) => {
    if (!config) return items;
    return items.filter(item => {
      if (item.id === 'volunteer-missions' && config.module_rescue === false) return false;
      if (item.id === 'volunteer-rewards' && config.module_extensions === false) return false;
      if (item.id === 'volunteer-notifications' && config.module_chat === false) return false;
      if (item.id === 'volunteer-forum' && config.module_forum === false) return false;
      return true;
    });
  };

  const activeNavItems = navItems.map(section => ({
    ...section,
    items: filterItems(section.items)
  })).filter(section => section.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ── Logo / Branding ── */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">Volunteer · Volunteer</div>
        </div>
      </div>



      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {activeNavItems.map((section) => (
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
                  {item.id === 'volunteer-notifications'
                      ? (unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>)
                      : item.id === 'volunteer-missions'
                      ? (pendingSOSCount > 0 && <span className="nav-badge">{pendingSOSCount}</span>)
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
