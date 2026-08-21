/**
 * DataRetentionConfig.jsx — Admin System Data Retention & Archiving Center
 * Strictly accessible by Role = 'Admin'
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, FileText, ChevronLeft, ChevronRight, Play, Save } from 'lucide-react';
import { apiService } from '../../services/apiService';
import ConfirmModal from '../../components/common/ConfirmModal';

export default function DataRetentionConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showRunConfirm, setShowRunConfirm] = useState(false);

  // Policy & Stats
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [sensoryDays, setSensoryDays] = useState(90);
  const [incidentsDays, setIncidentsDays] = useState(180);
  const [systemLogsDays, setSystemLogsDays] = useState(180);
  const [rescuesDays, setRescuesDays] = useState(365);
  const [dbStats, setDbStats] = useState(null);

  // Audit Logs & Archive files
  const [auditLogs, setAuditLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, logsRes] = await Promise.all([
        apiService.get('/admin/data-retention/policy'),
        apiService.get('/admin/data-retention/logs')
      ]);

      if (policyRes?.data?.policy) {
        const p = policyRes.data.policy;
        setAutoEnabled(Boolean(p.auto_archive_enabled));
        setSensoryDays(p.sensory_retention_days || 90);
        setIncidentsDays(p.incidents_retention_days || 180);
        setSystemLogsDays(p.system_logs_retention_days || 180);
        setRescuesDays(p.rescues_retention_days || 365);
      }
      if (policyRes?.data?.stats) {
        setDbStats(policyRes.data.stats);
      }
      if (logsRes?.logs) {
        setAuditLogs(logsRes.logs);
      }
    } catch (err) {
      console.error('[DataRetentionConfig] Load error:', err);
      setError(err.message || 'Failed to load data retention configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalActiveRecords = (dbStats?.sensory?.count || 0) + (dbStats?.incidents?.count || 0) + (dbStats?.system_logs?.count || 0) + (dbStats?.rescues?.count || 0);
  const totalFootprintMB = ((dbStats?.sensory?.estimated_mb || 0) + (dbStats?.incidents?.estimated_mb || 0) + (dbStats?.system_logs?.estimated_mb || 0) + (dbStats?.rescues?.estimated_mb || 0)).toFixed(2);
  const totalArchivedToDate = auditLogs.reduce((acc, log) => acc + (log.total_records_processed || 0), 0);

  // Flatten all runs into distinct Stream Batches
  const streamBatches = auditLogs.flatMap(log => {
    if (!Array.isArray(log.results)) return [];
    return log.results
      .filter(r => r && r.archive_filename && r.records_archived > 0)
      .map((r, index) => ({
        _id: `${log._id}_${r.stream}_${index}`,
        logId: log._id,
        start_time: log.start_time,
        trigger_type: log.trigger_type,
        executed_by: log.executed_by,
        stream: r.stream,
        retention_days: r.retention_days,
        records_archived: r.records_archived,
        archive_filename: r.archive_filename,
        archive_size_bytes: r.archive_size_bytes
      }));
  });

  const totalPages = Math.ceil(streamBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = streamBatches.slice(startIndex, startIndex + itemsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - 1;
    if (start < 1) start = 1;
    if (start + 2 > totalPages) start = totalPages - 2;
    return [start, start + 1, start + 2];
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSavePolicy = async (customAutoEnabled, showNotification = true) => {
    setSaving(true);
    setError(null);
    if (showNotification) setSuccessMsg(null);
    try {
      const payload = {
        auto_archive_enabled: typeof customAutoEnabled === 'boolean' ? customAutoEnabled : autoEnabled,
        sensory_retention_days: Number(sensoryDays),
        incidents_retention_days: Number(incidentsDays),
        system_logs_retention_days: Number(systemLogsDays),
        rescues_retention_days: Number(rescuesDays),
      };

      await apiService.put('/admin/data-retention/policy', payload);
      if (showNotification) {
        setSuccessMsg('Retention policy saved successfully.');
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Retention policy saved successfully.', type: 'success' } }));
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      setError(err.message || 'Error updating retention policy.');
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Error updating retention policy.', type: 'error' } }));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAuto = async () => {
    const nextState = !autoEnabled;
    setAutoEnabled(nextState);
    await handleSavePolicy(nextState, false);
  };

  const handleEmergencyRun = () => {
    setShowRunConfirm(true);
  };

  const executeEmergencyRun = async () => {
    setRunningNow(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiService.post('/admin/data-retention/run-now', {});
      const processed = res?.logResult?.total_records_processed || 0;
      let msg = '';
      if (processed === 0) {
        msg = 'No expired records found exceeding retention threshold.';
      } else {
        msg = `Archiving complete. Processed ${processed} records.`;
      }
      setSuccessMsg(msg);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type: 'success' } }));
      await fetchData();
      setShowRunConfirm(false);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setError(err.message || 'Error executing manual archive.');
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Error executing manual archive.', type: 'error' } }));
    } finally {
      setRunningNow(false);
    }
  };

  const handleDownloadFile = async (filename, format = 'json') => {
    try {
      const endpoint = format === 'xlsx'
        ? `/admin/data-retention/download/${filename}?format=xlsx`
        : `/admin/data-retention/download/${filename}`;
      const blob = await apiService.getBlob(endpoint);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let cleanBase = filename.replace('.json.gz', '').replace('.gz', '').replace(/-\d{13}/, '');
      if (cleanBase.includes('-cold-archive-')) {
        const parts = cleanBase.split('-cold-archive-');
        cleanBase = `SFTR_Archive_${parts[0].toUpperCase()}_${parts[1] || 'Batch'}`;
      }
      a.download = format === 'xlsx' ? `${cleanBase}.xlsx` : `${cleanBase}.json.gz`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Cannot download file: ' + (err.message || 'File not found on server'));
    }
  };

  if (loading && !dbStats) {
    return (
      <div className="page-enter" style={{ padding: '32px 24px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw className="animate-spin" size={16} />
          <span>Loading data retention configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ paddingBottom: 40 }}>
      {/* NOTIFICATIONS */}
      {error && (
        <div className="alert-banner error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="alert-banner success" style={{ marginBottom: 20 }}>
          {successMsg}
        </div>
      )}

      {/* TOP SECTION: GRID OF 2 CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 24, marginBottom: 24 }}>
        
        {/* CARD 1: RETENTION THRESHOLDS & SCHEDULING */}
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
          <div>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Data Retention Thresholds
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Set automatic expiration periods before archiving & purging
                </div>
              </div>
            </div>

            {/* ACTION ROW: TOGGLE & MANUAL RUN */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 12, padding: '14px',
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--r-md)', marginBottom: 20,
              alignItems: 'stretch',
            }}>
              {/* TOGGLE BLOCK */}
              <div
                onClick={!saving ? handleToggleAuto : undefined}
                style={{
                  flex: '1 1 auto', minWidth: 180,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  background: 'var(--bg-card)',
                  border: `1px solid ${autoEnabled ? 'var(--green-500)' : 'var(--border-subtle)'}`,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  userSelect: 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: autoEnabled ? 'var(--green-400)' : 'var(--text-primary)' }}>
                    Auto Archiving
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {autoEnabled ? 'Active (Monthly)' : 'Paused'}
                  </div>
                </div>
                <label className="toggle" style={{ margin: 0, pointerEvents: 'none' }}>
                  <input type="checkbox" checked={autoEnabled} readOnly />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* MANUAL ARCHIVE BUTTON */}
              <button
                onClick={handleEmergencyRun}
                disabled={runningNow || saving}
                className="btn"
                style={{
                  flex: '1 1 auto', minWidth: 160,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--red-400)', fontWeight: 600, fontSize: '0.82rem',
                  cursor: runningNow ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {runningNow ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                <span>{runningNow ? 'Processing...' : 'Run Archive Now'}</span>
              </button>
            </div>

            {/* RETENTION DAYS INPUT LIST */}
            <div style={{ display: 'grid', gap: 12 }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Sensory IoT Logs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Water level & rise speed telemetry</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={7} max={1800} value={sensoryDays}
                    onChange={e => setSensoryDays(e.target.value)}
                    style={{
                      width: 75, padding: '6px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                      fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>days</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Incident Reports</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Community flood & hazard reports</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={7} max={1800} value={incidentsDays}
                    onChange={e => setIncidentsDays(e.target.value)}
                    style={{
                      width: 75, padding: '6px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                      fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>days</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>System Audit Logs</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Security events & admin activity</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={7} max={1800} value={systemLogsDays}
                    onChange={e => setSystemLogsDays(e.target.value)}
                    style={{
                      width: 75, padding: '6px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                      fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>days</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Rescue SOS Sessions</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Completed emergency rescue missions</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number" min={7} max={1800} value={rescuesDays}
                    onChange={e => setRescuesDays(e.target.value)}
                    style={{
                      width: 75, padding: '6px 10px', background: 'var(--bg-card)',
                      border: '1px solid var(--border-default)', borderRadius: 'var(--r-sm)',
                      color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center',
                      fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>days</span>
                </div>
              </div>

            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => handleSavePolicy()}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: DATABASE HEALTH & STORAGE METRICS */}
        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Database Storage Metrics
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Active collection capacity & archived volume statistics
                </div>
              </div>
            </div>

            {/* TOP STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Records</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {totalActiveRecords.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Storage</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan-400)', marginTop: 4 }}>
                  {totalFootprintMB} MB
                </div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Archived Total</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--green-400)', marginTop: 4 }}>
                  {totalArchivedToDate.toLocaleString()}
                </div>
              </div>
            </div>

            {/* COLLECTION BREAKDOWN GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sensory IoT</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontWeight: 600 }}>&gt; {sensoryDays}d</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {dbStats?.sensory?.count?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>~ {dbStats?.sensory?.estimated_mb || 0} MB active</div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Incidents</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--green-400)', fontWeight: 600 }}>&gt; {incidentsDays}d</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {dbStats?.incidents?.count?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>~ {dbStats?.incidents?.estimated_mb || 0} MB active</div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>System Audit</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--purple-400)', fontWeight: 600 }}>&gt; {systemLogsDays}d</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {dbStats?.system_logs?.count?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>~ {dbStats?.system_logs?.estimated_mb || 0} MB active</div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Rescue SOS</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--blue-400)', fontWeight: 600 }}>&gt; {rescuesDays}d</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {dbStats?.rescues?.count?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>~ {dbStats?.rescues?.estimated_mb || 0} MB active</div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: REPOSITORY AUDIT TABLE */}
      <div className="card p-6">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Archive Repository
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Historical archive batches exported to server storage
            </div>
          </div>
        </div>

        {streamBatches.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No archived records found. All active collections are within current retention limits.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Data Stream</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Trigger</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Executed By</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Records</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((batch) => {
                  let streamLabel = 'Sensory IoT Logs';
                  if (batch.stream === 'incidents') streamLabel = 'Incident Reports';
                  else if (batch.stream === 'system_logs') streamLabel = 'System Audit Logs';
                  else if (batch.stream === 'rescues') streamLabel = 'Rescue SOS Sessions';

                  return (
                    <tr key={batch._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {new Date(batch.start_time).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {streamLabel}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>(&gt;{batch.retention_days}d)</span>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${batch.trigger_type === 'Scheduled_Cron' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          {batch.trigger_type === 'Scheduled_Cron' ? 'Scheduled Cron' : 'Manual Run'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {batch.executed_by?.full_name || (batch.trigger_type === 'Scheduled_Cron' ? 'System Cron' : 'Admin')}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {batch.records_archived ? batch.records_archived.toLocaleString() : 0}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                          ({(batch.archive_size_bytes / 1024).toFixed(1)} KB)
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleDownloadFile(batch.archive_filename, 'xlsx')}
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            <FileText size={12} />
                            <span>Excel (.XLSX)</span>
                          </button>
                          <button
                            onClick={() => handleDownloadFile(batch.archive_filename, 'json')}
                            className="btn btn-outline btn-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem', color: 'var(--cyan-400)', borderColor: 'var(--cyan-500)' }}
                          >
                            <Download size={12} />
                            <span>Gzip (.GZ)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 0 0', marginTop: 16, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: 12 }}>
            <span className="pagination-showing-text" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, streamBatches.length)} of {streamBatches.length} batches
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              {getPageNumbers().map(pageNum => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={showRunConfirm}
        title="Confirm Manual Archive Run"
        message="Are you sure you want to execute immediate data archiving and purging for records exceeding retention policies?"
        confirmText="Confirm"
        loading={runningNow}
        onConfirm={executeEmergencyRun}
        onCancel={() => setShowRunConfirm(false)}
      />
    </div>
  );
}
