import React, { useState, useEffect } from 'react';
import {
  History, Search, Filter, RefreshCw, FileDown,
  User, ShieldAlert, Clock, AlertTriangle, ArrowRight, ShieldCheck, Trash2, Sliders, ChevronLeft, ChevronRight, Archive
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import ConfirmModal from '../../components/common/ConfirmModal';

function ActionBadge({ action }) {
  const configs = {
    'SUSPEND_USER':     { color: 'var(--red-400)',    bg: 'rgba(207,52,64,0.08)',  border: 'rgba(207,52,64,0.25)',  label: 'SUSPEND USER' },
    'REACTIVATE_USER':  { color: 'var(--green-400)',  bg: 'rgba(62,169,123,0.08)', border: 'rgba(62,169,123,0.25)', label: 'ACTIVATED USER' },
    'APPROVE_REPORT':   { color: 'var(--cyan-400)',   bg: 'rgba(69,179,192,0.08)', border: 'rgba(69,179,192,0.25)', label: 'APPROVE REPORT' },
    'REJECT_REPORT':    { color: 'var(--red-400)',    bg: 'rgba(207,52,64,0.08)',  border: 'rgba(207,52,64,0.25)',  label: 'REJECT REPORT' },
    'ARCHIVE_REPORT':   { color: 'var(--text-muted)', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.25)', label: 'ARCHIVE REPORT' },
    'DELETE_POST':      { color: 'var(--orange-400)', bg: 'rgba(225,132,60,0.08)', border: 'rgba(225,132,60,0.22)', label: 'DELETE POST' },
    'FEATURE_TOGGLE':   { color: 'var(--gold-400)',   bg: 'rgba(200,162,75,0.08)', border: 'rgba(200,162,75,0.22)', label: 'CONFIG CHANGE' },
  };

  const cfg = configs[action] || { color: 'var(--text-muted)', bg: 'rgba(127,147,166,0.1)', border: 'rgba(127,147,166,0.2)', label: action };

  return (
    <span style={{
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      padding: '3px 8px',
      borderRadius: '99px',
      fontSize: '0.62rem',
      fontWeight: 800,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }}>
      {action === 'SUSPEND_USER' && <ShieldAlert size={10} />}
      {action === 'REACTIVATE_USER' && <ShieldCheck size={10} />}
      {action === 'APPROVE_REPORT' && <CheckCircleIcon size={10} />}
      {action === 'REJECT_REPORT' && <ShieldAlert size={10} />}
      {action === 'ARCHIVE_REPORT' && <Archive size={10} />}
      {action === 'DELETE_POST' && <Trash2 size={10} />}
      {action === 'FEATURE_TOGGLE' && <Sliders size={10} />}
      {cfg.label}
    </span>
  );
}

function CheckCircleIcon({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function OperationLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchLogs = async (currentPage = page, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search,
        action: actionFilter,
        page: currentPage,
        limit
      }).toString();
      
      const res = await apiService.get(`/auth/admin/system-logs?${queryParams}`);
      if (res && res.success) {
        setLogs(res.logs);
        setTotal(res.total);
        setTotalPages(res.pages);
      } else {
        setError(res?.message || 'Failed to fetch operation logs.');
      }
    } catch (err) {
      console.error('Error fetching operations logs:', err);
      setError(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, actionFilter]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchLogs(1);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleExport = () => {
    if (logs.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ logs, total }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `operation_audit_logs_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleDelete = (id) => {
    setLogToDelete(id);
  };

  const executeDeleteLog = async (id) => {
    try {
      setIsSaving(true);
      const res = await apiService.delete(`/auth/admin/system-logs/${id}`);
      if (res && res.success) {
        setLogs((prev) => prev.filter(log => log.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Audit log deleted successfully.', type: 'success' } }));
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: res?.message || 'Failed to delete operation log.', type: 'error' } }));
      }
    } catch (err) {
      console.error('Error deleting operation log:', err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Error occurred while deleting operation log.', type: 'error' } }));
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="page-enter">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Operation Audit Logs</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Audit trace of administrator operations including user bans, post removals, and configuration changes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" onClick={() => fetchLogs(page, true)} disabled={refreshing}>
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExport} disabled={logs.length === 0}>
              <FileDown size={13} />
              Export Audit Trail
            </button>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3 w-full">
          <div className="input-group" style={{ maxWidth: 300, flex: 1 }}>
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder="Search by operator name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="input"
              style={{ width: 180 }}
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Actions</option>
              <option value="SUSPEND_USER">Suspend User</option>
              <option value="REACTIVATE_USER">Reactivate User</option>
              <option value="APPROVE_REPORT">Approve Report</option>
              <option value="REJECT_REPORT">Reject Report</option>
              <option value="ARCHIVE_REPORT">Archive Report</option>
              <option value="DELETE_POST">Delete Post</option>
              <option value="FEATURE_TOGGLE">Config Change</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Total Audit Records: <span style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>{total}</span>
          </div>
        </div>
      </div>

      {/* ── Table Log List ── */}
      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--r-md)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="card p-6 text-center" style={{ border: '1px solid rgba(239,29,55,0.2)' }}>
          <AlertTriangle size={32} color="var(--red-400)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>Could not load logs</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : (
        <>
          <div className="card table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operator</th>
                  <th>Action</th>
                  <th>Reason / Details</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={11} />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                          {log.operator.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {log.operator.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.reason}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Delete log record"
                        onClick={() => handleDelete(log.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: 'var(--red-400)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No operation logs found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)'
          }}>
            <span className="pagination-showing-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Show {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total} Audit Log
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ width: 32, height: 32, padding: 0, fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => handlePageChange(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="btn btn-ghost btn-sm btn-icon"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => handlePageChange(page + 1)}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
      <ConfirmModal
        isOpen={!!logToDelete}
        title="Confirm Delete"
        message="Are you sure you want to permanently delete this audit log record?"
        loading={isSaving}
        onConfirm={async () => {
          const id = logToDelete;
          await executeDeleteLog(id);
          setLogToDelete(null);
        }}
        onCancel={() => setLogToDelete(null)}
      />
    </div>
  );
}
