import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, MapPin, CloudRain, Zap, ShieldAlert, ArrowRight,
  TrendingUp, Radio, Droplets, Wind, AlertTriangle, Users, Navigation,
  ChevronRight, Activity, Thermometer, ShieldCheck, Search, Sun, CloudLightning, CloudDrizzle, Battery, Wifi, User, Star, Award, CheckCircle2 } from 'lucide-react';
import LiveMap from '../../components/common/LiveMap';
import DeviceDetailPanel from '../../components/common/DeviceDetailPanel';
import WeatherBanner from '../../components/weather/WeatherBanner';
import 'leaflet/dist/leaflet.css';
import { broadcastAdvisories } from '../../data/mockData';
import { apiService } from '../../services/apiService';

export default function GuestHome({ onLoginToUser, onRegister }) {
  const [systemConfig, setSystemConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [detailDeviceId, setDetailDeviceId] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res.success && res.data) {
          setSystemConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch system config in GuestHome:', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await apiService.get('/iot/devices');
        if (res.success && res.data && res.data.length > 0) {
          const formatted = res.data.map(d => ({
            ...d,
            id: d.device_code || d._id,
            waterLevel: d.waterLevel || 0,
            status: d.status || 'active',
          }));
          setDevices(formatted);
          setSelectedSensor(prev => prev || formatted[0]);
        }
      } catch (error) {
        console.error('Failed to fetch devices, using mock data:', error);
      }
    };
    fetchDevices();
    const intervalId = setInterval(fetchDevices, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Weather forecast data
  const weatherData = {
    today: { temp: '29°C', condition: "Heavy thunderstorm", alert: "Warning of heavy tidal flooding", icon: CloudLightning, color: 'var(--red-400)' },
    forecast: [
      { day: "Tomorrow", temp: '28°C', condition: "Scattered rain", icon: CloudDrizzle },
      { day: "Day after tomorrow", temp: '30°C', condition: "Cloudy", icon: Sun },
    ]
  };

  // Helper to get water level badge and styling
  const getWaterLevelBadge = (level, status, calib_empty_cm) => {
    const current = level || 0;
    if (current > 5) {
      return { label: `${Math.round(current * 10) / 10} cm`, className: 'badge-green', color: 'var(--green-400)', mapColor: '#22c55e' };
    }
    return { label: "No water", className: 'badge-gray', color: 'var(--text-muted)', mapColor: '#64748b' };
  };

  // Filter sensors based on search box input
  const filteredDevices = devices.filter(d => 
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.district || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-enter">
      
      {/* ── WEATHER FORECAST HEADER (Xem dự báo thời tiết) ── */}
      <WeatherBanner />

      {/* ── INTERACTIVE FLOOD MAP (Xem bản đồ, vị trí trạm, mực nước cm, chi tiết điểm ngập) ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 620, overflow: 'hidden', marginBottom: 24, position: 'relative' }}>
        <LiveMap hideWrapper height={620} onClickDetail={(device) => setDetailDeviceId(device.id || device.device_code)}>
          {detailDeviceId && <DeviceDetailPanel deviceId={detailDeviceId} onClose={() => setDetailDeviceId(null)} />}
        </LiveMap>
      </div>






    </div>
  );
}

// Small helper to quickly hide labels on offline/error sensors
function collapsedLabel(status) {
  return status === 'offline' || status === 'error';
}
