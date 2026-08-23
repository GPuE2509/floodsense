import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle, Navigation, PhoneCall, ShieldCheck, ShieldAlert,
  MapPin, Clock, Send, LifeBuoy, Plus, Trash2, Edit2,
  CheckCircle, Radio, Car, Crosshair, Building2, Pill,
  Heart, Phone, X, Save, Bell, Activity, Camera, Loader,
  Bike, XCircle, Maximize, Minimize, Wrench, Star, ArrowLeft, MessageSquare, ChevronRight, Copy, User, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GoongMaplibreLayer from '../../components/common/GoongMaplibreLayer';
import { apiService } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import RescueSessionChat from '../../components/common/RescueSessionChat';

// ── Mock Data ────────────────────────────────────────────────────────────────

// ── Mock Data ────────────────────────────────────────────────────────────────

const trackingSteps = [];

const statusBadge = {
  Pending: <span className="badge badge-orange">Waiting for routing</span>,
  Assigned: <span className="badge badge-blue">Received</span>,
  In_Progress: <span className="badge badge-blue" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Processing</span>,
  Arrived: <span className="badge badge-cyan">Arrived & Assisting</span>,
  Resolved: <span className="badge badge-green">Complete</span>,
  Completed: <span className="badge badge-green">Complete</span>,
  Cancelled: <span className="badge badge-ghost" style={{ opacity: 0.6 }}>Cancelled</span>,
};

const severityBg = {
  critical: '3px solid var(--red-400)',
  high: '3px solid var(--orange-400)',
  medium: '3px solid var(--cyan-400)',
};

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

const getReportTypeLabel = (type) => {
  if (!type) return 'Unknown';
  const cleanType = String(type).trim().toLowerCase();
  switch (cleanType) {
    case 'flood':
    case 'flooding':
      return 'Flooding';
    case 'accident':
    case 'traffic accident':
    case 'traffic_accident':
      return 'Traffic accident';
    case 'tree':
    case 'tree falling':
    case 'tree_falling':
      return 'Tree falling';
    case 'traffic':
    case 'serious traffic jam':
    case 'serious_traffic_jam':
      return 'Serious traffic jam';
    case 'infra':
    case 'infrastructure failure':
    case 'infrastructure_failure':
      return 'Infrastructure failure';
    default:
      return cleanType.charAt(0).toUpperCase() + cleanType.slice(1);
  }
};

const emergencyServices = [
  { name: "District 12 Hospital", type: 'hospital', address: "14 To Ky, Trung My Tay Ward", phone: '028 3891 1234', dist: '1.2 km', icon: Building2, color: 'var(--red-400)' },
  { name: "Thanh Xuan Ward Medical Station", type: 'clinic', address: "52 Quang Trung, Thanh Xuan", phone: '028 3891 5678', dist: '0.8 km', icon: Heart, color: 'var(--orange-400)' },
  { name: "Minh Tam Pharmacy", type: 'pharmacy', address: "88 Nguyen Oanh, Go Vap", phone: '028 3891 9012', dist: '2.1 km', icon: Pill, color: 'var(--cyan-400)' },
  { name: "Hoc Mon Rescue Station", type: 'rescue', address: "Highway 22, Hoc Mon", phone: '028 3891 3456', dist: '3.5 km', icon: LifeBuoy, color: 'var(--green-400)' },
  { name: "Community shelter Q12", type: 'shelter', address: "People's Committee of Thoi An Ward, District 12", phone: '028 3891 7890', dist: '1.9 km', icon: Building2, color: 'var(--blue-400)' },
];

const initContacts = [];

const SOS_TYPES = [
  { id: 'flood', label: "The vehicle stalled due to flooding", icon: Car },
  { id: 'stuck', label: "Unable to move, cannot escape", icon: AlertTriangle },
  { id: 'medical', label: "Need medical assistance", icon: Heart },
  { id: 'other', label: "Other scenario", icon: LifeBuoy },
];

// ── SVG Map: User + Rescue Vehicle ──────────────────────────────────────────

function RescueMap({ eta, currentRescue, userLat, userLng }) {
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [autoCenter, setAutoCenter] = useState(true);

  useEffect(() => {
    const hasAssigned = currentRescue && (currentRescue.assigned_volunteer_id || currentRescue.assigned_staff_id);
    if (hasAssigned) {
      setActiveVolunteers([]);
      return;
    }

    const fetchActiveVolunteers = async () => {
      try {
        const res = await apiService.get('/volunteers/active');
        if (res && res.success && res.data) {
          setActiveVolunteers(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch active volunteers:', err);
      }
    };

    fetchActiveVolunteers();
    const interval = setInterval(fetchActiveVolunteers, 5000);
    return () => clearInterval(interval);
  }, [currentRescue]);

  const assignedVol = currentRescue?.assigned_volunteer_id || currentRescue?.assigned_staff_id;
  const hasAssigned = !!assignedVol;

  const userPosition = [userLat || 10.8564, userLng || 106.6234];
  const assignedPosition = (() => {
    if (!hasAssigned) return null;
    if (assignedVol.current_lat != null && assignedVol.current_lng != null) {
      return [assignedVol.current_lat, assignedVol.current_lng];
    }
    if (currentRescue?.workshop_id && currentRescue.workshop_id.lat != null && currentRescue.workshop_id.lng != null) {
      return [currentRescue.workshop_id.lat, currentRescue.workshop_id.lng];
    }
    return null;
  })();

  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [floodedSensors, setFloodedSensors] = useState([]);
  const [hazardPoints, setHazardPoints] = useState([]);

  useEffect(() => {
    const fetchMapDetails = async () => {
      try {
        const iotRes = await apiService.get('/iot/devices');
        if (iotRes && iotRes.success && iotRes.data) {
          const flooded = iotRes.data.filter(d => d.warning_water_status !== 'safe');
          setFloodedSensors(flooded);
        }
        const hazardRes = await apiService.get('/incident-reports');
        if (hazardRes && hazardRes.success && hazardRes.data) {
          const approved = hazardRes.data.filter(h => h.moderation_status === 'Approved');
          setHazardPoints(approved);
        }
      } catch (err) {
        console.error('Failed to fetch map details:', err);
      }
    };
    fetchMapDetails();
  }, []);

  // Fetch Goong route between volunteer and victim
  useEffect(() => {
    if (!hasAssigned || !assignedPosition) {
      setRoutePath([]);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const start = `${assignedPosition[0]},${assignedPosition[1]}`;
        const end = `${userPosition[0]},${userPosition[1]}`;
        const res = await apiService.get(`/map/route?start=${start}&end=${end}`);
        if (res && res.success && res.data && res.data.length > 0) {
          const coordinates = res.data[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutePath(coordinates);
          setRouteDistance(res.data[0].distance);
          setRouteDuration(res.data[0].duration);
        } else {
          setRoutePath([]);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      } catch (err) {
        console.error('Failed to fetch Goong route path:', err);
        setRoutePath([]);
        setRouteDistance(null);
        setRouteDuration(null);
      }
    };

    fetchRoute();
  }, [hasAssigned, assignedPosition?.[0], assignedPosition?.[1], userPosition[0], userPosition[1]]);

  // Custom icons configuration
  const motorcycleIcon = useMemo(() => L.divIcon({
    className: 'custom-motorcycle-icon',
    html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: var(--orange-400); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px var(--orange-400);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/><path d="M15 8h1a2 2 0 0 1 2 2v2"/><path d="M10.5 17.5 9 12H3"/><path d="m14 17.5-1.5-6H9"/><path d="M12 9h3.5l2 3.5"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  }), []);

  const nearbyIcon = useMemo(() => L.divIcon({
    className: 'custom-nearby-icon',
    html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: var(--green-400); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px var(--green-400);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/><path d="M15 8h1a2 2 0 0 1 2 2v2"/><path d="M10.5 17.5 9 12H3"/><path d="m14 17.5-1.5-6H9"/><path d="M12 9h3.5l2 3.5"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }), []);

  const userIcon = useMemo(() => L.divIcon({
    className: 'custom-user-icon',
    html: `<div style="position: relative;"><div style="position: absolute; inset: -10px; border-radius: 50%; background: var(--cyan-400); opacity: 0.25; animation: pulse-ring 1.8s infinite ease-out;"></div><div style="width: 18px; height: 18px; border-radius: 50%; background: var(--cyan-400); border: 2px solid white; box-shadow: 0 0 12px var(--cyan-400);"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  }), []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!mapRef.current) return;
    if (!document.fullscreenElement) {
      mapRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Map viewport bounds controller
  function MapController({ center, hasAssigned, assignedPosition, isFullscreen, autoCenter, setAutoCenter }) {
    const map = useMap();

    useMapEvents({
      dragstart: () => {
        setAutoCenter(false);
      },
      zoomstart: () => {
        setAutoCenter(false);
      }
    });

    useEffect(() => {
      if (!autoCenter) return;
      if (!center || isNaN(center[0]) || isNaN(center[1])) {
        return; // Prevent crash on invalid user coordinates
      }
      map.invalidateSize();
      const timer1 = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      const timer2 = setTimeout(() => {
        map.invalidateSize();
        if (hasAssigned && assignedPosition && !isNaN(assignedPosition[0]) && !isNaN(assignedPosition[1])) {
          const isTooClose = Math.abs(center[0] - assignedPosition[0]) < 0.0003 && Math.abs(center[1] - assignedPosition[1]) < 0.0003;
          if (!isTooClose) {
            map.fitBounds([center, assignedPosition], { padding: [50, 50] });
          } else {
            map.setView(center, 17);
          }
        } else {
          map.setView(center, 14);
        }
      }, 500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }, [center, hasAssigned, assignedPosition, map, isFullscreen, autoCenter]);
    return null;
  }

  return (
    <div ref={mapRef} style={{
      position: 'relative',
      width: '100%',
      height: isFullscreen ? '100%' : 320,
      borderRadius: isFullscreen ? 0 : 'var(--r-md)',
      overflow: 'hidden',
      background: '#080d16'
    }}>
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid var(--border-dim)',
          borderRadius: 4,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white'
        }}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>

      {/* Recenter Button */}
      <button
        onClick={() => setAutoCenter(true)}
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 1000,
          background: autoCenter ? 'var(--cyan-400)' : 'rgba(0,0,0,0.75)',
          border: '1px solid var(--border-dim)',
          borderRadius: 4,
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          color: autoCenter ? '#080d16' : 'white',
          fontSize: '0.72rem',
          fontWeight: 700,
          boxShadow: autoCenter ? '0 0 10px var(--cyan-400)' : 'none',
          transition: 'all 0.15s'
        }}
      >
        <Crosshair size={13} /> {autoCenter ? 'Tracking' : 'Recenter'}
      </button>

      {/* Route Info Overlay */}
      {routeDistance !== null && routeDuration !== null && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(8, 13, 22, 0.9)',
          border: '1px solid var(--border-dim)',
          borderRadius: 4,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Distance</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan-400)', fontFamily: 'var(--font-mono)' }}>
              {routeDistance >= 1000 ? `${(routeDistance / 1000).toFixed(1)} km` : `${Math.round(routeDistance)} m`}
            </span>
          </div>
          <div style={{ width: 1, height: 12, background: 'var(--border-dim)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ETA</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--green-400)', fontFamily: 'var(--font-mono)' }}>
              {routeDuration >= 3600
                ? `${Math.floor(routeDuration / 3600)}h ${Math.round((routeDuration % 3600) / 60)}m`
                : `${Math.ceil(routeDuration / 60)} mins`}
            </span>
          </div>
        </div>
      )}

      <MapContainer
        center={userPosition}
        zoom={14}
        zoomControl={false}
        style={{ width: '100%', height: '100%', background: '#080d16' }}
      >
        <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />

        <MapController
          center={userPosition}
          hasAssigned={hasAssigned}
          assignedPosition={assignedPosition}
          isFullscreen={isFullscreen}
          autoCenter={autoCenter}
          setAutoCenter={setAutoCenter}
        />

        {/* User Marker */}
        <Marker position={userPosition} icon={userIcon} />

        {/* Assigned Rescuer & Path */}
        {hasAssigned && assignedPosition && (
          <>
            {routePath.length > 0 ? (
              <Polyline
                positions={routePath}
                color="var(--orange-400)"
                weight={4}
                opacity={0.85}
              />
            ) : (
              <Polyline
                positions={[assignedPosition, userPosition]}
                color="var(--orange-400)"
                weight={3}
                dashArray="6, 6"
                opacity={0.8}
              />
            )}
            <Marker position={assignedPosition} icon={motorcycleIcon} />
          </>
        )}

        {/* Nearby Active Volunteers */}
        {!hasAssigned && activeVolunteers.map(vol => {
          if (!vol.current_lat || !vol.current_lng) return null;
          return (
            <Marker
              key={vol._id}
              position={[vol.current_lat, vol.current_lng]}
              icon={nearbyIcon}
            />
          );
        })}

        {/* Flooded Sensors */}
        {floodedSensors.map((f, idx) => {
          if (f.lat === undefined || f.lat === null || f.lng === undefined || f.lng === null) return null;

          const currentLevel = f.waterLevel || f.current_water_level || 0;
          const hasWater = currentLevel > 5;
          const levelText = `${Math.round(currentLevel * 10) / 10} cm`;

          let mapColor = '#22c55e'; // default green
          if (f.warning_water_status === 'danger' || currentLevel > 50) {
            mapColor = '#ef4444'; // red
          } else if (f.warning_water_status === 'warning' || currentLevel > 15) {
            mapColor = '#f97316'; // orange
          }

          return (
            <Marker
              key={`sensor-${idx}`}
              position={[f.lat, f.lng]}
              icon={L.divIcon({
                className: 'custom-sensor-marker leaflet-interactive',
                html: `
                  <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                    ${hasWater ? `<div style="position: absolute; bottom: 38px; background: ${mapColor}; color: white; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 1.5px solid white; z-index: 10;">${levelText}</div>` : ''}
                    <div style="background-color: ${mapColor}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px ${mapColor}80; border: 3px solid white; position: relative; z-index: 2;">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 14a8 8 0 0 1 16 0"></path><path d="M8 14a4 4 0 0 1 8 0"></path><path d="M12 14v.01"></path><path d="M2 14h20"></path><path d="M12 2v20"></path>
                      </svg>
                      ${hasWater ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid ${mapColor}; animation: pulse-ring 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; box-sizing: border-box; z-index: -1;"></div>` : ''}
                    </div>
                  </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
                popupAnchor: [0, -18]
              })}
            >
              <Popup>
                <div style={{ padding: '2px 4px', fontSize: '0.82rem' }}>
                  <strong style={{ color: mapColor, display: 'block', marginBottom: 4 }}>⚠️ Flooded Area</strong>
                  <strong>Sensor:</strong> {f.name}<br />
                  <strong>Location:</strong> {f.location || 'N/A'}<br />
                  <strong>Water Status:</strong> <span style={{ color: mapColor, fontWeight: 700 }}>{f.warning_water_status || 'danger'}</span> ({currentLevel} cm)<br />
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Hazard Points */}
        {hazardPoints.map((h, idx) => {
          if (h.lat === undefined || h.lat === null || h.lng === undefined || h.lng === null) return null;
          return (
            <Marker
              key={`hazard-${idx}`}
              position={[h.lat, h.lng]}
              icon={L.divIcon({
                html: `
                  <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: #f97316; opacity: 0.4; animation: pulse-ring 1.2s infinite;"></div>
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: #f97316; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); z-index: 10;">
                      <span style="color: white; font-size: 11px; font-weight: 900; line-height: 1;">⚠️</span>
                    </div>
                  </div>
                `,
                className: 'leaflet-interactive',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div style={{ padding: '2px 4px', fontSize: '0.82rem' }}>
                  <strong style={{ color: '#f97316', display: 'block', marginBottom: 4 }}>⚠️ Hazard Point</strong>
                  <strong>Title:</strong> {h.title}<br />
                  <strong>Description:</strong> {h.description || 'N/A'}<br />
                  <strong>Report Type:</strong> {getReportTypeLabel(h.report_type)}<br />
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 12, zIndex: 1000 }}>
        {[
          { color: 'var(--cyan-400)', label: "Your location" },
          hasAssigned ? { color: 'var(--orange-400)', label: "Assigned rescuer" } : { color: 'var(--green-400)', label: "Nearby rescuers" },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.75)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-dim)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function UserSOS() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('send');
  const showToast = (title, body) => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { title, body, isNotification: true, showAction: false }
    }));
  };
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: null // 'cancel' or 'safe'
  });
  const [safePhotos, setSafePhotos] = useState([]);
  const [phone, setPhone] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lng: null, address: 'Locating...' });
  const [workshops, setWorkshops] = useState([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isLoadingWorkshops, setIsLoadingWorkshops] = useState(false);

  useEffect(() => {
    if (activeTab === 'mobile_repair') {
      const fetchWorkshops = async () => {
        setIsLoadingWorkshops(true);
        try {
          const lat = coords.lat || 10.8564;
          const lng = coords.lng || 106.6234;
          const res = await apiService.get(`/workshops?lat=${lat}&lng=${lng}`);
          if (res && res.success && res.data) {
            const filtered = res.data.filter(ws => !(ws.isOwner || ws.is_owner || (currentUser && ws.owner_id === currentUser._id)));
            setWorkshops(filtered);
          }
        } catch (err) {
          console.error('Failed to fetch workshops:', err);
        } finally {
          setIsLoadingWorkshops(false);
        }
      };
      fetchWorkshops();
    }
  }, [activeTab, coords.lat, coords.lng, currentUser]);

  const [contacts, setContacts] = useState(initContacts);
  const [sent, setSent] = useState(false);
  const [safe, setSafe] = useState(false);
  const [sosType, setSosType] = useState('flood');
  const [sosDesc, setSosDesc] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', relation: '', phone: '', notify: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);
  const [customLabel, setCustomLabel] = useState('Family');
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);
  const [historyPageInput, setHistoryPageInput] = useState('1');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sortFilter, setSortFilter] = useState('newest');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('');

  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [contactToDelete, setContactToDelete] = useState(null);

  useEffect(() => {
    setHistoryPageInput(historyPage.toString());
  }, [historyPage]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedHistorySearch(historySearch);
      setHistoryPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [historySearch]);

  const fetchHistory = async (page = 1, sort = sortFilter, type = typeFilter, status = statusFilter, search = debouncedHistorySearch) => {
    setIsLoadingHistory(true);
    try {
      const res = await apiService.get(`/rescue/my-history?page=${page}&limit=5&sort=${sort}&type=${type}&status=${status}&search=${encodeURIComponent(search)}`);
      if (res && res.success) {
        setHistory(res.data || []);
        if (res.pagination) {
          setHistoryTotalPages(res.pagination.totalPages);
          setHistoryTotalItems(res.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rescue history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyPage, sortFilter, typeFilter, statusFilter, debouncedHistorySearch);
    }
  }, [activeTab, historyPage, sortFilter, typeFilter, statusFilter, debouncedHistorySearch]);

  useEffect(() => {
    if (activeTab === 'contacts') {
      const fetchContacts = async () => {
        try {
          const res = await apiService.get('/auth/profile/contacts');
          if (res && res.success && res.data) {
            setContacts(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch emergency contacts:', err);
        }
      };
      fetchContacts();
    }
  }, [activeTab]);

  const handleSearchContacts = async (queryArg) => {
    const q = typeof queryArg === 'string' ? queryArg : searchQuery;
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingContacts(true);
    try {
      const res = await apiService.get(`/auth/profile/contacts/search?q=${encodeURIComponent(q.trim())}`);
      if (res && res.success) {
        setSearchResults(res.data || []);
      }
    } catch (err) {
      console.error('Search contacts error:', err);
    } finally {
      setIsSearchingContacts(false);
    }
  };

  useEffect(() => {
    if (!showAddContact) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchContacts(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, showAddContact]);

  const handleConfirmAddContact = async () => {
    if (!selectedSearchUser) return;
    try {
      const res = await apiService.post('/auth/profile/contacts', {
        contact_user_id: selectedSearchUser._id,
        label: customLabel.trim() || 'Family'
      });
      if (res && res.success) {
        setContacts(res.data || []);
        setSelectedSearchUser(null);
        setSearchQuery('');
        setSearchResults([]);
        setShowAddContact(false);
        setCustomLabel('Family');
      } else {
        alert(res.message || 'Cannot add contact');
      }
    } catch (err) {
      console.error('Add contact error:', err);
      alert('Error adding emergency contact list.');
    }
  };

  const handleRemoveApiContact = async (contactId) => {
    try {
      const res = await apiService.delete(`/auth/profile/contacts/${contactId}`);
      if (res && res.success) {
        setContacts(res.data || []);
      }
    } catch (err) {
      console.error('Remove contact error:', err);
    }
  };

  const [eta] = useState("4 minutes");
  const [safeChecked, setSafeChecked] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [customEmergencyType, setCustomEmergencyType] = useState('');
  const [photos, setPhotos] = useState([]);
  const [gpsApproved, setGpsApproved] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [currentRescue, setCurrentRescue] = useState(null);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    // Get user's phone number on mount
    const fetchProfile = async () => {
      try {
        const res = await apiService.get('/auth/profile');
        if (res && res.user) {
          setCurrentUser(res.user);
          if (res.user.phone) {
            setPhone(res.user.phone);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchProfile();

    // Check for active rescue request on mount and on update events
    const checkCurrentRescue = async () => {
      try {
        const res = await apiService.get('/rescue/current');
        if (res && res.success && res.data) {
          setCurrentRescue(res.data);
          setActiveTab('send');
        } else {
          setCurrentRescue(null);
        }
      } catch (err) {
        console.error('Failed to get current rescue session:', err);
      }
    };
    checkCurrentRescue();

    // Geolocation detection
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E · Live location determined`
          });
          setGpsApproved(true);
          setGpsLoading(false);
        },
        (err) => {
          console.warn('Geolocation access failed or denied. Using default coordinates.');
          setCoords(prev => ({
            ...prev,
            address: 'Location permission denied. Please grant location access in your browser settings to send an SOS.'
          }));
          setGpsApproved(false);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setCoords(prev => ({
        ...prev,
        address: 'Geolocation is not supported by your browser.'
      }));
      setGpsApproved(false);
      setGpsLoading(false);
    }
  }, []);

  const handleReloadGps = () => {
    if (navigator.geolocation) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            address: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E · Live location determined`
          });
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setGpsApproved(true);
          setGpsLoading(false);
        },
        (err) => {
          console.warn('Geolocation access failed or denied. Using default coordinates.');
          setCoords(prev => ({
            ...prev,
            address: 'Location permission denied. Please grant location access in your browser settings to send an SOS.'
          }));
          setGpsApproved(false);
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setCoords(prev => ({
        ...prev,
        address: 'Geolocation is not supported by your browser.'
      }));
      setGpsApproved(false);
      setGpsLoading(false);
    }
  };

  // Listen for active rescue status updates via WebSocket events
  useEffect(() => {
    const handleRescueUpdate = async () => {
      try {
        const res = await apiService.get('/rescue/current');
        if (res && res.success) {
          setCurrentRescue(res.data || null);
        }
      } catch (err) {
        console.error('Error updating current rescue from event:', err);
      }
    };
    window.addEventListener('rescue-status-update', handleRescueUpdate);
    window.addEventListener('rescue-update', handleRescueUpdate);
    return () => {
      window.removeEventListener('rescue-status-update', handleRescueUpdate);
      window.removeEventListener('rescue-update', handleRescueUpdate);
    };
  }, []);

  // Poll active rescue details for real-time updates when request is active
  useEffect(() => {
    if (!currentRescue) return;
    const shouldPoll = ['Pending', 'Assigned', 'In_Progress', 'Arrived'].includes(currentRescue.status);
    if (!shouldPoll) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiService.get('/rescue/current');
        if (res && res.success) {
          setCurrentRescue(res.data || null);
        }
      } catch (err) {
        console.error('Error updating moving rescuer coordinates:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentRescue?.status]);

  const prevStatusRef = useRef(null);

  useEffect(() => {
    if (!currentRescue) {
      prevStatusRef.current = null;
      return;
    }

    const prevStatus = prevStatusRef.current;
    const newStatus = currentRescue.status;

    if (prevStatus && prevStatus !== newStatus) {
      if (newStatus === 'Completed' || newStatus === 'Resolved') {
        const isMobileRepair = !!currentRescue.workshop_id;
        if (isMobileRepair) {
          showToast(
            'Sửa xe lưu động hoàn thành',
            'Cơ sở sửa xe đã xác nhận hoàn thành sửa chữa. Vui lòng xác nhận hoàn thành để đóng yêu cầu.'
          );
        } else {
          showToast(
            'Cứu hộ hoàn thành',
            'Cộng tác viên cứu hộ đã xác nhận hoàn thành hỗ trợ. Vui lòng xác nhận an toàn để hoàn tất.'
          );
        }
      }
    }

    prevStatusRef.current = newStatus;
  }, [currentRescue?.status, currentRescue?.workshop_id]);

  // Emergency facilities state (real API)
  const [emergencyFacilities, setEmergencyFacilities] = useState([]);
  const [loadingEmergency, setLoadingEmergency] = useState(false);
  const [emergencyError, setEmergencyError] = useState(null);
  const [emergencyRadius, setEmergencyRadius] = useState(3000);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // Get user GPS when "Emergency information" tab is active
  useEffect(() => {
    if (activeTab !== 'info') return;
    setLoadingEmergency(true);
    setEmergencyError(null);
    const fetchFacilities = (lat, lng) => {
      apiService.get(`/map/emergency-facilities?lat=${lat}&lng=${lng}&radius=${emergencyRadius}`)
        .then(res => {
          if (res.success) setEmergencyFacilities(res.facilities || []);
          else setEmergencyError('Could not load facilities.');
        })
        .catch(() => setEmergencyError('Service unavailable. Try again later.'))
        .finally(() => setLoadingEmergency(false));
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          fetchFacilities(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback to HCM city center
          setUserLat(10.8231); setUserLng(106.6297);
          fetchFacilities(10.8231, 106.6297);
        },
        { timeout: 6000 }
      );
    } else {
      fetchFacilities(10.8231, 106.6297);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, emergencyRadius]);

  const toggleContact = (id) => setContacts(prev => prev.map(c => c.id === id ? { ...c, notify: !c.notify } : c));
  const removeContact = (id) => setContacts(prev => prev.filter(c => c.id !== id));

  const handleSendSOS = async () => {
    if (!phone.trim()) {
      setErrorMsg('Please provide a contact phone number so that the rescue team can reach you.');
      setSuccessMsg('');
      return;
    }
    if (sosType === 'other' && (!customEmergencyType || !customEmergencyType.trim())) {
      setErrorMsg('Please enter details for the other emergency situation.');
      setSuccessMsg('');
      return;
    }

    // Try requesting Geolocation dynamically if not already approved
    let currentCoords = { ...coords };
    if (!gpsApproved) {
      if (!navigator.geolocation) {
        setErrorMsg('Geolocation is not supported by your browser. Cannot send SOS.');
        return;
      }

      setIsSending(true);
      setGpsLoading(true);
      setErrorMsg('Requesting location access permission...');

      const getPositionPromise = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      });

      try {
        const pos = await getPositionPromise();
        currentCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: `${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E · Live location determined`
        };
        setCoords(currentCoords);
        setGpsApproved(true);
        setGpsLoading(false);
        setErrorMsg('');
      } catch (err) {
        setIsSending(false);
        setGpsLoading(false);
        setErrorMsg('Location access is required to dispatch rescue teams. Please grant location access in your browser settings.');
        setSuccessMsg('');
        setGpsApproved(false);
        setCoords(prev => ({
          ...prev,
          address: 'Location permission denied. Please grant location access in your browser settings to send an SOS.'
        }));
        return;
      }
    }

    if (!currentCoords.lat || !currentCoords.lng) {
      setErrorMsg('Location access is required to dispatch rescue teams. Please grant location access in your browser settings.');
      setSuccessMsg('');
      return;
    }

    setIsSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    // Map internal types to schema-friendly strings
    const typeMapping = {
      'flood': 'Trapped_By_Flood',
      'stuck': 'Trapped_By_Flood',
      'medical': 'Medical',
      'other': 'Other'
    };
    const emergency_type = typeMapping[sosType] || 'Trapped_By_Flood';

    try {
      const res = await apiService.post('/rescue', {
        sender_phone: phone,
        emergency_type,
        custom_emergency_type: sosType === 'other' ? customEmergencyType : '',
        initial_lng: currentCoords.lng,
        initial_lat: currentCoords.lat,
        description: sosDesc || '',
        photos: photos // Array of base64 strings
      });

      if (res && res.success) {
        setSent(true);
        setSuccessMsg(res.message || '✓ Emergency SOS signal sent successfully!');
        setSosDesc('');
        setCustomEmergencyType('');
        setPhotos([]);

        try {
          const checkRes = await apiService.get('/rescue/current');
          if (checkRes && checkRes.success && checkRes.data) {
            setCurrentRescue(checkRes.data);
          }
        } catch (fetchErr) {
          console.error('Failed to pre-fetch new rescue status:', fetchErr);
        }

        setTimeout(() => {
          setSent(false);
          setSuccessMsg('');
          setActiveTab('send');
        }, 1500);
      } else {
        setErrorMsg(res.message || 'An error occurred while sending the rescue request.');
      }
    } catch (err) {
      console.error('Failed to submit rescue request:', err);
      setErrorMsg(err.message || 'Unable to connect to server. Please try again later.');
    } finally {
      setIsSending(false);
    }
  };

  const submitCancelSOS = async () => {
    try {
      setIsSending(true);
      const res = await apiService.put(`/rescue/${currentRescue._id}/cancel`);
      if (res && res.success) {
        setCurrentRescue(null);
        showToast('Cancelled successfully', "Rescue request cancelled successfully.");
        try {
          const checkRes = await apiService.get('/rescue/current');
          setCurrentRescue(checkRes?.data || null);
        } catch (e) {
          console.error(e);
        }
      } else {
        showToast('Error', res.message || "Failed to cancel rescue request.");
      }
    } catch (err) {
      console.error("Failed to cancel rescue request:", err);
      showToast('Error', err.message || "Error connecting to server.");
    } finally {
      setIsSending(false);
    }
  };

  const submitSafeCheck = async () => {
    try {
      setIsSending(true);
      const res = await apiService.put(`/rescue/${currentRescue._id}/safe`, {
        safe_photos: safePhotos
      });
      if (res && res.success) {
        setCurrentRescue(null);
        try {
          const checkRes = await apiService.get('/rescue/current');
          setCurrentRescue(checkRes?.data || null);
        } catch (e) {
          console.error(e);
        }
        setSafeChecked(true);
        setSafe(true);
        showToast('Safety confirmed', "Safety confirmed successfully. Your rescue request has been closed.");
        setSafePhotos([]);
        setTimeout(() => {
          setSafeChecked(false);
          setSafe(false);
        }, 1500);
      } else {
        showToast('Error', res.message || "Failed to confirm safety.");
      }
    } catch (err) {
      console.error("Failed to confirm safety:", err);
      showToast('Error', err.message || "Error connecting to server.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRequestMobileRepair = async (services) => {
    if (!phone) {
      showToast('Contact needed', 'Please register your phone number in your profile to request mobile repair.');
      return;
    }
    if (selectedWorkshop && currentUser && (selectedWorkshop.owner_id === currentUser._id || selectedWorkshop.isOwner || selectedWorkshop.is_owner)) {
      showToast('Request Error', 'You cannot request rescue services from your own workshop.');
      return;
    }
    if (!services || services.length === 0) {
      showToast('No service selected', 'Please select at least one service.');
      return;
    }

    setIsSending(true);
    try {
      const res = await apiService.post('/rescue', {
        sender_phone: phone,
        emergency_type: 'Vehicle_Broken',
        initial_lng: coords.lng || 106.6234,
        initial_lat: coords.lat || 10.8564,
        description: `Requested mobile repair: "${services.map(s => s.service_name).join(', ')}"`,
        workshop_id: selectedWorkshop.id || selectedWorkshop._id,
        selected_services: services.map(service => ({
          id: service._id || service.id || String(Date.now()),
          service_name: service.service_name,
          base_price: service.base_price,
          unit: service.unit
        }))
      });
      if (res && res.success) {
        showToast('Request submitted', 'Your mobile repair request has been sent to the workshop.');
        setSelectedWorkshop(null);
        setSelectedServices([]);
        const checkRes = await apiService.get('/rescue/current');
        if (checkRes && checkRes.success && checkRes.data) {
          setCurrentRescue(checkRes.data);
        }
      } else {
        showToast('Request failed', res.message || 'Could not submit request.');
      }
    } catch (err) {
      console.error(err);
      showToast('Error', err.message || 'Error connecting to server.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelSOS = () => {
    if (!currentRescue) return;
    setConfirmModal({
      isOpen: true,
      title: 'Cancel Rescue Request',
      message: 'Are you sure you want to cancel your emergency rescue request?',
      type: 'cancel'
    });
  };

  const handleSafeCheck = () => {
    if (!currentRescue) return;
    const isMobileRepair = !!currentRescue.workshop_id;
    setConfirmModal({
      isOpen: true,
      title: isMobileRepair ? 'Confirm Completion' : 'Confirm Safety',
      message: isMobileRepair
        ? 'Are you sure you want to confirm the completion of this vehicle repair request?'
        : 'Are you sure you want to confirm safety? This will close the rescue request.',
      type: 'safe'
    });
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts(prev => [...prev, { id: `ct${Date.now()}`, ...newContact }]);
    setNewContact({ name: '', relation: '', phone: '', notify: true });
    setShowAddContact(false);
  };

  const mobileWorkshops = workshops;

  const renderRescueTracking = (rescue) => {
    const isMobileRepair = !!rescue.workshop_id;
    const createdTime = new Date(rescue.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const isAssigned = rescue.status === 'Assigned' || rescue.status === 'In_Progress' || rescue.status === 'Arrived' || rescue.status === 'Completed' || rescue.status === 'Resolved';
    const isMoving = rescue.status === 'In_Progress' || rescue.status === 'Arrived' || rescue.status === 'Completed' || rescue.status === 'Resolved';
    const isArrived = rescue.status === 'Arrived' || rescue.status === 'Completed' || rescue.status === 'Resolved';
    const isCompleted = rescue.status === 'Completed' || rescue.status === 'Resolved';

    const steps = isMobileRepair ? [
      {
        time: createdTime,
        label: "Request recorded",
        status: 'done'
      },
      {
        time: isAssigned ? 'Done' : 'Pending',
        label: "Staff assigned",
        status: isAssigned ? 'done' : 'active'
      },
      {
        time: rescue.status === 'In_Progress' ? 'Active' : (isArrived ? 'Done' : '—'),
        label: "Moving to scene",
        status: rescue.status === 'In_Progress' ? 'active' : (isArrived ? 'done' : 'pending')
      },
      {
        time: rescue.status === 'Arrived' ? 'Active' : (isCompleted ? 'Done' : '—'),
        label: "Arrived & repairing",
        status: rescue.status === 'Arrived' ? 'active' : (isCompleted ? 'done' : 'pending')
      },
      {
        time: isCompleted ? 'Done' : '—',
        label: "Confirm task completion",
        status: isCompleted ? 'done' : 'pending'
      }
    ] : [
      {
        time: createdTime,
        label: "Request recorded",
        status: 'done'
      },
      {
        time: isAssigned ? 'Done' : 'Pending',
        label: "Volunteer assigned",
        status: isAssigned ? 'done' : 'active'
      },
      {
        time: rescue.status === 'In_Progress' ? 'Active' : (isArrived ? 'Done' : '—'),
        label: "Moving to scene",
        status: rescue.status === 'In_Progress' ? 'active' : (isArrived ? 'done' : 'pending')
      },
      {
        time: rescue.status === 'Arrived' ? 'Active' : (isCompleted ? 'Done' : '—'),
        label: "Arrived & assisting",
        status: rescue.status === 'Arrived' ? 'active' : (isCompleted ? 'done' : 'pending')
      },
      {
        time: isCompleted ? 'Done' : '—',
        label: "Confirm safety",
        status: isCompleted ? 'done' : 'pending'
      }
    ];

    const containerStyle = isMobile ? {
      display: 'grid',
      gap: 16,
      gridTemplateColumns: '1fr'
    } : {
      display: 'grid',
      gap: 16,
      gridTemplateColumns: '1.4fr 0.6fr'
    };

    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={containerStyle}>
          {/* Left Column: Map */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-2">
                <Navigation size={14} color="var(--orange-400)" />
                <div className="section-title">
                  {isMobileRepair ? 'MISSION TRACKING MAP' : 'MISSION TRACKING MAP'}
                </div>
              </div>
              <div className="live-indicator"><div className="live-dot" /> REALTIME</div>
            </div>
            <div style={{ padding: 16 }}>
              <RescueMap
                eta={eta}
                currentRescue={rescue}
                userLat={rescue ? rescue.initial_lat : coords.lat}
                userLng={rescue ? rescue.initial_lng : coords.lng}
              />
            </div>
          </div>

          {/* Right Column: Mission Progress */}
          <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div className="section-title" style={{ marginBottom: 14 }}>MISSION PROGRESS</div>
            <div style={{ display: 'grid', gap: 14 }}>
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                    background: step.status === 'done' ? 'var(--green-400)' : step.status === 'active' ? 'var(--orange-400)' : 'var(--bg-elevated)',
                    border: step.status === 'pending' ? '2px solid var(--border-dim)' : 'none',
                    boxShadow: step.status === 'active' ? '0 0 10px var(--orange-400)' : 'none',
                    animation: step.status === 'active' ? 'blink 1.5s ease-in-out infinite' : 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: step.status === 'active' ? 700 : 500, color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{step.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {rescue.selected_services && rescue.selected_services.length > 0 && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Selected Services</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {rescue.selected_services.map((srv, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>• {srv.service_name}</span>
                      <span style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>
                        {srv.base_price?.toLocaleString('vi-VN')}₫ / {srv.unit || 'turn'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-dim)', display: 'grid', gap: 10 }}>
              {rescue.workshop_id ? (
                <button className="btn btn-success" onClick={handleSafeCheck} disabled={isSending} style={{ width: '100%' }}>
                  <CheckCircle size={14} /> Completed
                </button>
              ) : (
                <button className="btn btn-success" onClick={handleSafeCheck} disabled={isSending} style={{ width: '100%' }}>
                  <ShieldCheck size={14} /> Confirm safety
                </button>
              )}
              <button className="btn btn-danger" onClick={handleCancelSOS} disabled={isSending} style={{ width: '100%' }}>
                <XCircle size={14} /> Cancel Request
              </button>
            </div>
          </div>
        </div>

        {/* Real-time embedded rescue chat box - Full Width */}
        {(() => {
          if (!rescue) return null;
          const targetUserId = rescue.assigned_volunteer_id?.user_id?._id || rescue.assigned_staff_id?.user_id?._id || rescue.assigned_volunteer_id?._id || rescue.assigned_staff_id?._id;
          const targetUserName = rescue.assigned_volunteer_id?.user_id?.full_name || rescue.assigned_staff_id?.user_id?.full_name || rescue.assigned_volunteer_id?.full_name || rescue.assigned_staff_id?.full_name || (rescue.workshop_id ? 'Workshop Staff' : 'Volunteer Rescuer');
          const targetRole = rescue.workshop_id ? 'Workshop Staff' : 'Volunteer Rescuer';
          const targetPhone = rescue.assigned_volunteer_id?.user_id?.phone || rescue.assigned_staff_id?.user_id?.phone || rescue.assigned_volunteer_id?.phone || rescue.assigned_staff_id?.phone;
          const targetAvatar = rescue.assigned_volunteer_id?.user_id?.avatar_url || rescue.assigned_staff_id?.user_id?.avatar_url || rescue.assigned_volunteer_id?.avatar_url || rescue.assigned_staff_id?.avatar_url;

          if (!targetUserId) {
            return (
              <div className="card p-4 text-center" style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border-dim)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <MessageSquare size={16} /> ⏳ Waiting for rescuer assignment... Once assigned, live chat with your rescuer will appear right here.
                </div>
              </div>
            );
          }

          return (
            <div id="rescue-live-chat" style={{ width: '100%' }}>
              <RescueSessionChat
                targetUser={{
                  id: targetUserId,
                  name: targetUserName,
                  role: targetRole,
                  phone: targetPhone,
                  avatarUrl: targetAvatar
                }}
                missionId={rescue._id}
                title={`Live Chat with ${targetUserName}`}
                isEnded={rescue.status === 'Resolved' || rescue.status === 'Cancelled' || rescue.status === 'resolved' || rescue.status === 'cancelled' || rescue.status === 'completed'}
                isCancelled={rescue.status === 'Cancelled' || rescue.status === 'cancelled'}
              />
            </div>
          );
        })()}
      </div>
    );
  };

  const renderHistoryDetailPanel = () => {
    if (!selectedHistoryItem) return null;
    const isMobileRepair = !!selectedHistoryItem.workshop_id;
    const severity = selectedHistoryItem.emergency_type === 'Medical' ? 'critical' : (selectedHistoryItem.workshop_id ? 'medium' : 'high');
    const emergencyLabel = selectedHistoryItem.workshop_id
      ? 'Vehicle broken/engine stalled due to flood'
      : (selectedHistoryItem.emergency_type === 'Medical'
        ? 'Urgent medical support needed'
        : (selectedHistoryItem.emergency_type === 'Trapped_By_Flood'
          ? 'Trapped in flooded area'
          : selectedHistoryItem.custom_emergency_type || 'Other rescue request'));
    const phoneNum = selectedHistoryItem.sender_phone || 'Not provided';
    const coordsText = `Coords: ${selectedHistoryItem.initial_lat?.toFixed(4)}, ${selectedHistoryItem.initial_lng?.toFixed(4)}`;
    const timeText = new Date(selectedHistoryItem.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateText = new Date(selectedHistoryItem.created_at).toLocaleDateString();

    const volObj = selectedHistoryItem.assigned_volunteer_id || selectedHistoryItem.assigned_staff_id;
    const helperName = volObj?.user_id?.full_name || volObj?.full_name || '';
    const helperPhone = volObj?.user_id?.phone || volObj?.phone || '';

    // Extract scene photos if any
    let photosList = [];
    if (selectedHistoryItem.photos) {
      try {
        photosList = typeof selectedHistoryItem.photos === 'string'
          ? JSON.parse(selectedHistoryItem.photos)
          : selectedHistoryItem.photos;
      } catch (e) {
        console.error(e);
      }
    }

    const totalCost = selectedHistoryItem.selected_services?.reduce((sum, srv) => sum + (srv.base_price || 0), 0) || 0;

    return (
      <div className="card" style={{
        padding: '14px 16px',
        position: 'sticky',
        top: 20,
        height: 480,
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }}>
        {/* Header Bar */}
        <div className="flex items-center justify-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="section-title" style={{ fontSize: '0.98rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              REQUEST DETAILS
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedHistoryItem(null)}
            style={{ padding: '3px 8px', height: 26, fontSize: '0.72rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
            title="Close details panel"
          >
            <XCircle size={14} /> Close
          </button>
        </div>

        {/* Summary Banner */}
        <div style={{
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--cyan-400)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> {emergencyLabel}
            </span>
          </div>
          <div style={{
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
            lineHeight: 1.45,
            fontStyle: 'italic',
            background: 'rgba(0,0,0,0.25)',
            padding: '6px 10px',
            borderRadius: 'var(--r-sm)',
            borderLeft: '3px solid var(--cyan-400)',
            wordBreak: 'break-word'
          }}>
            "{selectedHistoryItem.description || 'No description provided.'}"
          </div>
        </div>

        {/* Compact Details Strip */}
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border-dim)',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '8px 12px',
          fontSize: '0.78rem'
        }}>
          {/* Phone & Copy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Phone size={13} color="var(--green-400)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{phoneNum}</strong>
            </div>
            {phoneNum && phoneNum !== 'Not provided' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(phoneNum);
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = phoneNum;
                      textArea.style.position = "fixed";
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textArea);
                    }
                  } catch (err) {
                    console.error("Failed to copy phone number:", err);
                  }
                  setCopiedPhoneId(selectedHistoryItem._id);
                  setTimeout(() => setCopiedPhoneId(null), 2000);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '1px 6px',
                  height: 22,
                  fontSize: '0.68rem',
                  background: copiedPhoneId === selectedHistoryItem._id ? 'rgba(34,197,94,0.25)' : 'rgba(34,211,238,0.15)',
                  color: copiedPhoneId === selectedHistoryItem._id ? 'var(--green-400)' : 'var(--cyan-400)',
                  borderRadius: 4,
                  border: `1px solid ${copiedPhoneId === selectedHistoryItem._id ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.3)'}`
                }}
                title="Copy phone number"
              >
                {copiedPhoneId === selectedHistoryItem._id ? <CheckCircle size={11} /> : <Copy size={11} />} {copiedPhoneId === selectedHistoryItem._id ? 'Copied' : 'Copy Phone'}
              </button>
            )}
          </div>

          {/* Date & Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="var(--yellow-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>Time:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{timeText} ({dateText})</strong>
          </div>

          {/* Coords */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
            <MapPin size={13} color="var(--red-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Coords:</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coordsText}</span>
          </div>

          {/* Assigned Helper details */}
          {helperName && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
              <ShieldCheck size={13} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--cyan-400)', fontWeight: 600, flexShrink: 0 }}>Assigned:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {helperName} ({helperPhone || 'No phone'})
              </span>
            </div>
          )}

          {/* Total Cost for Repair */}
          {isMobileRepair && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
              <Wrench size={13} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>Total Cost:</span>
              <strong style={{ color: 'var(--cyan-400)' }}>
                {totalCost ? `${totalCost.toLocaleString('vi-VN')}₫` : '0₫'}
              </strong>
            </div>
          )}
        </div>

        {/* Selected services if any */}
        {selectedHistoryItem.selected_services && selectedHistoryItem.selected_services.length > 0 && (
          <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Requested Services
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selectedHistoryItem.selected_services.map((srv, sIdx) => (
                <span key={sIdx} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4 }}>
                  {srv.service_name} {srv.base_price ? `(${srv.base_price.toLocaleString('vi-VN')}₫ / ${srv.unit || 'turn'})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scene Photos Thumbnail Bar */}
        {photosList && photosList.length > 0 && (
          <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Scene Photos ({photosList.length})
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {photosList.map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt={`scene-${idx}`}
                    style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border-dim)', transition: 'transform 0.2s' }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'send', label: "Send SOS", icon: AlertTriangle },
    { id: 'mobile_repair', label: "Mobile Repair Request", icon: Wrench },
    { id: 'contacts', label: "Emergency Contacts", icon: PhoneCall },
    { id: 'history', label: "Emergency Request History", icon: Clock },
  ];

  return (
    <div className="page-enter" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="page-header">
        <h1>SOS & Rescue Center</h1>
        <p>Submit rescue requests, track rescue vehicles in real time, and manage emergency contacts</p>
      </div>

      <div className="tabs-nav" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── GỢI Ý CỨU HỘ / THEO DÕI YÊU CẦU ĐANG HOẠT ĐỘNG ── */}
      {activeTab === 'send' && currentRescue && !currentRescue.workshop_id && renderRescueTracking(currentRescue)}

      {activeTab === 'send' && currentRescue && currentRescue.workshop_id && (
        <div className="card p-6 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
          <AlertTriangle size={36} color="var(--orange-400)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Mobile Repair Request</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 450, lineHeight: 1.6 }}>
            You have an active mobile vehicle repair request in progress. Please complete or cancel it in the <strong>Mobile Repair Request</strong> tab before submitting an emergency rescue request.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('mobile_repair')} style={{ marginTop: 8 }}>
            Go to Mobile Repair Request
          </button>
        </div>
      )}

      {activeTab === 'send' && !currentRescue && (
        <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 16, color: 'var(--red-400)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} /> Submit an emergency rescue request
            </div>

            {/* SOS type */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Incident type</div>
              <div className="grid grid-2" style={{ gap: 8 }}>
                {SOS_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSosType(t.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${sosType === t.id ? 'var(--red-400)' : 'var(--border-dim)'}`,
                        background: sosType === t.id ? 'rgba(239,68,68,0.08)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <Icon size={14} color={sosType === t.id ? 'var(--red-400)' : 'var(--text-muted)'} />
                      <span style={{ fontSize: '0.78rem', color: sosType === t.id ? 'var(--red-400)' : 'var(--text-secondary)', fontWeight: 600 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              {sosType === 'other' && (
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  placeholder="Detail your emergency situation..."
                  value={customEmergencyType}
                  onChange={e => setCustomEmergencyType(e.target.value)}
                />
              )}
            </div>

            {/* Map location coordinate bar */}
            <div style={{
              background: gpsApproved ? 'rgba(34,197,94,0.06)' : gpsLoading ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${gpsApproved ? 'rgba(34,197,94,0.2)' : gpsLoading ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 'var(--r-md)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                {gpsLoading ? (
                  <Loader size={16} color="var(--blue-400)" style={{ animation: 'spin 1.5s infinite linear', flexShrink: 0 }} />
                ) : (
                  <Crosshair size={16} color={gpsApproved ? 'var(--green-400)' : 'var(--red-400)'} style={{ flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: gpsApproved ? 'var(--green-400)' : gpsLoading ? 'var(--blue-400)' : 'var(--red-400)' }}>
                    {gpsLoading ? 'GPS LOCATING...' : gpsApproved ? 'GPS location determined' : 'NO GPS LOCATION'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{coords.address}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleReloadGps}
                  disabled={gpsLoading}
                  title="Reload GPS Location"
                  style={{
                    padding: '4px 10px',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--cyan-400)',
                    borderColor: 'rgba(6,182,212,0.3)',
                    background: 'rgba(6,182,212,0.08)',
                    borderRadius: 6,
                    cursor: gpsLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={13} style={{ animation: gpsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{gpsLoading ? 'Locating...' : 'Reload GPS'}</span>
                </button>
                <span className={`badge ${gpsApproved ? 'badge-green' : gpsLoading ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: '0.62rem', letterSpacing: '0.04em' }}>
                  {gpsLoading ? 'LOADING' : gpsApproved ? 'GPS ✓' : 'NO GPS ✕'}
                </span>
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Emergency Contact Phone Number *</label>
              <input
                className="input"
                placeholder="Enter telephone number..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Emergency Situation Description (Optional)</label>
              <textarea
                className="input"
                style={{ minHeight: 80, resize: 'vertical' }}
                placeholder="Describe your situation (e.g., water flooded to knees, vehicle broken down, accompanied by elderly or children...)..."
                value={sosDesc}
                onChange={e => setSosDesc(e.target.value)}
              />
            </div>

            {/* Photo Scene Attachment */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>Incident Scene Photos (Optional)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {photos.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 70, height: 70, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                    <img src={p} alt="Scene" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={10} color="white" />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <label style={{
                    width: 70, height: 70, borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-dim)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)', transition: 'all 0.15s'
                  }}>
                    <Camera size={18} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: 4 }}>Add photo</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>

            <button
              className="btn btn-danger"
              onClick={handleSendSOS}
              disabled={isSending}
              style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, padding: '14px', letterSpacing: '0.06em', opacity: isSending ? 0.7 : 1 }}
            >
              <Radio size={18} /> {isSending ? 'SENDING SOS SIGNAL...' : 'SEND AN EMERGENCY SOS SIGNAL'}
            </button>
          </div>

          <div className="card p-5" style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <div className="section-title">Emergency instructions</div>
            {[
              { step: '1', text: "Choose the issue type that's appropriate for your situation" },
              { step: '2', text: "The system automatically retrieves the device's GPS location" },
              { step: '3', text: "Briefly describe the situation for faster rescue" },
              { step: '4', text: "Click SEND SOS — volunteers will be dispatched immediately" },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid var(--red-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.68rem', fontWeight: 800, color: 'var(--red-400)' }}>{s.step}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
            <div className="alert-banner warning" style={{ marginTop: 4 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem' }}>Rescue information will be publicly displayed on the map so other users and volunteers can assist.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE REPAIR REQUEST ── */}
      {activeTab === 'mobile_repair' && currentRescue && currentRescue.workshop_id && renderRescueTracking(currentRescue)}

      {activeTab === 'mobile_repair' && currentRescue && !currentRescue.workshop_id && (
        <div className="card p-6 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
          <AlertTriangle size={36} color="var(--orange-400)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Emergency Rescue Request</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 450, lineHeight: 1.6 }}>
            You have an active emergency SOS/rescue request in progress. Please complete or cancel it in the <strong>Send SOS</strong> tab before requesting mobile repair services.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('send')} style={{ marginTop: 8 }}>
            Go to Send SOS
          </button>
        </div>
      )}

      {activeTab === 'mobile_repair' && !currentRescue && (
        <div style={{ display: 'grid', gap: 16 }}>
          {selectedWorkshop ? (
            /* WORKSHOP DETAIL VIEW */
            <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-dim)', paddingBottom: 12 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedWorkshop(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <div style={{ flex: 1 }} />
                <span className="badge badge-green">Open</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedWorkshop.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star size={13} fill="var(--orange-400)" color="var(--orange-400)" />
                    {selectedWorkshop.rating_average ? selectedWorkshop.rating_average.toFixed(1) : '0.0'} ({selectedWorkshop.rating_count || 0} reviews)
                  </span>
                  <span>·</span>
                  <span>{selectedWorkshop.distanceToUser.toFixed(1)} km away</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{selectedWorkshop.address}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Phone size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Hotline: {selectedWorkshop.phone}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 16 }}>
                <div className="section-title" style={{ marginBottom: 12 }}>Available Services</div>
                {selectedWorkshop.services && selectedWorkshop.services.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedWorkshop.services.filter(s => s.active !== false).map((s, idx) => {
                      const isSelected = selectedServices.some(item => (item._id || item.id) === (s._id || s.id));
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedServices(prev => prev.filter(item => (item._id || item.id) !== (s._id || s.id)));
                            } else {
                              setSelectedServices(prev => [...prev, s]);
                            }
                          }}
                          style={{
                            padding: 12,
                            borderRadius: 6,
                            border: isSelected ? '1px solid var(--cyan-400)' : '1px solid var(--border-dim)',
                            background: isSelected ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.01)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              style={{ width: 15, height: 15, accentColor: 'var(--cyan-400)', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.service_name}</div>
                              {s.desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.desc}</div>}
                              <span style={{ display: 'inline-block', fontSize: '0.62rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 3, marginTop: 6 }}>{s.category || 'Repair'}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--cyan-400)' }}>
                              {s.base_price ? s.base_price.toLocaleString('vi-VN') : '0'}₫
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / {s.unit || 'turn'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No services configured by this workshop.
                  </div>
                )}
              </div>

              {selectedServices.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 16, marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected ({selectedServices.length} services):</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--cyan-400)' }}>
                      {selectedServices.reduce((sum, srv) => sum + (srv.base_price || 0), 0).toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
                    onClick={() => handleRequestMobileRepair(selectedServices)}
                    disabled={isSending}
                  >
                    <Wrench size={16} /> REQUEST SELECTED SERVICES NOW
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-dim)', paddingTop: 16 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', display: 'flex', alignItems: 'center', gap: 8 }}
                  onClick={() => {
                    localStorage.setItem('pending_chat_user', JSON.stringify({
                      id: selectedWorkshop.owner_id?._id || selectedWorkshop.owner_id || selectedWorkshop._id,
                      name: selectedWorkshop.name,
                      role: 'Workshop'
                    }));
                    navigate('/notifications');
                  }}
                >
                  <MessageSquare size={16} /> CHAT WITH WORKSHOP
                </button>
              </div>
            </div>
          ) : (
            /* LIST WORKSHOPS VIEW */
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="card p-4" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(6,182,212,0.05)' }}>
                <MapPin size={16} color="var(--cyan-400)" />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Showing mobile repair workshops within coverage radius near your live location.
                </div>
              </div>

              {gpsLoading && coords.lat === null ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <span>Determining your live location...</span>
                </div>
              ) : isLoadingWorkshops ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <span>Searching for active mobile workshops nearby...</span>
                </div>
              ) : mobileWorkshops.length > 0 ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {mobileWorkshops.map(ws => (
                    <div
                      key={ws._id}
                      className="card p-4 hover-highlight"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onClick={() => setSelectedWorkshop(ws)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{ws.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Star size={12} fill="var(--orange-400)" color="var(--orange-400)" />
                              {ws.rating_average ? ws.rating_average.toFixed(1) : '0.0'} ({ws.rating_count || 0})
                            </span>
                            <span>·</span>
                            <span>{ws.distanceToUser.toFixed(1)} km away</span>
                            <span>·</span>
                            <span>Radius: {ws.coverage_radius || 5} km</span>
                          </div>
                        </div>
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Open</span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {ws.address}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dim)', paddingTop: 10, fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {ws.services ? ws.services.filter(s => s.active !== false).length : 0} services available
                        </span>
                        <span style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>View details & select &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Wrench size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 4 }}>No mobile workshops found</div>
                  <div style={{ fontSize: '0.75rem' }}>
                    There are no open mobile workshops within coverage radius near your location right now.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EMERGENCY CONTACTS ── */}
      {activeTab === 'contacts' && (
        <div style={{ maxWidth: 720 }}>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="section-title" style={{ fontSize: '0.95rem', fontWeight: 700 }}>Emergency Contacts List</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Search and add trustworthy family/friends to receive instant automatic notifications whenever an SOS is triggered.
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowAddContact(p => !p); setSelectedSearchUser(null); setSearchQuery(''); setSearchResults([]); }}>
                <Plus size={13} /> {showAddContact ? 'Close search' : 'Add contact'}
              </button>
            </div>

            {showAddContact && (
              <div style={{ padding: '16px 18px', background: 'rgba(6,182,212,0.04)', borderBottom: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!selectedSearchUser ? (
                  <>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Enter name, email, or both (e.g., Alex, alex@gmail.com)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchContacts(); }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleSearchContacts} disabled={isSearchingContacts || !searchQuery.trim()}>
                        {isSearchingContacts ? <Loader size={14} className="animate-spin" /> : 'Search'}
                      </button>
                    </div>

                    {isSearchingContacts && (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        <Loader size={16} className="animate-spin inline mr-2" /> Searching...
                      </div>
                    )}

                    {!isSearchingContacts && searchResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Search results ({searchResults.length}):</div>
                        {searchResults.map(u => (
                          <div key={u._id} style={{ padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--cyan-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.8rem' }}>
                                {u.full_name?.substring(0, 2).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{u.full_name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.email} {u.phone && `· ${u.phone}`}</div>
                              </div>
                            </div>
                            <button className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => { setSelectedSearchUser(u); setCustomLabel('Family'); }}>
                              <Plus size={12} /> Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isSearchingContacts && searchQuery.trim() && searchResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No matching users found (or user is already in contacts list / is Admin / Manager).
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Add contact: {selectedSearchUser.full_name}</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} onClick={() => setSelectedSearchUser(null)}><X size={13} /></button>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Email: <b>{selectedSearchUser.email}</b> {selectedSearchUser.phone && `· Phone: ${selectedSearchUser.phone}`}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        Set a custom label (e.g., Family, Mother, Father, Best Friend...):
                      </label>
                      <input
                        className="input"
                        placeholder="Enter relationship label (default: Family)"
                        value={customLabel}
                        onChange={e => setCustomLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleConfirmAddContact(); }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSearchUser(null)}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={handleConfirmAddContact}><Save size={13} /> Save contact</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-card-hover)', borderRadius: 'var(--r-md)' }}>
                  No emergency contacts yet. Click <b>Add contact</b> to search for family/friends and add them to your list.
                </div>
              ) : (
                contacts.map(c => (
                  <div key={c._id || c.id || c.user_id} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PhoneCall size={16} color="var(--red-400)" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.full_name || c.name}</span>
                          <span className="badge badge-red" style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '12px' }}>{c.label || c.relation || 'Family'}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          {c.email} {c.phone && `· Phone: ${c.phone}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }} title="Remove from list" onClick={() => {
                        setContactToDelete(c._id || c.id || c.user_id);
                        setConfirmModal({
                          isOpen: true,
                          title: 'Remove Contact',
                          message: 'Are you sure you want to remove this contact from your emergency contact list?',
                          type: 'delete_contact'
                        });
                      }}>
                        <Trash2 size={14} color="var(--red-400)" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="alert-banner info">
            <Bell size={14} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Contacts in your emergency list will immediately receive automatic real-time alerts via bottom-right toast popups, bell notifications, and SMS/Email whenever you trigger an SOS signal, confirm your safety, or cancel an SOS.
            </span>
          </div>
        </div>
      )}

      {/* ── EMERGENCY REQUEST HISTORY ── */}
      {activeTab === 'history' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: (!isMobile && selectedHistoryItem) ? '1fr 1fr' : '1fr',
          gap: 20,
          alignItems: 'start',
          width: '100%'
        }}>
          <div style={{ minWidth: 0 }}>
            {isMobile && selectedHistoryItem ? (
              renderHistoryDetailPanel()
            ) : (
              <div className="card" style={{ overflow: 'hidden', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div className="section-title" style={{ margin: 0 }}>Request History</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Search volunteer/staff, situation..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      style={{
                        background: '#121d28',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 6,
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        padding: '4px 10px',
                        outline: 'none',
                        width: '180px'
                      }}
                    />

                    <select
                      value={typeFilter}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setHistoryPage(1);
                      }}
                      style={{
                        background: '#121d28',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 6,
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        padding: '4px 8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="rescue">Rescue SOS</option>
                      <option value="repair">Mobile Repair</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setHistoryPage(1);
                      }}
                      style={{
                        background: '#121d28',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 6,
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        padding: '4px 8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      value={sortFilter}
                      onChange={(e) => {
                        setSortFilter(e.target.value);
                        setHistoryPage(1);
                      }}
                      style={{
                        background: '#121d28',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 6,
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        padding: '4px 8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </div>
                </div>

                {isLoadingHistory ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Loader size={24} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <span>Loading request history...</span>
                  </div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', border: '1px dashed var(--border-dim)', borderRadius: 'var(--r-md)' }}>
                    No requests found in your history.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {history.map(item => {
                      const isMobileRepair = !!item.workshop_id;
                      const isSelected = selectedHistoryItem?._id === item._id;
                      return (
                        <div
                          key={item._id}
                          className="card"
                          style={{
                            padding: '14px 18px',
                            borderLeft: item.emergency_type === 'Medical' ? severityBg.critical : (item.workshop_id ? severityBg.medium : severityBg.high),
                            background: isSelected ? 'rgba(61,125,176,0.1)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onClick={() => setSelectedHistoryItem(item)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div style={{ flex: 1 }}>
                              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
                                {statusBadge[item.status] || <span className="badge badge-ghost">{item.status}</span>}
                                {isMobileRepair && (
                                  <>
                                    <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>
                                      MOBILE REPAIR
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--cyan-400)', marginLeft: 8 }}>
                                      {item.selected_services?.reduce((sum, s) => sum + (s.base_price || 0), 0).toLocaleString('vi-VN')}₫
                                    </span>
                                  </>
                                )}
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                  <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                                  {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>

                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                                <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--text-muted)' }} />
                                {item.workshop_id ? (
                                  <span>Repair request: {item.workshop_id?.name || 'Workshop'}</span>
                                ) : (
                                  <span>SOS: {item.emergency_type === 'Medical' ? 'Medical emergency' : item.emergency_type === 'Trapped_By_Flood' ? 'Trapped by flood' : item.custom_emergency_type || 'Rescue Request'}</span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {item.description || 'No description provided.'}
                              </div>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" style={{ alignSelf: 'center', flexShrink: 0 }} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {historyTotalItems > 0 && (
                      <div className="flex items-center justify-between" style={{ marginTop: 16, padding: '8px 4px', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          Showing <strong style={{ color: 'var(--text-primary)' }}>{historyTotalItems === 0 ? 0 : (historyPage - 1) * 5 + 1}-{Math.min(historyPage * 5, historyTotalItems)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{historyTotalItems}</strong> requests
                        </span>
                        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                            style={{ opacity: historyPage === 1 ? 0.5 : 1 }}
                          >
                            Previous
                          </button>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            Page
                            <input
                              type="number"
                              min="1"
                              max={historyTotalPages}
                              value={historyPageInput}
                              onChange={(e) => {
                                const valStr = e.target.value;
                                setHistoryPageInput(valStr);
                                const val = parseInt(valStr);
                                if (!isNaN(val) && val >= 1 && val <= historyTotalPages) {
                                  setHistoryPage(val);
                                }
                              }}
                              onBlur={() => {
                                setHistoryPageInput(historyPage.toString());
                              }}
                              style={{
                                width: 50,
                                textAlign: 'center',
                                background: 'rgba(0,0,0,0.5)',
                                border: '1px solid var(--border-dim)',
                                borderRadius: 4,
                                color: 'var(--cyan-400)',
                                fontWeight: 700,
                                padding: '2px 0',
                                fontSize: '0.78rem'
                              }}
                            />
                            of {historyTotalPages}
                          </span>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                            disabled={historyPage === historyTotalPages}
                            style={{ opacity: historyPage === historyTotalPages ? 0.5 : 1 }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {!isMobile && selectedHistoryItem && renderHistoryDetailPanel()}
        </div>
      )}

      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6,10,18,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 24
        }}>
          <div className="card p-6" style={{
            width: '100%',
            maxWidth: 400,
            background: 'rgba(18,29,40,0.95)',
            border: '1px solid var(--border-default, rgba(120,150,175,0.3))',
            boxShadow: 'var(--shadow-xl), 0 0 30px rgba(239,68,68,0.1)',
            borderRadius: 'var(--r-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={20} color="var(--red-400)" />
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {confirmModal.title}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {confirmModal.message}
            </div>
            {confirmModal.type === 'safe' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Attach Safety Verification Photos (Optional)
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {safePhotos.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border-dim)' }}>
                      <img src={p} alt="Safety status" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        onClick={() => setSafePhotos(prev => prev.filter((_, i) => i !== idx))}
                        style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <X size={8} color="white" />
                      </button>
                    </div>
                  ))}
                  {safePhotos.length < 3 && (
                    <label style={{
                      width: 60, height: 60, borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-dim)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.02)', transition: 'all 0.15s'
                    }}>
                      <Camera size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', marginTop: 2 }}>Add photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSafePhotos(prev => {
                                if (prev.length >= 3) return prev;
                                return [...prev, reader.result];
                              });
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  setSafePhotos([]);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  if (confirmModal.type === 'cancel') {
                    await submitCancelSOS();
                  } else if (confirmModal.type === 'safe') {
                    await submitSafeCheck();
                  } else if (confirmModal.type === 'delete_contact' && contactToDelete) {
                    await handleRemoveApiContact(contactToDelete);
                    setContactToDelete(null);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
