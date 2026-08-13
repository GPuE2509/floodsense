import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { MapPin, Star, MessageSquare, Wrench, Phone, Clock, CheckCircle, ThumbsUp, Search, Navigation, Bookmark, Share2, Loader, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../services/apiService';
import GoongMaplibreLayer from '../../components/common/GoongMaplibreLayer';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getWorkingHoursForToday = (w) => {
  if (!w) return 'Closed';
  if (w.is_open === false || w.status === 'closed' || w.status === 'Closed' || w.status === 'busy') {
    return 'Closed';
  }
  const defaultHours = `${w.open_time || w.openTime || '08:00'} – ${w.close_time || w.closeTime || '17:00'}`;
  
  if (!w.weekly_calendar && !w.weeklyCalendar) return defaultHours;
  const calendar = w.weekly_calendar || w.weeklyCalendar;
  if (!calendar || calendar.length === 0) return defaultHours;

  const hasActiveCalendar = calendar.some(day => day.is_active);
  if (!hasActiveCalendar) return defaultHours;

  const day = new Date().getDay();
  let dayGroup = "";
  if (day === 0) {
    dayGroup = "Sunday";
  } else if (day === 6) {
    dayGroup = "Saturday";
  } else {
    dayGroup = "Monday – Friday";
  }
  const entry = calendar.find(c => c.day_group === dayGroup);
  if (!entry) return defaultHours;
  if (!entry.is_active) return 'Closed';
  return `${entry.open_time} – ${entry.close_time}`;
};

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function MapFlyToTarget({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.lat && target.lng) {
      map.flyTo([target.lat, target.lng], 15, { animate: true, duration: 1 });
    }
  }, [target, map]);
  return null;
}

// ── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({ value, onChange, size = 20, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          onClick={() => !readonly && onChange && onChange(s)}
          onMouseEnter={() => !readonly && setHover(s)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          style={{ background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer', padding: 0 }}
        >
          <Star
            size={size}
            color={(hover || value) >= s ? '#f59e0b' : 'var(--border-dim)'}
            fill={(hover || value) >= s ? '#f59e0b' : 'none'}
            style={{ transition: 'all 0.1s' }}
          />
        </button>
      ))}
    </div>
  );
}

// ── Workshop Map (Leaflet) ───────────────────────────────────────────────────

function WorkshopMap({ workshops, selected, onSelect, userLocation }) {
  const mapCenter = selected 
    ? [selected.lat, selected.lng] 
    : (userLocation ? [userLocation.lat, userLocation.lng] : [10.03711, 105.78825]);

  return (
    <div style={{ position: 'relative', height: 350, background: '#080d16', borderRadius: 'var(--r-md)', overflow: 'hidden', zIndex: 1 }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 1; }
          80%, 100% { opacity: 0; }
        }
      `}</style>
      <MapContainer center={mapCenter} zoom={14} style={{ width: '100%', height: '100%' }} zoomControl={false}>
        <ZoomControl position="bottomright" />
        <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />
        <MapFlyToTarget target={selected} />

        {/* User position */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={L.divIcon({
              html: `
                <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: var(--cyan-400); opacity: 0.35; animation: pulse-ring 1.5s infinite;"></div>
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--cyan-400); border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>
                </div>
              `,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          />
        )}

        {/* Workshops markers */}
        {workshops.map(ws => {
          if (!ws.lat || !ws.lng) return null;
          const isSelected = selected?.id === ws.id;
          const color = ws.status === 'open' ? 'var(--green-400)' : 'var(--orange-400)';
          
          return (
            <Marker
              key={ws.id}
              position={[ws.lat, ws.lng]}
              icon={L.divIcon({
                className: '',
                html: `
                  <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    ${isSelected ? `<div style="position: absolute; inset: -6px; border-radius: 50%; background: ${color}; opacity: 0.3; animation: pulse-ring 1.2s infinite;"></div>` : ''}
                    <div style="width: ${isSelected ? 28 : 22}px; height: ${isSelected ? 28 : 22}px; border-radius: 50%; background: ${color}; border: 2px solid white; display: flex; align-items: center; justify-content: center; position: relative; box-shadow: ${isSelected ? `0 0 16px ${color}` : '0 2px 8px rgba(0,0,0,0.4)'}; transition: all 0.2s;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 14 : 11}" height="${isSelected ? 14 : 11}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                    </div>
                  </div>
                `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              })}
              eventHandlers={{
                click: () => onSelect(ws)
              }}
            />
          );
        })}
      </MapContainer>

      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1000 }}>
        {[{ color: 'var(--green-400)', label: "Open" }, { color: 'var(--orange-400)', label: "Busy / Closed" }].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(10,16,26,0.85)', padding: '4px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', border: '1px solid var(--border-dim)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} /> {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserWorkshops({ onNavigate }) {
  const [workshops, setWorkshops] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [currentPageServices, setCurrentPageServices] = useState(1);
  const itemsPerPageServices = 5;
  const [pageInputServices, setPageInputServices] = useState('1');

  useEffect(() => {
    setPageInputServices(currentPageServices.toString());
  }, [currentPageServices]);

  useEffect(() => {
    setCurrentPageServices(1);
  }, [selectedWs]);
  const [loadingWsDetail, setLoadingWsDetail] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState({});
  const [likedReviews, setLikedReviews] = useState({});
  const [searchWs, setSearchWs] = useState('');
  const [filterFlood, setFilterFlood] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile
  useEffect(() => {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
    if (!token) return;

    const loadProfile = async () => {
      try {
        const res = await apiService.get('/auth/profile');
        if (res && res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    };
    loadProfile();
  }, []);

  // Correct selectedWs if it is the owner's workshop
  useEffect(() => {
    if (selectedWs && currentUser && (selectedWs.owner_id === currentUser._id || selectedWs.isOwner || selectedWs.is_owner)) {
      const displayList = workshops.filter(w => !(currentUser && w.owner_id === currentUser._id) && !(w.isOwner || w.is_owner));
      if (displayList.length > 0) {
        setSelectedWs(displayList[0]);
      } else {
        setSelectedWs(null);
      }
    }
  }, [currentUser, workshops, selectedWs]);

  // Initialize data and location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          fetchWorkshops(loc);
        },
        (error) => {
          console.warn('Geolocation failed or permission denied. Using default location.', error);
          const defaultLoc = { lat: 10.03711, lng: 105.78825 };
          setUserLocation(defaultLoc);
          fetchWorkshops(defaultLoc);
        },
        { enableHighAccuracy: true }
      );
    } else {
      const defaultLoc = { lat: 10.03711, lng: 105.78825 };
      setUserLocation(defaultLoc);
      fetchWorkshops(defaultLoc);
    }
  }, []);

  // Fetch FULL workshop details + reviews every time a workshop is selected
  // This ensures we never show stale cached list data in the detail panel
  useEffect(() => {
    if (!selectedWs?.id) return;
    const wsId = selectedWs.id;
    // Skip mock ids
    if (typeof wsId === 'string' && wsId.startsWith('ws')) return;

    const fetchWsDetail = async () => {
      setLoadingWsDetail(true);
      try {
        const res = await apiService.get(`/workshops/${wsId}`);
        if (res.success && res.data) {
          setSelectedWs(prev => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.warn('Failed to fetch workshop detail:', err);
      } finally {
        setLoadingWsDetail(false);
      }
    };

    fetchWsDetail();
    fetchReviews(wsId);
  }, [selectedWs?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWorkshops = async (loc, keepSelectedId = null) => {
    try {
      setLoading(true);
      const res = await apiService.get('/map/workshops');
      if (res.success && res.data) {
        const formatted = res.data.map(w => {
          const latNum = parseFloat(w.lat);
          const lngNum = parseFloat(w.lng);
          const distanceVal = getDistance(loc.lat, loc.lng, latNum, lngNum);
          
          return {
            ...w,
            lat: isNaN(latNum) ? 10.03711 : latNum,
            lng: isNaN(lngNum) ? 105.78825 : lngNum,
            id: w._id,
            rating: w.rating_average || 0,
            reviews: w.rating_count || 0,
            status: w.is_open ? 'open' : 'busy',
            hours: getWorkingHoursForToday(w),
            distanceVal: distanceVal,
            dist: distanceVal !== null ? `${distanceVal.toFixed(1)} km` : 'N/A'
          };
        });

        // Sort by distance (nearest first)
        formatted.sort((a, b) => {
          if (a.distanceVal === null) return 1;
          if (b.distanceVal === null) return -1;
          return a.distanceVal - b.distanceVal;
        });

        setWorkshops(formatted);

        if (keepSelectedId) {
          const current = formatted.find(w => w.id === keepSelectedId);
          if (current) setSelectedWs(current);
        } else if (formatted.length > 0) {
          setSelectedWs(formatted[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching workshops:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (wsId) => {
    try {
      setLoadingReviews(true);
      const res = await apiService.get(`/workshops/${wsId}/reviews`);
      if (res.success && res.data) {
        setReviewsList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const submitReview = async (wsId) => {
    if (!newRating) return;
    try {
      const res = await apiService.post(`/workshops/${wsId}/reviews`, {
        rating: newRating,
        content: newReviewText.trim()
      });

      if (res.success && res.data) {
        setReviewsList(prev => [res.data, ...prev]);
        setReviewSubmitted(prev => ({ ...prev, [wsId]: true }));
        setNewRating(0);
        setNewReviewText('');

        // Refresh workshops stats in background
        await fetchWorkshops(userLocation || { lat: 10.03711, lng: 105.78825 }, wsId);

        setTimeout(() => setReviewSubmitted(prev => ({ ...prev, [wsId]: false })), 3000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      alert(err.message || 'Could not submit review.');
    }
  };

  const deleteReview = (wsId, reviewId) => {
    setReviewToDelete({ wsId, reviewId });
  };

  const executeDeleteReview = async (wsId, reviewId) => {
    try {
      setIsSaving(true);
      const res = await apiService.delete(`/workshops/${wsId}/reviews/${reviewId}`);
      if (res && (res.success || res.status === 200 || res.message)) {
        setReviewsList(prev => prev.filter(r => r._id !== reviewId && r.id !== reviewId));
        await fetchWorkshops(userLocation || { lat: 10.03711, lng: 105.78825 }, wsId);
      } else {
        alert('Failed to delete review. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      alert(err.message || 'Could not delete review.');
    } finally {
      setIsSaving(false);
    }
  };

  const likeReview = (reviewId) => {
    setLikedReviews(prev => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const filteredWs = workshops
    .filter(ws => !(currentUser && ws.owner_id === currentUser._id) && !(ws.isOwner || ws.is_owner))
    .filter(ws => {
      const matchSearch = ws.name.toLowerCase().includes(searchWs.toLowerCase()) || ws.address.toLowerCase().includes(searchWs.toLowerCase());
      const matchFlood = !filterFlood || ws.is_mobile; // matches support / mobile repairs
      return matchSearch && matchFlood;
    });

  if (loading && workshops.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <Loader size={36} className="animate-spin" color="var(--cyan-400)" />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading repair workshops...</div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <style>{`
        .ws-grid-top {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .ws-grid-detail {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
        }
        @media (max-width: 960px) {
          .ws-grid-top {
            grid-template-columns: 1fr;
          }
          .ws-grid-detail {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="page-header">
        <h1>Emergency Repair Workshops</h1>
        <p>Search for the nearest repair shops, view details, and review rescue services</p>
      </div>

      {/* Map + List */}
      <div className="ws-grid-top">
        {/* Map Container */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} color="var(--cyan-400)" />
            <div className="section-title" style={{ fontSize: '0.82rem' }}>System Map of Repair Workshops</div>
          </div>
          <div style={{ padding: 14, flex: 1 }}>
            <WorkshopMap workshops={filteredWs} selected={selectedWs} onSelect={setSelectedWs} userLocation={userLocation} />
          </div>
        </div>

        {/* Workshop List Table */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 420 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
            <div className="input-group" style={{ marginBottom: 8 }}>
              <Search size={13} className="input-icon" />
              <input className="input" placeholder="Search workshops, address..." value={searchWs} onChange={e => setSearchWs(e.target.value)} style={{ height: 30, fontSize: '0.78rem', paddingLeft: 30 }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={filterFlood} onChange={() => setFilterFlood(p => !p)} />
              Show only mobile workshops (flood rescue)
            </label>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredWs.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No repair workshops found.</div>
            ) : (
              filteredWs.map(ws => {
                const isSelected = selectedWs?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => setSelectedWs(ws)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 14px',
                      borderLeft: isSelected ? '3px solid var(--cyan-400)' : '3px solid transparent',
                      borderTop: 'none', borderRight: 'none', borderBottom: '1px solid var(--border-dim)',
                      cursor: 'pointer', background: isSelected ? 'rgba(6,182,212,0.06)' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{ws.name}</span>
                          {ws.is_mobile && <span className="badge badge-cyan" style={{ fontSize: '0.55rem' }}>Mobile</span>}
                          <span className={`badge ${ws.status === 'open' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.55rem' }}>
                            {ws.status === 'open' ? "Open" : "Busy / Closed"}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Star size={11} color="#f59e0b" fill="#f59e0b" />
                          <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#f59e0b' }}>{ws.rating}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({ws.reviews} Reviews)</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={9} /> {ws.address}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color: 'var(--cyan-400)' }}>{ws.dist}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Workshop details + reviews (Google Maps style) */}
      {selectedWs && (
        <div className="ws-grid-detail">
          
          {/* Google Maps Detail Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Cover photo */}
            <div style={{ height: 200, width: '100%', position: 'relative', overflow: 'hidden', background: '#1e293b' }}>
              <img
                src={selectedWs.cover_photo || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=800"}
                alt={selectedWs.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                <span className={`badge ${selectedWs.status === 'open' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                  {selectedWs.status === 'open' ? "Open Now" : "Busy / Closed Now"}
                </span>
                {selectedWs.is_mobile && (
                  <span className="badge badge-cyan" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                    Mobile Repairs (Radius {selectedWs.coverage_radius} km)
                  </span>
                )}
              </div>
            </div>

            {/* Info Body */}
            <div style={{ padding: 24, flex: 1, position: 'relative' }}>
              {loadingWsDetail && (
                <div style={{
                  position: 'absolute', top: 8, right: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  background: 'rgba(10,16,26,0.8)', borderRadius: 6,
                  padding: '4px 10px', backdropFilter: 'blur(4px)',
                  border: '1px solid var(--border-dim)', zIndex: 10
                }}>
                  <Loader size={11} className="animate-spin" />
                  Refreshing data…
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 6, marginTop: 0 }}>{selectedWs.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f59e0b' }}>{selectedWs.rating}</span>
                    <StarRating value={selectedWs.rating} readonly size={14} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({selectedWs.reviews} reviews)</span>
                  </div>
                  {selectedWs.owner_name && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Owner: <strong style={{ color: 'var(--text-secondary)' }}>{selectedWs.owner_name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions (Circular Buttons) */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, borderBottom: '1px solid var(--border-dim)', paddingBottom: 16 }}>
                {/* Directions (Dummy) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
                    <Navigation size={18} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Directions</span>
                </div>

                {/* Chat */}
                <div
                  onClick={() => {
                    const isOwner = currentUser && selectedWs && currentUser._id === selectedWs.owner_id;
                    if (isOwner) return;
                    if (!selectedWs.owner_id) {
                      alert("This workshop does not have an owner account associated.");
                      return;
                    }
                    localStorage.setItem('pending_chat_user', JSON.stringify({
                      id: selectedWs.owner_id,
                      name: selectedWs.owner_name || selectedWs.name,
                      role: 'Workshop',
                      avatar_url: selectedWs.cover_photo || ''
                    }));
                    if (onNavigate) {
                      const targetPage = (currentUser && currentUser.role === 'volunteer')
                        ? 'volunteer-notifications'
                        : 'user-notifications';
                      onNavigate(targetPage);
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    color: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? 'rgba(255,255,255,0.2)' : 'var(--cyan-400)',
                    cursor: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? 'not-allowed' : 'pointer',
                    opacity: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? 0.4 : 1,
                    pointerEvents: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? 'none' : 'auto'
                  }}
                >
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.1)',
                    border: (currentUser && selectedWs && currentUser._id === selectedWs.owner_id) ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(6,182,212,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}>
                    <MessageSquare size={18} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Chat</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>{selectedWs.address}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Phone size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div>{selectedWs.phone}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <Clock size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div>Operating Hours: {getWorkingHoursForToday(selectedWs)}</div>
                </div>
              </div>

              {/* Service Price List */}
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>Service Menu & Price List</h3>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                {(!selectedWs.services || selectedWs.services.length === 0) ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No service pricing has been registered for this workshop.</div>
                ) : (
                  <>
                    {(() => {
                      const totalPagesServices = Math.ceil(selectedWs.services.length / itemsPerPageServices);
                      const paginatedServices = selectedWs.services.slice((currentPageServices - 1) * itemsPerPageServices, currentPageServices * itemsPerPageServices);
                      return (
                        <>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {paginatedServices.map((s, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderBottom: i < paginatedServices.length - 1 ? '1px dashed var(--border-dim)' : 'none', paddingBottom: i < paginatedServices.length - 1 ? 6 : 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                                  <Wrench size={11} color="var(--cyan-400)" />
                                  <span>{s.service_name}</span>
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--cyan-400)', marginLeft: 'auto' }}>
                                  {s.base_price ? `${s.base_price.toLocaleString('vi-VN')} VND` : 'Contact'}
                                  {s.base_price && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / {s.unit || 'turn'}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                          {selectedWs.services.length > 0 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 0 0 0',
                              borderTop: '1px solid var(--border-subtle)',
                              marginTop: 12
                            }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Showing <strong style={{ color: 'var(--text-primary)' }}>{selectedWs.services.length === 0 ? 0 : (currentPageServices - 1) * itemsPerPageServices + 1}-{Math.min(currentPageServices * itemsPerPageServices, selectedWs.services.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{selectedWs.services.length}</strong> services
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setCurrentPageServices(p => Math.max(1, p - 1))}
                                  disabled={currentPageServices === 1}
                                  style={{ opacity: currentPageServices === 1 ? 0.5 : 1, padding: '2px 6px', fontSize: '0.72rem' }}
                                >
                                  Prev
                                </button>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {currentPageServices} / {totalPagesServices}
                                </span>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setCurrentPageServices(p => Math.min(totalPagesServices, p + 1))}
                                  disabled={currentPageServices === totalPagesServices}
                                  style={{ opacity: currentPageServices === totalPagesServices ? 0.5 : 1, padding: '2px 6px', fontSize: '0.72rem' }}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Reviews & Comments Section */}
          <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
              <div className="section-title" style={{ fontSize: '0.82rem' }}>Reviews & Feedback</div>
            </div>

            {/* Post/Write review form */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-dim)', flexShrink: 0, background: 'rgba(6,182,212,0.03)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Rate this workshop</div>
              <div style={{ marginBottom: 10 }}>
                <StarRating value={newRating} onChange={setNewRating} size={20} />
              </div>
              <textarea
                className="input"
                rows={3}
                placeholder="Share details of your experience regarding service, skills, prices..."
                value={newReviewText}
                onChange={e => setNewReviewText(e.target.value)}
                style={{ marginBottom: 8, fontSize: '0.8rem', resize: 'none' }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => submitReview(selectedWs.id)}
                disabled={!newRating}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageSquare size={13} /> Submit review
              </button>
              {reviewSubmitted[selectedWs.id] && (
                <div className="flex items-center gap-2" style={{ marginTop: 8, color: 'var(--green-400)', fontSize: '0.75rem', fontWeight: 600 }}>
                  <CheckCircle size={13} /> Review submitted successfully!
                </div>
              )}
            </div>

            {/* List of reviews from backend */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px', display: 'grid', gap: 10, alignContent: 'start' }}>
              {loadingReviews ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
                  <Loader size={20} className="animate-spin" color="var(--cyan-400)" />
                </div>
              ) : reviewsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No reviews yet for this workshop. Be the first to write one!
                </div>
              ) : (
                reviewsList.map(rev => (
                  <div key={rev._id} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: 'rgba(18,29,40,0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {rev.user?.avatar_url ? (
                          <img
                            src={rev.user.avatar_url}
                            alt={rev.user.full_name}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-dim)' }}
                          />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--cyan-400)' }}>
                            {(rev.user?.full_name || 'A').charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{rev.user?.full_name || 'Anonymous Guest'}</div>
                          <StarRating value={rev.rating} readonly size={11} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {new Date(rev.created_at).toLocaleDateString('en-US')}
                        </span>
                        {(() => {
                          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                          const canDel = currentUser && (String(currentUser._id || currentUser.id) === String(rev.user?._id || rev.user?.id || rev.user) || currentUser.role === 'Admin' || currentUser.role === 'Manager');
                          return canDel ? (
                            <button
                              type="button"
                              onClick={() => deleteReview(selectedWs.id, rev._id || rev.id)}
                              title="Delete review"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#ef4444',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, marginTop: 0 }}>{rev.content}</p>
                    <button
                      onClick={() => likeReview(rev._id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: likedReviews[rev._id] ? 'var(--cyan-400)' : 'var(--text-muted)', padding: 0 }}
                    >
                      <ThumbsUp size={11} fill={likedReviews[rev._id] ? 'var(--cyan-400)' : 'none'} />
                      Helpful ({likedReviews[rev._id] ? 1 : 0})
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!reviewToDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this review/comment? This action cannot be undone."
        loading={isSaving}
        onConfirm={async () => {
          const { wsId, reviewId } = reviewToDelete;
          await executeDeleteReview(wsId, reviewId);
          setReviewToDelete(null);
        }}
        onCancel={() => setReviewToDelete(null)}
      />
    </div>
  );
}
