import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Send, Info, AlertTriangle, ChevronDown } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';

export default function SystemNotifications() {
  const { user } = useAuth();
  const [type, setType] = useState('Admin_Announcement');
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalTitle = title.replace(/\s+/g, ' ').trim();
    const finalBody = body.replace(/\s+/g, ' ').trim();

    if (!finalTitle || !finalBody) {
      setFeedback({ type: 'error', message: 'Please provide both title and body for the notification.' });
      return;
    }

    if (finalTitle.length > 100) {
      setFeedback({ type: 'error', message: 'Title exceeds the maximum length of 100 characters.' });
      return;
    }

    if (finalBody.length > 500) {
      setFeedback({ type: 'error', message: 'Message exceeds the maximum length of 500 characters.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await apiService.post('/auth/admin/notifications/dispatch', {
        title: finalTitle,
        body: finalBody,
        type: type
      });

      if (res.success) {
        const msg = `Successfully dispatched notification to ${res.count} users.`;
        setFeedback({ 
          type: 'success', 
          message: msg
        });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type: 'success' } }));
        setTitle('');
        setBody('');
        
        // Trigger a local refresh so the sender's own ticker updates immediately
        window.dispatchEvent(new CustomEvent('unread-count-changed'));
      } else {
        const msg = res.message || 'Failed to dispatch notification.';
        setFeedback({ type: 'error', message: msg });
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type: 'error' } }));
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'An error occurred while sending the notification.' });
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'An error occurred while sending the notification.', type: 'error' } }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Megaphone size={28} color="var(--blue-400)" />
          Dispatch System Notifications
        </h1>
        <p>Send a custom notification to all registered users in the system.</p>
      </div>

      {feedback && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          borderRadius: 'var(--r-md)',
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--green-500)' : 'var(--red-500)'}`,
          color: feedback.type === 'success' ? 'var(--green-400)' : 'var(--red-400)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Info size={20} />
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="card p-6">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Notification Type
            </label>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div 
                className="input"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  opacity: loading ? 0.7 : 1
                }}
                onClick={() => !loading && setIsOpen(!isOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {type === 'Admin_Announcement' ? <Megaphone size={16} color="var(--blue-400)" /> : <AlertTriangle size={16} color="var(--orange-500)" />}
                  {type === 'Admin_Announcement' ? 'Announcement (Megaphone)' : 'System Alert (Warning)'}
                </div>
                <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} color="var(--text-muted)" />
              </div>
              
              <div 
                style={{ 
                  position: 'absolute', 
                  top: '100%', 
                  left: 0, 
                  right: 0, 
                  marginTop: 6,
                  background: 'rgba(30, 41, 59, 0.7)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 'var(--r-md)',
                  overflow: 'hidden',
                  zIndex: 50,
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                  pointerEvents: isOpen ? 'auto' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div 
                  onClick={() => { setType('Admin_Announcement'); setIsOpen(false); }}
                  style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    background: type === 'Admin_Announcement' ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = type === 'Admin_Announcement' ? 'rgba(255,255,255,0.05)' : 'transparent'}
                >
                  <Megaphone size={16} color="var(--blue-400)" />
                  <span>Announcement (Megaphone)</span>
                </div>
                <div 
                  onClick={() => { setType('System_Alert'); setIsOpen(false); }}
                  style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10,
                    background: type === 'System_Alert' ? 'rgba(255,255,255,0.05)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = type === 'System_Alert' ? 'rgba(255,255,255,0.05)' : 'transparent'}
                >
                  <AlertTriangle size={16} color="var(--orange-500)" />
                  <span>System Alert (Warning)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Notification Title
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Important Maintenance Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
            <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              Maximum 100 characters. Keep it concise and clear.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Notification Message
            </label>
            <textarea
              className="input"
              placeholder="Type your message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={loading}
              rows={5}
              maxLength={500}
              style={{ resize: 'vertical' }}
            />
            <small style={{ color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              Maximum 500 characters. This message will be visible in the user's notification center.
            </small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !title.trim() || !body.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}
            >
              {loading ? (
                <>Sending...</>
              ) : (
                <>
                  <Send size={18} />
                  Dispatch Notification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
