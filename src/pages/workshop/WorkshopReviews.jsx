import React, { useState, useEffect, useRef } from 'react';
import {
  Star, ThumbsUp, ThumbsDown, Send, CheckCircle,
  Filter, MessageSquare, Clock, ChevronDown, ChevronUp,
  Flag, User, Loader, Camera, SquarePen, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import { apiService } from '../../services/apiService';

const ratingColors = { 5: 'var(--green-400)', 4: '#f59e0b', 3: 'var(--orange-400)', 2: 'var(--red-400)', 1: 'var(--red-400)' };

export default function WorkshopReviews() {
  const [workshopId, setWorkshopId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [replies, setReplies] = useState({});
  const [sentId, setSentId] = useState(null);
  const [respondingReviewId, setRespondingReviewId] = useState(null);
  const [replyImages, setReplyImages] = useState({});
  const replyFileInputRef = useRef(null);
  const [responseToDelete, setResponseToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: message,
        type: type
      }
    }));
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [pageInput, setPageInput] = useState('1');

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchWorkshopAndReviews = async (silent = false) => {
    if (!silent && reviews.length === 0) setLoading(true);
    try {
      let wId = workshopId;
      if (!wId) {
        const wsRes = await apiService.get('/workshops/me');
        const wsObj = wsRes?.workshop || wsRes?.data || wsRes;
        if (wsObj && (wsObj._id || wsObj.id)) {
          wId = wsObj._id || wsObj.id;
          setWorkshopId(wId);
        }
      }
      if (wId) {
        const revRes = await apiService.get(`/workshops/${wId}/reviews`);
        const list = revRes?.data || revRes?.reviews || (Array.isArray(revRes) ? revRes : []);
        if (Array.isArray(list)) {
          const mapped = list.map(r => {
            const ownerResp = r.owner_response || (Array.isArray(r.replies) && r.replies.length > 0 ? r.replies[r.replies.length - 1] : null);
            return {
              id: r._id || r.id,
              customer: r.user?.full_name || r.user?.name || r.customer || r.user_name || 'Customer',
              taskId: r.taskId || r.service_name || 'Repair Service',
              service: r.service || r.service_name || 'Workshop Repair',
              rating: Number(r.rating) || 5,
              comment: r.content || r.comment || '',
              images: Array.isArray(r.images) ? r.images : [],
              time: r.created_at ? new Date(r.created_at).toLocaleString('en-US') : 'Just now',
              status: (ownerResp?.content || r.reply) ? 'replied' : 'pending',
              reply: ownerResp?.content || r.reply || null,
              reply_images: Array.isArray(ownerResp?.images) ? ownerResp.images : (Array.isArray(r.reply_images) ? r.reply_images : []),
              reply_time: ownerResp?.created_at ? new Date(ownerResp.created_at).toLocaleString('en-US') : '',
              isCritical: Number(r.rating) <= 3
            };
          });
          setReviews(mapped);
        } else {
          setReviews([]);
        }
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error loading real workshop reviews:', err);
      if (reviews.length === 0) setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopAndReviews();

    let ws;
    let timer;
    const connectWs = () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://floodsenseapi.onrender.com/api';
      const wsUrl = backendUrl.replace('http', 'ws').replace('/api', '');
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.type === 'WORKSHOP_REVIEW_UPDATED' ||
            msg.type === 'notification' ||
            msg.type === 'MAP_UPDATE'
          ) {
            fetchWorkshopAndReviews(true);
          }
        } catch (err) { }
      };
      ws.onclose = () => {
        timer = setTimeout(connectWs, 3000);
      };
    };
    connectWs();

    return () => {
      if (ws) ws.close();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const filtered = reviews.filter(r =>
    filter === 'all' || (filter === 'pending' && r.status === 'pending') || (filter === 'replied' && r.status === 'replied') || (filter === 'critical' && r.rating <= 3)
  );

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '5.0';
  const counts = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedReviews = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleReplyImageChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { showToast("Image max size is 10MB per file", "error"); continue; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImages(prev => {
          const current = prev[respondingReviewId] || [];
          return current.length < 5 ? { ...prev, [respondingReviewId]: [...current, reader.result] } : prev;
        });
      };
      reader.readAsDataURL(file);
    }
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const sendReply = async (id) => {
    const text = replies[id];
    if (!text?.trim() || !workshopId || sending) return;
    try {
      setSending(true);
      const imagesPayload = replyImages[id] || [];
      const res = await apiService.post(`/workshops/${workshopId}/reviews/${id}/respond`, {
        content: text.trim(),
        images: imagesPayload
      });
      if (res && (res.success || res.data || res.status === 200 || res.review || res.message)) {
        setReviews(prev => prev.map(r => r.id === id ? {
          ...r,
          status: 'replied',
          reply: text.trim(),
          reply_images: imagesPayload,
          reply_time: new Date().toLocaleString('en-US')
        } : r));
        setReplies(prev => ({ ...prev, [id]: '' }));
        setReplyImages(prev => ({ ...prev, [id]: [] }));
        setRespondingReviewId(null);
        setSentId(id);
        showToast('Reply submitted successfully!', 'success');
      } else {
        showToast('An error occurred while submitting your response. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error sending response to review:', err);
      showToast('Could not submit response: ' + (err.message || 'Connection error'), 'error');
    } finally {
      setSending(false);
    }
  };

  const deleteResponse = (id) => {
    setResponseToDelete(id);
  };

  const executeDeleteResponse = async (id) => {
    if (!workshopId || sending) return;
    try {
      setSending(true);
      const res = await apiService.delete(`/workshops/${workshopId}/reviews/${id}/respond`);
      if (res && (res.success || res.status === 200 || res.data || res.message)) {
        setReviews(prev => prev.map(r => r.id === id ? {
          ...r,
          status: 'pending',
          reply: null,
          reply_images: [],
          reply_time: ''
        } : r));
        showToast('Response deleted successfully!', 'success');
      } else {
        showToast('An error occurred while deleting your response. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Error deleting response:', err);
      showToast('Could not delete response: ' + (err.message || 'Connection error'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Customer Reviews</h1>
        <p>View and respond to customer reviews to improve service quality</p>
      </div>

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader size={28} className="spin" style={{ margin: '0 auto 12px', color: 'var(--blue-400)' }} />
          <div>Loading customer reviews...</div>
        </div>
      ) : (
        <>
          <style>{`
            .wr-summary-grid {
              display: grid;
              grid-template-columns: 0.5fr 1.5fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            @media (max-width: 768px) {
              .wr-summary-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
          {/* Summary */}
          <div className="wr-summary-grid">
            <div className="card p-6" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{avgRating}</div>
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', margin: '8px 0' }}>
                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'} color={s <= Math.round(avgRating) ? '#f59e0b' : 'var(--border-default)'} />)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{reviews.length} Evaluate</div>
            </div>

            <div className="card p-6">
              <div className="section-title" style={{ marginBottom: 12 }}>Rating distribution</div>
              {[5, 4, 3, 2, 1].map(star => {
                const count = counts[star];
                const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={11} fill={s <= star ? '#f59e0b' : 'none'} color={s <= star ? '#f59e0b' : 'var(--border-default)'} />)}
                    </div>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ratingColors[star], borderRadius: 99, boxShadow: `0 0 6px ${ratingColors[star]}44` }} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            <Filter size={14} color="var(--text-muted)" />
            {[
              { key: 'all', label: "All" },
              { key: 'pending', label: "No response yet" },
              { key: 'replied', label: "Responded" },
              { key: 'critical', label: "Needs attention (≤3★)" },
            ].map(f => (
              <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f.key)}>
                {f.label} {f.key === 'pending' && reviews.filter(r => r.status === 'pending').length > 0 && <span className="nav-badge" style={{ marginLeft: 4 }}>{reviews.filter(r => r.status === 'pending').length}</span>}
              </button>
            ))}
          </div>

          {/* Reviews list */}
          <div style={{ display: 'grid', gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={38} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No customer reviews found matching current filter
                </div>
                <div style={{ fontSize: '0.82rem' }}>
                  Customer reviews and ratings submitted after vehicle repairs will appear in this feed.
                </div>
              </div>
            ) : (
              paginatedReviews.map(r => (
                <div key={r.id} className="card" style={{
                  padding: '16px 20px',
                  borderLeft: r.rating >= 4 ? '3px solid var(--green-400)' : r.rating === 3 ? '3px solid var(--orange-400)' : '3px solid var(--red-400)',
                }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3" style={{ flex: 1 }}>
                      <div className="user-avatar" style={{ width: 38, height: 38, fontSize: '0.75rem', flexShrink: 0 }}>
                        {(r.customer || 'C').split(' ').slice(-2).map(n => n[0]).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.customer}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.taskId}</span>
                          <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(217,119,6,0.1)', color: '#f59e0b', border: 'none' }}>{r.service}</span>
                          <span className={`badge ${r.status === 'replied' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.62rem' }}>
                            {r.status === 'replied' ? "✓ Responded" : "No response yet"}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />{r.time}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill={s <= r.rating ? '#f59e0b' : 'none'} color={s <= r.rating ? '#f59e0b' : 'var(--border-default)'} />)}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic', marginBottom: 6 }}>
                          "{r.comment}"
                        </div>
                        {r.images && r.images.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, margin: '8px 0', flexWrap: 'wrap' }}>
                            {r.images.map((img, i) => (
                              <img
                                key={i}
                                src={typeof img === 'string' ? img : (img.url || img.secure_url || '')}
                                alt="Review"
                                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-default)' }}
                              />
                            ))}
                          </div>
                        )}
                        {r.reply && respondingReviewId !== r.id && (
                          <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.65)', borderLeft: '3px solid #06b6d4' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#38bdf8' }}>
                                  Workshop Owner Response
                                </span>
                                {r.reply_time && (
                                  <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                                    {r.reply_time}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRespondingReviewId(r.id);
                                    setReplies(prev => ({ ...prev, [r.id]: r.reply || '' }));
                                    setReplyImages(prev => ({ ...prev, [r.id]: r.reply_images || [] }));
                                  }}
                                  style={{
                                    background: 'rgba(6, 182, 212, 0.15)',
                                    border: '1px solid rgba(6, 182, 212, 0.4)',
                                    color: '#38bdf8',
                                    padding: '2px 9px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <SquarePen size={11} /> Edit response
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteResponse(r.id)}
                                  disabled={sending}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#ef4444',
                                    padding: '2px 9px',
                                    borderRadius: '4px',
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  <Trash2 size={11} /> Delete response
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: 1.45 }}>{r.reply}</div>
                            {r.reply_images && r.reply_images.length > 0 && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                {r.reply_images.map((imgUrl, iIdx) => (
                                  <img
                                    key={iIdx}
                                    src={typeof imgUrl === 'string' ? imgUrl : (imgUrl.url || imgUrl.secure_url || '')}
                                    alt="Response Photo"
                                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(6, 182, 212, 0.4)' }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reply button when no reply yet */}
                  {!r.reply && respondingReviewId !== r.id && (
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-start' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.35)', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => {
                          setRespondingReviewId(r.id);
                          setReplies(prev => ({ ...prev, [r.id]: '' }));
                          setReplyImages(prev => ({ ...prev, [r.id]: [] }));
                        }}
                      >
                        <MessageSquare size={13} /> Write response to customer
                      </button>
                    </div>
                  )}

                  {/* Reply/Edit form exactly like map */}
                  {respondingReviewId === r.id && (
                    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(6, 182, 212, 0.35)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                        {r.reply ? 'Edit workshop response' : 'Write professional response'}
                      </div>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Enter your professional reply or response..."
                        value={replies[r.id] !== undefined ? replies[r.id] : (r.reply || '')}
                        onChange={e => setReplies(prev => ({ ...prev, [r.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                          resize: 'vertical',
                          marginBottom: '8px'
                        }}
                      />
                      <input
                        ref={replyFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReplyImageChange}
                        style={{ display: 'none' }}
                      />
                      {replyImages[r.id] && replyImages[r.id].length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {replyImages[r.id].map((img, idx) => (
                            <div key={idx} style={{ position: 'relative', width: 48, height: 48, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                              <img src={img} alt="Reply Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button
                                type="button"
                                onClick={() => setReplyImages(prev => ({ ...prev, [r.id]: prev[r.id].filter((_, i) => i !== idx) }))}
                                style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(239, 68, 68, 0.85)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.6rem', cursor: 'pointer', fontWeight: 700 }}
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => replyFileInputRef.current?.click()}
                          style={{
                            background: 'transparent',
                            border: '1px dashed rgba(6, 182, 212, 0.4)',
                            color: (replyImages[r.id] && replyImages[r.id].length > 0) ? '#38bdf8' : '#94a3b8',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Camera size={13} />
                          <span>+ Attach photo {(replyImages[r.id] && replyImages[r.id].length > 0) && `(${replyImages[r.id].length})`}</span>
                        </button>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn btn-sm"
                            style={{ background: '#06b6d4', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => sendReply(r.id)}
                            disabled={sending}
                          >
                            <Send size={12} /> {sending ? 'Sending...' : (r.reply ? 'Update response' : 'Send response')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setRespondingReviewId(null)}
                            disabled={sending}
                          >
                            Cancel
                          </button>
                          {sentId === r.id && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--green-400)', fontWeight: 600 }}>
                              <CheckCircle size={12} style={{ display: 'inline', marginRight: 3 }} />Saved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {filtered.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--r-md)',
                marginTop: 12
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> reviews
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Page
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setPageInput(valStr);
                        const val = parseInt(valStr, 10);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) {
                          setCurrentPage(val);
                        }
                      }}
                      onBlur={() => {
                        setPageInput(currentPage.toString());
                      }}
                      style={{
                        width: 44,
                        padding: '4px 6px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                    of {totalPages}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <ConfirmModal
        isOpen={!!responseToDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete your response to this review? This action cannot be undone."
        loading={sending}
        onConfirm={async () => {
          const id = responseToDelete;
          await executeDeleteResponse(id);
          setResponseToDelete(null);
        }}
        onCancel={() => setResponseToDelete(null)}
      />
    </div>
  );
}
