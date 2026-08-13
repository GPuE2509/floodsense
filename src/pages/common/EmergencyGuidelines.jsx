import React, { useState, useEffect } from 'react';
import { Shield, Phone, AlertTriangle, Info, PhoneCall, Waves, HeartPulse, Truck, LifeBuoy, FireExtinguisher, SquarePlus, Baby, Activity, Heart, Car, Loader, X } from 'lucide-react';
import { apiService } from '../../services/apiService';

const ACTION_ICONS = {
  phone: Phone,
  shield: Shield,
  alert: AlertTriangle,
  heart: Heart,
  car: Car,
  activity: Activity,
  baby: Baby,
  lifebuoy: LifeBuoy,
  fire: FireExtinguisher,
  waves: Waves,
  heartpulse: HeartPulse,
  truck: Truck
};

const DraggableTitle = ({ children, className, style, as: Component = 'div' }) => {
  const scrollRef = React.useRef(null);
  const [isDown, setIsDown] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  const onMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onMouseLeave = () => setIsDown(false);
  const onMouseUp = () => setIsDown(false);
  const onMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <Component 
      ref={scrollRef}
      className={className}
      style={{ ...style, cursor: isDown ? 'grabbing' : 'grab', userSelect: 'none' }}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
    >
      {children}
    </Component>
  );
};

const EmergencyGuidelines = ({ onNavigate }) => {
  const [hotlines, setHotlines] = useState([]);
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuideline, setSelectedGuideline] = useState(null);

  useEffect(() => {
    const fetchGuidelines = async () => {
      try {
        const response = await apiService.getEmergencyGuidelines();
        const data = response.data || response;
        if (data && Array.isArray(data)) {
          setHotlines(data.filter(d => d.type === 'hotline').sort((a, b) => a.order - b.order));
          setGuidelines(data.filter(d => d.type === 'guideline').sort((a, b) => a.order - b.order));
        }
      } catch (err) {
        console.error('Error fetching emergency guidelines:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGuidelines();
  }, []);

  const getColorData = (colorStr) => {
    if (!colorStr) colorStr = 'blue';
    if (colorStr.startsWith('#')) {
      const hex = colorStr.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return {
        bg: `rgba(${r},${g},${b},0.1)`,
        border: `rgba(${r},${g},${b},0.3)`,
        text: colorStr
      };
    }
    const c = colorStr.toLowerCase();
    if (c.includes('red')) return { bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', text: 'var(--red-400)' };
    if (c.includes('blue')) return { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.25)', text: 'var(--blue-400)' };
    if (c.includes('green') || c.includes('cyan')) return { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.25)', text: 'var(--green-400)' };
    if (c.includes('amber') || c.includes('orange')) return { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', text: 'var(--orange-400)' };
    if (c.includes('purple')) return { bg: 'rgba(168,85,247,0.07)', border: 'rgba(168,85,247,0.25)', text: 'var(--purple-400)' };
    return { bg: 'rgba(0,170,255,0.07)', border: 'rgba(0,170,255,0.25)', text: 'var(--blue-400)' };
  };

  const renderIcon = (g) => {
    if (g.icon && g.icon.startsWith('<svg')) {
      return <div style={{ width: 28, height: 28, display: 'flex', fill: 'currentColor' }} dangerouslySetInnerHTML={{ __html: g.icon }} />;
    }
    if (g.icon && g.icon !== 'other' && ACTION_ICONS[g.icon]) {
      const Comp = ACTION_ICONS[g.icon];
      return <Comp size={28} />;
    }
    return <Info size={28} />;
  };

  const handleAction = (path) => {
    if (path.startsWith('http') || path.startsWith('tel:')) {
      window.open(path, '_blank');
      return;
    }
    
    // Check if we are previewing in Manager/Admin Dashboard
    if (window.location.pathname === '/guidelines') {
      alert(`[Preview Mode] Navigation simulated.\nNormal users will be redirected to: ${path}`);
      return;
    }

    const isLoggedIn = !!localStorage.getItem('token');
    if (!isLoggedIn) {
      if (onNavigate) onNavigate('auth');
      else window.location.href = '/auth';
    } else {
      if (onNavigate) onNavigate(path.replace(/^\//, ''));
      else window.location.href = path.startsWith('/') ? path : `/${path}`;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: 12, padding: '40px 20px', color: 'var(--cyan-400)' }}>
        <Loader className="animate-spin" size={24} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading emergency resources...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        .eg-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 20px;
        }
        @media (max-width: 900px) {
          .eg-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .eg-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <section style={{ marginBottom: 40 }}>
        <div className="section-header">
          <h2>EMERGENCY HOTLINES</h2>
        </div>
        <div className="eg-grid">
          {hotlines.map((h, i) => {
            const colors = getColorData(h.color || 'blue');
            const desc = h.description;
            
            return (
              <div key={i} className="card premium-card" style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: desc ? 'flex-start' : 'center',
                padding: '24px 20px', textDecoration: 'none',
                background: colors.bg, borderColor: colors.border,
                height: '240px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: desc ? 12 : 8, flexShrink: 0 }}>
                  <div style={{ color: colors.text, display: 'flex' }}>
                    {renderIcon(h)}
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700, color: colors.text, lineHeight: 1 }}>{h.phone_number}</div>
                </div>
                <div title={h.title} style={{ fontSize: '1rem', fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: desc ? 12 : 0, width: '100%', flexShrink: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{h.title}</div>
                
                {desc && (
                  <div className="hide-scrollbar" style={{ 
                    flex: 1, overflowY: 'auto', width: '100%', paddingRight: 4,
                    fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, wordBreak: 'break-word',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                  }}>
                    {desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-header">
          <h2>DISASTER & EMERGENCY GUIDELINES</h2>
        </div>
        <div className="eg-grid" style={{ alignItems: 'stretch' }}>
          {guidelines.map((g, i) => {
            const colors = getColorData(g.color || 'blue');
            return (
              <div key={i} className="card premium-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '420px', background: colors.bg, borderColor: colors.border, cursor: 'pointer' }} onClick={() => setSelectedGuideline(g)}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', padding: '16px 20px', 
                  borderBottom: `1px solid ${colors.border}`, color: colors.text,
                  flexShrink: 0
                }}>
                  <div style={{ marginRight: 12, display: 'flex' }}>{renderIcon(g)}</div>
                  <DraggableTitle as="h3" className="premium-title hide-scrollbar" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px', margin: 0, flex: 1 }}>{g.title}</DraggableTitle>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  <ul className="hide-scrollbar" style={{ 
                    listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingRight: 8,
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                  }}>
                    {g.tips.map((tip, idx) => (
                      <li key={idx} className="guideline-item" style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <div style={{ 
                          marginTop: 6, marginRight: 12, width: 8, height: 8, borderRadius: '50%', 
                          background: colors.text, flexShrink: 0, boxShadow: `0 0 8px ${colors.text}`
                        }}></div>
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, wordBreak: 'break-word', fontWeight: 500 }}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {selectedGuideline && (() => {
        const colors = getColorData(selectedGuideline.color || 'blue');
        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }} onClick={() => setSelectedGuideline(null)}>
            <div style={{
              background: '#0d1527',
              border: `1px solid ${colors.border}`,
              borderRadius: 'var(--r-lg)',
              width: '100%',
              maxWidth: 540,
              boxShadow: `0 10px 40px ${colors.border}44`,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
              overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: colors.text }}>
                  {renderIcon(selectedGuideline)}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {selectedGuideline.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedGuideline(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                    borderRadius: '50%',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                  Please follow the official instructions below to ensure safety during emergencies:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {selectedGuideline.tips.map((tip, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <div style={{
                        marginTop: 6,
                        marginRight: 14,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: colors.text,
                        flexShrink: 0,
                        boxShadow: `0 0 10px ${colors.text}`
                      }} />
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.98rem', lineHeight: 1.6, fontWeight: 500 }}>
                        {tip}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedGuideline(null)}
                  style={{ background: colors.text, border: 'none', color: '#000', fontWeight: 700 }}
                >
                  Understood
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default EmergencyGuidelines;
