import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, Search, Clock, CheckCircle2, 
  AlertCircle, Activity, MapPin, Phone, User, Calendar,
  ChevronRight, ChevronLeft, X, ShieldCheck, UserCheck, Zap, Layers
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function IncidentProcessingLogs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    totalIncidents: 0,
    resolvedIncidents: 0,
    activeOperations: 0,
    cancelledIncidents: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Pagination states & ref
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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


  const fetchLogs = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await apiService.get('/incident-reports/processing-logs');
      if (res && res.success) {
        setLogs(res.data || []);
        if (res.summary) {
          setSummary(res.summary);
        }
      } else if (!isSilent) {
        setError('Failed to fetch real-time incident processing logs from DB.');
      }
    } catch (err) {
      console.error('Error fetching incident processing logs:', err);
      if (!isSilent) setError('Could not connect to database or load processing logs.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    let ws;
    let reconnectTimer;
    const connectWs = () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const wsUrl = backendUrl.replace('http', 'ws').replace('/api', '');
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.type === 'MAP_UPDATE' ||
            msg.type === 'rescue-update' ||
            msg.type === 'notification' ||
            msg.type === 'sos' ||
            msg.type === 'sos_update' ||
            msg.type === 'rescue_session_updated' ||
            msg.type === 'incident_report_updated' ||
            msg.notification?.type?.includes('SOS') ||
            msg.notification?.reference_type === 'rescue_sessions'
          ) {
            fetchLogs(true);
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };
    };
    connectWs();

    const handleUpdate = () => fetchLogs(true);
    window.addEventListener('map-update', handleUpdate);
    window.addEventListener('rescue-update', handleUpdate);
    window.addEventListener('sos-update', handleUpdate);
    window.addEventListener('incident-update', handleUpdate);

    // 5-second background sync to guarantee real-time updates even if WS is busy
    const syncInterval = setInterval(() => fetchLogs(true), 5000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearInterval(syncInterval);
      window.removeEventListener('map-update', handleUpdate);
      window.removeEventListener('rescue-update', handleUpdate);
      window.removeEventListener('sos-update', handleUpdate);
      window.removeEventListener('incident-update', handleUpdate);
    };
  }, []);

  // Filter logic: cleanly mapped to 3 high-level processing states + All
  // And search only on visible fields (excluding "Awaiting Responder Assignment" from matching generic terms like "tin")
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = query === '' || 
        (log.id && log.id.toLowerCase().includes(query)) ||
        (log.title && log.title.toLowerCase().includes(query)) ||
        (log.reporter?.name && log.reporter.name.toLowerCase().includes(query)) ||
        (log.reporter?.phone && log.reporter.phone.toLowerCase().includes(query)) ||
        (log.assignedResponder && !log.assignedResponder.includes('Awaiting') && log.assignedResponder.toLowerCase().includes(query));

      let matchStatus = true;
      const st = log.status || '';
      if (statusFilter === 'Active') {
        matchStatus = !['Resolved', 'Archived', 'Completed', 'Cancelled', 'Rejected'].includes(st);
      } else if (statusFilter === 'Resolved') {
        matchStatus = ['Resolved', 'Archived', 'Completed', 'Approved'].includes(st);
      } else if (statusFilter === 'Cancelled') {
        matchStatus = ['Cancelled', 'Rejected'].includes(st);
      }

      return matchSearch && matchStatus;
    });
  }, [logs, searchQuery, statusFilter]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Pagination logic: max 25 items per page
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Exactly up to 3 page numbers shown around current page
  const getPageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - 1;
    if (start < 1) start = 1;
    if (start + 2 > totalPages) start = totalPages - 2;
    return [start, start + 1, start + 2];
  };

  // Status badge exactly matching IoT Device Management badge tokens
  const getStatusBadge = (status) => {
    if (['Resolved', 'Archived', 'Completed', 'Approved'].includes(status)) {
      return (
        <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%', display: 'inline-block' }} />
          Resolved
        </span>
      );
    }
    if (['Cancelled', 'Rejected'].includes(status)) {
      return (
        <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--red-400)' }}>
          <span style={{ width: 6, height: 6, background: 'var(--red-400)', borderRadius: '50%', display: 'inline-block' }} />
          Cancelled
        </span>
      );
    }
    return (
      <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--blue-400)' }}>
        <span style={{ width: 6, height: 6, background: 'var(--blue-400)', borderRadius: '50%', display: 'inline-block' }} />
        Active
      </span>
    );
  };

  // Dynamic counts accurately reflecting current data (or summary from DB)
  const totalLogs = summary.totalIncidents || logs.length;
  const resolvedCount = summary.resolvedIncidents !== undefined ? summary.resolvedIncidents : logs.filter(l => ['Resolved', 'Archived', 'Completed', 'Approved'].includes(l.status)).length;
  const activeCount = summary.activeOperations !== undefined ? summary.activeOperations : logs.filter(l => !['Resolved', 'Archived', 'Completed', 'Approved', 'Cancelled', 'Rejected'].includes(l.status)).length;
  const cancelledCount = summary.cancelledIncidents !== undefined ? summary.cancelledIncidents : logs.filter(l => ['Cancelled', 'Rejected'].includes(l.status)).length;

  return (
    <div className="page-enter" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .ipl-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          width: 100%;
        }
        .ipl-search-wrap {
          flex: 1;
          max-width: 300px;
        }
        @media (max-width: 900px) {
          .ipl-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .ipl-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .ipl-search-wrap {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
      
      {/* Page Header exactly matching IoT Device Management */}
      <div className="page-header">
        <h1>Incident Processing Logs</h1>
      </div>

      {/* 4 Stat Cards: Total, Resolved, Active, Cancelled */}
      <div className="ipl-stat-grid">
        {[
          { label: 'Total Logged Events', value: totalLogs, color: 'var(--blue-400)' },
          { label: 'Resolved / Completed', value: resolvedCount, color: 'var(--green-400)' },
          { label: 'Active Operations', value: activeCount, color: 'var(--orange-400)' },
          { label: 'Cancelled / Rejected', value: cancelledCount, color: 'var(--red-400)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter and Search Toolbar */}
      <div ref={listTopRef} className="flex items-center justify-between" style={{ marginBottom: 16, width: '100%', flexWrap: 'wrap', gap: 12 }}>
        <div className="ipl-search-wrap">
          <div className="input-group" style={{ width: '100%' }}>
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder="Find incident logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: 'auto', height: 36, padding: '0 12px',
              fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)',
              background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            <option value="All" style={{ background: '#0F172A', color: '#E2E8F0' }}>All Statuses</option>
            <option value="Active" style={{ background: '#0F172A', color: '#60A5FA' }}>Active</option>
            <option value="Resolved" style={{ background: '#0F172A', color: '#34D399' }}>Resolved</option>
            <option value="Cancelled" style={{ background: '#0F172A', color: '#F87171' }}>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading processing logs...</div>
      ) : error ? (
        <div className="card p-5" style={{ textAlign: 'center', color: 'var(--red-400)' }}>
          <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 8 }}>{error}</div>
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">Retry Connection</button>
        </div>
      ) : (
        <div className="card" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Incident / Log ID</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Reporter Information</th>
                  <th>Assigned Responder</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                      No processing logs found matching current filter
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      {/* Column 1: Incident Title & Log ID */}
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {log.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: log.id.startsWith('SOS-') ? 'var(--blue-400)' : 'var(--green-400)', marginTop: 4, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {log.id}
                        </div>
                      </td>

                      {/* Column 2: Status Badge */}
                      <td style={{ textAlign: 'center' }}>
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Column 3: Reporter Info */}
                      <td style={{ maxWidth: '220px' }}>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {log.reporter?.name || 'Anonymous User'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                          {log.created_at ? new Date(log.created_at).toLocaleString('vi-VN') : 'N/A'}
                        </div>
                      </td>

                      {/* Column 4: Assigned Responder & Duration */}
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: log.assignedResponder?.includes('Awaiting') ? 'var(--orange-400)' : 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCheck size={14} style={{ color: log.assignedResponder?.includes('Awaiting') ? 'var(--orange-400)' : 'var(--green-400)', flexShrink: 0 }} />
                          {log.assignedResponder}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={13} />
                          {log.resolutionTimeMinutes != null
                            ? (typeof log.resolutionTimeMinutes === 'number' ? `${log.resolutionTimeMinutes} mins` : log.resolutionTimeMinutes)
                            : 'Active ongoing'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Clean Centered Pagination Controls (10 items per page, max 3 pages shown, < and > arrow buttons) */}
          {totalPages >= 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', position: 'absolute', left: 20 }}>
                Show {filteredLogs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredLogs.length)} / {filteredLogs.length} Log
              </span>
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

    </div>
  );
}
