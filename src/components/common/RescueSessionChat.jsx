import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Camera, Phone, Minimize2, Maximize2, Loader, CheckCircle2, Copy, ShieldAlert } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function RescueSessionChat({ targetUser, missionId, title, defaultMinimized = false, hideHeader = false, isEnded = false, isCancelled = false }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [phoneCopied, setPhoneCopied] = useState(false);
  
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  const scrollToBottom = () => {
    if (!isMinimized && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!isMinimized && (messages.length > prevMessagesLengthRef.current || prevMessagesLengthRef.current === 0)) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isMinimized]);

  useEffect(() => {
    if (!isMinimized) {
      setTimeout(scrollToBottom, 50);
    }
  }, [isMinimized]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const cached = localStorage.getItem('user');
        if (cached) {
          setCurrentUser(JSON.parse(cached));
        }
        const res = await apiService.get('/auth/profile');
        if (res && res.success && res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.error('Failed to load user profile for rescue chat:', err);
      }
    };
    loadUser();
  }, []);

  // Fetch chat history
  const loadHistory = async () => {
    if (!targetUser || !targetUser.id) return;
    try {
      const res = await apiService.get(`/chat/history?targetId=${targetUser.id}`);
      if (res && res.success && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load rescue chat history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!targetUser || !targetUser.id) return;
    setIsLoading(true);
    loadHistory();

    const interval = setInterval(loadHistory, 4000);
    return () => clearInterval(interval);
  }, [targetUser?.id]);

  // WebSocket connection
  useEffect(() => {
    if (!currentUser || !targetUser?.id) return;

    const wsUrl = `ws://${window.location.hostname}:5000`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'register',
        userId: currentUser._id,
        userName: currentUser.full_name || 'User',
        role: currentUser.role || 'User',
        avatarUrl: currentUser.avatar_url || ''
      }));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chat') {
          // Check if message belongs to this conversation
          const isFromTarget = String(msg.senderId) === String(targetUser.id);
          const isToTarget = String(msg.targetId) === String(targetUser.id);
          const isGroupMatch = msg.groupId && String(msg.groupId) === String(missionId);

          if (isFromTarget || isToTarget || isGroupMatch) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => String(m.id) === String(msg.id || event.timeStamp))) return prev;
              return [...prev, {
                id: msg.id || Date.now(),
                from: isFromTarget ? 'them' : 'me',
                senderName: msg.senderName || targetUser.name,
                senderRole: msg.senderRole || targetUser.role,
                senderAvatarUrl: msg.senderAvatarUrl || targetUser.avatarUrl || '',
                text: msg.text,
                time: msg.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              }];
            });
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message in rescue chat:', err);
      }
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentUser?._id, targetUser?.id, missionId]);

  const handleSend = async () => {
    if (!inputText.trim() || !targetUser?.id || isSending) return;
    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const tempId = `local-${Date.now()}`;

    // Optimistic append
    setMessages(prev => [...prev, {
      id: tempId,
      from: 'me',
      senderName: currentUser?.full_name || 'Me',
      senderRole: currentUser?.role || 'Me',
      text: textToSend,
      time: timeStr
    }]);

    try {
      // Send via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
        wsRef.current.send(JSON.stringify({
          type: 'chat',
          senderId: currentUser._id,
          senderName: currentUser.full_name || 'User',
          senderRole: currentUser.role || 'User',
          targetId: targetUser.id,
          text: textToSend,
          time: timeStr
        }));
      }

      // Simultaneously send via API for guaranteed persistence
      await apiService.post('/chat/send', {
        targetId: targetUser.id,
        text: textToSend
      });
      loadHistory();
    } catch (err) {
      console.error('Failed to send rescue chat message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !targetUser?.id) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await apiService.upload('/chat/upload-image', formData, {}, 'POST');
      if (res && res.success && res.url) {
        const imageText = `[IMAGE]:${res.url}`;
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
          wsRef.current.send(JSON.stringify({
            type: 'chat',
            senderId: currentUser._id,
            senderName: currentUser.full_name || 'User',
            senderRole: currentUser.role || 'User',
            targetId: targetUser.id,
            text: imageText,
            time: timeStr
          }));
        }

        await apiService.post('/chat/send', {
          targetId: targetUser.id,
          text: imageText
        });
        loadHistory();
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to send image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const renderMessageContent = (text) => {
    if (typeof text === 'string' && text.startsWith('[IMAGE]:')) {
      const url = text.replace('[IMAGE]:', '').trim();
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 4 }}>
          <img
            src={url}
            alt="Rescue Chat Attachment"
            style={{
              maxHeight: 180,
              maxWidth: '100%',
              borderRadius: 'var(--r-sm)',
              border: '1px solid rgba(255,255,255,0.15)',
              objectFit: 'cover'
            }}
          />
        </a>
      );
    }
    return <span style={{ wordBreak: 'break-word', lineHeight: 1.5 }}>{text}</span>;
  };

  if (!targetUser || !targetUser.id) return null;

  return (
    <div className="card" style={{
      overflow: 'hidden',
      border: '1px solid var(--border-dim)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      transition: 'all 0.25s ease'
    }}>
      {/* Header */}
      {!hideHeader && (
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--bg-elevated)',
            borderBottom: isMinimized ? 'none' : '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(34,211,238,0.15)',
              border: '1px solid var(--cyan-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan-400)',
              flexShrink: 0
            }}>
              <MessageSquare size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {title || `Live Chat with ${targetUser.name || 'Rescuer'}`}
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'var(--green-400)',
                  background: 'rgba(34,197,94,0.12)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid rgba(34,197,94,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%' }} /> REALTIME
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span>{targetUser.role || 'Emergency Partner'}</span>
                {targetUser.phone && targetUser.phone !== 'Not provided' && (
                  <>
                    <span>·</span>
                    <span>Tel: {targetUser.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {targetUser.phone && targetUser.phone !== 'Not provided' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(targetUser.phone);
                  setPhoneCopied(true);
                  setTimeout(() => setPhoneCopied(false), 2000);
                }}
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '4px 10px',
                  height: 28,
                  fontSize: '0.72rem',
                  background: phoneCopied ? 'rgba(34,197,94,0.25)' : 'rgba(34,211,238,0.15)',
                  color: phoneCopied ? 'var(--green-400)' : 'var(--cyan-400)',
                  border: `1px solid ${phoneCopied ? 'rgba(34,197,94,0.4)' : 'rgba(34,211,238,0.3)'}`
                }}
                title="Copy phone number"
              >
                {phoneCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {phoneCopied ? 'Copied SĐT' : 'Copy SĐT'}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              title={isMinimized ? "Maximize chat" : "Minimize chat"}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Body & Input (Visible when not minimized or when hideHeader is true) */}
      {(!isMinimized || hideHeader) && (
        <>
          {/* Message List */}
          <div
            ref={messagesContainerRef}
            style={{
              padding: '16px 18px',
              height: 320,
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8, fontSize: '0.82rem' }}>
                <Loader size={16} className="animate-spin" /> Loading message history...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', gap: 6 }}>
                <MessageSquare size={28} style={{ opacity: 0.3 }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Connected to real-time rescue session chat</div>
                <div style={{ fontSize: '0.75rem', maxWidth: 300 }}>Send coordinates, situation updates, or ask your rescuer/victim any urgent questions here.</div>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.from === 'me';
                return (
                  <div
                    key={m.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {!isMe && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--cyan-400)', fontWeight: 700, marginBottom: 2, marginLeft: 4 }}>
                        {m.senderName || targetUser.name}
                      </div>
                    )}
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe
                        ? 'linear-gradient(135deg, var(--cyan-400), var(--blue-500))'
                        : 'var(--bg-elevated)',
                      color: isMe ? '#080d16' : 'var(--text-primary)',
                      border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: isMe ? '0 2px 8px rgba(34,211,238,0.25)' : 'none',
                      fontSize: '0.84rem'
                    }}>
                      {renderMessageContent(m.text)}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, padding: '0 4px' }}>
                      {m.time}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer or Ended Banner */}
          {isEnded ? (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              borderTop: '1px solid var(--border-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={15} color="var(--yellow-400)" />
                <span>SOS request {isCancelled ? 'cancelled' : 'completed/confirmed'}. Live chat is closed.</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (targetUser.id) {
                    localStorage.setItem('pending_chat_user', JSON.stringify({
                      id: targetUser.id,
                      name: targetUser.name || 'Partner',
                      role: targetUser.role || 'User'
                    }));
                    window.location.href = '/notifications';
                  }
                }}
                style={{
                  height: 32,
                  padding: '0 12px',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--cyan-400)',
                  border: '1px solid rgba(34,211,238,0.35)',
                  background: 'rgba(34,211,238,0.12)',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer'
                }}
              >
                <MessageSquare size={13} /> Open in normal Messages
              </button>
            </div>
          ) : (
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <label
                className="btn btn-ghost btn-sm"
                style={{
                  padding: '6px 10px',
                  height: 36,
                  cursor: isUploadingImage ? 'wait' : 'pointer',
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title="Attach scene photo"
              >
                {isUploadingImage ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  style={{ display: 'none' }}
                />
              </label>

              <input
                type="text"
                className="input"
                style={{ flex: 1, height: 36, fontSize: '0.84rem' }}
                placeholder={`Message ${targetUser.name || 'rescuer'}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isSending}
              />

              <button
                className="btn btn-primary btn-sm"
                style={{ height: 36, padding: '0 14px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                onClick={handleSend}
                disabled={isSending || !inputText.trim()}
              >
                <Send size={14} /> Gửi
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
