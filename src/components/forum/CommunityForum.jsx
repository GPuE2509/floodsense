import React, { useState, useRef, useEffect } from 'react';
import {
  ThumbsUp, MessageSquare, Send, Image as ImageIcon, Trash2, X, Lock, Search,
  AlertTriangle, PenSquare, Camera, Plus, CheckCircle, Clock, User, MoreHorizontal, Heart, Flag, Pin,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiService } from '../../services/apiService';

const INITIAL_FORUM_POSTS = [];

const TruncatedText = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;

  const lines = text.split('\n');
  const isLong = text.length > 400 || lines.length > 5;

  const displayText = isExpanded ? text : (isLong ? (lines.length > 5 ? lines.slice(0, 5).join('\n') + '...' : text.slice(0, 400) + '...') : text);

  return (
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 16 }}>
      <div>
        {displayText}
      </div>
      {isLong && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'var(--cyan-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
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
            color: 'var(--cyan-400)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginLeft: 6,
            fontSize: '0.72rem',
            display: 'inline-block'
          }}
        >
          {isExpanded ? 'Show less' : 'See more'}
        </button>
      )}
    </div>
  );
};

export default function CommunityForum({ role = 'user', onRedirectToRegister }) {
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem('forum_posts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse forum posts from localStorage:', e);
      }
    }
    return INITIAL_FORUM_POSTS.map(p => ({ ...p, status: 'approved' }));
  });
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activePostMenuId, setActivePostMenuId] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [deletePostTarget, setDeletePostTarget] = useState(null);
  // Edit / Report states
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [reportingPost, setReportingPost] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportingComment, setReportingComment] = useState(null); // { id: commentId }
  const [commentReportReason, setCommentReportReason] = useState('');
  const [commentReportDetails, setCommentReportDetails] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [toast, setToast] = useState(null);
  const [showOnlyMyPosts, setShowOnlyMyPosts] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [showAllComments, setShowAllComments] = useState({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const params = new URLSearchParams();
      if (showOnlyMyPosts) {
        params.append('my_posts', 'true');
      }
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      if (search && search.trim() !== '') {
        params.append('search', search.trim());
      }
      params.append('page', currentPage);
      params.append('limit', 5); // 5 posts per page
      params.append('_t', Date.now()); // Prevent browser cache returning stale data
      const url = `/forum/posts?${params.toString()}`;
      const res = await apiService.get(url);
      if (res && res.success) {
        const mapped = res.data.map(p => ({
          id: p._id || p.id,
          author: p.author_id?.full_name || "Unknown",
          authorId: p.author_id?._id || p.author_id,
          avatar: p.author_id?.avatar_url || p.author_id?.avatar || "UN",
          role: p.author_id?.role || "user",
          category: p.category,
          title: p.title,
          is_pinned: p.is_pinned,
          raw_date: p.created_at || Date.now(),
          time: p.created_at
            ? new Date(p.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(p.created_at).toLocaleDateString('en-US')
            : "Just now",
          content: p.content,
          image: p.images?.[0] || null,
          images: p.images || [],
          likesList: Array.isArray(p.likes) ? p.likes : [],
          heartsList: Array.isArray(p.hearts) ? p.hearts : [],
          comments: p.comments?.map(c => ({
            id: c._id || c.id,
            author: c.author_id?.full_name || "Unknown",
            avatar: c.author_id?.avatar_url || c.author_id?.avatar || "UN",
            role: c.author_id?.role || "user",
            content: c.content,
            time: c.created_at
              ? new Date(c.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(c.created_at).toLocaleDateString('en-US')
              : "Just now",
            likes: c.likes || 0,
            likedByMe: c.likedByMe || false,
            reportedByMe: c.reportedByMe || false,
            myReportReason: c.myReportReason,
            myReportDetails: c.myReportDetails,
            replies: c.replies?.map(r => ({
              id: r._id || r.id,
              author: r.author_id?.full_name || "Unknown",
              avatar: r.author_id?.avatar_url || r.author_id?.avatar || "UN",
              role: r.author_id?.role || "user",
              content: r.content,
              time: r.created_at
                ? new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(r.created_at).toLocaleDateString('en-US')
                : "Just now",
              likes: r.likes || 0,
              likedByMe: r.likedByMe || false,
              reportedByMe: r.reportedByMe || false,
              myReportReason: r.myReportReason,
              myReportDetails: r.myReportDetails
            })) || []
          })) || [],
          status: p.status || 'approved',
          reportedByMe: p.reportedByMe || false,
          myReportReason: p.myReportReason,
          myReportDetails: p.myReportDetails
        }));
        setPosts(mapped);
        if (res.pagination) {
          setTotalPages(res.pagination.pages || 1);
          setTotalPosts(res.pagination.total || 0);
        }
      }
    } catch (e) {
      console.error("Failed to load forum posts from server:", e);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, showOnlyMyPosts, search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPosts();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedCategory, showOnlyMyPosts, search, currentPage]);

  const fetchPostsRef = useRef(fetchPosts);
  useEffect(() => {
    fetchPostsRef.current = fetchPosts;
  }, [fetchPosts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('postId');
    if (postId && posts.length > 0) {
      const element = document.getElementById(`forum-post-${postId}`);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.transition = 'background-color 0.5s ease, border-color 0.5s ease';
          element.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';
          element.style.borderColor = 'var(--cyan-400)';
          
          const clearTimer = setTimeout(() => {
            element.style.backgroundColor = '';
            element.style.borderColor = 'var(--border-subtle)';
          }, 3000);
          return () => clearTimeout(clearTimer);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [posts]);

  useEffect(() => {
    // Set up WebSocket for real-time forum updates with auto-reconnect
    const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') : 'ws://localhost:5000');
    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'FORUM_UPDATE') {
            console.log('Real-time FORUM_UPDATE received on client, fetching fresh data...');
            fetchPostsRef.current();
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed in CommunityForum, reconnecting in 3s...');
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error in CommunityForum', err);
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

  useEffect(() => {
    localStorage.setItem('forum_posts', JSON.stringify(posts));
  }, [posts]);

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (role !== 'guest') {
        try {
          const res = await apiService.get('/auth/profile');
          if (res && res.user) {
            setCurrentUser({
              _id: res.user._id,
              full_name: res.user.full_name || '',
              avatar: res.user.avatar_url || res.user.avatar || ''
            });
          }
        } catch (e) {
          console.error('Failed to fetch profile in forum:', e);
        }
      }
    };
    fetchProfile();
  }, [role]);

  const getInitials = (name) => {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const renderAvatar = (avatarData, fallbackText, size = 40, borderStyle = {}) => {
    const isUrl = avatarData && (avatarData.startsWith('http') || avatarData.startsWith('/') || avatarData.startsWith('data:'));
    return (
      <div className="user-avatar" style={{ width: size, height: size, flexShrink: 0, position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...borderStyle }}>
        {isUrl ? (
          <img
            src={avatarData}
            alt="User avatar"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                const span = document.createElement('span');
                span.innerText = fallbackText;
                span.style.fontWeight = 'bold';
                parent.appendChild(span);
              }
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(26,108,255,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {fallbackText}
          </div>
        )}
      </div>
    );
  };

  const [lightboxImage, setLightboxImage] = useState(null);

  const renderPostImages = (images) => {
    if (!images || images.length === 0) return null;
    const count = images.length;

    // Single image
    if (count === 1) {
      return (
        <div
          className="flood-image-card"
          onClick={() => setLightboxImage(images[0])}
          style={{ overflow: 'hidden', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: '#070c14', marginBottom: 12, cursor: 'pointer' }}
        >
          <img src={images[0]} alt="Attachment" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
        </div>
      );
    }

    // Two images
    if (count === 2) {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setLightboxImage(img)}
              style={{ height: 180, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-dim)', background: '#070c14', cursor: 'pointer' }}
            >
              <img src={img} alt={`Attachment ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      );
    }

    // Three images: 1 large on top, 2 small on bottom
    if (count === 3) {
      return (
        <div style={{ display: 'grid', gridTemplateRows: '200px 120px', gap: 8, marginBottom: 12 }}>
          <div
            onClick={() => setLightboxImage(images[0])}
            style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-dim)', background: '#070c14', cursor: 'pointer' }}
          >
            <img src={images[0]} alt="Attachment 0" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {images.slice(1).map((img, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxImage(img)}
                style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-dim)', background: '#070c14', cursor: 'pointer' }}
              >
                <img src={img} alt={`Attachment ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Four or more images (show up to 4, last one has +X overlay if count > 4)
    const displayImages = images.slice(0, 4);
    const remainingCount = count - 4;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {displayImages.map((img, idx) => {
          const isLast = idx === 3;
          const showOverlay = isLast && remainingCount > 0;
          return (
            <div
              key={idx}
              onClick={() => setLightboxImage(img)}
              style={{ height: 140, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-dim)', background: '#070c14', position: 'relative', cursor: 'pointer' }}
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

  // Post Creator states
  const [showCreator, setShowCreator] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState("Experience");
  const [newPostImages, setNewPostImages] = useState([]); // array of base64
  const fileInputRef = useRef(null);
  const editContentRef = useRef(null);

  // Guest alert state
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Active reply input fields: maps parentCommentId -> string
  const [replyInputs, setReplyInputs] = useState({});
  // Active main comment input fields: maps postId -> string
  const [commentInputs, setCommentInputs] = useState({});

  const categories = ["All", "Announcement", "Urgent report", "Notification", "Experience", "Information", "Q&A"];

  const verifyAction = (actionCallback) => {
    if (role === 'guest') {
      setShowGuestModal(true);
      return false;
    }
    if (actionCallback) actionCallback();
    return true;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) { alert("Photos maximum 5MB per file"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPostImages(prev => prev.length < 6 ? [...prev, reader.result] : prev);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-selected
    e.target.value = '';
  };
  const removePostImage = (idx) => setNewPostImages(prev => prev.filter((_, i) => i !== idx));

  // Create Post
  const handleCreatePost = () => {
    verifyAction(async () => {
      if (!newPostContent.trim()) return;

      try {
        const response = await apiService.post('/forum/posts', {
          title: '',
          content: newPostContent,
          category: newPostCategory,
          images: newPostImages
        });

        if (response && response.success) {
          const backendPost = response.data;
          const newPost = {
            id: backendPost._id,
            author: backendPost.author_id?.full_name || (role === 'volunteer' ? "Nguyen Hung Cuong" : "You (Member)"),
            avatar: backendPost.author_id?.avatar_url || backendPost.author_id?.avatar || (role === 'volunteer' ? 'HC' : 'ME'),
            role: backendPost.author_id?.role || role,
            category: backendPost.category,
            time: "Just finished",
            content: backendPost.content,
            image: backendPost.images?.[0] || null,
            images: backendPost.images || [],
            likesList: [],
            heartsList: [],
            comments: [],
            status: backendPost.status || 'pending'
          };

          setPosts([newPost, ...posts]);
          setNewPostContent('');
          setNewPostImages([]);
          setShowCreator(false);
          setToast({ message: "Your article has been submitted and is waiting for admin approval.", type: "success" });
          setTimeout(() => setToast(null), 4000);
        }
      } catch (error) {
        console.error('Failed to create forum post:', error);
        alert(error.response?.data?.message || "Failed to publish post. Please try again.");
      }
    });
  };

  // Edit Post (FE-only)
  const handleStartEditPost = (postId) => {
    const p = posts.find(x => x.id === postId);
    if (!p) return;
    setEditingPost(postId);
    setEditContent(p.content || '');
  };
  const handleSaveEditPost = () => {
    const html = editContentRef.current ? editContentRef.current.innerHTML : editContent;
    setPosts(prev => prev.map(p => p.id === editingPost ? { ...p, content: html } : p));
    setEditingPost(null);
    setEditContent('');
  };
  const handleCancelEdit = () => { setEditingPost(null); setEditContent(''); };

  // Edit post feature connected to the database
  const startEditPost = (post) => {
    setEditingPostId(post.id);
    setNewPostContent(post.content || '');
    setNewPostCategory(post.category || 'Experience');
    setNewPostImages(post.images || []);
    setShowCreator(true);
    setActivePostMenuId(null);
  };

  const handleEditPost = () => {
    verifyAction(async () => {
      if (!newPostContent.trim()) return;
      try {
        const response = await apiService.put(`/forum/posts/${editingPostId}`, {
          content: newPostContent,
          category: newPostCategory,
          images: newPostImages
        });
        if (response && response.success) {
          const updated = response.post || response.data;
          setPosts(prev => prev.map(p => {
            if (p.id === updated._id || p.id === updated.id) {
              return {
                ...p,
                content: updated.content,
                category: updated.category,
                images: updated.images || [],
                image: updated.images?.[0] || null,
                status: updated.status || 'pending'
              };
            }
            return p;
          }));
          setShowCreator(false);
          setEditingPostId(null);
          setNewPostContent('');
          setNewPostImages([]);
          setToast({ message: "Your article has been updated successfully.", type: "success" });
          setTimeout(() => setToast(null), 4000);
        }
      } catch (e) {
        console.error("Failed to update post:", e);
        alert(e.response?.data?.message || "Failed to update post. Please try again.");
      }
    });
  };

  // Report Post (connected to DB)
  const handleStartReport = (postId, existingReport = null) => {
    verifyAction(() => {
      setReportingPost({ id: postId, existingReport });
      if (existingReport) {
        setReportReason(existingReport.reason || '');
        setReportDetails(existingReport.details || '');
      } else {
        setReportReason('');
        setReportDetails('');
      }
      setReportError('');
    });
  };

  const handleSendReport = () => {
    if (!reportingPost) return;
    if (!reportReason) {
      setReportError("Please select a reason before submitting.");
      return;
    }
    setReportError('');
    verifyAction(async () => {
      try {
        const response = await apiService.post(`/forum/posts/${reportingPost.id}/report`, {
          reason: reportReason,
          details: reportDetails
        });
        if (response && response.success) {
          setPosts(prev => prev.map(p => p.id === reportingPost.id ? {
            ...p,
            reportedByMe: true,
            myReportReason: reportReason,
            myReportDetails: reportDetails
          } : p));
          setReportingPost(null);
          setReportReason('');
          setReportDetails('');
          setToast({ message: "Report sent — Thank you for your feedback.", type: "success" });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (error) {
        console.error("Failed to report post:", error);
        const errMsg = error.response?.data?.message || "Failed to submit report. Please try again.";
        setToast({ message: errMsg, type: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    });
  };

  // Report Comment (connected to DB)
  const handleStartCommentReport = (commentId, existingReport = null) => {
    verifyAction(() => {
      setReportingComment({ id: commentId, existingReport });
      if (existingReport) {
        setCommentReportReason(existingReport.reason || '');
        setCommentReportDetails(existingReport.details || '');
      } else {
        setCommentReportReason('');
        setCommentReportDetails('');
      }
      setReportError('');
    });
  };

  const handleSendCommentReport = () => {
    if (!reportingComment) return;
    if (!commentReportReason) {
      setReportError("Please select a reason before submitting.");
      return;
    }
    setReportError('');
    verifyAction(async () => {
      try {
        const response = await apiService.post(`/forum/comments/${reportingComment.id}/report`, {
          reason: commentReportReason,
          details: commentReportDetails
        });
        if (response && response.success) {
          setPosts(prev => prev.map(post => ({
            ...post,
            comments: post.comments.map(c => {
              if (c.id === reportingComment.id) {
                return { ...c, reportedByMe: true, myReportReason: commentReportReason, myReportDetails: commentReportDetails };
              }
              return {
                ...c,
                replies: (c.replies || []).map(r => r.id === reportingComment.id ? { ...r, reportedByMe: true, myReportReason: commentReportReason, myReportDetails: commentReportDetails } : r)
              };
            })
          })));
          setReportingComment(null);
          setCommentReportReason('');
          setCommentReportDetails('');
          setToast({ message: "Report sent — Thank you for your feedback.", type: "success" });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (error) {
        console.error("Failed to report comment:", error);
        const errMsg = error.response?.data?.message || "Failed to submit report. Please try again.";
        setToast({ message: errMsg, type: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    });
  };

  // React to Post (Like/Heart)
  const handleReactPost = (postId, type) => {
    verifyAction(async () => {
      try {
        const response = await apiService.post(`/forum/posts/${postId}/react`, { type });
        if (response && response.success) {
          const { likes, hearts } = response.data;
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likesList: likes || [],
                heartsList: hearts || []
              };
            }
            return post;
          }));
        }
      } catch (error) {
        console.error("Failed to react to post:", error);
      }
    });
  };

  // Delete Post
  const handleDeletePost = (postId) => {
    setActivePostMenuId(null);
    setDeletePostTarget(postId);
  };

  const confirmDeletePost = () => {
    if (!deletePostTarget) return;
    const postId = deletePostTarget;
    setDeletePostTarget(null);
    verifyAction(async () => {
      try {
        const response = await apiService.delete(`/forum/posts/${postId}`);
        if (response && response.success) {
          setPosts(prev => prev.filter(post => post.id !== postId));
          setToast({ message: "Article has been deleted successfully.", type: "success" });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (error) {
        console.error("Failed to delete post:", error);
        alert(error.response?.data?.message || "Failed to delete post. Please try again.");
      }
    });
  };

  // Like Comment (Level 1 or Level 2)
  const handleLikeComment = (postId, commentId, replyId = null) => {
    verifyAction(() => {
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map(c => {
              if (!replyId && c.id === commentId) {
                const liked = !c.likedByMe;
                return { ...c, likedByMe: liked, likes: liked ? c.likes + 1 : c.likes - 1 };
              } else if (replyId && c.id === commentId) {
                return {
                  ...c,
                  replies: c.replies.map(r => {
                    if (r.id === replyId) {
                      const liked = !r.likedByMe;
                      return { ...r, likedByMe: liked, likes: liked ? r.likes + 1 : r.likes - 1 };
                    }
                    return r;
                  })
                };
              }
              return c;
            })
          };
        }
        return post;
      }));
    });
  };

  // Delete Comment / Reply (open confirmation modal)
  const handleDeleteComment = (postId, commentId, replyId = null) => {
    setDeleteCommentTarget({ postId, commentId, replyId });
  };

  const confirmDeleteComment = () => {
    const target = deleteCommentTarget;
    if (!target) return;
    const { postId, commentId, replyId } = target;
    setDeleteCommentTarget(null);
    verifyAction(async () => {
      try {
        const response = await apiService.delete(`/forum/comments/${replyId || commentId}`);
        if (response && response.success) {
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: post.comments.map(c => {
                  if (c.id === commentId) {
                    if (replyId) {
                      return {
                        ...c,
                        replies: c.replies.filter(r => r.id !== replyId)
                      };
                    }
                  }
                  return c;
                }).filter(c => replyId || c.id !== commentId)
              };
            }
            return post;
          }));
          setToast({ message: "Comment has been deleted successfully.", type: "success" });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    });
  };

  // Add Level 1 Comment
  const handleAddComment = (postId) => {
    verifyAction(async () => {
      const content = commentInputs[postId] || '';
      if (!content.trim()) return;

      try {
        const response = await apiService.post(`/forum/posts/${postId}/comments`, { content });
        if (response && response.success) {
          const fresh = response.data;
          const newComment = {
            id: fresh._id,
            author: fresh.author_id?.full_name || "Unknown",
            avatar: fresh.author_id?.avatar_url || fresh.author_id?.avatar || "UN",
            role: fresh.author_id?.role || "user",
            content: fresh.content,
            time: "Just now",
            likes: 0,
            likedByMe: false,
            replies: []
          };
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: [...post.comments, newComment]
              };
            }
            return post;
          }));
          setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        }
      } catch (error) {
        console.error("Failed to add comment:", error);
      }
    });
  };

  // Add Level 2 Comment (Nested Reply)
  const handleAddReply = (postId, commentId) => {
    verifyAction(async () => {
      const content = replyInputs[commentId] || '';
      if (!content.trim()) return;

      try {
        const response = await apiService.post(`/forum/posts/${postId}/comments`, { content, parent_id: commentId });
        if (response && response.success) {
          const fresh = response.data;
          const newReply = {
            id: fresh._id,
            author: fresh.author_id?.full_name || "Unknown",
            avatar: fresh.author_id?.avatar_url || fresh.author_id?.avatar || "UN",
            role: fresh.author_id?.role || "user",
            content: fresh.content,
            time: "Just now",
            likes: 0,
            likedByMe: false
          };
          setPosts(prev => prev.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                comments: post.comments.map(c => {
                  if (c.id === commentId) {
                    return {
                      ...c,
                      replies: [...c.replies, newReply]
                    };
                  }
                  return c;
                })
              };
            }
            return post;
          }));
          setReplyInputs(prev => {
            const copy = { ...prev };
            delete copy[commentId];
            return copy;
          });
          setExpandedReplies(prev => ({ ...prev, [commentId]: true }));
        }
      } catch (error) {
        console.error("Failed to add reply:", error);
      }
    });
  };

  // Edit Comment inline (FE-only)
  const [editingComment, setEditingComment] = useState(null); // { postId, commentId, replyId? }
  const [editingCommentText, setEditingCommentText] = useState('');
  const startEditComment = (postId, commentId, replyId = null, currentText = '') => {
    setEditingComment({ postId, commentId, replyId });
    setEditingCommentText(currentText);
  };
  const saveEditComment = () => {
    if (!editingComment) return;
    const { postId, commentId, replyId } = editingComment;
    verifyAction(async () => {
      try {
        const targetId = replyId || commentId;
        const response = await apiService.put(`/forum/comments/${targetId}`, { content: editingCommentText });
        if (response && response.success) {
          setPosts(prev => prev.map(post => {
            if (post.id !== postId) return post;
            return {
              ...post,
              comments: post.comments.map(c => {
                if (c.id !== commentId) return c;
                if (replyId) {
                  return {
                    ...c,
                    replies: c.replies.map(r => r.id === replyId ? { ...r, content: response.data.content } : r)
                  };
                }
                return { ...c, content: response.data.content };
              })
            };
          }));
          setEditingComment(null);
          setEditingCommentText('');
          setToast({ message: "Comment has been updated successfully.", type: "success" });
          setTimeout(() => setToast(null), 3000);
        }
      } catch (error) {
        console.error("Failed to update comment:", error);
      }
    });
  };
  const cancelEditComment = () => { setEditingComment(null); setEditingCommentText(''); };

  // Delete confirmation modal state for comments
  const [deleteCommentTarget, setDeleteCommentTarget] = useState(null); // { postId, commentId, replyId }

  // Handles clicking "Phản hồi" on Level 1 Comment or Level 2 Reply
  const handleReplyClick = (authorName, commentId) => {
    verifyAction(() => {
      // Set value with @Mention and open the input box
      setReplyInputs(prev => ({
        ...prev,
        [commentId]: `@${authorName} `
      }));

      // Focus the input element
      setTimeout(() => {
        const el = document.getElementById(`reply-input-${commentId}`);
        if (el) {
          el.focus();
        }
      }, 50);
    });
  };

  // Filter posts based on category and search query
  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = post.content.toLowerCase().includes(search.toLowerCase()) ||
      post.author.toLowerCase().includes(search.toLowerCase()) ||
      post.category.toLowerCase().includes(search.toLowerCase());

    // Visibility rules:
    // 1. Approved posts are visible to everyone
    // 2. Pending posts are only visible to their creator (avatar === 'ME') or if current role is 'admin'
    const isApproved = post.status === 'approved' || !post.status;
    const isOwnPost = post.avatar === 'ME';
    const isAdmin = role === 'admin';
    const isVisible = isApproved || isOwnPost || isAdmin;

    return matchesCategory && matchesSearch && isVisible;
  }).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.raw_date) - new Date(a.raw_date);
  });

  const getRoleStyle = (userRole) => {
    const roleLower = (userRole || '').toLowerCase();
    switch (roleLower) {
      case 'super_admin':
      case 'super admin':
        return { border: '2px solid var(--gold-400)', badgeBg: 'rgba(234,179,8,0.12)', badgeColor: 'var(--gold-400)', label: 'Super Admin' };
      case 'admin':
        return { border: '2px solid var(--gold-400)', badgeBg: 'rgba(234,179,8,0.12)', badgeColor: 'var(--gold-400)', label: 'Admin' };
      case 'manager':
        return { border: '2px solid var(--gold-400)', badgeBg: 'rgba(234,179,8,0.12)', badgeColor: 'var(--gold-400)', label: 'Manager' };
      case 'volunteer':
        return { border: '2px solid var(--red-400)', badgeBg: 'rgba(239,68,68,0.12)', badgeColor: 'var(--red-400)', label: 'Volunteer' };
      case 'workshop':
        return { border: '2px solid var(--orange-400)', badgeBg: 'rgba(249,115,22,0.12)', badgeColor: 'var(--orange-400)', label: 'Workshop' };
      default:
        return { border: '2px solid var(--cyan-400)', badgeBg: 'rgba(6,182,212,0.12)', badgeColor: 'var(--cyan-400)', label: 'Member' };
    }
  };

  return (
    <div style={{ position: 'relative' }}>

      {/* Search and Category Filters */}
      <div className="grid grid-2" style={{ gap: 16, marginBottom: 20, gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div>
          <div className="input-group">
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder="Search for keywords, author name or post content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 flex-wrap" style={{ alignItems: 'center' }}>
          {role !== 'guest' && (
            <button
              className={`btn btn-sm ${showOnlyMyPosts ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowOnlyMyPosts(!showOnlyMyPosts)}
              style={{
                fontSize: '0.72rem',
                padding: '6px 12px',
                borderColor: 'var(--cyan-500)',
                color: showOnlyMyPosts ? 'black' : 'var(--cyan-400)',
                marginRight: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <User size={13} />
              My posts
            </button>
          )}
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedCategory(cat)}
              style={{ fontSize: '0.72rem', padding: '6px 12px' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── CREATE POST BUTTON BAR ── */}
      <div className="card p-5" style={{ marginBottom: 20, position: 'relative', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 100% 0%, rgba(6,182,212,0.05), transparent 50%)', pointerEvents: 'none' }} />
        <div className="flex items-center gap-3">
          {renderAvatar(
            currentUser?.avatar,
            currentUser?.full_name ? getInitials(currentUser.full_name) : (role === 'guest' ? 'G' : role === 'volunteer' ? 'HC' : 'ME'),
            42
          )}
          <button
            onClick={() => role === 'guest' ? setShowGuestModal(true) : setShowCreator(true)}
            style={{ flex: 1, textAlign: 'left', cursor: 'pointer', color: 'var(--text-muted)', background: 'rgba(18,29,40,0.4)', borderRadius: 24, padding: '10px 18px', border: '1px solid var(--border-dim)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem' }}
          >
            {role === 'guest' ? "Log in to share flood information..." : "What are you thinking? Share images and flood information..."}
          </button>
          <button className="btn btn-primary" onClick={() => role === 'guest' ? setShowGuestModal(true) : setShowCreator(true)} style={{ flexShrink: 0, gap: 6 }}>
            <PenSquare size={14} /> Create articles
          </button>
        </div>
      </div>

      {/* ── CREATE POST MODAL ── */}
      {showCreator && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}>
          <div className="card page-enter" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenSquare size={16} color="var(--cyan-400)" /> {editingPostId ? "Edit article" : "Create new article"}
              </div>
              <button onClick={() => { setShowCreator(false); setNewPostContent(''); setNewPostImages([]); setEditingPostId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Body (scrollable) */}
            <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
              {/* Author + category */}
              <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                {renderAvatar(
                  currentUser?.avatar,
                  currentUser?.full_name ? getInitials(currentUser.full_name) : (role === 'volunteer' ? 'HC' : 'ME'),
                  40
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {currentUser?.full_name || (role === 'volunteer' ? "Nguyen Hung Cuong" : "You (Member)")}
                  </div>
                  <select className="input" style={{ marginTop: 4, padding: '2px 8px', fontSize: '0.72rem', height: 26, minWidth: 140, borderRadius: 12 }} value={newPostCategory} onChange={e => setNewPostCategory(e.target.value)}>
                    {categories.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <textarea
                className="input"
                rows={5}
                autoFocus
                placeholder="Describe specifically the location, water depth, damage or repair experience..."
                value={newPostContent}
                onChange={e => setNewPostContent(e.target.value)}
                style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16, resize: 'vertical' }}
              />

              {/* Image grid */}
              {newPostImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {newPostImages.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border-dim)', aspectRatio: '1' }}>
                      <img src={src} alt={`img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <button onClick={() => removePostImage(idx)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={11} color="white" />
                      </button>
                    </div>
                  ))}
                  {newPostImages.length < 6 && (
                    <button onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 'var(--r-sm)', border: '1.5px dashed var(--border-dim)', background: 'rgba(18,29,40,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', aspectRatio: '1' }}>
                      <Plus size={18} color="var(--text-muted)" />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Add photos</span>
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone (no images yet) */}
              {newPostImages.length === 0 && (
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

              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--cyan-400)', fontSize: '0.78rem', fontWeight: 600 }}>
                <ImageIcon size={15} /> Photo {newPostImages.length > 0 && `(${newPostImages.length}/6)`}
              </button>
              <div className="flex gap-3">
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreator(false); setNewPostContent(''); setNewPostImages([]); setEditingPostId(null); }}>Cancel</button>
                <button className="btn btn-primary" onClick={editingPostId ? handleEditPost : handleCreatePost} disabled={!newPostContent.trim()} style={{ minWidth: 100 }}>
                  <Send size={13} /> {editingPostId ? "Save changes" : "Post now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comment Confirmation Modal */}
      {deleteCommentTarget && (
        <div className="modal-overlay" onClick={() => setDeleteCommentTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Confirm comment deletion</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteCommentTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this comment? Action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteCommentTarget(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={confirmDeleteComment}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Post Confirmation Modal */}
      {deletePostTarget && (
        <div className="modal-overlay" onClick={() => setDeletePostTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Confirm article deletion</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeletePostTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this post? Action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setDeletePostTarget(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={confirmDeletePost}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Feed list with 2-Column Split (50% Media/Caption on Left, 50% Threaded Comments on Right) */}
      <div style={{ display: 'grid', gap: 28 }}>
        {filteredPosts.map((post) => {
          const authorStyle = getRoleStyle(post.role);
          const isOwnPost = post.avatar === 'ME' || (currentUser && (post.authorId === currentUser._id || post.author === currentUser.full_name));
          const totalCommentsCount = post.comments.length + post.comments.reduce((acc, c) => acc + c.replies.length, 0);
          const likesCount = post.likesList?.length || 0;
          const heartsCount = post.heartsList?.length || 0;
          const likedByMe = currentUser && post.likesList?.some(id => id.toString() === currentUser._id?.toString());
          const heartedByMe = currentUser && post.heartsList?.some(id => id.toString() === currentUser._id?.toString());

          return (
            <div key={post.id} id={`forum-post-${post.id}`} className="card page-enter" style={{ position: 'relative', overflow: 'hidden', padding: 0, border: '1px solid var(--border-subtle)' }}>
              {post.status === 'pending' && (
                <div style={{
                  background: 'rgba(234,179,8,0.1)',
                  borderBottom: '1px solid var(--border-subtle)',
                  padding: '8px 16px',
                  color: 'var(--orange-400)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Clock size={13} />
                  <span>Pending admin approval</span>
                </div>
              )}

              {/* Post Container (1 Column Layout) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>

                {/* ============================================================
                    POST CONTENT (AUTHOR, CAPTION, MEDIA, ACTIONS)
                    ============================================================ */}
                <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>

                  {/* Scrollable content area for very long posts */}
                  <div className="custom-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4" style={{ marginBottom: 16, flexShrink: 0 }}>
                      <div className="flex items-center gap-3">
                        {renderAvatar(
                          (post.author === currentUser?.full_name || post.avatar === 'ME') ? (currentUser?.avatar || post.avatar) : post.avatar,
                          getInitials(post.author),
                          44,
                          { border: authorStyle.border, padding: 1, background: 'var(--bg-elevated)' }
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{post.author}</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: authorStyle.badgeBg, color: authorStyle.badgeColor, letterSpacing: '0.04em' }}>
                              {authorStyle.label}
                            </span>
                            {post.is_pinned && (
                              <span title="Pinned" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 5px', borderRadius: 4, background: 'rgba(234,179,8,0.1)', color: 'var(--gold-400)', border: '1px solid rgba(234,179,8,0.2)' }}>
                                <Pin size={12} />
                              </span>
                            )}
                            <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(6,182,212,0.06)', color: 'var(--cyan-400)', border: '1px solid rgba(6,182,212,0.15)', padding: '1px 5px' }}>{post.category}</span>
                            {post.reportedByMe && (
                              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--orange-400)', marginLeft: 4 }}>
                                <Flag size={12} fill="currentColor" />
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{post.time}</div>
                        </div>
                      </div>

                      {currentUser && (isOwnPost || (post.role !== 'Admin' && post.role !== 'Manager')) && (
                        <div style={{ position: 'relative' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--text-muted)', padding: 6, display: 'flex', alignItems: 'center' }}
                            onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)}
                            title="Options"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {activePostMenuId === post.id && (
                            <div
                              className="card shadow-lg"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 100,
                                minWidth: 120,
                                padding: 4,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                              }}
                            >
                              {isOwnPost ? (
                                <>
                                  <button
                                    className="btn btn-ghost btn-sm flex items-center gap-2"
                                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', padding: '6px 10px', color: 'var(--text-primary)' }}
                                    onClick={() => startEditPost(post)}
                                  >
                                    <PenSquare size={12} color="var(--cyan-400)" /> Edit post
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm flex items-center gap-2"
                                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', padding: '6px 10px', color: 'var(--red-400)' }}
                                    onClick={() => { handleDeletePost(post.id); setActivePostMenuId(null); }}
                                  >
                                    <Trash2 size={12} /> Delete post
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn btn-ghost btn-sm flex items-center gap-2"
                                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.75rem', padding: '6px 10px', color: 'var(--orange-400)' }}
                                  onClick={() => { handleStartReport(post.id, post.reportedByMe ? { reason: post.myReportReason, details: post.myReportDetails } : null); setActivePostMenuId(null); }}
                                  title={post.reportedByMe ? 'View your report' : 'Report post'}
                                >
                                  <Flag size={12} /> {post.reportedByMe ? 'Reported' : 'Report post'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content text (Caption) & Title */}
                    {post.title && (
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                        {post.title}
                      </div>
                    )}
                    <div style={{ flexShrink: 0 }}>
                      <TruncatedText text={post.content} />
                    </div>

                    {/* Image Render */}
                    {renderPostImages(post.images)}
                  </div>

                  {/* Actions & Likes count (Strictly NO share button) */}
                  <div style={{ marginTop: 12 }}>

                    {/* Likes & Comments stats row */}
                    <div className="flex items-center justify-between" style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)', marginBottom: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div className="flex items-center gap-2">
                        {likesCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>👍</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{likesCount}</span>
                          </div>
                        )}
                        {heartsCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>❤️</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{heartsCount}</span>
                          </div>
                        )}
                        {likesCount === 0 && heartsCount === 0 && (
                          <span style={{ color: 'var(--text-muted)' }}>0 reactions</span>
                        )}
                      </div>
                      <div>
                        <span>{totalCommentsCount} comment</span>
                      </div>
                    </div>

                    {/* Interaction Buttons (Like, Heart, Comment) */}
                    <div className="flex items-center gap-3">
                      <button
                        className="btn btn-ghost btn-sm flex-1"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: likedByMe ? 'var(--cyan-400)' : 'var(--text-secondary)', background: likedByMe ? 'rgba(6,182,212,0.06)' : 'transparent', border: '1px solid var(--border-dim)', height: 36 }}
                        onClick={() => handleReactPost(post.id, 'like')}
                      >
                        <ThumbsUp size={18} fill={likedByMe ? 'currentColor' : 'none'} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Like</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm flex-1"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: heartedByMe ? 'var(--red-400)' : 'var(--text-secondary)', background: heartedByMe ? 'rgba(239,68,68,0.06)' : 'transparent', border: '1px solid var(--border-dim)', height: 36 }}
                        onClick={() => handleReactPost(post.id, 'heart')}
                      >
                        <Heart size={18} fill={heartedByMe ? 'currentColor' : 'none'} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Heart</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm flex-1"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: expandedComments[post.id] ? 'var(--cyan-400)' : 'var(--text-secondary)', background: expandedComments[post.id] ? 'rgba(6,182,212,0.06)' : 'transparent', border: '1px solid var(--border-dim)', height: 36 }}
                        onClick={() => {
                          setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                          if (!expandedComments[post.id]) {
                            setTimeout(() => {
                              const el = document.getElementById(`comment-focus-${post.id}`);
                              if (el) el.focus();
                            }, 100);
                          }
                        }}
                      >
                        <MessageSquare size={17} />
                        <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>Comment</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* ============================================================
                    COMMENTS SECTION (TOGGLEABLE)
                    ============================================================ */}
                {expandedComments[post.id] && (
                  <div style={{
                    padding: '20px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(18,29,40,0.18)',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>

                    {/* Title / Info banner */}
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, marginBottom: 12, display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                      <span>COMMUNITY COMMENT</span>
                      <span style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--cyan-400)', padding: '2px 8px', borderRadius: 10, fontSize: '0.68rem', marginLeft: 'auto' }}>
                        {totalCommentsCount}
                      </span>
                    </div>

                    {/* Comments scroll container */}
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: 6, marginBottom: 12, display: 'grid', gap: 14 }}>
                      {post.comments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          There are no comments yet. Be the first to discuss!
                        </div>
                      ) : (
                        <>
                          {post.comments.length > 3 && (
                            <button
                              onClick={() => setShowAllComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--cyan-400)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '4px 0 12px 0',
                                fontSize: '0.75rem',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {showAllComments[post.id] ? 'Collapse comments' : `View previous comments (${post.comments.length - 3})`}
                            </button>
                          )}
                          {(showAllComments[post.id] ? post.comments : post.comments.slice(-3)).map((comment) => {
                            const commRole = getRoleStyle(comment.role);
                            const isOwnComment = comment.author === currentUser?.full_name || comment.avatar === 'ME';
                            const hasReplies = comment.replies && comment.replies.length > 0;
                            const showReplyBox = replyInputs[comment.id] !== undefined;

                            return (
                              <div key={comment.id} style={{ display: 'flex', flexDirection: 'column' }}>

                              {/* TẦNG 1: Main Comment bubble */}
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                {renderAvatar(
                                  (comment.author === currentUser?.full_name || comment.avatar === 'ME') ? (currentUser?.avatar || comment.avatar) : comment.avatar,
                                  getInitials(comment.author),
                                  28,
                                  { border: commRole.border }
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>

                                  <div style={{ background: 'rgba(25,39,53,0.85)', padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', position: 'relative', width: 'fit-content', maxWidth: '100%', wordBreak: 'break-word' }}>
                                    <div className="flex items-center gap-1.5" style={{ marginBottom: 3 }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)' }}>{comment.author}</span>
                                      <span style={{ fontSize: '0.48rem', fontWeight: 700, padding: '0px 4px', borderRadius: 3, background: commRole.badgeBg, color: commRole.badgeColor }}>
                                        {commRole.label}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                      {editingComment && editingComment.postId === post.id && editingComment.commentId === comment.id && !editingComment.replyId ? (
                                        <div>
                                          <textarea className="input" rows={2} value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                            <button className="btn btn-sm" onClick={saveEditComment}>Save</button>
                                            <button className="btn btn-ghost btn-sm" onClick={cancelEditComment}>Cancel</button>
                                          </div>
                                        </div>
                                      ) : (
                                        <TruncatedCommentText text={comment.content} />
                                      )}
                                    </div>

                                    {/* Likes indicator on comment bubble (Facebook styled) */}
                                    {comment.likes > 0 && (
                                      <div style={{ position: 'absolute', bottom: -8, right: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', padding: '1px 5px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.55rem', color: 'var(--text-secondary)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                        <span>👍</span>
                                        <span style={{ fontWeight: 700 }}>{comment.likes}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions Level 1 comment (Thời gian + Reply + Xoá) */}
                                  <div className="flex items-center gap-3" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4 }}>
                                    <span style={{ fontSize: '0.65rem' }}>{comment.time}</span>
                                    <button
                                      style={{ background: 'transparent', border: 'none', color: 'rgba(6,182,212,0.85)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'inherit' }}
                                      onClick={() => handleReplyClick(comment.author, comment.id)}
                                    >
                                      Reply
                                    </button>
                                    {!isOwnComment && comment.role !== 'Admin' && comment.role !== 'Manager' && (
                                      <>
                                        <button
                                          style={{ background: 'transparent', border: 'none', color: comment.reportedByMe ? 'var(--orange-400)' : 'var(--cyan-400)', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                          onClick={() => handleStartCommentReport(comment.id, comment.reportedByMe ? { reason: comment.myReportReason, details: comment.myReportDetails } : null)}
                                          title={comment.reportedByMe ? "View your report" : "Report comment"}
                                        >
                                          <Flag size={12} fill={comment.reportedByMe ? "currentColor" : "none"} />
                                        </button>
                                      </>
                                    )}
                                    {isOwnComment && (
                                      <>
                                        <button
                                          style={{ background: 'transparent', border: 'none', color: 'rgba(6,182,212,0.85)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'inherit' }}
                                          onClick={() => startEditComment(post.id, comment.id, null, comment.content)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          style={{ background: 'transparent', border: 'none', color: 'var(--red-400)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.68rem', fontFamily: 'inherit' }}
                                          onClick={() => handleDeleteComment(post.id, comment.id)}
                                        >
                                          Delete
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* TẦNG 2: Connected indentation for child replies (flattened layer containing all replies) */}
                              <div style={{ paddingLeft: 36, marginTop: 6, borderLeft: ((hasReplies && !!expandedReplies[comment.id]) || showReplyBox) ? '1.5px solid var(--border-dim)' : 'none', marginLeft: 14 }}>

                                {/* Toggle replies button */}
                                {hasReplies && (
                                  <button
                                    onClick={() => setExpandedReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--cyan-400)',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      padding: '4px 0',
                                      fontSize: '0.72rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      marginBottom: !!expandedReplies[comment.id] ? 8 : 0
                                    }}
                                  >
                                    {!!expandedReplies[comment.id] ? 'Hide replies' : `View replies (${comment.replies.length})`}
                                  </button>
                                )}

                                {/* Replies listing */}
                                {!!expandedReplies[comment.id] && comment.replies.map((reply) => {
                                  const repRole = getRoleStyle(reply.role);
                                  const isOwnReply = reply.author === currentUser?.full_name || reply.avatar === 'ME';

                                  return (
                                    <div key={reply.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, position: 'relative' }}>
                                      {renderAvatar(
                                        (reply.author === currentUser?.full_name || reply.avatar === 'ME') ? (currentUser?.avatar || reply.avatar) : reply.avatar,
                                        getInitials(reply.author),
                                        24,
                                        { border: repRole.border }
                                      )}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>

                                        <div style={{ background: 'rgba(30,48,65,0.75)', padding: '6px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', position: 'relative', width: 'fit-content', maxWidth: '100%', wordBreak: 'break-word' }}>
                                          <div className="flex items-center gap-1.5" style={{ marginBottom: 3 }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-primary)' }}>{reply.author}</span>
                                            <span style={{ fontSize: '0.45rem', fontWeight: 700, padding: '0px 3px', borderRadius: 3, background: repRole.badgeBg, color: repRole.badgeColor }}>
                                              {repRole.label}
                                            </span>
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                                            {editingComment && editingComment.postId === post.id && editingComment.commentId === comment.id && editingComment.replyId === reply.id ? (
                                              <div>
                                                <textarea className="input" rows={2} value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} />
                                                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                                                  <button className="btn btn-sm" onClick={saveEditComment}>Save</button>
                                                  <button className="btn btn-ghost btn-sm" onClick={cancelEditComment}>Cancel</button>
                                                </div>
                                              </div>
                                            ) : (
                                              reply.content
                                            )}
                                          </div>

                                          {/* Sub-comment likes bubble */}
                                          {reply.likes > 0 && (
                                            <div style={{ position: 'absolute', bottom: -8, right: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', padding: '1px 4px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.55rem', color: 'var(--text-secondary)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                              <span>👍</span>
                                              <span style={{ fontWeight: 700 }}>{reply.likes}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Sub-comment actions (Thời gian + Reply + Xoá) */}
                                        <div className="flex items-center gap-3" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2, paddingLeft: 4 }}>
                                          <span style={{ fontSize: '0.62rem' }}>{reply.time}</span>
                                          <button
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(6,182,212,0.85)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit' }}
                                            onClick={() => handleReplyClick(reply.author, comment.id)}
                                          >
                                            Reply
                                          </button>
                                          {!isOwnReply && reply.role !== 'Admin' && reply.role !== 'Manager' && (
                                            <>
                                              <button
                                                style={{ background: 'transparent', border: 'none', color: reply.reportedByMe ? 'var(--orange-400)' : 'var(--cyan-400)', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                onClick={() => handleStartCommentReport(reply.id, reply.reportedByMe ? { reason: reply.myReportReason, details: reply.myReportDetails } : null)}
                                                title={reply.reportedByMe ? "View your report" : "Report reply"}
                                              >
                                                <Flag size={11} fill={reply.reportedByMe ? "currentColor" : "none"} />
                                              </button>
                                            </>
                                          )}
                                          {isOwnReply && (
                                            <>
                                              <button
                                                style={{ background: 'transparent', border: 'none', color: 'rgba(6,182,212,0.85)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit' }}
                                                onClick={() => startEditComment(post.id, comment.id, reply.id, reply.content)}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                style={{ background: 'transparent', border: 'none', color: 'var(--red-400)', fontWeight: 600, padding: 0, cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit' }}
                                                onClick={() => handleDeleteComment(post.id, comment.id, reply.id)}
                                              >
                                                Delete
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Input box for replies inside TẦNG 2 */}
                                {showReplyBox && (
                                  <div className="flex gap-2" style={{ marginTop: 6, background: 'rgba(18,29,40,0.1)', padding: '6px 8px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)' }}>
                                    {renderAvatar(
                                      currentUser?.avatar,
                                      currentUser?.full_name ? getInitials(currentUser.full_name) : (role === 'guest' ? 'G' : role === 'volunteer' ? 'HC' : 'ME'),
                                      22
                                    )}
                                    <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                                      <input
                                        id={`reply-input-${comment.id}`}
                                        className="input"
                                        style={{ borderRadius: 16, fontSize: '0.72rem', height: 26, padding: '4px 10px', background: 'rgba(18,29,40,0.4)', border: '1px solid var(--border-dim)' }}
                                        placeholder="Reply to comments..."
                                        value={replyInputs[comment.id] || ''}
                                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddReply(post.id, comment.id);
                                        }}
                                      />
                                      <button
                                        className="btn btn-primary"
                                        style={{ padding: 0, width: 26, height: 26, borderRadius: '50%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => handleAddReply(post.id, comment.id)}
                                      >
                                        <Send size={10} />
                                      </button>
                                    </div>
                                  </div>
                                )}

                              </div>

                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {showAllComments[post.id] && post.comments.length > 3 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10, marginBottom: 6 }}>
                      <button
                        onClick={() => {
                          setShowAllComments(prev => ({ ...prev, [post.id]: false }));
                          setTimeout(() => {
                            const el = document.getElementById(`comment-focus-${post.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 50);
                        }}
                        className="btn btn-ghost btn-sm"
                        style={{
                          color: 'var(--cyan-400)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        Collapse comments
                      </button>
                    </div>
                  )}

                    {/* Main Comment input sticky at the bottom */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                      <div className="flex gap-2">
                        {renderAvatar(
                          currentUser?.avatar,
                          currentUser?.full_name ? getInitials(currentUser.full_name) : (role === 'guest' ? 'G' : role === 'volunteer' ? 'HC' : 'ME'),
                          32
                        )}
                        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                          <input
                            id={`comment-focus-${post.id}`}
                            className="input"
                            style={{ borderRadius: 20, fontSize: '0.78rem', height: 32, background: 'rgba(18,29,40,0.4)', border: '1px solid var(--border-dim)' }}
                            placeholder="Write a public comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                          />
                          <button
                            className="btn btn-primary"
                            style={{ padding: 0, width: 32, height: 32, borderRadius: '50%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleAddComment(post.id)}
                          >
                            <Send size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          );
        })}

        {filteredPosts.length === 0 && (
          <div className="card p-8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div>No articles were found matching your search</div>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 24, padding: '0 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing Page {currentPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={currentPage === 1} 
              onClick={() => {
                setCurrentPage(p => Math.max(p - 1, 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
                style={{ minWidth: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => {
                  setCurrentPage(i + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {i + 1}
              </button>
            ))}
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              disabled={currentPage === totalPages} 
              onClick={() => {
                setCurrentPage(p => Math.min(p + 1, totalPages));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Edit Post Modal (FE-only) */}
      {editingPost && (
        <div className="modal-overlay" onClick={() => setEditingPost(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Edit article</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingPost(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => document.execCommand('bold', false, null)}><strong>B</strong></button>
                <button className="btn btn-ghost btn-sm" onClick={() => document.execCommand('italic', false, null)}><em>I</em></button>
              </div>
              <div
                ref={editContentRef}
                contentEditable
                suppressContentEditableWarning
                className="input"
                style={{ minHeight: 140 }}
                dangerouslySetInnerHTML={{ __html: editContent }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPost(null); setEditContent(''); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { handleSaveEditPost(); }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportingPost && (
        <div className="modal-overlay" onClick={() => setReportingPost(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Report article</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReportingPost(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reason for reporting</label>
                <select
                  className="input"
                  value={reportReason}
                  onChange={(e) => { setReportReason(e.target.value); setReportError(''); }}
                  disabled={!!reportingPost.existingReport}
                >
                  <option value="">Choose a reason</option>
                  <option value="Spam / Advertising">Spam / Advertising</option>
                  <option value="Misinformation / Fake News">Misinformation / Fake News</option>
                  <option value="Inappropriate Content">Inappropriate Content</option>
                  <option value="Harassment / Hate Speech">Harassment / Hate Speech</option>
                  <option value="Unrelated to Rescue / Traffic">Unrelated to Rescue / Traffic</option>
                  <option value="Scam / Fraud">Scam / Fraud</option>
                  <option value="Other">Other</option>
                </select>
                {reportError && (
                  <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, fontWeight: 600 }}>
                    {reportError}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={200}
                  placeholder="Details (optional)"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  disabled={!!reportingPost.existingReport}
                />
                <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {reportDetails.length}/200
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setReportingPost(null)}>Close</button>
              {!reportingPost.existingReport && (
                <button className="btn btn-danger btn-sm" onClick={handleSendReport}>Submit report</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Comment Modal */}
      {reportingComment && (
        <div className="modal-overlay" onClick={() => setReportingComment(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Report comment</div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setReportingComment(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reason for reporting</label>
                <select
                  className="input"
                  value={commentReportReason}
                  onChange={(e) => { setCommentReportReason(e.target.value); setReportError(''); }}
                  disabled={!!reportingComment.existingReport}
                >
                  <option value="">Choose a reason</option>
                  <option value="Spam">Spam/Ads</option>
                  <option value="Harassment">Harassment / Offensive Language</option>
                  <option value="Hate Speech">Hate Speech</option>
                  <option value="Sensitive Content">Sensitive Content</option>
                  <option value="Misinformation">Misinformation</option>
                  <option value="Privacy Violation">Privacy Violation</option>
                  <option value="Other">Other</option>
                </select>
                {reportError && (
                  <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, fontWeight: 600 }}>
                    {reportError}
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="input"
                  rows={4}
                  maxLength={200}
                  placeholder="Details (optional)"
                  value={commentReportDetails}
                  onChange={(e) => setCommentReportDetails(e.target.value)}
                  disabled={!!reportingComment.existingReport}
                />
                <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {commentReportDetails.length}/200
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setReportingComment(null)}>Close</button>
              {!reportingComment.existingReport && (
                <button className="btn btn-danger btn-sm" onClick={handleSendCommentReport}>Submit report</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guest Lock Overlay Modal */}
      {showGuestModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,18,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card p-6 page-enter" style={{ maxWidth: 420, textAlign: 'center', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(6,182,212,0.2)' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Lock size={22} color="var(--cyan-400)" />
            </div>

            <h2 style={{ fontSize: '1.2rem', marginBottom: 8, fontWeight: 700 }}>Limited Features</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
              You are browsing the forum as **Guest**. Please register for a member account to post new articles, like articles, post comments or respond to other discussions.
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowGuestModal(false);
                  if (onRedirectToRegister) onRedirectToRegister();
                }}
              >
                Go to Account Registration Page
              </button>
              <button className="btn btn-ghost" onClick={() => setShowGuestModal(false)}>Later</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: toast.type === 'error' ? 'var(--red-500)' : 'var(--green-400)',
          color: toast.type === 'error' ? 'white' : '#064e3b',
          padding: '12px 20px',
          borderRadius: 'var(--r-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          <CheckCircle size={18} />
          {toast.message}
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

    </div>
  );
}
