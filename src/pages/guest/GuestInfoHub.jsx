import React from 'react';
import { PhoneCall, ShieldAlert, CheckCircle, AlertTriangle, Package, Map } from 'lucide-react';

export default function GuestInfoHub() {
  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Emergency portal</h1>
        <p>Safety instructions and support hotline in flood situations</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Emergency center", value: '112', color: 'var(--red-400)' },
          { label: "Fire & rescue", value: '114', color: 'var(--orange-400)' },
          { label: "Medical emergency", value: '115', color: 'var(--green-400)' },
        ].map((item) => (
          <div key={item.value} className="card p-5 flex items-center gap-4">
            <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={16} color={item.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)' }}>{item.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 12 }}>Before flooding</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              "Fully charge your phone and prepare a spare battery.",
              "Check safe travel routes.",
              "Prepare an emergency bag and important documents.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle size={14} color="var(--green-400)" style={{ marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 12 }}>While flooded</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              "Do not enter areas with fast flowing water.",
              "Avoid touching wet electrical equipment.",
              "Contact the hotline when you need urgent assistance.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <AlertTriangle size={14} color="var(--orange-400)" style={{ marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 12 }}>After flooding</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              "Check electrical safety before using again.",
              "Clean and disinfect flooded area.",
              "Monitor your health and report if there are any unusual signs.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <ShieldAlert size={14} color="var(--blue-400)" style={{ marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 12 }}>Emergency kit</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              "Flashlight, spare batteries, small radio.",
              "Drinking water and dry food are enough for 2-3 days.",
              "Raincoat, waterproof bag and medical medicine.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Package size={14} color="var(--cyan-400)" style={{ marginTop: 2 }} />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="section-title" style={{ marginBottom: 12 }}>Evacuation map</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'rgba(26,108,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Map size={18} color="var(--blue-400)" />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Find safe routes and nearest evacuation points according to local instructions.
          </div>
        </div>
      </div>
    </div>
  );
}
