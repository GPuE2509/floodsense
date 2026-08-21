import React, { useState, useEffect, useRef } from 'react';
import { Search, Cpu, Battery, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/apiService';
import DeviceLifecycleModal from '../../components/common/DeviceLifecycleModal';

function BatteryBar({ value }) {
  const color = value > 50 ? 'var(--green-500)' : value > 20 ? 'var(--yellow-500)' : 'var(--red-500)';
  return (
    <div className="flex items-center gap-2">
      <Battery size={13} color={color} />
      <div style={{ width: 50, height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{value}%</span>
    </div>
  );
}

// Hiển thị badge trạng thái thiết bị
function DeviceStatusBadge({ device }) {
  if (device.is_disabled) {
    return (
      <span className="badge" style={{ background: 'rgba(100,116,139,0.18)', color: 'var(--text-muted)', border: '1px solid rgba(100,116,139,0.3)' }}>
        <span style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Disabled
      </span>
    );
  }
  if (device.status === 'Maintenance') {
    return (
      <span className="badge badge-orange">
        <span style={{ width: 6, height: 6, background: 'var(--orange-400)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Maintenance
      </span>
    );
  }
  const isOnline = (device.current_water_level || device.waterLevel || 0) > 5;
  if (isOnline) {
    return (
      <span className="badge badge-green">
        <span style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Online
      </span>
    );
  }
  return (
    <span className="badge badge-red">
      <span style={{ width: 6, height: 6, background: 'var(--red-400)', borderRadius: '50%', display: 'inline-block' }} />
      {' '}Offline
    </span>
  );
}

export default function ManagerIotDeviceManagement() {
  const [deviceList, setDeviceList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [lifecycleDevice, setLifecycleDevice] = useState(null);

  const fetchDevices = async (isSilent = false, searchQuery = search) => {
    if (!isSilent) setLoading(true);
    try {
      const url = searchQuery && searchQuery.trim() !== '' 
        ? `/iot/devices?search=${encodeURIComponent(searchQuery.trim())}` 
        : '/iot/devices';
      const response = await apiService.get(url);
      if (response && response.success && response.data) {
        setDeviceList(response.data);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDevices(false, search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    fetchDevices();

    const intervalId = setInterval(() => {
      fetchDevices(true);
    }, 5000);

    let ws = null;
    const connectWebSocket = () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://floodsenseapi.onrender.com/api';
      const wsUrl = backendUrl.replace('http', 'ws').replace('/api', '');
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Real-time telemetry: update water/battery for active devices
          if (msg.type === 'iot_telemetry' && msg.device) {
            setDeviceList(prev => prev.map(d => {
              if (d.device_code !== msg.device.device_code) return d;
              return {
                ...d,
                current_water_level: msg.device.current_water_level,
                current_battery_level: msg.device.current_battery_level,
                last_reading_time: msg.device.last_reading_time,
                status: 'Online'
              };
            }));
          }

          // Admin broadcast: another admin tab toggled a device
          if (msg.type === 'device_status_changed') {
            setDeviceList(prev => prev.map(d =>
              d.device_code === msg.device_code
                ? { ...d, is_disabled: msg.is_disabled }
                : d
            ));
          }
        } catch {}
      };

      ws.onclose = () => setTimeout(connectWebSocket, 3000);
    };

    connectWebSocket();
    return () => {
      if (ws) ws.close();
      clearInterval(intervalId);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const listTopRef = useRef(null);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setTimeout(() => {
      if (listTopRef.current) {
        listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredDevices = deviceList;
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, startIndex + itemsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - 1;
    if (start < 1) start = 1;
    if (start + 2 > totalPages) start = totalPages - 2;
    return [start, start + 1, start + 2];
  };

  const totalDevices = deviceList.length;
  const activeDevices = deviceList.filter(d => !d.is_disabled && d.status === 'Online').length;
  const disabledDevices = deviceList.filter(d => d.is_disabled).length;
  const offlineDevices = deviceList.filter(d => !d.is_disabled && d.status !== 'Online').length;

  return (
    <div className="page-enter">
      <style>{`
        .mgr-iot-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .mgr-iot-search-wrap {
          flex: 1;
          max-width: 300px;
        }
        .mgr-iot-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .mgr-iot-table-card {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .mgr-iot-table-card .data-table {
          min-width: 800px;
        }
        @media (max-width: 900px) {
          .mgr-iot-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .mgr-iot-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .mgr-iot-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .mgr-iot-search-wrap {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
      <div className="page-header">
        <h1>IoT Device Management</h1>
      </div>

      <div className="mgr-iot-stat-grid">
        {[
          { label: 'Total Devices', value: totalDevices, color: 'var(--blue-400)' },
          { label: 'Online', value: activeDevices, color: 'var(--green-400)' },
          { label: 'Offline', value: offlineDevices, color: 'var(--red-400)' },
          { label: 'Disabled', value: disabledDevices, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div ref={listTopRef} className="mgr-iot-toolbar">
        <div className="mgr-iot-search-wrap">
          <div className="input-group" style={{ width: '100%' }}>
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder="Find devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices...</div>
      ) : (
        <div className="card table-wrapper mgr-iot-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Image</th>
                <th>Location</th>
                <th>Settings (cm)</th>
                <th>Battery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.map(d => (
                <tr
                  key={d._id || d.device_code}
                  style={{
                    opacity: d.is_disabled ? 0.55 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                >
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <DeviceStatusBadge device={d} />
                    </div>
                  </td>
                  <td>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {d.image_url ? (
                        <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: d.is_disabled ? 'grayscale(100%)' : 'none', transition: 'filter 0.3s' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.is_disabled ? 'var(--text-dim)' : 'var(--text-muted)' }}><Cpu size={18} /></div>
                      )}
                    </div>
                  </td>
                  <td style={{ maxWidth: '250px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: 1.4 }}>
                      {d.location}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calib Height: <span style={{ color: 'var(--text-secondary)' }}>{d.calib_empty_cm} cm</span></div>
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <BatteryBar value={d.is_disabled ? 0 : (d.current_battery_level || 0)} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                      {d.is_disabled ? '—' : `Ping: ${d.last_reading_time ? new Date(d.last_reading_time).toLocaleTimeString() : '--'}`}
                    </div>
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setLifecycleDevice(d)}
                        title="Device Lifecycle"
                      >
                        <Activity size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedDevices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>No IoT devices found.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Clean Centered Pagination Controls (25 items per page, max 3 pages shown, < and > arrow buttons) */}
          {totalPages >= 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Previous Arrow < */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Exactly up to 3 Page Numbers */}
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handlePageChange(pageNum)}
                    style={{ width: 32, height: 32, padding: 0, fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next Arrow > */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {lifecycleDevice && <DeviceLifecycleModal device={lifecycleDevice} onClose={() => setLifecycleDevice(null)} />}
    </div>
  );
}
