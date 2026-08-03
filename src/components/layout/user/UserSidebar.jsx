import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, ShieldAlert, Bell,
  MessageSquare, Trophy, ChevronLeft, ChevronRight,
  Waves, AlertTriangle,
  Store, ClipboardList, Star, BarChart2, Users, ShieldPlus,
} from 'lucide-react';
import { apiService } from '../../../services/apiService';

export default function UserSidebar({ activePage, onNavigate, collapsed, onToggleCollapse, role = 'user', mobileOpen = false, onMobileClose, activeSOSCount = 0 }) {
  const isWorkshop = role === 'workshop';
  const isWorkshopRole = isWorkshop;

  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('total_unread_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  const [newReportsCount, setNewReportsCount] = useState(0);
  const [config, setConfig] = useState(null);
  const [pendingRepairCount, setPendingRepairCount] = useState(0);

  useEffect(() => {
    if (!isWorkshopRole) return;
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
  }, [isWorkshopRole]);

  useEffect(() => {
    const checkNew = async () => {
      const lastSeen = localStorage.getItem('lastVisitedCommunityVerification');
      try {
        const res = await fetch(`http://localhost:5000/api/incident-reports/new-count${lastSeen ? `?since=${lastSeen}` : ''}`);
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
        console.error('Failed to fetch system config in UserSidebar:', err);
      }
    };
    fetchConfig();
  }, []);

  // Filter items based on module toggle statuses
  const filterSectionItems = (items) => {
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

  const sections = [
    {
      section: "OVERVIEW",
      items: filterSectionItems([
        { id: 'user-dashboard', label: "Live Map & Weather", icon: LayoutDashboard, badge: null },
      ]),
    },
    {
      section: "REPORT & RESCUE",
      items: filterSectionItems([
        { id: 'user-reports', label: "Community reporting", icon: FileText, badge: null },
        { id: 'user-sos', label: "SOS & Rescue", icon: ShieldAlert, badge: null },
      ]),
    },
  ];

  if (isWorkshopRole) {
    const wsItems = [
      { id: 'ws-shop', label: "Workshop Profile & Services", icon: Store, badge: null },
      { id: 'ws-tasks', label: "Vehicle repair form", icon: ClipboardList, badge: pendingRepairCount > 0 ? pendingRepairCount : null },
    ];
    if (isWorkshop) {
      wsItems.push({ id: 'ws-mechanics', label: "Vehicle repairman manager", icon: Users, badge: null });
    }
    wsItems.push(
      { id: 'ws-reviews', label: "Customer reviews", icon: Star, badge: null }
    );
    sections.push({
      section: "YOUR CAR REPAIR SHOP",
      items: filterSectionItems(wsItems),
    });
  }

  sections.push({
    section: "COMMUNITY",
    items: filterSectionItems([
      { id: 'user-notifications', label: "Notifications & Chat", icon: Bell, badge: unreadCount },
      { id: 'user-forum', label: "Forum", icon: MessageSquare, badge: null },
      { id: 'user-guidelines', label: "Emergency Guidelines", icon: ShieldPlus, badge: null },
      { id: 'user-rewards', label: "Honor board", icon: Trophy, badge: null },
    ]),
  });

  const activeSections = sections.filter(section => section.items.length > 0);


  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/logo.png" alt="Logo" className="logo-icon" style={{ background: 'none', border: 'none', boxShadow: 'none' }} />
        <div className="logo-text">
          <div className="logo-name">FloodSense</div>
          <div className="logo-sub">{isWorkshop ? "Workshop Owner" : "Member · User"}</div>
        </div>
        {/* Mobile close button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="sidebar-mobile-close-btn"
            title="Close menu"
          >
            ✕
          </button>
        )}
      </div>



      {/* Nav */}
      <nav className="sidebar-nav">
        {activeSections.map((section) => (
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

      {/* Footer */}
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
