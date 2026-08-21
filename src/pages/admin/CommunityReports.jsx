import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Filter, CheckCircle, XCircle, Eye, Megaphone,
  Bot, AlertTriangle, Clock, ChevronLeft, ChevronRight, Send, X,
  MapPin, Camera, ThumbsUp, ThumbsDown, Radio, Timer, Archive, Users,
} from 'lucide-react';


function AiScoreBadge({ score, verdict }) {
  const color = score >= 80 ? 'var(--green-400)' : score >= 50 ? 'var(--yellow-400)' : 'var(--red-400)';
  const bg = score >= 80 ? 'rgba(34,197,94,0.1)' : score >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';
  const border = score >= 80 ? 'rgba(34,197,94,0.3)' : score >= 50 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)';
  const label = verdict === 'verified' ? "AI: Authentication" : verdict === 'rejected' ? "AI: Refuse" : "AI: Not sure";

  return (
    <div className="flex items-center gap-2">
      <Bot size={13} style={{ color }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color, background: bg, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 99 }}>
        {label} ({score}%)
      </span>
    </div>
  );
}

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Recent';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${Math.max(0, diffMins)} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const formatCountdown = (expiredAt) => {
  if (!expiredAt) return null;
  const diff = new Date(expiredAt) - new Date();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
};

const lifecycleBadge = {
  Active: <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-400)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 8px', borderRadius: 99 }}>🟢 Active</span>,
  Pending_Verification: <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.3)', padding: '2px 8px', borderRadius: 99 }}>⚪ Pending Verify</span>,
  Archived: <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--red-400)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: 99 }}>🔴 Archived</span>,
};

function ReportModal({ report, onClose, onAction }) {
  if (!report) return null;
  const aiScore = report.ai_confidence_score ? Math.round(report.ai_confidence_score * 100) : 0;
  const aiVerdict = aiScore >= 80 ? 'verified' : aiScore >= 50 ? 'uncertain' : 'rejected';
  const parsedImages = report.images ? JSON.parse(report.images) : [];
  const [modalTab, setModalTab] = useState('detail');
  const [votersPage, setVotersPage] = useState(1);
  const [localSeverity, setLocalSeverity] = useState(report.severity || 'Medium');
  const countdown = formatCountdown(report.expiredAt);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Report details
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
              Posted by {report.reporter_id?.full_name || report.reporter_name || 'Anonymous'} · {formatRelativeTime(report.created_at)}
              {lifecycleBadge[report.lifecycle_status] || null}
              {(() => {
                const typeColors = {
                  flood: { label: 'Flooding', text: 'var(--cyan-400)', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)' },
                  accident: { label: 'Traffic accident', text: 'var(--orange-400)', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)' },
                  tree: { label: 'Tree falling', text: 'var(--green-400)', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)' },
                  traffic: { label: 'Serious traffic jam', text: 'var(--yellow-400)', bg: 'rgba(250,204,21,0.1)', border: 'rgba(250,204,21,0.25)' },
                  infra: { label: 'Infrastructure failure', text: 'var(--red-400)', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
                };
                const typeCfg = typeColors[report.report_type?.trim().toLowerCase()] || { label: report.report_type || 'Flooding', text: 'var(--cyan-400)', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)' };
                return (
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 700, 
                    color: typeCfg.text, 
                    background: typeCfg.bg, 
                    border: `1px solid ${typeCfg.border}`, 
                    padding: '2px 8px', 
                    borderRadius: 99 
                  }}>
                    {typeCfg.label}
                  </span>
                );
              })()}
              {countdown && <span style={{ fontSize: '0.7rem', color: countdown === 'Expired' ? 'var(--red-400)' : 'var(--orange-400)', display: 'flex', alignItems: 'center', gap: 3 }}><Timer size={11} />{countdown}</span>}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Modal Tabs */}
        <div className="tabs-nav" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-dim)' }}>
          <button className={`tab-btn ${modalTab === 'detail' ? 'active' : ''}`} style={{ fontSize: '0.8rem' }} onClick={() => setModalTab('detail')}>Details</button>
          <button className={`tab-btn ${modalTab === 'votes' ? 'active' : ''}`} style={{ fontSize: '0.8rem' }} onClick={() => setModalTab('votes')}>
            Votes ({(report.vote_still_exist || 0) + (report.vote_no_more || 0) + (report.vote_wrong_report || 0)})
          </button>
        </div>

        {modalTab === 'detail' && (
        <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
          {/* User info */}
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6cff,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', color: 'white' }}>
              {(report.reporter_id?.full_name || report.reporter_name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{report.reporter_id?.full_name || report.reporter_name || 'Anonymous'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {report.reporter_id?.email || 'No email'}{report.reporter_id?.phone ? ` · ${report.reporter_id.phone}` : ''}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {report.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Severity:</span>
                {(!report.status || report.status === 'pending') ? (
                  <select 
                    className="input" 
                    style={{ padding: '2px 8px', fontSize: '0.8rem', height: 'auto', minHeight: '28px' }}
                    value={localSeverity}
                    onChange={(e) => setLocalSeverity(e.target.value)}
                  >
                    <option value="Serious">Serious</option>
                    <option value="Medium">Medium</option>
                    <option value="Light">Light</option>
                  </select>
                ) : (
                  <span style={{ fontWeight: 600, color: 'var(--orange-400)' }}>{report.severity || 'Medium'}</span>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {report.description}
            </div>
          </div>

          {/* Images count */}
          {parsedImages.length > 0 && (
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <Camera size={14} />
                {parsedImages.length} attached image
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                {parsedImages.map((img, i) => (
                  <img key={i} src={img.url} alt={`img-${i}`} style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border-dim)', cursor: 'zoom-in' }} onClick={() => onAction(img.url, 'fullscreen')} />
                ))}
              </div>
            </div>
          )}

          {/* AI Assessment */}
          {report.report_type === 'flood' && (
            <div style={{ background: 'rgba(26,108,255,0.06)', border: '1px solid rgba(26,108,255,0.2)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🤖 AI Review
              </div>
              <div className="flex items-center gap-3">
                <AiScoreBadge score={aiScore} verdict={aiVerdict} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Trust level: {aiScore}%
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${aiScore}%`,
                    background: aiScore >= 80 ? 'var(--green-500)' : aiScore >= 50 ? 'var(--yellow-500)' : 'var(--red-500)',
                    borderRadius: 99,
                    transition: 'width 1s ease-out',
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {modalTab === 'votes' && (
        <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
          {/* Vote summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Still exists', value: report.vote_still_exist || 0, color: 'var(--green-400)' },
              { label: 'Not anymore', value: report.vote_no_more || 0, color: 'var(--orange-400)' },
              { label: 'False report', value: report.vote_wrong_report || 0, color: 'var(--red-400)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Vote list */}
          {(() => {
            const sortedVoters = [...(report.voters || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const limit = 5;
            const startIndex = (votersPage - 1) * limit;
            const paginatedVoters = sortedVoters.slice(startIndex, startIndex + limit);
            const totalPages = Math.ceil(sortedVoters.length / limit);

            if (sortedVoters.length === 0) {
              return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>No votes yet</div>;
            }

            const getUsername = (user) => {
              if (!user) return 'Guest';
              if (user.username) return user.username;
              if (user.email) return user.email.split('@')[0];
              return 'guest';
            };

            return (
              <>
                <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {paginatedVoters.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{v.user_id?.full_name || 'User'} ({getUsername(v.user_id)})</span>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 600, 
                            color: v.vote_type === 'confirm' ? 'var(--green-400)' : v.vote_type === 'deny' ? 'var(--orange-400)' : 'var(--red-400)',
                            background: v.vote_type === 'confirm' ? 'rgba(34,197,94,0.1)' : v.vote_type === 'deny' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${v.vote_type === 'confirm' ? 'rgba(34,197,94,0.25)' : v.vote_type === 'deny' ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)'}`,
                            padding: '2px 6px',
                            borderRadius: 4,
                            marginLeft: 8
                          }}>
                            {v.vote_type === 'confirm' ? 'Still exists' : v.vote_type === 'deny' ? 'Not anymore' : 'False report'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {v.user_id?.email || 'No email'}{v.user_id?.phone ? ` · ${v.user_id.phone}` : ''}
                          {v.photo_url && <span style={{ marginLeft: 8, color: 'var(--cyan-400)' }}>Photo attached</span>}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatRelativeTime(v.created_at)}</div>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '0 4px' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      disabled={votersPage === 1}
                      onClick={() => setVotersPage(prev => prev - 1)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Page {votersPage} of {totalPages}
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      disabled={votersPage === totalPages}
                      onClick={() => setVotersPage(prev => prev + 1)}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        <div className="modal-footer">
          {report.lifecycle_status !== 'Archived' && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }} onClick={() => { onAction(report._id, 'archive'); onClose(); }}>
              <Archive size={13} /> Archive
            </button>
          )}
          {(!report.status || report.status === 'pending') ? (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => { onAction(report._id, 'rejected'); onClose(); }}>
                <XCircle size={14} /> Reject
              </button>
              <button className="btn btn-success btn-sm" onClick={() => { onAction(report._id, 'approved', localSeverity); onClose(); }}>
                <CheckCircle size={14} /> Approve
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}



export default function CommunityReports() {
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportId = params.get('reportId');
    if (reportId && reports.length > 0) {
      const match = reports.find(r => r._id === reportId || r.id === reportId);
      if (match) {
        setSelectedReport(match);
        setTimeout(() => {
          const element = document.getElementById(`report-row-${reportId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.boxShadow = '0 0 15px var(--cyan-400)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 3000);
          }
        }, 500);
      }
    }
  }, [location.search, reports]);

  React.useEffect(() => {
    fetchReports();

    const handleIncidentUpdate = () => {
      fetchReports();
    };

    window.addEventListener('incident-update', handleIncidentUpdate);
    return () => {
      window.removeEventListener('incident-update', handleIncidentUpdate);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('https://floodsenseapi.onrender.com/api/incident-reports');
      const data = await res.json();
      if (data.success) {
        const mappedData = data.data.map(r => ({ 
          ...r, 
          status: r.moderation_status ? r.moderation_status.toLowerCase() : 'pending',
          lifecycle_status: r.lifecycle_status || 'Active'
        }));
        setReports(mappedData);
        setSelectedReport(prev => {
          if (!prev) return null;
          const updated = mappedData.find(r => r._id === prev._id || r.id === prev._id || r._id === prev.id);
          return updated || prev;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };





  const filtered = reports.filter((r) => {
    const user = r.reporter_id?.full_name || r.reporter_name || 'Anonymous';
    const location = r.location?.address || '';
    const description = r.description || '';
    const title = r.title || '';
    const matchSearch = user.toLowerCase().includes(search.toLowerCase()) ||
      location.toLowerCase().includes(search.toLowerCase()) ||
      description.toLowerCase().includes(search.toLowerCase()) ||
      title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAction = async (id, action, severity) => {
    if (action === 'fullscreen') {
      setFullscreenImage(id); // id is image url in this case
      return;
    }
    try {
      const payload = { status: action };
      if (severity) {
        payload.severity = severity;
      }
      const res = await fetch(`https://floodsenseapi.onrender.com/api/incident-reports/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        if (action === 'archive') {
          setReports((prev) => prev.map((r) => r._id === id ? { ...r, lifecycle_status: 'Archived' } : r));
        } else {
          setReports((prev) => prev.map((r) => r._id === id ? { ...r, status: action, moderation_status: action.charAt(0).toUpperCase() + action.slice(1) } : r));
        }
        await fetchReports();
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Report successfully ${action === 'approved' ? 'approved' : (action === 'rejected' ? 'rejected' : 'archived')}!`, type: 'success' } }));
      } else {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Failed to ${action} report.`, type: 'error' } }));
      }
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Connection error while processing report.', type: 'error' } }));
    }
  };

  const severityLabel = { high: "Serious", medium: "Medium", low: "Light", none: 'N/A' };
  const statusBadge = {
    pending: <span className="badge badge-orange">Waiting for approval</span>,
    approved: <span className="badge badge-green">Approved</span>,
    rejected: <span className="badge badge-red">Rejected</span>,
  };

  const filteredLifecycle = filterStatus === 'all' ? filtered : 
    ['active', 'pending_verification', 'archived'].includes(filterStatus)
      ? reports.filter(r => (r.lifecycle_status || 'Active').toLowerCase() === filterStatus.toLowerCase())
      : filtered;

  const displayReports = ['active', 'pending_verification', 'archived'].includes(filterStatus) ? filteredLifecycle : filtered;

  const totalPages = Math.ceil(displayReports.length / itemsPerPage);
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const getPageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - 1;
    if (start < 1) start = 1;
    if (start + 2 > totalPages) start = totalPages - 2;
    return [start, start + 1, start + 2];
  };
  const paginatedReports = displayReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Moderation of Community Reports</h1>
            <p>AI automatically classifies – Manual moderation – Public notification management</p>
          </div>

        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Waiting for approval", value: reports.filter(r => r.status === 'pending' || !r.status).length, color: 'var(--orange-400)' },
          { label: "AI Authentication", value: reports.filter(r => r.ai_confidence_score >= 0.8).length, color: 'var(--green-400)' },
          { label: "Need to consider", value: reports.filter(r => r.ai_confidence_score < 0.8 && r.ai_confidence_score >= 0.5).length, color: 'var(--yellow-400)' },
          { label: "Processed today", value: reports.filter(r => r.status === 'approved' || r.status === 'rejected').length, color: 'var(--blue-400)' },
        ].map((s) => (
          <div key={s.label} className="card p-5" style={{ borderLeft: `3px solid ${s.color}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs and Filters */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 20 }}>
        <div className="tabs-nav" style={{ width: 'auto' }}>
          <button className="tab-btn active">
            Report ({reports.length})
          </button>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="input-group" style={{ width: 280 }}>
              <Search size={15} className="input-icon" />
              <input
                className="input"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input" style={{ width: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All status</option>
              <optgroup label="Moderation">
                <option value="pending">Waiting for approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </optgroup>
              <optgroup label="Lifecycle">
                <option value="active">🟢 Active</option>
                <option value="pending_verification">⚪ Pending Verification</option>
                <option value="archived">🔴 Archived</option>
              </optgroup>
            </select>
        </div>
      </div>



          {/* Reports list */}
          <div style={{ display: 'grid', gap: 12 }}>
            {paginatedReports.map((report) => {
              const rStatus = report.status || 'pending';
              const lcStatus = report.lifecycle_status || 'Active';
              const aiScore = report.ai_confidence_score ? Math.round(report.ai_confidence_score * 100) : 0;
              const aiVerdict = aiScore >= 80 ? 'verified' : aiScore >= 50 ? 'uncertain' : 'rejected';
              const parsedImages = report.images ? JSON.parse(report.images) : [];
              const countdown = formatCountdown(report.expiredAt);
              const borderColor = lcStatus === 'Active' ? 'var(--green-400)' : lcStatus === 'Pending_Verification' ? 'var(--text-muted)' : 'var(--red-400)';
              return (
                <div
                  id={`report-row-${report._id}`}
                  key={report._id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    borderLeft: `3px solid ${borderColor}`,
                    animation: 'slide-in-up 0.3s ease-out',
                    opacity: lcStatus === 'Archived' ? 0.6 : 1,
                  }}
                >
                  <div className="report-card-row flex items-start gap-4" style={{ flexWrap: 'wrap' }}>
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6cff,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'white', flexShrink: 0 }}>
                      {(report.reporter_id?.full_name || report.reporter_name || 'A').charAt(0).toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="report-card-content" style={{ flex: '1 1 220px', minWidth: 200 }}>
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{report.reporter_id?.full_name || report.reporter_name || 'Anonymous'}</span>
                        {statusBadge[rStatus]}
                        {lifecycleBadge[lcStatus]}
                        {report.report_type === 'flood' && (
                          <AiScoreBadge score={aiScore} verdict={aiVerdict} />
                        )}
                        {countdown && (
                          <span style={{ fontSize: '0.7rem', color: countdown === 'Expired' ? 'var(--red-400)' : 'var(--orange-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} />{countdown}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />{formatRelativeTime(report.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                        <MapPin size={12} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.title} - {report.location?.address || ''}</span>
                        {parsedImages.length > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cyan-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Camera size={11} /> {parsedImages.length} image
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: parsedImages.length > 0 ? 12 : 0, wordBreak: 'break-word' }}>
                        {report.description}
                      </div>

                      {parsedImages.length > 0 && (
                        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                          {parsedImages.slice(0, 4).map((img, i) => (
                            <div key={i} style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                              <img src={img.url} alt={`img-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-dim)', cursor: 'zoom-in' }} onClick={(e) => { e.stopPropagation(); setFullscreenImage(img.url); }} />
                              {i === 3 && parsedImages.length > 4 && (
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold', pointerEvents: 'none' }}>
                                  +{parsedImages.length - 4}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {rStatus === 'pending' && (
                      <div className="report-card-actions flex items-center gap-2" style={{ flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedReport(report)}>
                          <Eye size={13} /> Detail
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleAction(report._id, 'rejected')}>
                          <ThumbsDown size={13} /> Reject
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => handleAction(report._id, 'approved')}>
                          <ThumbsUp size={13} /> Approve
                        </button>
                      </div>
                    )}
                    {rStatus !== 'pending' && (
                      <div className="report-card-actions flex items-center gap-2" style={{ flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedReport(report)}>
                          <Eye size={13} /> Detail
                        </button>
                        {lcStatus !== 'Archived' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleAction(report._id, 'archive')} style={{ color: 'var(--red-400)' }}>
                            <Archive size={13} /> Archive
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Centered Pagination Controls */}
          {displayReports.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: '16px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--r-md)',
              marginTop: 16
            }}>
              <div className="pagination-showing-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{displayReports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, displayReports.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{displayReports.length}</strong> reports
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Previous Arrow < */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage <= 1 ? 0.5 : 1 }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
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
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}


      {selectedReport && <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} onAction={handleAction} />}

      {/* 🖼️ FULLSCREEN IMAGE LIGHTBOX */}
      {fullscreenImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }} onClick={() => setFullscreenImage(null)}>
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', color: '#fff' }} onClick={() => setFullscreenImage(null)}>
            <X size={24} />
          </button>
          <img src={fullscreenImage} alt="fullscreen" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </div>
  );
}

function FileIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
}
