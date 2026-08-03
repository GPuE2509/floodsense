import React, { useState } from 'react';
import { AlertTriangle, Megaphone, Clock, MapPin, Filter } from 'lucide-react';
import { broadcastAdvisories, sosAlerts } from '../../data/mockData';

export default function GuestAlerts() {
  const [typeFilter, setTypeFilter] = useState('all');

  const counts = {
    critical: broadcastAdvisories.filter(a => a.type === 'critical').length,
    warning: broadcastAdvisories.filter(a => a.type === 'warning').length,
    info: broadcastAdvisories.filter(a => a.type === 'info').length,
  };

  const filtered = broadcastAdvisories.filter((adv) =>
    typeFilter === 'all' ? true : adv.type === typeFilter
  );

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Public announcement</h1>
            <p>Quickly update flood warnings and safety recommendations</p>
          </div>
          <div className="live-indicator">
            <div className="live-dot" />
            LIVE FEED
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Urgent", value: counts.critical, color: 'var(--red-400)' },
          { label: "Warning", value: counts.warning, color: 'var(--orange-400)' },
          { label: "Information", value: counts.info, color: 'var(--blue-400)' },
          { label: "Total", value: broadcastAdvisories.length, color: 'var(--cyan-400)' },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 460 }}>
        {[
          { id: 'all', label: "All" },
          { id: 'critical', label: "Urgent" },
          { id: 'warning', label: "Warning" },
          { id: 'info', label: "Information" },
        ].map((tab) => (
          <button key={tab.id} className={`tab-btn ${typeFilter === tab.id ? 'active' : ''}`} onClick={() => setTypeFilter(tab.id)}>
            <Filter size={13} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 0.7fr', gap: 16 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Megaphone size={14} />
            <div className="section-title">Official announcement</div>
          </div>
          <div style={{ display: 'grid', gap: 10, padding: '12px 16px 16px' }}>
            {filtered.map((adv) => (
              <div key={adv.id} className="card" style={{ padding: '14px 16px', borderLeft: adv.type === 'critical' ? '3px solid var(--red-400)' : adv.type === 'warning' ? '3px solid var(--orange-400)' : '3px solid var(--blue-400)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{adv.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} /> {adv.sentAt} · Reach {adv.reach.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <span className={`badge ${adv.type === 'critical' ? 'badge-red' : adv.type === 'warning' ? 'badge-orange' : 'badge-blue'}`}>
                    {adv.type === 'critical' ? "Urgent" : adv.type === 'warning' ? "Warning" : "Information"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 12 }}>Hot spot is watching</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {sosAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)', background: 'rgba(18,29,40,0.7)' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <AlertTriangle size={12} color={alert.severity === 'critical' ? 'var(--red-400)' : 'var(--orange-400)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.id}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{alert.message}</div>
                <div className="flex items-center gap-2" style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <MapPin size={11} /> {alert.location}
                </div>
              </div>
            ))}
          </div>
          <div className="alert-banner info" style={{ marginTop: 12 }}>
            <AlertTriangle size={15} color="var(--orange-400)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Hotspot information is compiled from community and IoT data.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
