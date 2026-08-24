import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Wrench, MapPin, Clock, CheckCircle, Phone,
  Filter, ChevronRight, XCircle, Navigation, User,
  AlertTriangle, Send, MessageSquare, Loader, Maximize, Minimize, Crosshair, Search
} from 'lucide-react';
import { MapContainer, Marker, Polyline, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GoongMaplibreLayer from '../../components/common/GoongMaplibreLayer';
import { apiService } from '../../services/apiService';
import { useNavigate } from 'react-router-dom';
import RescueSessionChat from '../../components/common/RescueSessionChat';
import ConfirmModal from '../../components/common/ConfirmModal';

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

function WorkshopMissionMap({ activeTask, isFullscreen, setIsFullscreen }) {
  const [volPosition, setVolPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [autoCenter, setAutoCenter] = useState(true);
  const mapRef = useRef(null);

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

  useEffect(() => {
    if (!navigator.geolocation) return;

    const getCoordsDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // metres
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setVolPosition((prev) => {
          if (!prev) {
            apiService.put('/workshops/me/staff/location', { lat: newLat, lng: newLng })
              .catch(err => console.warn('Failed to sync staff initial location:', err));
            return [newLat, newLng];
          }
          const dist = getCoordsDistance(prev[0], prev[1], newLat, newLng);
          if (dist > 5) {
            apiService.put('/workshops/me/staff/location', { lat: newLat, lng: newLng })
              .catch(err => console.warn('Failed to sync staff location update:', err));
            return [newLat, newLng];
          }
          return prev;
        });
      },
      (err) => console.warn('Failed to watch staff position:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const customerPosition = useMemo(() => {
    if (!activeTask || activeTask.lat == null || activeTask.lng == null) return null;
    return [activeTask.lat, activeTask.lng];
  }, [activeTask?.lat, activeTask?.lng]);

  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

  // Fetch Goong route between staff and customer
  useEffect(() => {
    if (!customerPosition || !volPosition) {
      setRouteAlternatives([]);
      setRoutePath([]);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const start = `${volPosition[0]},${volPosition[1]}`;
        const end = `${customerPosition[0]},${customerPosition[1]}`;
        const res = await apiService.get(`/map/route?start=${start}&end=${end}`);
        if (res && res.success && res.data && res.data.length > 0) {
          setRouteAlternatives(res.data);
          setSelectedRouteIdx(0);

          const bestRoute = res.data[0];
          const coordinates = bestRoute.geometry.coordinates.map(c => [c[1], c[0]]);
          setRoutePath(coordinates);
          setRouteDistance(bestRoute.distance);
          setRouteDuration(bestRoute.duration);
        } else {
          setRouteAlternatives([]);
          setRoutePath([]);
          setRouteDistance(null);
          setRouteDuration(null);
        }
      } catch (err) {
        console.error('Failed to fetch Goong route path:', err);
        setRouteAlternatives([]);
        setRoutePath([]);
        setRouteDistance(null);
        setRouteDuration(null);
      }
    };

    fetchRoute();
  }, [volPosition?.[0], volPosition?.[1], customerPosition?.[0], customerPosition?.[1]]);

  // Sync details when selecting an alternative route
  useEffect(() => {
    if (routeAlternatives.length > 0 && routeAlternatives[selectedRouteIdx]) {
      const selectedRoute = routeAlternatives[selectedRouteIdx];
      const coordinates = selectedRoute.geometry.coordinates.map(c => [c[1], c[0]]);
      setRoutePath(coordinates);
      setRouteDistance(selectedRoute.distance);
      setRouteDuration(selectedRoute.duration);
    }
  }, [selectedRouteIdx, routeAlternatives]);

  const volunteerIcon = useMemo(() => L.divIcon({
    className: 'custom-motorcycle-icon',
    html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: var(--green-400); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px var(--green-400);"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/><path d="M15 8h1a2 2 0 0 1 2 2v2"/><path d="M10.5 17.5 9 12H3"/><path d="m14 17.5-1.5-6H9"/><path d="M12 9h3.5l2 3.5"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  }), []);

  const victimIcon = useMemo(() => L.divIcon({
    className: 'custom-victim-icon',
    html: `<div style="position: relative;"><div style="position: absolute; inset: -12px; border-radius: 50%; background: var(--red-400); opacity: 0.25; animation: pulse-ring 1.8s infinite ease-out;"></div><div style="width: 24px; height: 24px; border-radius: 50%; background: var(--red-500); border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px var(--red-500);"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }), []);

  function MapController({ center, customerPosition, isFullscreen, autoCenter, setAutoCenter }) {
    const map = useMap();

    useMapEvents({
      dragstart: () => setAutoCenter(false),
      zoomstart: () => setAutoCenter(false)
    });

    useEffect(() => {
      if (!autoCenter) return;
      if (!center || isNaN(center[0]) || isNaN(center[1])) {
        if (customerPosition && !isNaN(customerPosition[0]) && !isNaN(customerPosition[1])) {
          map.setView(customerPosition, 14);
        }
        return;
      }
      map.invalidateSize();
      const timer = setTimeout(() => {
        map.invalidateSize();
        if (customerPosition && !isNaN(customerPosition[0]) && !isNaN(customerPosition[1])) {
          const isTooClose = Math.abs(center[0] - customerPosition[0]) < 0.0003 && Math.abs(center[1] - customerPosition[1]) < 0.0003;
          if (!isTooClose) {
            map.fitBounds([center, customerPosition], { padding: [50, 50] });
          } else {
            map.setView(center, 17);
          }
        } else {
          map.setView(center, 14);
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [center, customerPosition, map, isFullscreen, autoCenter]);
    return null;
  }

  const toggleFullscreen = () => {
    if (!mapRef.current) return;
    if (!document.fullscreenElement) {
      mapRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setIsFullscreen]);

  return (
    <div ref={mapRef} style={{
      position: 'relative',
      width: '100%',
      height: isFullscreen ? '100%' : 380,
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
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

          {/* Alternatives selector */}
          {routeAlternatives.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 2, borderTop: '1px solid var(--border-dim)', paddingTop: 4, width: '100%', justifyContent: 'center' }}>
              {routeAlternatives.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedRouteIdx(i)}
                  style={{
                    fontSize: '0.58rem',
                    padding: '2px 6px',
                    borderRadius: 3,
                    border: selectedRouteIdx === i ? '1px solid var(--cyan-400)' : '1px solid transparent',
                    background: selectedRouteIdx === i ? 'rgba(6,182,212,0.15)' : 'transparent',
                    color: selectedRouteIdx === i ? 'var(--cyan-400)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}
                >
                  Route {i + 1} {r.is_flooded ? '⚠️' : '✅'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(() => {
        const mapCenter = [
          volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) ? volPosition[0] : (customerPosition && !isNaN(customerPosition[0]) && !isNaN(customerPosition[1]) ? customerPosition[0] : 10.0357),
          volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) ? volPosition[1] : (customerPosition && !isNaN(customerPosition[0]) && !isNaN(customerPosition[1]) ? customerPosition[1] : 105.7818)
        ];
        return (
          <MapContainer
            center={mapCenter}
            zoom={14}
            zoomControl={false}
            style={{ width: '100%', height: '100%', zIndex: 1, background: '#080d16' }}
          >
            <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />
            <MapController
              center={volPosition}
              customerPosition={customerPosition}
              isFullscreen={isFullscreen}
              autoCenter={autoCenter}
              setAutoCenter={setAutoCenter}
            />

            {volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) && (
              <Marker position={volPosition} icon={volunteerIcon} />
            )}

            {customerPosition && (
              <>
                {routeAlternatives.length > 0 ? (
                  routeAlternatives.map((route, idx) => {
                    const isSelected = selectedRouteIdx === idx;
                    const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
                    return (
                      <Polyline
                        key={`alt-route-${idx}`}
                        positions={coordinates}
                        color={isSelected ? "var(--cyan-400)" : "#4b5563"}
                        weight={isSelected ? 5 : 3}
                        opacity={isSelected ? 0.9 : 0.4}
                        eventHandlers={{
                          click: () => setSelectedRouteIdx(idx)
                        }}
                      />
                    );
                  })
                ) : (
                  volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) && (
                    <Polyline
                      positions={[volPosition, customerPosition]}
                      color="var(--cyan-400)"
                      weight={3}
                      dashArray="6, 6"
                      opacity={0.8}
                    />
                  )
                )}
                <Marker position={customerPosition} icon={victimIcon} />
              </>
            )}

            {/* Flooded Sensors */}
            {(routeAlternatives.length > 0 && routeAlternatives[selectedRouteIdx]
              ? routeAlternatives[selectedRouteIdx].floods || []
              : floodedSensors
            ).map((f, idx) => {
              if (f.lat === undefined || f.lat === null || f.lng === undefined || f.lng === null) return null;

              const currentLevel = f.waterLevel || f.current_water_level || 0;
              const hasWater = currentLevel > 5;
              const levelText = `${Math.round(currentLevel * 10) / 10} cm`;

              let mapColor = '#22c55e';
              if (f.warning_water_status === 'danger' || currentLevel > 50) {
                mapColor = '#ef4444';
              } else if (f.warning_water_status === 'warning' || currentLevel > 15) {
                mapColor = '#f97316';
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
            {(routeAlternatives.length > 0 && routeAlternatives[selectedRouteIdx]
              ? routeAlternatives[selectedRouteIdx].hazards || []
              : hazardPoints
            ).map((h, idx) => {
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
        );
      })()}

      <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 12, zIndex: 1000 }}>
        {[
          { color: 'var(--green-400)', label: "Your location" },
          customerPosition ? { color: 'var(--red-400)', label: "Customer" } : null
        ].filter(Boolean).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.75)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-dim)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const statusBadge = {
  pending: <span className="badge badge-orange" style={{ fontSize: '0.62rem' }}>Waiting for assignment</span>,
  assigned: <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Assigned</span>,
  in_progress: <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Processing</span>,
  arrived: <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>Arrived & repairing</span>,
  completed: <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>Complete</span>,
  cancelled: <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Cancelled</span>,
};

export default function WorkshopTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [mechanics, setMechanics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [assignModal, setAssignModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [stats, setStats] = useState({ pending: 0, assigned: 0, in_progress: 0, completed: 0 });
  const [pageInput, setPageInput] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 5;

  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const activeTask = tasks.find(t => t.assignedStaffUserId === currentUserId && (t.status === 'assigned' || t.status === 'in_progress' || t.status === 'arrived'));

  const fetchProfile = async () => {
    try {
      const res = await apiService.get('/auth/profile');
      if (res && res.user) {
        setCurrentUserId(res.user._id);
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    }
  };

  const fetchTasks = async (pageNumber = page, statusFilter = filter, search = searchQuery) => {
    setIsLoading(true);
    try {
      const res = await apiService.get(`/rescue/workshop?page=${pageNumber}&limit=${limit}&status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res && res.success && res.data) {
        setTasks(res.data);
        if (selected) {
          const freshSelected = res.data.find(t => t.id === selected.id);
          if (freshSelected) {
            setSelected(freshSelected);
          }
        }

        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotalTasks(res.pagination.total);
        } else {
          setTotalPages(1);
          setTotalTasks(res.data.length);
        }

        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load workshop tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await apiService.get('/workshops/me/staff');
      if (res && res.staff) {
        setIsOwner(res.isOwner || false);
        setMechanics(res.staff.filter(s => s.status !== 'Suspended'));
      }
    } catch (err) {
      console.error('Failed to load mechanics:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchMechanics();
  }, []);

  useEffect(() => {
    fetchTasks(page, filter, searchQuery);
  }, [page, filter, searchQuery]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchTasks(page, filter, searchQuery);
    };
    window.addEventListener('rescue-update', handleUpdate);
    return () => window.removeEventListener('rescue-update', handleUpdate);
  }, [page, filter, searchQuery]);

  const filtered = tasks;

  const updateStaffLiveLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await apiService.put('/workshops/me/staff/location', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }).catch(err => console.warn('Failed to sync initial staff location:', err));
      }, (err) => console.warn(err), { enableHighAccuracy: true });
    }
  };

  const assign = async (taskId, mechanicUserId) => {
    try {
      const res = await apiService.put(`/rescue/${taskId}/assign-staff`, {
        staff_user_id: mechanicUserId
      });
      if (res && res.success) {
        if (mechanicUserId === currentUserId) {
          updateStaffLiveLocation();
        }
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to assign staff:', err);
    }
    setAssignModal(null);
  };

  const startTask = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/start`);
      if (res && res.success) {
        updateStaffLiveLocation();
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  const arriveTask = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/arrive`);
      if (res && res.success) {
        updateStaffLiveLocation();
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to mark task as arrived:', err);
    }
  };

  const completeTask = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/complete`);
      if (res && res.success) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const confirmPayment = (id) => {
    setPaymentToConfirm(id);
  };

  const executeConfirmPayment = async (id) => {
    try {
      setIsSaving(true);
      const res = await apiService.put(`/rescue/${id}/confirm-payment`);
      if (res && res.success) {
        await fetchTasks();
        setSelected(prev => prev && prev.id === id ? { ...prev, isPaid: true } : prev);
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const counts = {
    pending: stats.pending,
    assigned: stats.assigned,
    in_progress: stats.in_progress,
    completed: stats.completed
  };

  const renderDetailPanel = () => {
    if (!selected) return null;
    return (
      <div className="card p-6" style={{ position: isMobile ? 'static' : 'sticky', top: 20 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="section-title">Single detail</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}><XCircle size={14} /></button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(217,119,6,0.06)', borderRadius: 'var(--r-md)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{selected.note}"</div>
          </div>
          {[
            {
              icon: Wrench,
              label: "Service",
              value: (selected.selected_services && selected.selected_services.length > 0) ? (
                <div style={{ display: 'grid', gap: 4, marginTop: 2 }}>
                  {selected.selected_services.map((srv, i) => (
                    <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      {srv.service_name}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {' '}({srv.base_price?.toLocaleString('vi-VN')}₫ / {srv.unit || 'turn'})
                      </span>
                    </div>
                  ))}
                </div>
              ) : selected.service
            },
            {
              icon: Wrench,
              label: "Total Price",
              value: (
                <span>
                  {selected.total_price ? `${selected.total_price.toLocaleString('vi-VN')}₫` : '0₫'}
                  <span className={`badge ${selected.isPaid ? 'badge-green' : 'badge-orange'}`} style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                    {selected.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </span>
              )
            },
            { icon: User, label: "Customer", value: selected.customer },
            { icon: Phone, label: "Phone number", value: selected.phone },
            { icon: MapPin, label: "Location", value: selected.location },
            (selected.status !== 'completed' && selected.status !== 'cancelled') ? { icon: Navigation, label: "Distance", value: `${selected.distance} (ETA: ${selected.eta})` } : null,
            { icon: Clock, label: "Set time", value: selected.time },
          ].filter(Boolean).map(row => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-start gap-3">
                <Icon size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 1 }}>{row.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</div>
                </div>
              </div>
            );
          })}
          {selected.mechanic && (
            <div className="alert-banner" style={{ margin: 0, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle size={14} color="var(--green-400)" />
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Assignment: <strong>{selected.mechanic}</strong></div>
            </div>
          )}

          {/* Actions */}
          <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-dim)', display: 'grid', gap: 8 }}>
            {selected.status === 'pending' && (
              isOwner ? (
                <button className="btn btn-sm" style={{ background: 'rgba(217,119,6,0.15)', color: '#f59e0b', border: '1px solid rgba(217,119,6,0.3)' }} onClick={() => setAssignModal(selected.id)}>
                  <User size={13} /> Assigning workers
                </button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={() => assign(selected.id, currentUserId)}>
                  <User size={13} /> Accept Request
                </button>
              )
            )}
            {selected.status === 'assigned' && (
              <button className="btn btn-primary btn-sm" onClick={() => startTask(selected.id)}>
                <Navigation size={13} /> Start moving
              </button>
            )}
            {selected.status === 'in_progress' && (
              <button className="btn btn-primary btn-sm" style={{ background: 'var(--cyan-400)', color: '#080d16' }} onClick={() => arriveTask(selected.id)}>
                <MapPin size={13} /> Arrived & repairing
              </button>
            )}
            {selected.status === 'arrived' && (
              <button className="btn btn-success btn-sm" onClick={() => completeTask(selected.id)}>
                <CheckCircle size={13} /> Confirm completion
              </button>
            )}
            {selected.status === 'completed' && !selected.isPaid && (
              <button className="btn btn-primary btn-sm" onClick={() => confirmPayment(selected.id)}>
                <CheckCircle size={13} /> Confirm payment
              </button>
            )}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (selected.requesterUserId) {
                  localStorage.setItem('pending_chat_user', JSON.stringify({
                    id: selected.requesterUserId,
                    name: selected.customer || 'Customer',
                    role: 'User'
                  }));
                  navigate('/notifications');
                }
              }}
            >
              <MessageSquare size={12} /> Chat with customer
            </button>
          </div>

          {/* Assign Modal */}
          {assignModal === selected.id && isOwner && (
            <div style={{ padding: '12px', background: 'rgba(217,119,6,0.06)', borderRadius: 'var(--r-md)', border: '1px solid rgba(217,119,6,0.25)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', marginBottom: 8 }}>Choose an assigner:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => assign(selected.id, currentUserId)}>
                  Assign to Myself (Owner)
                </button>
                {(() => {
                  const activeStaff = mechanics.filter(m => m.isOnDuty && m.status === 'Available' && (m.user_id?._id || m.user_id) !== currentUserId);
                  return activeStaff.map(m => {
                    const name = m.user_id?.full_name || 'Staff';
                    const userId = m.user_id?._id || m.user_id;
                    return (
                      <button key={userId} className="btn btn-ghost btn-sm" onClick={() => assign(selected.id, userId)}>
                        {name}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Manage Vehicle Repair Orders</h1>
        <p>Receive, assign Workshop Staff and monitor the status of mobile vehicle repair orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Waiting for assignment", value: counts.pending, color: '#f59e0b', anim: true },
          { label: "Assigned", value: counts.assigned, color: 'var(--blue-400)' },
          { label: "Processing", value: counts.in_progress, color: 'var(--cyan-400)' },
          { label: "Completed", value: counts.completed, color: 'var(--green-400)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)', ...(s.anim ? { animation: 'blink 2s ease-in-out infinite' } : {}) }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 500 }}>
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          <Wrench size={13} /> Menu List
        </button>
        <button
          className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => activeTask && setActiveTab('track')}
          disabled={!activeTask}
          style={{ opacity: activeTask ? 1 : 0.5, cursor: activeTask ? 'pointer' : 'not-allowed' }}
        >
          <Navigation size={13} /> Mission Tracking
        </button>
      </div>

      {/* Tab: List */}
      {activeTab === 'list' && (
        <div className="grid" style={{ gridTemplateColumns: (!isMobile && selected) ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div>
            {/* Search bar */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by customer, phone, or workers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: 36,
                    height: 38,
                    borderRadius: 'var(--r-md)',
                    fontSize: '0.82rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-dim)'
                  }}
                />
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    opacity: 0.5,
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
              <Filter size={15} color="var(--text-muted)" />
              {[
                { key: 'all', label: "All" },
                { key: 'pending', label: "Waiting for assignment" },
                { key: 'assigned', label: "Assigned" },
                { key: 'in_progress', label: "Processing" },
                { key: 'completed', label: "Complete" },
                { key: 'cancelled', label: "Cancelled" },
                { key: 'paid', label: "Paid" },
                { key: 'unpaid', label: "Unpaid" },
              ].map(f => (
                <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFilter(f.key); setPage(1); }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 10, minHeight: 200, position: 'relative', alignContent: 'start' }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: 'var(--cyan-400)' }}>
                  <Loader className="animate-spin" size={24} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading tasks...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.88rem', border: '1px dashed var(--border-dim)', borderRadius: 'var(--r-md)' }}>
                  No tasks found.
                </div>
              ) : (
                filtered.map(task => (
                  <div key={task.id} className="card" style={{ padding: '14px 18px', borderLeft: task.priority === 'urgent' ? '3px solid #f59e0b' : '3px solid var(--border-default)', cursor: 'pointer', background: selected?.id === task.id ? 'rgba(217,119,6,0.06)' : undefined, transition: 'background 0.15s' }} onClick={() => setSelected(task)}>
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 5 }}>
                          {statusBadge[task.status]}
                          {task.priority === 'urgent' && <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(217,119,6,0.15)', color: '#f59e0b', border: 'none' }}>URGENT</span>}
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}><Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{task.time}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                          {task.service} {task.total_price > 0 && <span style={{ color: 'var(--cyan-400)', marginLeft: 6 }}>({task.total_price.toLocaleString('vi-VN')}₫)</span>}
                          {task.status === 'completed' && (
                            <span style={{ fontSize: '0.68rem', marginLeft: 8, color: task.isPaid ? 'var(--green-400)' : 'var(--orange-400)', fontWeight: 700 }}>
                              ({task.isPaid ? 'Paid' : 'Unpaid'})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <User size={10} style={{ display: 'inline', marginRight: 3 }} />{task.customer} · <MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />{task.location}{(task.status !== 'completed' && task.status !== 'cancelled') && ` · ${task.distance}`}
                        </div>
                        {task.mechanic && <div style={{ fontSize: '0.72rem', color: 'var(--green-400)', marginTop: 3 }}>✓ Workers: {task.mechanic}</div>}
                      </div>
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {totalTasks > 0 && (
              <div className="flex items-center justify-between" style={{ marginTop: 16, padding: '8px 4px', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{totalTasks === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, totalTasks)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalTasks}</strong> tasks
                </span>
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ opacity: page === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    Page
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setPageInput(valStr);
                        const val = parseInt(valStr);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setPage(val);
                        }
                      }}
                      onBlur={() => {
                        setPageInput(page.toString());
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
                    of {totalPages}
                  </span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ opacity: page === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {!isMobile && selected && renderDetailPanel()}
        </div>
      )}


      {/* Tab: Track Mission */}
      {activeTab === 'track' && activeTask && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.4fr 0.6fr', gap: 16 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-dim)' }}>
                <div className="section-title">
                  Mission tracking map
                </div>
              </div>
              <WorkshopMissionMap
                activeTask={activeTask}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
              />
            </div>

            <div className="card p-6">
              <div className="section-title" style={{ marginBottom: 14 }}>Mission progress</div>
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { time: activeTask.time, label: "Request recorded", status: 'done' },
                  { time: 'Done', label: "Staff assigned", status: 'done' },
                  {
                    time: (activeTask.status === 'in_progress') ? 'Active' : ((activeTask.status === 'arrived' || activeTask.status === 'completed') ? 'Done' : '—'),
                    label: "Moving to scene",
                    status: activeTask.status === 'in_progress' ? 'active' : ((activeTask.status === 'arrived' || activeTask.status === 'completed') ? 'done' : 'pending')
                  },
                  {
                    time: activeTask.status === 'arrived' ? 'Active' : (activeTask.status === 'completed' ? 'Done' : '—'),
                    label: "Arrived & repairing",
                    status: activeTask.status === 'arrived' ? 'active' : (activeTask.status === 'completed' ? 'done' : 'pending')
                  },
                  {
                    time: activeTask.status === 'completed' ? 'Done' : '—',
                    label: "Confirm task completion",
                    status: activeTask.status === 'completed' ? 'done' : 'pending'
                  }
                ].map((step, i) => (
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

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
                {activeTask.status === 'assigned' ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => startTask(activeTask.id)}
                  >
                    <Navigation size={14} /> Start moving to scene
                  </button>
                ) : activeTask.status === 'in_progress' ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', background: 'var(--cyan-400)', color: '#080d16' }}
                    onClick={() => arriveTask(activeTask.id)}
                  >
                    <MapPin size={14} /> Arrived & repairing
                  </button>
                ) : activeTask.status === 'arrived' ? (
                  <button
                    className="btn btn-success"
                    style={{ width: '100%' }}
                    onClick={() => completeTask(activeTask.id)}
                  >
                    <CheckCircle size={14} /> Confirm task completion
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Embedded Real-time Chat Box */}
          {activeTask.requesterUserId && (
            <div id="rescue-live-chat" style={{ width: '100%' }}>
              <RescueSessionChat
                targetUser={{
                  id: activeTask.requesterUserId,
                  name: activeTask.customer || 'Customer',
                  role: 'User',
                  phone: activeTask.phone,
                  avatarUrl: activeTask.avatarUrl
                }}
                missionId={activeTask.id}
                title={`Live Chat with Customer (${activeTask.customer || 'Customer'})`}
                isEnded={activeTask.status === 'completed' || activeTask.status === 'resolved' || activeTask.status === 'cancelled'}
                isCancelled={activeTask.status === 'cancelled'}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile Details Modal */}
      {isMobile && selected && activeTab === 'list' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          backdropFilter: 'blur(4px)'
        }} onClick={() => setSelected(null)}>
          <div style={{
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--border-dim)',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 16 }}>
              {renderDetailPanel()}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!paymentToConfirm}
        title="Confirm Payment"
        message="Are you sure you want to confirm payment for this rescue task? This will mark the task's payment transaction as completed."
        confirmText="Confirm"
        loading={isSaving}
        onConfirm={async () => {
          const id = paymentToConfirm;
          await executeConfirmPayment(id);
          setPaymentToConfirm(null);
        }}
        onCancel={() => setPaymentToConfirm(null)}
      />
    </div>
  );
}
