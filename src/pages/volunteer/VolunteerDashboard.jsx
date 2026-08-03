import React, { useState } from 'react';
import LiveMap from '../../components/common/LiveMap';
import WeatherBanner from '../../components/weather/WeatherBanner';
import DeviceDetailPanel from '../../components/common/DeviceDetailPanel';

export default function VolunteerDashboard({ onNavigate }) {
  const [detailDeviceId, setDetailDeviceId] = useState(null);

  return (
    <div className="page-enter">
      <WeatherBanner />

      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Live Map & Weather</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Rescue map and weather status
            </p>
          </div>
        </div>
      </div>

      {/* Flood Map synced with UserDashboard */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 620, overflow: 'hidden', marginBottom: 20 }}>
        <LiveMap height={620} hideWrapper onNavigate={onNavigate} onClickDetail={(device) => setDetailDeviceId(device.id || device.device_code)}>
          {detailDeviceId && <DeviceDetailPanel deviceId={detailDeviceId} onClose={() => setDetailDeviceId(null)} />}
        </LiveMap>
      </div>
    </div>
  );
}
