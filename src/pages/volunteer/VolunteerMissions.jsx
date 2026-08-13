import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ShieldAlert, CheckCircle, Clock, MapPin, User, Navigation,
  AlertTriangle, Filter, Phone, MessageSquare, Send, LifeBuoy,
  ChevronRight, XCircle, ShieldCheck, Maximize, Minimize, Crosshair, Loader, Copy, Search
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, useMap, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GoongMaplibreLayer from '../../components/common/GoongMaplibreLayer';
import { apiService } from '../../services/apiService';
import RescueSessionChat from '../../components/common/RescueSessionChat';

const initialSOSList = [];

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


function VolunteerMissionMap({ activeMission, volunteerProfile, isFullscreen, setIsFullscreen }) {
  const [volPosition, setVolPosition] = useState(() => {
    if (volunteerProfile && volunteerProfile.current_lat && volunteerProfile.current_lng) {
      return [volunteerProfile.current_lat, volunteerProfile.current_lng];
    }
    return null;
  });
  const [routePath, setRoutePath] = useState([]);
  const [autoCenter, setAutoCenter] = useState(true);
  const mapRef = useRef(null);

  useEffect(() => {
    if (volunteerProfile && volunteerProfile.current_lat && volunteerProfile.current_lng) {
      setVolPosition([volunteerProfile.current_lat, volunteerProfile.current_lng]);
    }
  }, [volunteerProfile]);

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
          if (!prev) return [newLat, newLng];
          const dist = getCoordsDistance(prev[0], prev[1], newLat, newLng);
          if (dist > 5) {
            return [newLat, newLng];
          }
          return prev;
        });
      },
      (err) => console.warn('Failed to watch volunteer position:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const victimPosition = useMemo(() => {
    if (!activeMission || !activeMission.coords) return null;
    const parts = activeMission.coords.split(',');
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  }, [activeMission?.coords]);

  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [floodedSensors, setFloodedSensors] = useState([]);
  const [hazardPoints, setHazardPoints] = useState([]);
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

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
    if (!victimPosition || !volPosition) {
      setRouteAlternatives([]);
      setRoutePath([]);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const start = `${volPosition[0]},${volPosition[1]}`;
        const end = `${victimPosition[0]},${victimPosition[1]}`;
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
  }, [volPosition?.[0], volPosition?.[1], victimPosition?.[0], victimPosition?.[1]]);

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

  function MapController({ center, victimPosition, isFullscreen, autoCenter, setAutoCenter }) {
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
        if (victimPosition && !isNaN(victimPosition[0]) && !isNaN(victimPosition[1])) {
          map.setView(victimPosition, 14);
        }
        return; // Prevent crash on invalid volunteer coordinates
      }
      map.invalidateSize();
      const timer1 = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      const timer2 = setTimeout(() => {
        map.invalidateSize();
        if (victimPosition && !isNaN(victimPosition[0]) && !isNaN(victimPosition[1])) {
          const isTooClose = Math.abs(center[0] - victimPosition[0]) < 0.0003 && Math.abs(center[1] - victimPosition[1]) < 0.0003;
          if (!isTooClose) {
            map.fitBounds([center, victimPosition], { padding: [50, 50] });
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
    }, [center, victimPosition, map, isFullscreen, autoCenter]);
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
          volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) ? volPosition[0] : (victimPosition && !isNaN(victimPosition[0]) && !isNaN(victimPosition[1]) ? victimPosition[0] : 10.8564),
          volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) ? volPosition[1] : (victimPosition && !isNaN(victimPosition[0]) && !isNaN(victimPosition[1]) ? victimPosition[1] : 106.6234)
        ];

        return (
          <MapContainer
            center={mapCenter}
            zoom={14}
            zoomControl={false}
            style={{ width: '100%', height: '100%', background: '#080d16' }}
          >
            <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />

            <MapController
              center={volPosition}
              victimPosition={victimPosition}
              isFullscreen={isFullscreen}
              autoCenter={autoCenter}
              setAutoCenter={setAutoCenter}
            />

            {volPosition && !isNaN(volPosition[0]) && !isNaN(volPosition[1]) && (
              <Marker position={volPosition} icon={volunteerIcon} />
            )}

            {victimPosition && (
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
                      positions={[volPosition, victimPosition]}
                      color="var(--cyan-400)"
                      weight={3}
                      dashArray="6, 6"
                      opacity={0.8}
                    />
                  )
                )}
                <Marker position={victimPosition} icon={victimIcon} />
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
          victimPosition ? { color: 'var(--red-400)', label: "SOS victim" } : null
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
  pending: <span className="badge badge-orange">Waiting for routing</span>,
  accepted: <span className="badge badge-blue">Received</span>,
  in_progress: <span className="badge badge-blue" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>Processing</span>,
  arrived: <span className="badge badge-cyan">Arrived & Assisting</span>,
  resolved: <span className="badge badge-green">Complete</span>,
  cancelled: <span className="badge badge-ghost" style={{ opacity: 0.6 }}>Cancelled</span>,
};

const severityBg = {
  critical: '3px solid var(--red-400)',
  high: '3px solid var(--orange-400)',
  medium: '3px solid var(--cyan-400)',
};

export default function VolunteerMissions() {
  const location = useLocation();
  const navigate = useNavigate();
  const processedStateRef = useRef(null);
  const [sos, setSos] = useState(initialSOSList);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [listLoading, setListLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [copiedPhoneId, setCopiedPhoneId] = useState(null);
  const [isChatMode, setIsChatMode] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMissions, setTotalMissions] = useState(0);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, resolved: 0, cancelled: 0 });
  const limit = 5;

  const [pageInput, setPageInput] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  useEffect(() => {
    setIsChatMode(false);
  }, [selected?.id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (title, body) => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { title, body, isNotification: true, showAction: false }
    }));
  };
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeMission = useMemo(() => {
    if (!currentUser) return null;
    return sos.find(s =>
      s.assignedVolunteerUserId === currentUser._id &&
      (s.status === 'accepted' || s.status === 'in_progress' || s.status === 'arrived')
    );
  }, [sos, currentUser]);

  const steps = useMemo(() => {
    if (!activeMission) return [];
    const reqTime = activeMission.time || 'Pending';
    const isAccepted = activeMission.status === 'accepted' || activeMission.status === 'in_progress' || activeMission.status === 'arrived';
    const isInProgress = activeMission.status === 'in_progress' || activeMission.status === 'arrived';
    const isArrived = activeMission.status === 'arrived';

    return [
      { label: "Rescue request recorded", time: reqTime, status: 'done' },
      { label: "Accepted rescue assignment", time: reqTime, status: isAccepted ? 'done' : 'pending' },
      { label: "Moving to the scene", time: isInProgress ? 'Active' : '—', status: isArrived ? 'done' : (isInProgress ? 'active' : 'pending') },
      { label: "Arrive and assist the rescuee", time: isArrived ? 'Arrived' : '—', status: isArrived ? 'active' : 'pending' },
      { label: "Confirm task completion", time: '—', status: 'pending' }
    ];
  }, [activeMission]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiService.get('/auth/profile');
        if (res && res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    const fetchVolunteer = async () => {
      try {
        const res = await apiService.get('/volunteers/me');
        if (res && res.success && res.volunteer) {
          setVolunteerProfile(res.volunteer);
        }
      } catch (err) {
        console.error('Failed to fetch volunteer profile:', err);
      }
    };

    fetchProfile();
    fetchVolunteer();
  }, []);

  useEffect(() => {
    const stateRescueId = location.state?.selectedRescueId;
    if (stateRescueId && sos.length > 0 && processedStateRef.current !== stateRescueId) {
      const found = sos.find(item => item.id === stateRescueId);
      if (found) {
        setSelected(found);
        setActiveTab('list');
        processedStateRef.current = stateRescueId;
        // Clear history state to avoid selecting again on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, sos]);

  const fetchActiveRescues = async (pageNumber = page, statusFilter = filter, search = searchQuery) => {
    try {
      const res = await apiService.get(`/rescue?page=${pageNumber}&limit=${limit}&status=${statusFilter}&search=${encodeURIComponent(search)}`);
      if (res && res.success && res.data) {
        const mapped = res.data.map(item => {
          const labels = {
            'Trapped_By_Flood': 'Trapped in flooded area',
            'Medical': 'Urgent medical support needed',
            'Vehicle_Broken': 'Vehicle broken/engine stalled due to flood',
            'Other': item.custom_emergency_type || 'Other rescue request'
          };
          const label = labels[item.emergency_type] || 'Rescue request';

          return {
            id: item._id,
            severity: item.emergency_type === 'Medical' ? 'critical' : 'high',
            location: `Coords: ${item.initial_lat.toFixed(4)}, ${item.initial_lng.toFixed(4)}`,
            victim: item.requester_id?.full_name || 'Anonymous User',
            phone: item.sender_phone || 'Not provided',
            message: item.description || 'Urgent assistance needed in the flooded area.',
            time: new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            status: item.status === 'Assigned' ? 'accepted' : (item.status === 'Completed' ? 'resolved' : (item.status === 'Cancelled' ? 'cancelled' : item.status.toLowerCase())), // map backend Assigned/Completed/Cancelled to accepted/resolved/cancelled
            type: label,
            coords: `${item.initial_lat}, ${item.initial_lng}`,
            waterLevel: '—',
            distance: item.distance != null ? `${(item.distance / 1000).toFixed(1)} km` : '—',
            eta: item.distance != null ? `~${Math.round(item.distance / 250) + 1} minutes` : '—',
            photos: item.photos ? JSON.parse(item.photos) : [],
            assignedVolunteerUserId: item.assigned_volunteer_id?.user_id?._id || null,
            assignedVolunteerName: item.assigned_volunteer_id?.user_id?.full_name || null,
            assignedVolunteerPhone: item.assigned_volunteer_id?.user_id?.phone || null,
            requesterUserId: item.requester_id?._id || item.requester_id || null
          };
        });
        setSos(mapped);

        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotalMissions(res.pagination.total);
        } else {
          setTotalPages(1);
          setTotalMissions(mapped.length);
        }

        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load active rescue requests:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRescues(page, filter, searchQuery);
  }, [page, filter, searchQuery]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchActiveRescues(page, filter, searchQuery);
    };
    const interval = setInterval(handleUpdate, 5000);
    window.addEventListener('rescue-update', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('rescue-update', handleUpdate);
    };
  }, [page, filter, searchQuery]);

  useEffect(() => {
    const handleTerminated = (e) => {
      const { status } = e.detail || {};
      showToast(
        status === 'Cancelled' ? 'Mission cancelled' : 'Mission completed',
        status === 'Cancelled'
          ? 'This rescue mission has been cancelled by the requester.'
          : 'The victim has confirmed they are safe. Mission completed!'
      );
      setActiveTab('list');
      setSelected(null);
    };
    window.addEventListener('active-mission-terminated', handleTerminated);
    return () => window.removeEventListener('active-mission-terminated', handleTerminated);
  }, []);

  useEffect(() => {
    if (selected) {
      const found = sos.find(x => x.id === selected.id);
      if (found && JSON.stringify(found) !== JSON.stringify(selected)) {
        setSelected(found);
      }
    }
  }, [sos, selected?.id]);

  useEffect(() => {
    if (activeTab === 'track' && !activeMission) {
      showToast('Mission status updated', 'This rescue mission has been completed or cancelled by the requester.');
      setActiveTab('list');
      setSelected(null);
    }
  }, [activeMission, activeTab]);

  const filtered = sos;

  const counts = {
    pending: stats.pending,
    in_progress: stats.in_progress,
    resolved: stats.resolved,
    cancelled: stats.cancelled,
  };

  const acceptMission = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/accept`);
      if (res && res.success) {
        setSos(prev => prev.map(s => s.id === id ? {
          ...s,
          status: 'accepted',
          assignedVolunteerUserId: currentUser?._id || s.assignedVolunteerUserId,
          assignedVolunteerName: currentUser?.full_name || s.assignedVolunteerName || 'You',
          assignedVolunteerPhone: currentUser?.phone || s.assignedVolunteerPhone || ''
        } : s));
        if (selected?.id === id) {
          setSelected(prev => ({
            ...prev,
            status: 'accepted',
            assignedVolunteerUserId: currentUser?._id || prev.assignedVolunteerUserId,
            assignedVolunteerName: currentUser?.full_name || prev.assignedVolunteerName || 'You',
            assignedVolunteerPhone: currentUser?.phone || prev.assignedVolunteerPhone || ''
          }));
        }
        showToast('Mission accepted', 'Accepted rescue mission successfully!');
      } else {
        showToast('Error', res.message || 'Failed to accept rescue mission.');
      }
    } catch (err) {
      console.error('Failed to accept rescue mission:', err);
      showToast('Error', err.message || 'Failed to connect to server.');
    }
  };

  const startMission = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/start`);
      if (res && res.success) {
        setSos(prev => prev.map(s => s.id === id ? { ...s, status: 'in_progress' } : s));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'in_progress' }));
        showToast('Mission started', 'Mission started! You can now track your route.');
        setActiveTab('track');
      } else {
        showToast('Error', res.message || 'Failed to start mission.');
      }
    } catch (err) {
      console.error('Failed to start mission:', err);
      showToast('Error', err.message || 'Error connecting to server.');
    }
  };

  const arriveMission = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/arrive`);
      if (res && res.success) {
        setSos(prev => prev.map(s => s.id === id ? { ...s, status: 'arrived' } : s));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'arrived' }));
        showToast('Arrived at scene', 'You have arrived at the scene and started assisting the victim.');
      } else {
        showToast('Error', res.message || 'Failed to confirm arrival.');
      }
    } catch (err) {
      console.error('Failed to confirm arrival:', err);
      showToast('Error', err.message || 'Error connecting to server.');
    }
  };

  const completeMission = async (id) => {
    try {
      const res = await apiService.put(`/rescue/${id}/complete`);
      if (res && res.success) {
        setSos(prev => prev.map(s => s.id === id ? { ...s, status: 'resolved' } : s));
        if (selected?.id === id) setSelected(prev => ({ ...prev, status: 'resolved' }));
        showToast('Mission completed', 'Mission completed successfully!');
        setActiveTab('list');
      } else {
        showToast('Error', res.message || 'Failed to complete mission.');
      }
    } catch (err) {
      console.error('Failed to complete mission:', err);
      showToast('Error', err.message || 'Error connecting to server.');
    }
  };

  const handleSendReport = () => {
    setReportSent(true);
    setTimeout(() => { setReportSent(false); setReportText(''); }, 2000);
  };

  const renderDetailPanel = () => {
    if (!selected) return null;

    if (isChatMode) {
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
          gap: 12
        }}>
          {/* Header Bar with Back Button */}
          <div className="flex items-center justify-between" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsChatMode(false)}
                style={{
                  padding: '4px 10px',
                  height: 28,
                  fontSize: '0.75rem',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(34,211,238,0.15)',
                  color: 'var(--cyan-400)',
                  border: '1px solid rgba(34,211,238,0.3)',
                  fontWeight: 600
                }}
                title="Back to Details"
              >
                ← Back to Details
              </button>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Live Chat ({selected.victim || 'Rescuee'})
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelected(null)}
              style={{ padding: '3px 8px', height: 26, fontSize: '0.72rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
              title="Close panel"
            >
              <XCircle size={14} /> Close
            </button>
          </div>

          {/* Full Chat Component with hideHeader={true} */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <RescueSessionChat
              targetUser={{
                id: selected.requesterUserId || selected.userId || 'unknown_user',
                name: selected.victim || 'Customer',
                role: 'Requester (Rescuee)',
                phone: selected.phone || 'Not provided'
              }}
              missionId={selected.id}
              title={`Live Chat with ${selected.victim || 'Rescuee'}`}
              defaultMinimized={false}
              hideHeader={true}
              isEnded={selected.status === 'resolved' || selected.status === 'cancelled' || selected.status === 'completed'}
              isCancelled={selected.status === 'cancelled'}
            />
          </div>
        </div>
      );
    }

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
              Request details
            </div>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 7px',
              borderRadius: 6,
              background: selected.severity === 'critical' ? 'rgba(239,29,55,0.15)' : 'rgba(249,115,22,0.15)',
              color: selected.severity === 'critical' ? 'var(--red-400)' : 'var(--orange-400)',
              border: `1px solid ${selected.severity === 'critical' ? 'rgba(239,29,55,0.35)' : 'rgba(249,115,22,0.35)'}`
            }}>
              {selected.severity || 'HIGH'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSelected(null)}
            style={{ padding: '3px 8px', height: 26, fontSize: '0.72rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}
            title="Close details panel"
          >
            <XCircle size={14} /> {isMobile ? 'Back' : 'Close'}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--cyan-400)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldAlert size={14} /> {selected.type}
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
            "{selected.message}"
          </div>
        </div>

        {/* Compact Details Strip (All info in 1 single dense box!) */}
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
          {/* Victim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <User size={13} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>Rescuee:</span>
            <strong style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.victim}</strong>
          </div>

          {/* Phone & Copy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Phone size={13} color="var(--green-400)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.phone}</strong>
            </div>
            {selected.phone && selected.phone !== 'Not provided' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(selected.phone);
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = selected.phone;
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
                  setCopiedPhoneId(selected.id);
                  setTimeout(() => setCopiedPhoneId(null), 2000);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '1px 6px',
                  height: 22,
                  fontSize: '0.68rem',
                  background: copiedPhoneId === selected.id ? 'rgba(34,197,94,0.25)' : 'rgba(34,211,238,0.15)',
                  color: copiedPhoneId === selected.id ? 'var(--green-400)' : 'var(--cyan-400)',
                  borderRadius: 4,
                  border: `1px solid ${copiedPhoneId === selected.id ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.3)'}`
                }}
                title="Copy phone number"
              >
                {copiedPhoneId === selected.id ? <CheckCircle size={11} /> : <Copy size={11} />} {copiedPhoneId === selected.id ? 'Copied' : 'Copy Phone'}
              </button>
            )}
          </div>


          {/* Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="var(--yellow-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)' }}>Time:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{selected.time}</strong>
          </div>

          {/* Location */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
            <MapPin size={13} color="var(--red-400)" style={{ flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Coords:</span>
            <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.location}</span>
          </div>

          {/* Assigned Rescuer if any */}
          {selected.assignedVolunteerName && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
              <ShieldCheck size={13} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--cyan-400)', fontWeight: 600, flexShrink: 0 }}>Assigned:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {currentUser && selected.assignedVolunteerUserId === currentUser._id
                  ? 'You (Active on this mission)'
                  : `${selected.assignedVolunteerName} (${selected.assignedVolunteerPhone || 'No phone'})`}
              </span>
            </div>
          )}
        </div>

        {/* Scene Photos Thumbnail Bar */}
        {selected.photos && selected.photos.length > 0 && (
          <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
              Scene Photos ({selected.photos.length})
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {selected.photos.map((url, idx) => (
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

        {/* Action Buttons & Live Chat */}
        <div style={{ display: 'grid', gap: 6, paddingTop: 4, borderTop: '1px solid var(--border-dim)' }}>
          {selected.status === 'pending' && (
            <button type="button" className="btn btn-danger" style={{ height: 34, fontWeight: 700, fontSize: '0.8rem' }} onClick={() => acceptMission(selected.id)}>
              <ShieldAlert size={14} /> Get the quest
            </button>
          )}
          {selected.status === 'accepted' && currentUser && selected.assignedVolunteerUserId === currentUser._id && (
            <button type="button" className="btn btn-primary" style={{ height: 34, fontWeight: 700, fontSize: '0.8rem' }} onClick={() => startMission(selected.id)}>
              <Navigation size={14} /> Start moving to scene
            </button>
          )}
          {selected.status === 'in_progress' && currentUser && selected.assignedVolunteerUserId === currentUser._id && (
            <button type="button" className="btn btn-warning" style={{ height: 34, fontWeight: 700, fontSize: '0.8rem', background: 'rgba(249,115,22,0.18)', color: 'var(--orange-400)', border: '1px solid rgba(249,115,22,0.35)' }} onClick={() => arriveMission(selected.id)}>
              <CheckCircle size={14} /> Arrived & Assisting
            </button>
          )}
          {selected.status === 'arrived' && currentUser && selected.assignedVolunteerUserId === currentUser._id && (
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--yellow-400)',
                textAlign: 'center',
                padding: '8px',
                background: 'rgba(234,179,8,0.06)',
                border: '1px solid rgba(234,179,8,0.2)',
                borderRadius: 'var(--r-sm)',
                fontWeight: 600
              }}>
                Waiting for the rescuee to confirm safety...
              </div>
              <button type="button" className="btn btn-success" style={{ height: 34, fontWeight: 700, fontSize: '0.8rem' }} onClick={() => completeMission(selected.id)}>
                <CheckCircle size={14} /> Confirm task completion
              </button>
            </div>
          )}
          {selected.assignedVolunteerName && currentUser && selected.assignedVolunteerUserId !== currentUser._id && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-sm)' }}>
              Accepted by {selected.assignedVolunteerName}.
            </div>
          )}

          {/* Chat Button (Turns Panel into Chat Box & Hides Info!) */}
          {selected.status === 'resolved' || selected.status === 'cancelled' ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (selected.requesterUserId || selected.userId) {
                  localStorage.setItem('pending_chat_user', JSON.stringify({
                    id: selected.requesterUserId || selected.userId,
                    name: selected.victim || 'Customer',
                    role: 'User'
                  }));
                  navigate('/notifications');
                }
              }}
              style={{
                height: 38,
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--cyan-400)',
                border: '1px dashed rgba(34,211,238,0.35)',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={15} /> Chat in normal Messages (SOS {selected.status === 'cancelled' ? 'Cancelled' : 'Confirmed'})
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (selected.requesterUserId || selected.userId) {
                  setIsChatMode(true);
                } else {
                  localStorage.setItem('pending_chat_user', JSON.stringify({
                    id: selected.requesterUserId || selected.userId,
                    name: selected.victim || 'Customer',
                    role: 'User'
                  }));
                  navigate('/notifications');
                }
              }}
              style={{
                height: 38,
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: 16,
                gap: 8,
                background: 'linear-gradient(135deg, var(--cyan-500), var(--blue-600))',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                boxShadow: '0 4px 14px rgba(6,182,212,0.3)',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={16} /> Live Chat with Victim ({selected.victim || 'Customer'})
            </button>
          )}
        </div>
      </div>
    );
  };

  const totalSOS = stats.pending + stats.in_progress + stats.resolved + stats.cancelled;

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>SOS Request & Rescue Mission</h1>
        <p>Receive, monitor and complete emergency rescue requests</p>
      </div>

      {/* Summary Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: "Waiting for routing", value: stats.pending, color: 'var(--red-400)', anim: true },
          { label: "Processing", value: stats.in_progress, color: 'var(--orange-400)' },
          { label: "Completed", value: stats.resolved, color: 'var(--green-400)' },
          { label: "Cancelled", value: stats.cancelled, color: 'var(--text-muted)' },
          { label: "Total SOS", value: totalSOS, color: 'var(--cyan-400)' },
        ].map((s) => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)', ...(s.anim ? { animation: 'blink 2s ease-in-out infinite' } : {}) }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Master Content Grid: When on desktop and an SOS request is selected inside 'list' tab, split into 2 equal columns so Detail Panel starts EXACTLY ngang hàng (level) with the 4 tabs! */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: (!isMobile && selected && activeTab === 'list') ? '1fr 1fr' : '1fr',
          gap: 20,
          alignItems: 'start'
        }}
      >
        {/* Left Column: Tabs Navigation & Active Tab Content */}
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div className="tabs-nav" style={{ marginBottom: 20, width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap' }}>
            <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
              <ShieldAlert size={13} /> SOS List
            </button>
            <button
              className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`}
              onClick={() => activeMission && setActiveTab('track')}
              disabled={!activeMission}
              style={{ opacity: activeMission ? 1 : 0.5, cursor: activeMission ? 'pointer' : 'not-allowed' }}
            >
              <Navigation size={13} /> Mission tracking
            </button>
            <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
              <LifeBuoy size={13} /> Emergency instructions
            </button>
          </div>

          {/* Tab: SOS List */}
          {activeTab === 'list' && (
            listLoading ? (
              <div className="card p-8 flex flex-column items-center justify-center" style={{ minHeight: 250, gap: 12 }}>
                <Loader size={32} color="var(--cyan-400)" style={{ animation: 'spin 1.5s infinite linear' }} />
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading active rescue missions...</div>
              </div>
            ) : (
              (
                <div>
                  {/* Search bar */}
                  <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Search by victim name or situation details..."
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

                  {/* Filter */}
                  <div className="flex items-center gap-3" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
                    <Filter size={15} color="var(--text-muted)" />
                    {[
                      { key: 'all', label: "All" },
                      { key: 'pending', label: "Waiting for routing" },
                      { key: 'accepted', label: "Received" },
                      { key: 'in_progress', label: "Processing" },
                      { key: 'resolved', label: "Complete" },
                      { key: 'cancelled', label: "Cancelled" },
                    ].map(f => (
                      <button
                        key={f.key}
                        className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => { setFilter(f.key); setPage(1); }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {filtered.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.88rem', border: '1px dashed var(--border-dim)', borderRadius: 'var(--r-md)' }}>
                        No rescue requests found.
                      </div>
                    ) : (
                      filtered.map(s => (
                        <div
                          key={s.id}
                          className="card"
                          style={{
                            padding: '14px 18px',
                            borderLeft: severityBg[s.severity] || '3px solid var(--border-default)',
                            cursor: 'pointer',
                            background: selected?.id === s.id ? 'rgba(61,125,176,0.1)' : undefined,
                            transition: 'background 0.15s',
                          }}
                          onClick={() => setSelected(s)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div style={{ flex: 1 }}>
                              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
                                {statusBadge[s.status]}
                                <span className={`badge ${s.severity === 'critical' ? 'badge-red' : s.severity === 'high' ? 'badge-orange' : 'badge-green'}`} style={{ fontSize: '0.62rem' }}>
                                  {s.severity.toUpperCase()}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                  <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{s.time}
                                </span>
                              </div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 3 }}>
                                <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--text-muted)' }} />
                                {s.location}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                Rescuee: {s.victim}
                              </div>
                              {s.assignedVolunteerName && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--orange-400)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <ShieldAlert size={12} />
                                  <span>
                                    {currentUser && s.assignedVolunteerUserId === currentUser._id
                                      ? 'Assigned to you'
                                      : `Assigned to: ${s.assignedVolunteerName}`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between" style={{ marginTop: 16, padding: '8px 4px', flexWrap: 'wrap', gap: 12 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        Showing <strong style={{ color: 'var(--text-primary)' }}>{totalMissions === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, totalMissions)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalMissions}</strong> missions
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
              )
            ))}
        </div>

        {/* Right Column: Detail Panel */}
        {!isMobile && selected && activeTab === 'list' && (
          <div style={{ position: 'sticky', top: 20 }}>
            {renderDetailPanel()}
          </div>
        )}
      </div>

      {/* Tab: Track Mission */}
      {activeTab === 'track' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: isMobile ? '1fr' : '1.4fr 0.6fr', gap: 16 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-dim)' }}>
                <div className="section-title">
                  Mission tracking map
                </div>
              </div>
              <VolunteerMissionMap
                activeMission={activeMission}
                volunteerProfile={volunteerProfile}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
              />
            </div>

            <div className="card p-6">
              <div className="section-title" style={{ marginBottom: 14 }}>Mission progress</div>
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
              {activeMission && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
                  {activeMission.status === 'accepted' ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => startMission(activeMission.id)}
                    >
                      <Navigation size={14} /> Start moving to scene
                    </button>
                  ) : activeMission.status === 'in_progress' ? (
                    <button
                      className="btn btn-warning"
                      style={{ width: '100%', background: 'rgba(249,115,22,0.15)', color: 'var(--orange-400)', border: '1px solid rgba(249,115,22,0.3)' }}
                      onClick={() => arriveMission(activeMission.id)}
                    >
                      <CheckCircle size={14} /> Arrived & Assisting
                    </button>
                  ) : activeMission.status === 'arrived' ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{
                        fontSize: '0.78rem',
                        color: 'var(--yellow-400)',
                        textAlign: 'center',
                        padding: '12px',
                        background: 'rgba(234,179,8,0.06)',
                        border: '1px solid rgba(234,179,8,0.2)',
                        borderRadius: 'var(--r-sm)',
                        fontWeight: 600
                      }}>
                         Waiting for the rescuee to confirm safety...
                      </div>
                      <button
                        className="btn btn-success"
                        style={{ width: '100%' }}
                        onClick={() => completeMission(activeMission.id)}
                      >
                        <CheckCircle size={14} /> Confirm task completion
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {activeMission && activeMission.requesterUserId && (
            <div id="volunteer-live-chat">
              <RescueSessionChat
                targetUser={{
                  id: activeMission.requesterUserId,
                  name: activeMission.victim || 'Rescuee',
                  role: 'Requester (Rescuee)',
                  phone: activeMission.phone || 'Not provided'
                }}
                missionId={activeMission.id}
                title={`Live Chat with Rescuee (${activeMission.victim || 'Customer'})`}
              />
            </div>
          )}
        </div>
      )}


      {/* Tab: Info Hub */}
      {activeTab === 'info' && (
        <div className="grid grid-2" style={{ gap: 16, minWidth: 0 }}>
          <div className="card p-6" style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Rescue procedure</div>
            <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
              {[
                { step: '01', title: "Get the quest", desc: "View SOS requests, assess urgency, and receive appropriate tasks." },
                { step: '02', title: "Move to the scene", desc: "Use the tactical map to find safe routes and avoid deeply flooded areas." },
                { step: '03', title: "Assess the situation", desc: "Check the number of victims, the level of danger and call for additional assistance if necessary." },
                { step: '04', title: "Victim support", desc: "Basic medical first aid, take the victim to a safe place or hand over to medical attention." },
                { step: '05', title: "Confirmation & Reporting", desc: "Submit field reports and confirm task completion on the system." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3" style={{ minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(239,29,55,0.12)', border: '1px solid rgba(239,29,55,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--red-400)', fontFamily: 'var(--font-mono)' }}>{item.step}</span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 3, wordBreak: 'break-word' }}>{item.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'break-word' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6" style={{ minWidth: 0, overflow: 'hidden' }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Emergency phone number</div>
            <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
              {[
                { label: "Rescue coordination center", phone: '1800 599 920', color: 'var(--red-400)' },
                { label: "Ambulance – Emergency medical care", phone: '115', color: 'var(--orange-400)' },
                { label: "Fire & Fire Prevention", phone: '114', color: 'var(--orange-400)' },
                { label: "Police", phone: '113', color: 'var(--cyan-400)' },
                { label: "Ho Chi Minh City Disaster Prevention and Control Steering Committee", phone: '028 3930 2524', color: 'var(--blue-400)' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border-dim)',
                    background: 'rgba(61,125,176,0.04)',
                    flexWrap: 'wrap',
                    minWidth: 0
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: '1 1 180px', minWidth: 0, wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: item.color, fontSize: '0.9rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {item.phone}
                  </div>
                </div>
              ))}
            </div>
            <div className="alert-banner" style={{ marginTop: 16, background: 'rgba(239,29,55,0.08)', border: '1px solid rgba(239,29,55,0.2)', display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
              <ShieldAlert size={15} color="var(--red-400)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-word', lineHeight: 1.4, minWidth: 0 }}>
                In case of danger to life, priority should be given to contacting the dispatch center before acting independently.
              </div>
            </div>
          </div>
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
    </div>
  );
}
