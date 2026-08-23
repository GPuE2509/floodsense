import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Megaphone, MessageSquare,
  Trophy, LifeBuoy, ShieldPlus, ChevronLeft, ChevronRight,
  Waves, AlertTriangle, User
} from 'lucide-react';
import { apiService } from '../../../services/apiService';

const navItems = [
  {
    section: "OVERVIEW",
    items: [
      { id: 'guest-home', label: "Live Map & Weather", icon: LayoutDashboard, badge: null },
    ],
  },
  {
    section: "COMMUNITY",
    items: [
      { id: 'guest-forum', label: "Community Forum", icon: MessageSquare, badge: null },
      { id: 'guest-leaderboard', label: "Honor Board", icon: Trophy, badge: null },
    ],
  },
  {
    section: "INSTRUCT",
    items: [
      { id: 'guest-info', label: "Emergency Guidelines", icon: ShieldPlus, badge: null },
    ],
  },
];

export default function GuestSidebar({ activePage, onNavigate, collapsed, onToggleCollapse }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res && res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch system config in GuestSidebar:', err);
      }
    };
    fetchConfig();
  }, []);

  const filterItems = (items) => {
    if (!config) return items;
    return items.filter(item => {
      if (item.id === 'guest-forum' && config.module_forum === false) return false;
      if (item.id === 'guest-leaderboard' && config.module_extensions === false) return false;
      return true;
    });
  };

  const activeNavItems = navItems.map(section => ({
    ...section,
    items: filterItems(section.items)
  })).filter(section => section.items.length > 0);
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">Public · Guest Portal</div>
        </div>
      </div>

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
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
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
