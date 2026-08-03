import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Pin, PinOff, Trash2, CheckCircle, Clock, MessageSquare,
  ThumbsUp, Eye, AlertTriangle, Shield, X, ChevronDown, Heart,
  Flag, Hammer, PenSquare, ShieldCheck, ImagePlus, Camera, Plus, Send, Image as ImageIcon,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { apiService } from '../../services/apiService';

const TruncatedText = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;
  
  const lines = text.split('\n');
  const isLong = text.length > 400 || lines.length > 5;
  
  const displayText = isExpanded ? text : (isLong ? (lines.length > 5 ? lines.slice(0, 5).join('\n') + '...' : text.slice(0, 400) + '...') : text);
  
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      <div style={{ maxHeight: isExpanded ? '400px' : 'none', overflowY: isExpanded ? 'auto' : 'visible', paddingRight: isExpanded ? 4 : 0 }}>
        {displayText}
      </div>
      {isLong && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'var(--blue-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            {isExpanded ? 'Show less' : 'See more'}
          </button>
        </div>
      )}
    </div>
  );
};

const TruncatedCommentText = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;
  
  const lines = text.split('\n');
  const isLong = text.length > 200 || lines.length > 3;
  
  const displayText = isExpanded ? text : (isLong ? (lines.length > 3 ? lines.slice(0, 3).join('\n') + '...' : text.slice(0, 200) + '...') : text);
  
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      <span>{displayText}</span>
      {isLong && (
        <button 
          onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded); }} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--blue-400)', 
            fontWeight: 600, 
            cursor: 'pointer', 
            padding: 0,
            marginLeft: 6,
            fontSize: '0.8rem',
            display: 'inline-block'
          }}
        >
          {isExpanded ? 'Show less' : 'See more'}
        </button>
      )}
    </div>
  );
};

function PostCard({ post, postComments = [], onPin, onDelete, onDeleteOfficialPinned, onReject, onDismiss, onApprove, onEdit, onImageClick, onCommentDelete, onCommentDismiss, activeTab }) {
  const [expanded, setExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showAllComments, setShowAllComments] = useState(false);

  const renderPostImages = (images) => {
    if (!images || images.length === 0) return null;
    const count = images.length;
    
    // Single image
    if (count === 1) {
      return (
        <div 
          onClick={() => onImageClick(images[0])}
          style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginTop: 8, cursor: 'pointer', maxWidth: '100%' }}
        >
          <img src={images[0]} alt="Attachment" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block', background: '#070c14' }} />
        </div>
      );
    }
    
    // Two images
    if (count === 2) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, maxWidth: '100%' }}>
          {images.map((img, idx) => (
            <div 
              key={idx} 
              onClick={() => onImageClick(img)}
              style={{ height: 180, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: '#070c14' }}
            >
              <img src={img} alt={`Attachment ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      );
    }

    // Three images
    if (count === 3) {
      return (
        <div style={{ display: 'grid', gridTemplateRows: '200px 120px', gap: 6, marginTop: 8, maxWidth: '100%' }}>
          <div 
            onClick={() => onImageClick(images[0])}
            style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: '#070c14' }}
          >
            <img src={images[0]} alt="Attachment 0" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {images.slice(1).map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => onImageClick(img)}
                style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: '#070c14' }}
              >
                <img src={img} alt={`Attachment ${idx+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Four or more images
    const displayImages = images.slice(0, 4);
    const remainingCount = count - 4;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, maxWidth: '100%' }}>
        {displayImages.map((img, idx) => {
          const isLast = idx === 3;
          const showOverlay = isLast && remainingCount > 0;
          return (
            <div 
              key={idx} 
              onClick={() => onImageClick(img)}
              style={{ height: 140, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative', cursor: 'pointer', background: '#070c14' }}
            >
              <img src={img} alt={`Attachment ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {showOverlay && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.4rem' }}>
                  +{remainingCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="card"
      style={{
        borderLeft: post.hasViolation
          ? '3px solid var(--red-500)'
          : post.isPinned
          ? '3px solid var(--blue-primary)'
          : post.status === 'approved'
          ? '3px solid var(--green-500)'
          : '3px solid rgba(71,85,105,0.4)',
        transition: 'all 0.3s',
        animation: 'slide-in-up 0.35s ease-out',
      }}
    >
      <div style={{ padding: '16px 20px' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3" style={{ flex: 1 }}>
            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: post.hasViolation ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#1a6cff,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', color: 'white', flexShrink: 0 }}>
              {post.avatar}
            </div>

            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                {post.isPinned && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--blue-400)', background: 'rgba(26,108,255,0.1)', border: '1px solid rgba(26,108,255,0.3)', padding: '1px 7px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Pin size={9} /> Pinned
                  </span>
                )}
                {post.hasViolation && (
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--red-400)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 7px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Flag size={9} /> There is a violation
                  </span>
                )}
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{post.category}</span>
                {post.status === 'approved' && <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Approved</span>}
                {post.status === 'pending' && <span className="badge badge-orange" style={{ fontSize: '0.65rem' }}>Waiting for approval</span>}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{post.author}</span>
                {' · '}<Clock size={11} style={{ display: 'inline' }} /> {post.time}
              </div>

              {expanded && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '12px 0', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
                  {post.title && (
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                      {post.title}
                    </div>
                  )}
                  <div style={{ marginBottom: (post.images && post.images.length > 0) ? 8 : 0 }}>
                    <TruncatedText text={post.content} />
                  </div>
                  {renderPostImages(post.images)}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4" style={{ marginTop: 8 }}>
                <div className="flex items-center" style={{ gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <ThumbsUp size={13} /> {post.likes}
                </div>
                <div className="flex items-center" style={{ gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Heart size={13} style={{ color: 'var(--red-400)' }} /> {post.hearts || 0}
                </div>
                <button 
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-2" 
                  style={{ fontSize: '0.75rem', color: showComments ? 'var(--blue-500)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <MessageSquare size={12} /> {postComments.length} comments {showComments ? <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={12} />}
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  style={{ fontSize: '0.75rem', color: 'var(--blue-400)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Eye size={12} /> {expanded ? "Collapse" : "View content"}
                </button>
              </div>

              {/* Reports warning block */}
              {(() => {
                const showPostReports = post.reportCount > 0 && activeTab !== 'reported_comments';
                const showCommentReports = postComments?.some(c => c.reportCount > 0) && activeTab !== 'reported';
                
                if (!showPostReports && !showCommentReports) return null;

                return (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red-500)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Flag size={14} /> ⚠️ 
                        {showPostReports && <span>{post.reportCount} post reports</span>}
                        {showPostReports && showCommentReports && <span> • </span>}
                        {showCommentReports && <span>{postComments.filter(c => c.reportCount > 0).length} reported comments</span>}
                      </div>
                      {((showPostReports && post.reports && post.reports.length > 0) || (showCommentReports && postComments && postComments.some(c => c.reports && c.reports.length > 0))) && (
                        <button 
                          onClick={() => setReportsExpanded(!reportsExpanded)}
                          style={{ fontSize: '0.75rem', color: 'var(--red-500)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                        >
                          {reportsExpanded ? <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={12} />} 
                          {reportsExpanded ? 'Collapse' : 'View Details'}
                        </button>
                      )}
                    </div>
                    {reportsExpanded && (
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: 'var(--red-400)', fontSize: '0.8rem', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}>
                        {showPostReports && post.reports && Object.values(post.reports.reduce((acc, r) => {
                          if (!acc[r.reason]) acc[r.reason] = { reason: r.reason, count: 0 };
                          acc[r.reason].count += 1;
                          return acc;
                        }, {})).map((group, idx) => (
                          <li key={`p-${idx}`} style={{ marginBottom: 4 }}>
                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', marginRight: 6 }}>Post</span>
                            <strong>{group.reason}</strong>
                            <span style={{ fontWeight: 'bold', color: 'var(--red-300)', marginLeft: 6 }}>
                              (x{group.count})
                            </span>
                          </li>
                        ))}
                        {showCommentReports && postComments && postComments.filter(c => c.reportCount > 0).map(c => 
                          c.reports && Object.values(c.reports.reduce((acc, r) => {
                            if (!acc[r.reason]) acc[r.reason] = { reason: r.reason, count: 0 };
                            acc[r.reason].count += 1;
                            return acc;
                          }, {})).map((group, idx) => (
                            <li key={`c-${c.id}-${idx}`} style={{ marginBottom: 4 }}>
                              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', marginRight: 6 }}>Comment by {c.author}</span>
                              <strong>{group.reason}</strong>
                              <span style={{ fontWeight: 'bold', color: 'var(--red-300)', marginLeft: 6 }}>
                                (x{group.count})
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {post.status === 'pending' && (
              <button className="btn btn-success btn-sm" onClick={() => onApprove(post.id)} style={{ padding: '5px 10px' }}>
                <CheckCircle size={12} /> Browse
              </button>
            )}
            {post.status === 'pending' && (
              <button className="btn btn-danger btn-sm" onClick={() => onReject(post.id)} style={{ padding: '5px 10px' }}>
                <X size={12} /> Reject
              </button>
            )}
            {post.status !== 'pending' && post.reportCount > 0 && activeTab !== 'pinned' && activeTab !== 'reported_comments' && (
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(post.id)} style={{ padding: '5px 10px' }}>
                <Trash2 size={12} /> Delete
              </button>
            )}
            {post.reportCount > 0 && activeTab !== 'reported_comments' && (
              <button className="btn btn-ghost btn-sm" onClick={() => onDismiss(post.id)} style={{ padding: '5px 10px', color: 'var(--text-muted)' }} title="Dismiss reports">
                <ShieldCheck size={12} /> Dismiss
              </button>
            )}
            {post.status === 'approved' && activeTab !== 'reported_comments' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onPin(post.id)}
                style={{ padding: '5px 10px', color: post.isPinned ? 'var(--blue-400)' : 'var(--text-muted)' }}
                title={post.isPinned ? "Unpin" : "Pin the article"}
              >
                {post.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                {post.isPinned ? "Unpin" : 'Pin'}
              </button>
            )}
            {post.isPinned && post.status !== 'rejected' && activeTab === 'pinned' && (post.authorRole === 'Admin' || post.authorRole === 'Manager') && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => onEdit && onEdit(post.id)} style={{ padding: '5px 10px' }}>
                  <PenSquare size={12} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => onDeleteOfficialPinned && onDeleteOfficialPinned(post.id)} style={{ padding: '5px 10px' }}>
                  <Trash2 size={12} /> Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
            <h4 id={`comments-header-${post.id}`} style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Comments</h4>
            {postComments.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(() => {
                  const parentComments = postComments.filter(c => !c.parentId);
                  const hasManyComments = parentComments.length > 3;
                  const parentIdsToShow = new Set(
                    (showAllComments ? parentComments : parentComments.slice(-3)).map(c => c.id)
                  );
                  
                  return (
                    <>
                      {hasManyComments && (
                        <button
                          onClick={() => setShowAllComments(!showAllComments)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--blue-400)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '4px 0 12px 0',
                            fontSize: '0.8rem',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          {showAllComments ? 'Collapse comments' : `View previous comments (${parentComments.length - 3})`}
                        </button>
                      )}
                      {postComments.map(comment => {
                        const belongsToId = comment.parentId || comment.id;
                        if (!parentIdsToShow.has(belongsToId)) {
                          return null;
                        }
                        if (comment.parentId && !expandedReplies[comment.parentId]) {
                          return null;
                        }
                        
                        const repliesCount = postComments.filter(c => c.parentId === comment.id).length;
                        const isRepliesExpanded = !!expandedReplies[comment.id];
                        
                        return (
                          <React.Fragment key={comment.id}>
                            <CommentCard 
                              comment={comment} 
                              onDelete={onCommentDelete} 
                              onDismiss={onCommentDismiss} 
                              activeTab={activeTab}
                            />
                            {!comment.parentId && repliesCount > 0 && (
                              <div style={{ marginLeft: 56, marginBottom: 12, marginTop: -4 }}>
                                <button
                                  onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--blue-400)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                  }}
                                >
                                  {isRepliesExpanded ? 'Hide replies' : `View replies (${repliesCount})`}
                                </button>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {showAllComments && hasManyComments && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10, marginBottom: 6 }}>
                          <button
                            onClick={() => {
                              setShowAllComments(false);
                              setTimeout(() => {
                                const el = document.getElementById(`comments-header-${post.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 50);
                            }}
                            className="btn btn-ghost btn-sm"
                            style={{
                              color: 'var(--blue-400)',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: 0,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            Collapse comments
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({ comment, onDelete, onDismiss, activeTab }) {
  const [reportsExpanded, setReportsExpanded] = useState(false);

  return (
    <div className="card p-4" style={{ display: 'flex', gap: 16, marginBottom: 12, border: comment.reportCount > 0 ? '1px solid rgba(255, 59, 48, 0.3)' : 'none', position: 'relative', marginLeft: comment.isReply ? 40 : 0 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
        {comment.avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{comment.author}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comment.time}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 6 }}>
            {comment.reportCount > 0 && (
              <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--green-500)', background: 'rgba(52, 199, 89, 0.1)' }} onClick={() => onDismiss(comment.id)} title="Dismiss Reports">
                <ShieldCheck size={14} />
              </button>
            )}
            {comment.reportCount > 0 && (
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(comment.id)} title="Delete Comment">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {comment.isReply ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</div>
          ) : (
            <TruncatedCommentText text={comment.content} />
          )}
        </div>

        {/* Reports warning block */}
        {comment.reportCount > 0 && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(255, 59, 48, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red-500)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Flag size={14} /> ⚠️ {comment.reportCount} reports
              </div>
              {comment.reports && comment.reports.length > 0 && (
                <button 
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                  style={{ fontSize: '0.75rem', color: 'var(--red-500)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  {reportsExpanded ? <ChevronDown size={12} style={{ transform: 'rotate(180deg)' }} /> : <ChevronDown size={12} />} 
                  {reportsExpanded ? 'Collapse' : 'View Details'}
                </button>
              )}
            </div>
            {reportsExpanded && comment.reports && comment.reports.length > 0 && (
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, color: 'var(--red-400)', fontSize: '0.8rem', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto' }}>
                {Object.values(comment.reports.reduce((acc, r) => {
                  if (!acc[r.reason]) acc[r.reason] = { reason: r.reason, count: 0 };
                  acc[r.reason].count += 1;
                  return acc;
                }, {})).map((group, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <strong>{group.reason}</strong>
                    <span style={{ fontWeight: 'bold', color: 'var(--red-300)', marginLeft: 6 }}>
                      (x{group.count})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumModeration() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [reportedPosts, setReportedPosts] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: '', id: null });

  const fetchAllPostsRef = useRef();
  const fetchReportedPostsRef = useRef();
  const fetchAllCommentsRef = useRef();
  const fetchReportedCommentsRef = useRef();

  useEffect(() => {
    fetchAllPostsRef.current = fetchAllPosts;
    fetchReportedPostsRef.current = fetchReportedPosts;
    fetchAllCommentsRef.current = fetchAllComments;
    fetchReportedCommentsRef.current = fetchReportedComments;
  }, [posts, reportedPosts, comments, reportedComments]); // It's fine to just update the ref on every render

  useEffect(() => {
    fetchAllPostsRef.current();
    fetchReportedPostsRef.current();
    fetchAllCommentsRef.current();
    fetchReportedCommentsRef.current();

    // Set up WebSocket for real-time forum updates with auto-reconnect
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'FORUM_UPDATE') {
            console.log('Real-time FORUM_UPDATE received, fetching fresh data...');
            if (fetchAllPostsRef.current) fetchAllPostsRef.current();
            if (fetchReportedPostsRef.current) fetchReportedPostsRef.current();
            if (fetchAllCommentsRef.current) fetchAllCommentsRef.current();
            if (fetchReportedCommentsRef.current) fetchReportedCommentsRef.current();
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed in Admin Forum Moderation, reconnecting in 3s...');
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error in Admin Forum Moderation', err);
        ws.close(); // trigger onclose
      };
    };

    connectWebSocket();
    
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws && (ws.readyState === 1 || ws.readyState === 0)) {
        ws.onclose = null; // prevent reconnect loop on unmount
        ws.close();
      }
    };
  }, []);

  const fetchAllPosts = async () => {
    try {
      const res = await apiService.get(`/forum/posts/all?_t=${Date.now()}`);
      if (res && res.success) {
        const mapped = res.data.map(p => ({
          id: p._id,
          author: p.author_id?.full_name || 'Unknown User',
          avatar: (p.author_id?.full_name || 'U').charAt(0).toUpperCase(),
          authorRole: p.author_id?.role || 'User',
          time: new Date(p.created_at).toLocaleString(),
          category: p.category,
          title: p.title || '',
          content: p.content,
          images: p.images || [],
          likes: p.like_count || 0,
          hearts: p.heart_count || 0,
          reportCount: p.reportCount || 0,
          reports: p.reports || [],
          status: p.status,
          isPinned: p.is_pinned,
          pinnedAt: p.pinned_at ? new Date(p.pinned_at).getTime() : 0,
          hasViolation: p.reportCount > 3
        }));
        setPosts(mapped);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    }
  };

  const fetchReportedPosts = async () => {
    try {
      const res = await apiService.get(`/forum/posts/reported?_t=${Date.now()}`);
      if (res && res.success) {
        const mapped = res.data.map(p => ({
          id: p._id,
          author: p.author_id?.full_name || 'Unknown User',
          avatar: (p.author_id?.full_name || 'U').charAt(0).toUpperCase(),
          authorRole: p.author_id?.role || 'User',
          time: new Date(p.created_at).toLocaleString(),
          category: p.category,
          title: p.title || '',
          content: p.content,
          images: p.images || [],
          likes: p.like_count || 0,
          hearts: p.heart_count || 0,
          reportCount: p.reportCount || 0,
          reports: p.reports || [],
          status: p.status,
          isPinned: p.is_pinned,
          pinnedAt: p.pinned_at ? new Date(p.pinned_at).getTime() : 0,
          hasViolation: p.reportCount > 3
        }));
        setReportedPosts(mapped);
      }
    } catch (err) {
      console.error('Error fetching reported posts:', err);
    }
  };

  const fetchAllComments = async () => {
    try {
      const res = await apiService.get(`/forum/comments/all?_t=${Date.now()}`);
      if (res && res.success) {
        const mapped = res.data.map(c => ({
          id: c._id,
          postId: c.post_id?._id,
          parentId: c.parent_id,
          author: c.author_id?.full_name || 'Unknown User',
          avatar: (c.author_id?.full_name || 'U').charAt(0).toUpperCase(),
          content: c.content || '',
          postTitle: c.post_id?.title || 'Unknown Post',
          time: new Date(c.created_at).toLocaleString('vi-VN'),
          reportCount: c.reportCount || 0,
          reports: c.reports || [],
        }));
        setComments(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const fetchReportedComments = async () => {
    try {
      const res = await apiService.get(`/forum/comments/reported?_t=${Date.now()}`);
      if (res && res.success) {
        const mapped = res.data.map(c => ({
          id: c._id,
          postId: c.post_id?._id,
          parentId: c.parent_id,
          author: c.author_id?.full_name || 'Unknown User',
          avatar: (c.author_id?.full_name || 'U').charAt(0).toUpperCase(),
          content: c.content || '',
          postTitle: c.post_id?.title || 'Unknown Post',
          time: new Date(c.created_at).toLocaleString('vi-VN'),
          reportCount: c.reportCount || 0,
          reports: c.reports || [],
        }));
        setReportedComments(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch reported comments:', err);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'posts'; // Default to 'posts' instead of 'queue'
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [postFilter, setPostFilter] = useState('all'); // all
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, postFilter]);

  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState([]);
  const [editingPinnedId, setEditingPinnedId] = useState(null);
  const [editPinnedContent, setEditPinnedContent] = useState('');
  const [editPinnedTitle, setEditPinnedTitle] = useState('');
  const [editPinnedCategory, setEditPinnedCategory] = useState('Announcement');
  const [editPinnedImages, setEditPinnedImages] = useState([]);
  const [isEditingPinnedSubmit, setIsEditingPinnedSubmit] = useState(false);
  const editPinnedRef = useRef(null);
  const editFileInputRef = useRef(null);

  const [showAddPinnedModal, setShowAddPinnedModal] = useState(false);
  const [newPinnedTitle, setNewPinnedTitle] = useState('');
  const [newPinnedContent, setNewPinnedContent] = useState('');
  const [newPinnedImages, setNewPinnedImages] = useState([]);
  const [newPinnedCategory, setNewPinnedCategory] = useState('Announcement');
  const [isSubmittingPinned, setIsSubmittingPinned] = useState(false);
  const fileInputRef = useRef(null);

  const handlePinnedImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (newPinnedImages.length + files.length > 6) {
      alert('You can only upload a maximum of 6 images.');
      return;
    }
    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(results => {
      setNewPinnedImages(prev => [...prev, ...results]);
    });
  };

  const removePinnedImage = (index) => {
    setNewPinnedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditPinnedImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (editPinnedImages.length + files.length > 6) {
      alert('You can only upload a maximum of 6 images.');
      return;
    }
    const promises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then(results => {
      setEditPinnedImages(prev => [...prev, ...results]);
    });
  };

  const removeEditPinnedImage = (index) => {
    setEditPinnedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getFilteredPosts = () => {
    let result = [];
    if (activeTab === 'pinned') {
      result = posts.filter(p => p.isPinned);
    } else if (activeTab === 'reported') {
      result = [...reportedPosts].sort((a, b) => {
        const latestA = a.reports?.length > 0 ? new Date(a.reports[0].created_at || 0).getTime() : 0;
        const latestB = b.reports?.length > 0 ? new Date(b.reports[0].created_at || 0).getTime() : 0;
        return latestB - latestA;
      });
    } else if (activeTab === 'reported_comments') {
      const reportedPostIds = new Set(reportedComments.map(c => c.postId));
      result = posts.filter(p => reportedPostIds.has(p.id));
      
      // Sort these posts by the latest reported comment they contain
      result.sort((a, b) => {
        const commentsA = reportedComments.filter(c => c.postId === a.id);
        const latestA = commentsA.length > 0 ? Math.max(...commentsA.map(c => 
          c.reports?.length > 0 ? new Date(c.reports[0].created_at || 0).getTime() : 0
        )) : 0;

        const commentsB = reportedComments.filter(c => c.postId === b.id);
        const latestB = commentsB.length > 0 ? Math.max(...commentsB.map(c => 
          c.reports?.length > 0 ? new Date(c.reports[0].created_at || 0).getTime() : 0
        )) : 0;

        return latestB - latestA;
      });
    } else {
      // activeTab === 'posts' (All Posts)
      if (postFilter === 'pending') {
        result = posts.filter(p => p.status === 'pending');
      } else {
        result = posts.filter(p => p.status === 'approved');
      }
    }
    
    // Only apply pinned sort for posts and pinned tabs
    if (activeTab === 'posts' || activeTab === 'pinned') {
      return [...result].sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        if (a.isPinned && b.isPinned) {
          return (b.pinnedAt || 0) - (a.pinnedAt || 0);
        }
        return 0;
      });
    }

    return result;
  };

  const filteredPosts = getFilteredPosts();
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage);
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
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const togglePin = async (id) => {
    try {
      await apiService.put(`/forum/posts/${id}/pin`);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, isPinned: !p.isPinned, pinnedAt: !p.isPinned ? Date.now() : 0 } : p));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const rejectPost = async (id) => {
    try {
      await apiService.put(`/forum/posts/${id}/reject`);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p));
    } catch (err) {
      console.error('Failed to reject post:', err);
    }
  };

  const deleteViolatingPost = async (id) => {
    try {
      await apiService.delete(`/forum/posts/${id}/violation`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const deleteNormalPost = async (id) => {
    try {
      await apiService.delete(`/forum/posts/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Failed to delete official pinned post:', err);
    }
  };

  // Dismiss Forum Post Reports
  const dismissReports = async (id) => {
    try {
      await apiService.delete(`/forum/posts/${id}/reports`);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, reportCount: 0, reports: [] } : p));
    } catch (err) {
      console.error('Failed to dismiss reports:', err);
    }
  };

  const deleteViolatingComment = async (id) => {
    try {
      await apiService.delete(`/forum/comments/${id}/violation`);
      setComments(prev => prev.filter(c => c.id !== id));
      setReportedComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Dismiss Comment Reports
  const dismissCommentReports = async (id) => {
    try {
      await apiService.delete(`/forum/comments/${id}/reports`);
      setComments(prev => prev.map(c => c.id === id ? { ...c, reportCount: 0, reports: [] } : c));
      setReportedComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Failed to dismiss comment reports:', err);
    }
  };

  const approvePost = async (id) => {
    try {
      await apiService.put(`/forum/posts/${id}/approve`);
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p));
    } catch (err) {
      console.error('Failed to approve post:', err);
    }
  };

  const handleEditPinned = (id) => {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    setEditingPinnedId(id);
    setEditPinnedTitle(p.title || '');
    setEditPinnedCategory(p.category || 'Announcement');
    setEditPinnedContent(p.content || '');
    setEditPinnedImages(p.images || []);
  };
  const saveEditPinned = async () => {
    if (!editPinnedTitle.trim() || !editPinnedContent.trim()) {
      alert("Title and content are required.");
      return;
    }
    if (isEditingPinnedSubmit) return;
    setIsEditingPinnedSubmit(true);
    
    try {
      const payload = {
        title: editPinnedTitle,
        content: editPinnedContent,
        category: editPinnedCategory,
        images: editPinnedImages
      };
      
      const res = await apiService.put(`/forum/posts/${editingPinnedId}`, payload);
      if (res && res.success) {
        setPosts(prev => prev.map(p => p.id === editingPinnedId ? { ...p, title: editPinnedTitle, category: editPinnedCategory, content: editPinnedContent, images: editPinnedImages } : p));
        setEditingPinnedId(null);
        setEditPinnedTitle('');
        setEditPinnedCategory('Announcement');
        setEditPinnedContent('');
        setEditPinnedImages([]);
      } else {
        alert(res?.message || 'Failed to update pinned post');
      }
    } catch (error) {
      console.error('Error updating pinned post:', error);
      alert('An error occurred while updating the post.');
    } finally {
      setIsEditingPinnedSubmit(false);
    }
  };

  const handleCreatePinned = async () => {
    if (!newPinnedTitle.trim() || !newPinnedContent.trim()) {
      alert("Title and content are required.");
      return;
    }
    if (isSubmittingPinned) return;
    setIsSubmittingPinned(true);
    try {
      // Backend createOfficialPinnedPost expects JSON if images is base64 array
      const payload = {
        title: newPinnedTitle,
        content: newPinnedContent,
        category: newPinnedCategory,
        images: newPinnedImages
      };
      
      const res = await apiService.post('/forum/posts/official', payload);
      if (res && res.success) {
        setShowAddPinnedModal(false);
        setNewPinnedTitle('');
        setNewPinnedContent('');
        setNewPinnedImages([]);
        fetchAllPosts();
      } else {
        alert(res?.message || 'Failed to create pinned post');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating pinned post');
    } finally {
      setIsSubmittingPinned(false);
    }
  };

  const toggleBatch = (id) => {
    setSelectedBatch(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const batchApprove = () => {
    setPosts(prev => prev.map(p => selectedBatch.includes(p.id) ? { ...p, status: 'approved' } : p));
    setSelectedBatch([]);
  };

  const batchDelete = () => {
    setPosts(prev => prev.filter(p => !selectedBatch.includes(p.id)));
    setSelectedBatch([]);
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Moderate the Community Forum</h1>
        <p>Manage post and pin queues and remove violating content</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: "Posts", value: posts.length, color: 'var(--green-400)' },
          { label: "Reported Posts", value: reportedPosts.length, color: 'var(--red-400)' },
          { label: "Reported Comments", value: reportedComments.length, color: 'var(--red-500)' },
          { label: "Pinned Posts", value: posts.filter(p => p.isPinned).length, color: 'var(--blue-400)' },
          { label: "Pending Moderation", value: posts.filter(p => p.status === 'pending').length, color: 'var(--orange-400)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 1000 }}>
        {/* View all forum posts & Moderate Forum Posts Queue */}
        <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
          <CheckCircle size={13} /> Posts ({posts.filter(p => p.status !== 'rejected').length})
        </button>
        <button className={`tab-btn ${activeTab === 'reported' ? 'active' : ''}`} onClick={() => setActiveTab('reported')}>
          <AlertTriangle size={13} /> Reported Posts ({reportedPosts.length})
        </button>
        {/* View Reported Comments */}
        <button className={`tab-btn ${activeTab === 'reported_comments' ? 'active' : ''}`} onClick={() => setActiveTab('reported_comments')}>
          <MessageSquare size={13} /> Reported Comments ({reportedComments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'pinned' ? 'active' : ''}`} onClick={() => setActiveTab('pinned')}>
          <Pin size={13} /> Pinned Posts ({posts.filter(p => p.isPinned).length})
        </button>
      </div>

      {/* Filter bar (posts tab) */}
      {activeTab === 'posts' && (
        <div className="flex gap-2" style={{ marginBottom: 16 }}>
          <button 
            className={`btn ${postFilter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setPostFilter('all')}
          >
            All ({posts.filter(p => p.status === 'approved').length})
          </button>
          <button 
            className={`btn ${postFilter === 'pending' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setPostFilter('pending')}
          >
            Pending Moderation ({posts.filter(p => p.status === 'pending').length})
          </button>
        </div>
      )}

      {/* Batch Toolbar */}
      {selectedBatch.length > 0 && (
        <div style={{ background: 'rgba(26,108,255,0.08)', border: '1px solid rgba(26,108,255,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--blue-400)', fontWeight: 600 }}>
            Selected {selectedBatch.length} article
          </span>
          <button className="btn btn-success btn-sm" onClick={batchApprove}><CheckCircle size={12} /> Browse all</button>
          <button className="btn btn-danger btn-sm" onClick={batchDelete}><Trash2 size={12} /> Delete all</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBatch([])}><X size={12} /> Deselect</button>
        </div>
      )}


      {/* Add Pinned Post button when in pinned tab */}
      {activeTab === 'pinned' && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowAddPinnedModal(true)}>
            + Add Pinned Post
          </button>
        </div>
      )}

      {/* Posts list */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filteredPosts.length === 0 && (
          <div className="card p-6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Hammer size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div>There are no articles in this category</div>
          </div>
        )}
        {paginatedPosts.map((post) => {
          // Build threaded comments for this post
          const postComments = comments.filter(c => c.postId === post.id);
          const parents = postComments.filter(c => !c.parentId);
          const threadedComments = [];
          parents.forEach(p => {
            threadedComments.push(p);
            const children = postComments.filter(c => c.parentId === p.id);
            children.forEach(child => {
              threadedComments.push({ ...child, isReply: true });
            });
          });

          return (
            <PostCard
              key={post.id}
              post={post}
              postComments={threadedComments}
              onPin={togglePin}
              onReject={(id) => setConfirmModal({ open: true, type: 'reject', id })}
              onDelete={(id) => setConfirmModal({ open: true, type: 'delete', id })}
              onDeleteOfficialPinned={(id) => setConfirmModal({ open: true, type: 'delete-official', id })}
              onDismiss={(id) => setConfirmModal({ open: true, type: 'dismiss', id })}
              onApprove={approvePost}
              onEdit={handleEditPinned}
              onImageClick={setLightboxImage}
              onCommentDelete={(id) => setConfirmModal({ open: true, type: 'delete-comment', id })}
              onCommentDismiss={(id) => setConfirmModal({ open: true, type: 'dismiss-comment', id })}
              activeTab={activeTab}
            />
          );
        })}

        {/* Edit pinned post modal */}
        {editingPinnedId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}>
            <div className="card page-enter" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PenSquare size={16} color="var(--cyan-400)" /> Edit Official Pinned Post
                </div>
                <button onClick={() => setEditingPinnedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
                <select
                  className="input"
                  value={editPinnedCategory}
                  onChange={(e) => setEditPinnedCategory(e.target.value)}
                  style={{ fontSize: '0.9rem', marginBottom: 12, padding: '10px 16px', background: 'var(--bg-elevated)', cursor: 'pointer' }}
                >
                  <option value="Announcement">Announcement</option>
                  <option value="Urgent report">Urgent report</option>
                  <option value="Notification">Notification</option>
                  <option value="Experience">Experience</option>
                  <option value="Information">Information</option>
                  <option value="Q&A">Q&A</option>
                </select>

                <input 
                  className="input" 
                  placeholder="Enter announcement title..." 
                  value={editPinnedTitle}
                  onChange={(e) => setEditPinnedTitle(e.target.value)}
                  style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, padding: '12px 16px' }}
                />

                <textarea
                  className="input"
                  rows={5}
                  placeholder="Describe specifically the announcement details..."
                  value={editPinnedContent}
                  onChange={e => setEditPinnedContent(e.target.value)}
                  style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16, resize: 'vertical', padding: '12px 16px' }}
                />

                {/* Image grid */}
                {editPinnedImages.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                    {editPinnedImages.map((src, idx) => (
                      <div key={idx} style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border-dim)', aspectRatio: '1' }}>
                        <img src={src} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button onClick={() => removeEditPinnedImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={11} color="white" />
                        </button>
                      </div>
                    ))}
                    {editPinnedImages.length < 6 && (
                      <button onClick={() => editFileInputRef.current?.click()} style={{ borderRadius: 'var(--r-sm)', border: '1.5px dashed var(--border-dim)', background: 'rgba(18,29,40,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', aspectRatio: '1' }}>
                        <Plus size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Add photos</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Drop zone (no images yet) */}
                {editPinnedImages.length === 0 && (
                  <div onClick={() => editFileInputRef.current?.click()} style={{ border: '1.5px dashed var(--border-dim)', borderRadius: 'var(--r-md)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14, background: 'rgba(18,29,40,0.3)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={22} color="var(--cyan-400)" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add images</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>PNG, JPG · Maximum 6 photos · Each photo ≤ 5MB</div>
                    </div>
                  </div>
                )}

                <input ref={editFileInputRef} type="file" accept="image/*" multiple onChange={handleEditPinnedImageChange} style={{ display: 'none' }} />
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <button onClick={() => editFileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--cyan-400)', fontSize: '0.78rem', fontWeight: 600 }} disabled={isEditingPinnedSubmit}>
                  <ImageIcon size={15} /> Photo {editPinnedImages.length > 0 && `(${editPinnedImages.length}/6)`}
                </button>
                <div className="flex gap-3">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingPinnedId(null)} disabled={isEditingPinnedSubmit}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveEditPinned} disabled={isEditingPinnedSubmit || !editPinnedContent.trim() || !editPinnedTitle.trim()} style={{ minWidth: 100 }}>
                    <CheckCircle size={13} /> {isEditingPinnedSubmit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clean Centered Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          marginTop: '16px'
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
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Custom Confirmation Modal */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-6" style={{ maxWidth: 400, width: '90%', border: '1px solid rgba(239,29,55,0.3)', background: 'var(--bg-elevated)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,29,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red-400)' }}>
                {confirmModal.type.startsWith('delete') ? <Trash2 size={20} /> : confirmModal.type === 'reject' ? <X size={20} /> : <ShieldCheck size={20} />}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {confirmModal.type.startsWith('delete') ? 'Delete Content' : confirmModal.type === 'reject' ? 'Reject Post' : 'Dismiss Reports'}
              </h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              {confirmModal.type.startsWith('delete') 
                ? (confirmModal.type === 'delete-official' 
                    ? 'Are you sure you want to delete this official pinned post? This action cannot be undone.' 
                    : 'Are you sure you want to delete this violating content? This action cannot be undone.')
                : confirmModal.type === 'reject'
                    ? 'Are you sure you want to reject this post? The author will be notified.'
                    : 'Are you sure you want to dismiss all reports for this content?'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmModal({ open: false, type: '', id: null })}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirmModal.type === 'delete') {
                    deleteViolatingPost(confirmModal.id);
                  } else if (confirmModal.type === 'delete-official') {
                    deleteNormalPost(confirmModal.id);
                  } else if (confirmModal.type === 'dismiss') {
                    dismissReports(confirmModal.id);
                  } else if (confirmModal.type === 'delete-comment') {
                    deleteViolatingComment(confirmModal.id);
                  } else if (confirmModal.type === 'dismiss-comment') {
                    dismissCommentReports(confirmModal.id);
                  } else if (confirmModal.type === 'reject') {
                    rejectPost(confirmModal.id);
                  }
                  setConfirmModal({ open: false, type: '', id: null });
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div 
          className="modal-overlay" 
          onClick={() => setLightboxImage(null)}
          style={{ zIndex: 9999, background: 'rgba(0, 0, 0, 0.95)' }}
        >
          <button 
            onClick={() => setLightboxImage(null)}
            style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Enlarged preview" 
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }} 
          />
        </div>
      )}

      {/* Add Pinned Post Modal */}
      {showAddPinnedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}>
          <div className="card page-enter" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenSquare size={16} color="var(--cyan-400)" /> Create Official Pinned Post
              </div>
              <button onClick={() => { setShowAddPinnedModal(false); setNewPinnedTitle(''); setNewPinnedContent(''); setNewPinnedImages([]); setNewPinnedCategory('Announcement'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
              <select
                className="input"
                value={newPinnedCategory}
                onChange={(e) => setNewPinnedCategory(e.target.value)}
                style={{ fontSize: '0.9rem', marginBottom: 12, padding: '10px 16px', background: 'var(--bg-elevated)', cursor: 'pointer' }}
              >
                <option value="Announcement">Announcement</option>
                <option value="Urgent report">Urgent report</option>
                <option value="Notification">Notification</option>
                <option value="Experience">Experience</option>
                <option value="Information">Information</option>
                <option value="Q&A">Q&A</option>
              </select>

              <input 
                className="input" 
                placeholder="Enter announcement title..." 
                value={newPinnedTitle}
                onChange={(e) => setNewPinnedTitle(e.target.value)}
                style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, padding: '12px 16px' }}
              />

              <textarea
                className="input"
                rows={5}
                placeholder="Describe specifically the announcement details..."
                value={newPinnedContent}
                onChange={e => setNewPinnedContent(e.target.value)}
                style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16, resize: 'vertical', padding: '12px 16px' }}
              />

              {/* Image grid */}
              {newPinnedImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {newPinnedImages.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border-dim)', aspectRatio: '1' }}>
                      <img src={src} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => removePinnedImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={11} color="white" />
                      </button>
                    </div>
                  ))}
                  {newPinnedImages.length < 6 && (
                    <button onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 'var(--r-sm)', border: '1.5px dashed var(--border-dim)', background: 'rgba(18,29,40,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', aspectRatio: '1' }}>
                      <Plus size={18} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Add photos</span>
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone (no images yet) */}
              {newPinnedImages.length === 0 && (
                <div onClick={() => fileInputRef.current?.click()} style={{ border: '1.5px dashed var(--border-dim)', borderRadius: 'var(--r-md)', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14, background: 'rgba(18,29,40,0.3)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'rgba(6,182,212,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={22} color="var(--cyan-400)" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add images</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>PNG, JPG · Maximum 6 photos · Each photo ≤ 5MB</div>
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePinnedImageChange} style={{ display: 'none' }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--cyan-400)', fontSize: '0.78rem', fontWeight: 600 }} disabled={isSubmittingPinned}>
                <ImageIcon size={15} /> Photo {newPinnedImages.length > 0 && `(${newPinnedImages.length}/6)`}
              </button>
              <div className="flex gap-3">
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddPinnedModal(false); setNewPinnedTitle(''); setNewPinnedContent(''); setNewPinnedImages([]); setNewPinnedCategory('Announcement'); }} disabled={isSubmittingPinned}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreatePinned} disabled={isSubmittingPinned || !newPinnedContent.trim() || !newPinnedTitle.trim()} style={{ minWidth: 100 }}>
                  <Send size={13} /> {isSubmittingPinned ? 'Posting...' : 'Post now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
