import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, ShieldAlert, Bell,
  MessageSquare, Trophy, ChevronLeft, ChevronRight,
  Wrench, ClipboardList, Users, BarChart2, Store,
  Waves, Star, ShieldPlus,
} from 'lucide-react';
import { apiService } from '../../../services/apiService';

const navItems = [
  {
    section: "OVERVIEW",
    items: [
      { id: 'ws-dashboard',   label: "Live Map & Weather",     icon: LayoutDashboard, badge: null },
    ],
  },
  {
    section: "CAR REPAIR SHOP",
    items: [
      { id: 'ws-shop',        label: "Workshop Profile & Services", icon: Store,        badge: null },
      { id: 'ws-tasks',       label: "Vehicle repair form",            icon: ClipboardList, badge: null  },
      { id: 'ws-mechanics',   label: "Workshop Staff",    icon: Users,        badge: null },
      { id: 'ws-reviews',     label: "Customer reviews",   icon: Star,         badge: null  },
    ],
  },
  {
    section: "User",
    items: [
      { id: 'user-reports',       label: "Community reporting",        icon: FileText,        badge: null   },
      { id: 'user-sos',           label: "SOS & Rescue",             icon: ShieldAlert,     badge: null   },
      { id: 'user-notifications', label: "Notifications & Chat",          icon: Bell,            badge: 4   },
      { id: 'user-forum',         label: "Community forum",       icon: MessageSquare,   badge: null },
      { id: 'user-guidelines',    label: "Emergency Guidelines", icon: ShieldPlus, badge: null },
      { id: 'user-rewards',       label: "Honor board",               icon: Trophy,          badge: null },
    ],
  },
];

export default function WorkshopSidebar({ activePage, onNavigate, collapsed, onToggleCollapse, activeSOSCount = 0 }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  const [newReportsCount, setNewReportsCount] = useState(0);
  const [config, setConfig] = useState(null);
  const [pendingRepairCount, setPendingRepairCount] = useState(0);

  useEffect(() => {
    const fetchPendingRepairCount = async () => {
      try {
        const res = await apiService.get('/rescue/workshop?limit=1');
        if (res && res.success && res.stats) {
          setPendingRepairCount(res.stats.pending || 0);
        }
      } catch (err) {
        console.error('Failed to fetch pending repair count for sidebar:', err);
      }
    };
    fetchPendingRepairCount();
    window.addEventListener('rescue-update', fetchPendingRepairCount);
    return () => {
      window.removeEventListener('rescue-update', fetchPendingRepairCount);
    };
  }, []);

  useEffect(() => {
    const checkNew = async () => {
      const lastSeen = localStorage.getItem('lastVisitedCommunityVerification');
      try {
        const res = await fetch(`https://floodsenseapi.onrender.com/api/incident-reports/new-count${lastSeen ? `?since=${lastSeen}` : ''}`);
        const data = await res.json();
        if (data.success) setNewReportsCount(data.count);
      } catch (err) {
        console.error(err);
      }
    };
    checkNew();
    const interval = setInterval(checkNew, 60000);
    const onVisited = () => setNewReportsCount(0);
    window.addEventListener('communityVerificationVisited', onVisited);
    return () => {
      clearInterval(interval);
      window.removeEventListener('communityVerificationVisited', onVisited);
    };
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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res && res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch system config in WorkshopSidebar:', err);
      }
    };
    fetchConfig();
  }, []);

  const filterItems = (items) => {
    if (!config) return items;
    return items.filter(item => {
      if (item.id === 'user-reports' && config.module_map === false) return false;
      if (item.id === 'user-sos' && config.module_rescue === false) return false;
      if (item.id === 'user-notifications' && config.module_chat === false) return false;
      if (item.id === 'user-forum' && config.module_forum === false) return false;
      if (item.id === 'user-rewards' && config.module_extensions === false) return false;
      return true;
    });
  };

  const activeNavItems = navItems.map(section => ({
    ...section,
    items: filterItems(section.items)
  })).filter(section => section.items.length > 0);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* â”€â”€ Logo â”€â”€ */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">Workshop · Repair</div>
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
                   style={isActive && section.section === "CAR REPAIR SHOP"
                     ? { borderLeft: '3px solid #f59e0b', background: 'rgba(217,119,6,0.1)' }
                     : {}}
                >
                  <Icon size={17} className="nav-item-icon" />
                  <span className="nav-item-label">{item.label}</span>
                  {item.id === 'user-notifications'
                    ? (unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>)
                    : item.id === 'ws-tasks'
                    ? (pendingRepairCount > 0 && <span className="nav-badge">{pendingRepairCount}</span>)
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
