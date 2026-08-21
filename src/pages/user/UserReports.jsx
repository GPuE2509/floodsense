import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Camera, MapPin, Upload, CheckCircle, XCircle,
  Search, Bot, User, ThumbsUp, ThumbsDown, FileText,
  AlertTriangle, Image as ImageIcon, X, Flag,
  Crosshair, Clock, Eye, MessageSquare, Loader, RefreshCw
} from 'lucide-react';
import { communityReports } from '../../data/mockData';
import { apiService } from '../../services/apiService';

// ── AI Score Badge ───────────────────────────────────────────────────────────

function AiScoreBadge({ score, reportType }) {
  if (reportType && reportType !== 'flood') return null;
  const color = score >= 50 ? 'var(--green-400)' : 'var(--red-400)';
  const bg = score >= 50 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
  return (
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}55`, padding: '2px 8px', borderRadius: 99 }}>
      AI Flooded {score}%
    </span>
  );
}

// ── Status Config ─────────────────────────────────────────────────────────────

const verifyStatusConfig = {
  verified: { label: "Verified", className: 'badge-green', border: 'var(--green-400)', confirmCount: 8, denyCount: 1 },
  unverified: { label: "Not verified", className: 'badge-orange', border: 'var(--orange-400)', confirmCount: 2, denyCount: 0 },
  invalid: { label: "No longer valid", className: 'badge-gray', border: 'var(--text-muted)', confirmCount: 1, denyCount: 5 },
};

const REPORT_TYPES = [
  { id: 'flood', label: "Flooding", color: 'var(--cyan-400)' },
  { id: 'accident', label: "Traffic accident", color: 'var(--orange-400)' },
  { id: 'tree', label: "Tree falling", color: 'var(--green-400)' },
  { id: 'traffic', label: "Serious traffic jam", color: 'var(--yellow-400)' },
  { id: 'infra', label: "Infrastructure failure", color: 'var(--red-400)' },
];

const getTypeInfo = (typeId) => {
  const cleanId = String(typeId || '').trim().toLowerCase();
  const match = REPORT_TYPES.find(t => t.id === cleanId || t.label?.toLowerCase() === cleanId);
  if (match) return match;
  return { id: typeId || 'flood', label: typeId || 'Flooding', color: 'var(--cyan-400)' };
};

const severityBadge = (severity) => {
  const sev = severity || 'Medium';
  let color = 'var(--yellow-400)';
  let bg = 'rgba(234,179,8,0.15)';
  if (sev === 'Light') {
    color = 'var(--cyan-400)';
    bg = 'rgba(6,182,212,0.15)';
  } else if (sev === 'Serious' || sev === 'High') {
    color = 'var(--red-400)';
    bg = 'rgba(239,68,68,0.15)';
  }
  return (
    <span style={{ fontSize: '0.68rem', fontWeight: 600, color, background: bg, border: `1px solid ${color}44`, padding: '2px 8px', borderRadius: 99 }}>
      {sev}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserReports() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('submit');
  const [reportType, setReportType] = useState('flood');
  const [form, setForm] = useState({ location: '', description: '', severity: 'Medium', consent: false });
  const [images, setImages] = useState([]);
  const setToast = (obj) => {
    if (!obj) return;
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: obj.message,
        type: obj.type || 'info'
      }
    }));
  };
  const [submitted, setSubmitted] = useState(false);
  const [searchVerify, setSearchVerify] = useState('');
  const [votes, setVotes] = useState({});
  const [gps, setGps] = useState(null);
  const [reports, setReports] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [pageMy, setPageMy] = useState(1);
  const [pageVerify, setPageVerify] = useState(1);
  const [durationHours, setDurationHours] = useState(1);
  const [votePhotos, setVotePhotos] = useState([]);
  const fileInputRef = useRef(null);
  const voteFileInputRef = useRef(null);
  const [aiResult, setAiResult] = useState(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('report'); // 'report' or 'vote'
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async (target, customFacing) => {
    const mode = customFacing || facingMode;
    setCameraTarget(target);
    setCameraActive(true);
    // Wait briefly for the DOM element to mount before accessing stream
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Failed to access camera", err);
        setToast({ type: 'error', message: 'Cannot access camera. Please check permissions.' });
        setTimeout(() => setToast(null), 3000);
        setCameraActive(false);
      }
    }, 100);
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    startCamera(cameraTarget, nextMode);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      // If front camera, you can mirror it, but environment facingMode doesn't need mirror
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);

      if (cameraTarget === 'report') {
        if (images.length >= 10) {
          setToast({ type: 'error', message: 'You can only upload up to 10 images.' });
          setTimeout(() => setToast(null), 3000);
        } else {
          const newImg = {
            url: base64Data,
            name: `captured_${Date.now()}.jpg`
          };
          const updated = [...images, newImg];
          setImages(updated);
          if (reportType === 'flood') {
            analyzeAllMissingImages(updated);
          }
        }
      } else {
        setVotePhotos(prev => [...prev, base64Data]);
      }
      stopCamera();
    }
  };

  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = location.state?.tab || params.get('tab');
    const reportId = location.state?.reportId || params.get('reportId');
    if (tab) {
      setActiveTab(tab);
    }
    if (reportId && reports.length > 0) {
      const match = reports.find(r => r._id === reportId || r.id === reportId);
      if (match) {
        setSelectedReport(match);
        // Find which page this report is on
        const isApproved = (r) => r.moderation_status === 'Approved' || r.status === 'approved';
        const verifyList = reports.filter(isApproved).filter(r =>
          r.title?.toLowerCase().includes(searchVerify.toLowerCase()) ||
          r.description?.toLowerCase().includes(searchVerify.toLowerCase())
        );
        const index = verifyList.findIndex(r => r._id === reportId || r.id === reportId);
        if (index !== -1) {
          const page = Math.floor(index / 5) + 1;
          setPageVerify(page);
        }

        // Scroll to card
        setTimeout(() => {
          const element = document.getElementById(`report-card-${reportId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.style.boxShadow = '0 0 15px var(--cyan-400)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 3000);
          }
        }, 500);

        // Clear location state to prevent re-triggering on reports refresh
        if (location.state?.reportId || params.get('reportId')) {
          navigate(location.pathname, { replace: true, state: {} });
        }
      }
    }
  }, [location, reports, searchVerify, navigate]);

  React.useEffect(() => {
    fetchReports();
    const interval = setInterval(() => {
      fetchReports();
    }, 180000); // 3 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    if (reports.length === 0) setIsLoadingReports(true);
    try {
      const res = await fetch('https://floodsenseapi.onrender.com/api/incident-reports');
      const data = await res.json();
      if (data.success) {
        setReports(data.data);

        let userId = getUserIdFromToken() || localStorage.getItem('guest_id');

        const initialVotes = {};
        if (userId) {
          data.data.forEach(report => {
            if (report.voters && report.voters.length > 0) {
              const userVote = report.voters.find(v => (v.user_id?._id || v.user_id)?.toString() === userId.toString());
              if (userVote) {
                initialVotes[report._id] = userVote.vote_type;
              }
            }
          });
        }
        setVotes(initialVotes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'submit') {
      requestLocation();
    } else if (activeTab === 'verify') {
      localStorage.setItem('lastVisitedCommunityVerification', Date.now().toString());
      window.dispatchEvent(new Event('communityVerificationVisited'));
    }
  }, [activeTab]);

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

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Geolocation permission denied or error', err)
      );
    }
  };

  const recalculateAverage = (currentImages) => {
    const floodImages = currentImages.filter(img => img.aiResult);
    if (floodImages.length === 0) {
      setAiResult(null);
      return;
    }
    
    let totalProb = 0;
    let totalConf = 0;
    let threshold = 0.5;
    
    floodImages.forEach(img => {
      totalProb += img.aiResult.probability_flooded ?? 0;
      totalConf += img.aiResult.confidence ?? 0;
      threshold = img.aiResult.threshold ?? 0.5;
    });
    
    const avgProb = totalProb / floodImages.length;
    const avgConf = totalConf / floodImages.length;
    
    const mockResult = {
      probability_flooded: avgProb,
      confidence: avgConf,
      threshold: threshold
    };
    
    setAiResult(mockResult);
  };

  const analyzeAllMissingImages = async (currentImages) => {
    const missing = currentImages.filter(img => !img.aiResult);
    if (missing.length === 0) {
      recalculateAverage(currentImages);
      return;
    }
    
    setIsAiAnalyzing(true);
    try {
      const promises = missing.map(async (img) => {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const file = new File([blob], img.name, { type: blob.type });
        
        const formData = new FormData();
        formData.append('image', file);
        const aiServerUrl = import.meta.env.VITE_AI_API_URL || 'http://localhost:5002';
        const apiRes = await fetch(`${aiServerUrl}/api/predict`, {
          method: 'POST',
          body: formData,
        });
        if (apiRes.ok) {
          const data = await apiRes.json();
          img.aiResult = data;
          img.aiScore = Math.round(data.probability_flooded * 100);
        } else {
          img.aiResult = { probability_flooded: 0, confidence: 0, threshold: 0.5 };
          img.aiScore = 0;
        }
      });
      await Promise.all(promises);
      setImages([...currentImages]);
      recalculateAverage(currentImages);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (images.length + files.length > 10) {
      setToast({ type: 'error', message: 'You can only upload up to 10 images.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const newImages = [];
    for (const f of files) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(f);
      });
      newImages.push({
        url: base64,
        name: f.name
      });
    }
    const updated = [...images, ...newImages];
    setImages(updated);
    
    if (reportType === 'flood') {
      analyzeAllMissingImages(updated);
    }
  };

  const removeImage = (index) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (reportType === 'flood') {
        recalculateAverage(updated);
      } else {
        setAiResult(null);
      }
      return updated;
    });
  };

  const handleVotePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = [];
      for (const f of files) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(f);
        });
        newPhotos.push(base64);
      }
      setVotePhotos(prev => [...prev, ...newPhotos]);
    }
  };

  let aiScore = 0;
  let isApprovedByAi = false;
  if (reportType === 'flood' && aiResult) {
    aiScore = Math.round(aiResult.probability_flooded * 100);
    isApprovedByAi = aiResult.probability_flooded >= aiResult.threshold;
  }

  const getUserIdFromToken = () => {
    try {
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.id || payload._id || null;
      }
    } catch (e) { }
    return null;
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!reportType) newErrors.type = 'Please select an incident type!';
    if (!form.location.trim()) newErrors.location = 'Please enter detailed location!';
    if (!form.description.trim()) newErrors.description = 'Please describe the incident!';
    if (images.length === 0) newErrors.images = 'Please attach at least 1 image!';
    if (!form.consent) newErrors.consent = 'Please confirm that the information is true and photos were taken at the scene.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      let userId = getUserIdFromToken();
      if (!userId) {
        userId = localStorage.getItem('guest_id');
        if (!userId) {
          userId = 'guest_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('guest_id', userId);
        }
      }

      const payload = {
        reporter_id: userId,
        title: form.location,
        description: form.description,
        images: JSON.stringify(images),
        lng: gps?.lng || null,
        lat: gps?.lat || null,
        report_type: reportType,
        ai_confidence_score: reportType === 'flood' ? aiScore / 100 : null,
        is_approved_by_ai: reportType === 'flood' ? isApprovedByAi : false,
        duration_hours: durationHours,
        severity: form.severity,
      };

      const res = await fetch('https://floodsenseapi.onrender.com/api/incident-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setToast({ type: 'success', message: 'The report has been sent successfully!' });
        setSubmitted(true);
        const submitUserId = getUserIdFromToken() || localStorage.getItem('guest_id');
        const storageKey = `my_reports_${submitUserId}`;
        const myReports = JSON.parse(localStorage.getItem(storageKey) || '[]');
        myReports.push(data.data._id);
        localStorage.setItem(storageKey, JSON.stringify(myReports));
        setImages([]);
        setForm({ location: '', description: '', severity: 'Medium', consent: false });
        setErrors({});
        setAiResult(null);
        fetchReports();
        setTimeout(() => { setToast(null); setSubmitted(false); }, 3000);
      } else {
        setToast({ type: 'error', message: 'Failed to submit report' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Server error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const vote = async (reportId, type) => {
    if (isVoting) return;
    let userId = getUserIdFromToken();
    if (!userId) {
      setToast({ type: 'error', message: 'You need to log in to verify a report.' });
      setTimeout(() => setToast(null), 5000);
      return;
    }

    setIsVoting(true);
    const storageKey = `my_reports_${userId}`;
    const myReports = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const legacyReports = [...JSON.parse(localStorage.getItem('my_reports') || '[]'), ...JSON.parse(localStorage.getItem('my_reports_guest') || '[]')];

    const report = reports.find(r => r._id === reportId);

    const isCreator = myReports.includes(reportId) || legacyReports.includes(reportId) || (report && (report.reporter_id === userId || (typeof report.reporter_id === 'object' && report.reporter_id?._id === userId)) && userId !== 'guest');

    const hasProofPhotos = votePhotos.length > 0;
    if (isCreator && !hasProofPhotos) {
      setToast({ type: 'error', message: 'You cannot vote on your own report.' });
      setTimeout(() => setToast(null), 4000);
      setIsVoting(false);
      return;
    }

    const prevVote = votes[reportId] || null;
    const newVoteType = prevVote === type ? null : type;

    const payload = { vote_type: newVoteType, previous_vote: prevVote, user_id: userId };
    if (hasProofPhotos && newVoteType !== null) {
      payload.photo_urls = votePhotos;
    }

    try {
      const res = await apiService.post(`/incident-reports/${reportId}/vote`, payload);
      if (res.success && res.data) {
        setVotePhotos([]);
        if (res.data.lifecycle_status === 'Archived') {
          setReports(prev => prev.filter(r => r._id !== reportId));
          setToast({ type: 'success', message: 'Report has been archived due to community votes.' });
        } else {
          setVotes(prev => ({ ...prev, [reportId]: newVoteType }));
          setReports(prev => prev.map(r => r._id === reportId ? res.data : r));
          if (selectedReport && selectedReport._id === reportId) setSelectedReport(res.data);

          let successMsg = 'Verification recorded successfully!';
          if (hasProofPhotos) {
            successMsg = 'Proof photo attached and report extended successfully!';
          } else if (newVoteType === null) {
            successMsg = 'Vote cancelled successfully.';
          } else if (isCreator) {
            successMsg = 'Report status updated successfully!';
          }
          setToast({ type: 'success', message: successMsg });
        }
        setTimeout(() => setToast(null), 5000);
      } else {
        setToast({ type: 'error', message: res?.message || 'Failed to submit verification.' });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.error('Vote error:', err);
      setToast({ type: 'error', message: err?.message || 'An error occurred while voting.' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsVoting(false);
    }
  };

  const statusBadge = {
    pending: <span className="badge badge-orange">Waiting for approval</span>,
    approved: <span className="badge badge-green">Approved</span>,
    rejected: <span className="badge badge-red">Refuse</span>,
    archived: <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>ARCHIVED</span>,
  };

  const filteredVerify = reports.filter(r => {
    const isApproved = (r.moderation_status === 'Approved' || r.status === 'approved') && r.lifecycle_status !== 'Archived';
    return isApproved;
  }).filter(r =>
    r.title?.toLowerCase().includes(searchVerify.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchVerify.toLowerCase())
  );

  let currentUserId = getUserIdFromToken() || localStorage.getItem('guest_id');
  const myReportsStored = JSON.parse(localStorage.getItem(`my_reports_${currentUserId}`) || '[]');
  const legacyReportsStored = [...JSON.parse(localStorage.getItem('my_reports') || '[]'), ...JSON.parse(localStorage.getItem('my_reports_guest') || '[]')];

  const myReportsFiltered = reports.filter(r =>
    r.reporter_id === currentUserId ||
    (typeof r.reporter_id === 'object' && r.reporter_id?._id === currentUserId) ||
    myReportsStored.includes(r._id) ||
    legacyReportsStored.includes(r._id)
  );

  const totalMyPages = Math.ceil(myReportsFiltered.length / 5);
  const paginatedMy = myReportsFiltered.slice((pageMy - 1) * 5, pageMy * 5);

  const totalVerifyPages = Math.ceil(filteredVerify.length / 5);
  const paginatedVerify = filteredVerify.slice((pageVerify - 1) * 5, pageVerify * 5);

  const renderThumbnails = (images) => {
    if (!images || images.length === 0) return null;
    const visible = images.slice(0, 4);
    const remaining = images.length - 4;
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {visible.map((img, i) => (
          <div key={i} onClick={(e) => { e.stopPropagation(); setFullscreenImage(img.url); }} style={{ width: 55, height: 55, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-dim)', position: 'relative', cursor: 'zoom-in' }}>
            <img src={img.url} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {i === 3 && remaining > 0 && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                +{remaining}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Community reporting</h1>
        <p>Submit reports with actual photos and participate in community information verification</p>
      </div>

      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 600 }}>
        {[
          { id: 'submit', label: "Submit report", icon: Upload },
          { id: 'my', label: "My report", icon: FileText },
          { id: 'verify', label: "Community verification", icon: AlertTriangle },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── GỬI BÁO CÁO ── */}
      {activeTab === 'submit' && (
        <div className="grid" style={{ gridTemplateColumns: reportType === 'flood' ? '1.2fr 0.8fr' : '1fr', gap: 16 }}>
          <div className="card p-6" style={{ maxWidth: reportType === 'flood' ? 'none' : '717px' }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Report information</div>

            {/* Report type */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Incident type</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {REPORT_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const newType = t.id;
                      setReportType(newType);
                      if (newType !== 'flood') {
                        setAiResult(null);
                      } else if (images.length > 0) {
                        analyzeAllMissingImages(images);
                      }
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${reportType === t.id ? t.color : 'var(--border-dim)'}`,
                      background: reportType === t.id ? t.color + '18' : 'transparent',
                      color: reportType === t.id ? t.color : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.type && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 8 }}>* {errors.type}</div>}
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {/* Location + GPS */}
              <div className="input-group">
                <MapPin size={15} className="input-icon" />
                <input
                  className="input"
                  placeholder="Enter detailed location..."
                  value={form.location}
                  onChange={e => { setForm(p => ({ ...p, location: e.target.value })); setErrors(p => ({ ...p, location: null })); }}
                />
              </div>
              {errors.location && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: -6 }}>* {errors.location}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <Crosshair size={12} color={gps ? "var(--cyan-400)" : "var(--text-muted)"} />
                  <span>Automatic GPS: <strong style={{ color: gps ? 'var(--cyan-400)' : 'var(--text-muted)' }}>
                    {gps ? `${gps.lat.toFixed(4)}° N, ${gps.lng.toFixed(4)}° E` : 'Locating...'}
                  </strong></span>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={requestLocation}
                  title="Get current location"
                  style={{ padding: '6px', height: 'auto' }}
                >
                  <MapPin size={14} color="var(--cyan-400)" />
                </button>
              </div>

              <textarea
                className="input"
                rows={4}
                placeholder="Describe the flood or incident (the more details, the higher the AI ​​score)..."
                value={form.description}
                onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setErrors(p => ({ ...p, description: null })); }}
              />
              {errors.description && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: -6 }}>* {errors.description}</div>}

              {/* Duration picker */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} /> Estimated duration of incident
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { val: 1, label: '1 hour' },
                    { val: 3, label: '3 hours' },
                    { val: 6, label: '6 hours' },
                    { val: 12, label: '12 hours' },
                    { val: 16 / 60, label: '16 min (test)' },
                  ].map(d => (
                    <button
                      key={d.val}
                      type="button"
                      onClick={() => setDurationHours(d.val)}
                      style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${durationHours === d.val ? 'var(--orange-400)' : 'var(--border-dim)'}`,
                        background: durationHours === d.val ? 'rgba(251,146,60,0.15)' : 'transparent',
                        color: durationHours === d.val ? 'var(--orange-400)' : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>


              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity prediction:</span>
                  <select
                    className="input"
                    value={form.severity}
                    onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
                    style={{ maxWidth: 160 }}
                  >
                    <option value="Light">Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Serious">Serious</option>
                  </select>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => startCamera('report')}>
                  <Camera size={13} /> Take photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { handleImageUpload(e); setErrors(p => ({ ...p, images: null })); }} style={{ display: 'none' }} />
                {images.length > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontWeight: 600 }}>{images.length} {images.length > 1 ? 'images' : 'image'}</span>}
              </div>

              {errors.images && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: -6 }}>* {errors.images}</div>}

              {/* Image previews */}
              {images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {images.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
                      <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)' }} />
                      <button
                        onClick={() => removeImage(idx)}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--red-400)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <X size={10} color="white" />
                      </button>
                    </div>
                  ))}
                  {/* Placeholder add more */}
                  <button
                    onClick={() => startCamera('report')}
                    style={{ width: 72, height: 72, borderRadius: 'var(--r-sm)', border: '1px dashed var(--border-dim)', background: 'rgba(18,29,40,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
                  >
                    <ImageIcon size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>More</span>
                  </button>
                </div>
              )}

              <div>
                <label className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.consent} onChange={() => { setForm(p => ({ ...p, consent: !p.consent })); setErrors(p => ({ ...p, consent: null })); }} />
                  I confirm that the information is true and the photos were taken at the scene
                </label>
                {errors.consent && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 6 }}>* {errors.consent}</div>}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12, opacity: isSubmitting ? 0.7 : 1 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 8 }}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Submit report to the system
                  </>
                )}
              </button>

              {submitted && (
                <div className="alert-banner success">
                  <CheckCircle size={14} color="var(--green-400)" />
                  <span style={{ fontWeight: 600, color: 'var(--green-400)' }}>
                    {reportType === 'flood' ? 'AI is reviewing...' : 'Report submitted! Waiting for manager review.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI Score panel */}
          {reportType === 'flood' && (
            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <div className="card p-5">
                <div className="section-title" style={{ marginBottom: 12 }}>AI review (real time)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Bot size={16} color="var(--cyan-400)" />
                  <AiScoreBadge score={aiScore} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>reliability</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${aiScore}%`, background: aiScore >= 50 ? 'var(--green-400)' : 'var(--red-400)', transition: 'width 0.4s ease', borderRadius: 99 }} />
                </div>

                {isAiAnalyzing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--cyan-400)', margin: '10px 0' }}>
                    <span className="spinner" style={{ width: 12, height: 12, border: '2px solid rgba(6,182,212,0.3)', borderTopColor: 'var(--cyan-400)', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                    <span>AI is analyzing attached image...</span>
                  </div>
                )}

                {aiResult && !isAiAnalyzing && (
                  <>
                    <div style={{ margin: '12px 0', padding: '10px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>AI Image Recognition:</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: aiResult.probability_flooded >= aiResult.threshold ? 'var(--green-400)' : 'var(--red-400)' }}>
                          {aiResult.probability_flooded >= aiResult.threshold ? 'Flooded' : 'Not Flooded'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Confidence: {Math.round(aiResult.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    {images.map((img, idx) => ({ img, idx: idx + 1 })).filter(item => item.img.aiResult && item.img.aiResult.probability_flooded < 0.20).length > 0 && (
                      <div style={{ color: 'var(--yellow-400)', fontSize: '0.72rem', marginTop: -4, marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.3 }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>Warning: Image #{images.map((img, idx) => ({ img, idx: idx + 1 })).filter(item => item.img.aiResult && item.img.aiResult.probability_flooded < 0.20).map(item => item.idx).join(', #')} has a very low flooding level (&lt;20%).</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="card p-5">
                <div className="section-title" style={{ marginBottom: 10, fontSize: '0.8rem' }}>Moderation Note</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(6,182,212,0.06)', border: '1px solid var(--border-dim)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Bot size={15} color="var(--cyan-400)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong>Flood images</strong> automatically moderated by AI — results in seconds.
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(249,115,22,0.06)', border: '1px solid var(--border-dim)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <User size={15} color="var(--orange-400)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <strong>Other incidents</strong> (accidents, fallen trees...) will be manually reviewed by the Manager.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BÁO CÁO CỦA TÔI ── */}
      {activeTab === 'my' && (
        <div style={{ display: 'grid', gap: 12, minHeight: 200, position: 'relative', alignContent: 'start' }}>
          {isLoadingReports ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: 'var(--cyan-400)' }}>
              <Loader className="animate-spin" size={24} />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading reports...</span>
            </div>
          ) : myReportsFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              You haven't posted any reports yet.
            </div>
          ) : (
            paginatedMy.map(report => {
              const parsedImages = report.images ? JSON.parse(report.images) : [];
              const typeCfg = getTypeInfo(report.report_type);
              let statusKey = report.moderation_status?.toLowerCase() || 'pending';
              if (report.lifecycle_status === 'Archived') {
                statusKey = 'archived';
              }
              return (
                <div key={report._id} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${typeCfg.color}`, cursor: 'pointer', opacity: report.lifecycle_status === 'Archived' ? 0.6 : 1 }} onClick={() => setSelectedReport(report)}>
                  <div className="flex items-start justify-between gap-4">
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                          {report.reporter_id?.full_name
                            ? report.reporter_id.full_name
                            : (typeof report.reporter_id === 'string' && !report.reporter_id.startsWith('guest') ? report.reporter_id : 'Community Member')}
                        </span>
                        {(() => {
                          const typeCfg = getTypeInfo(report.report_type);
                          return (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: typeCfg.color, background: typeCfg.color + '18', border: `1px solid ${typeCfg.color}44`, padding: '2px 8px', borderRadius: 99 }}>{typeCfg.label}</span>
                          );
                        })()}
                        {severityBadge(report.severity)}
                        {statusBadge[statusKey] || statusBadge.pending}
                        {report.report_type === 'flood' && <AiScoreBadge score={report.ai_confidence_score ? Math.round(report.ai_confidence_score * 100) : 0} reportType={report.report_type} />}
                      </div>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                            <MapPin size={12} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.title}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{report.description}</div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {renderThumbnails(parsedImages)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {formatRelativeTime(report.created_at)}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--green-400)' }}>↑ {report.vote_still_exist || 0} confirm</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--red-400)' }}>↓ {report.vote_no_more || 0} deny</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {myReportsFiltered.length > 0 && (
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
                Showing <strong style={{ color: 'var(--text-primary)' }}>{myReportsFiltered.length === 0 ? 0 : (pageMy - 1) * 5 + 1}-{Math.min(pageMy * 5, myReportsFiltered.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{myReportsFiltered.length}</strong> reports
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageMy(p => Math.max(1, p - 1))}
                  disabled={pageMy === 1}
                  style={{ opacity: pageMy === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Page 
                  <input
                    type="number"
                    min={1}
                    max={totalMyPages}
                    value={pageMy}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalMyPages) {
                        setPageMy(val);
                      }
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
                  of {totalMyPages}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageMy(p => Math.min(totalMyPages, p + 1))}
                  disabled={pageMy === totalMyPages}
                  style={{ opacity: pageMy === totalMyPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── XÁC MINH CỘNG ĐỒNG ── */}
      {activeTab === 'verify' && (
        <div>
          <div className="alert-banner info" style={{ marginBottom: 16 }}>
            <Eye size={14} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Participate in verifying reports from the community. Your feedback helps the system automatically update the correct status on the map.
            </span>
          </div>

          <div className="input-group" style={{ maxWidth: 360, marginBottom: 16 }}>
            <Search size={14} className="input-icon" />
            <input className="input" placeholder="Find reports that need verification..." value={searchVerify} onChange={e => setSearchVerify(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gap: 14, minHeight: 200, position: 'relative', alignContent: 'start' }}>
            {isLoadingReports ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: 'var(--cyan-400)' }}>
                <Loader className="animate-spin" size={24} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading reports...</span>
              </div>
            ) : filteredVerify.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No reports found for verification.
              </div>
            ) : (
              paginatedVerify.map(report => {
                const parsedImages = report.images ? JSON.parse(report.images) : [];
                const myVote = votes[report._id] || null;
                const isReportCreator = myReportsStored.includes(report._id) || legacyReportsStored.includes(report._id) ||
                  (report.reporter_id && (
                    report.reporter_id === currentUserId ||
                    (typeof report.reporter_id === 'object' && report.reporter_id?._id === currentUserId)
                  ) && currentUserId !== 'guest');
                const confirmCount = report.vote_still_exist || 0;
                const denyCount = report.vote_no_more || 0;
                const wrongCount = report.vote_wrong_report || 0;
                const totalVotes = confirmCount + denyCount;
                const confirmPct = totalVotes > 0 ? Math.round((confirmCount / totalVotes) * 100) : 0;

                return (
                  <div id={`report-card-${report._id}`} key={report._id} className="card" style={{ padding: '16px 20px', borderLeft: `3px solid ${myVote ? (myVote === 'confirm' ? 'var(--green-400)' : 'var(--red-400)') : 'var(--orange-400)'}`, cursor: 'pointer' }} onClick={() => setSelectedReport(report)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div className="flex items-center gap-3" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {typeof report.reporter_id === 'object' && report.reporter_id?.full_name
                              ? report.reporter_id.full_name
                              : (typeof report.reporter_id === 'string' && !report.reporter_id.startsWith('guest') ? report.reporter_id : 'Community Member')}
                          </span>
                          {(() => {
                            const typeCfg = getTypeInfo(report.report_type);
                            return (
                              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: typeCfg.color, background: typeCfg.color + '18', border: `1px solid ${typeCfg.color}44`, padding: '2px 8px', borderRadius: 99 }}>{typeCfg.label}</span>
                            );
                          })()}
                          {severityBadge(report.severity)}
                          <AiScoreBadge score={report.ai_confidence_score ? Math.round(report.ai_confidence_score * 100) : 0} reportType={report.report_type} />
                          {myVote === 'confirm' && <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>You: Still exists</span>}
                          {myVote === 'deny' && <span className="badge badge-red" style={{ fontSize: '0.62rem' }}>You: Not anymore</span>}
                          {myVote === 'false' && <span className="badge badge-gray" style={{ fontSize: '0.62rem' }}>You: Wrong report</span>}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <Clock size={10} /> {formatRelativeTime(report.created_at)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                              <MapPin size={12} color="var(--text-muted)" />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.title}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{report.description}</div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {renderThumbnails(parsedImages)}
                          </div>
                        </div>
                      </div>

                      {/* Vote buttons or Creator Badge */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, alignItems: 'flex-end' }}>
                        {isReportCreator ? (
                          <span className="badge badge-cyan" style={{ fontSize: '0.72rem', padding: '6px 12px', fontWeight: 600 }}>
                            Your Report
                          </span>
                        ) : (
                          <>
                            <button
                              className={`btn btn-sm ${myVote === 'confirm' ? 'btn-success' : 'btn-ghost'}`}
                              onClick={(e) => { e.stopPropagation(); vote(report._id, 'confirm'); }}
                              disabled={isVoting}
                              style={{ gap: 6 }}
                            >
                              <ThumbsUp size={13} /> Still exists
                            </button>
                            <button
                              className={`btn btn-sm ${myVote === 'deny' ? 'btn-danger' : 'btn-ghost'}`}
                              onClick={(e) => { e.stopPropagation(); vote(report._id, 'deny'); }}
                              disabled={isVoting}
                              style={{ gap: 6 }}
                            >
                              <ThumbsDown size={13} /> No more
                            </button>
                            <button
                              className={`btn btn-sm ${myVote === 'false' ? 'btn-warning' : 'btn-ghost'}`}
                              onClick={(e) => { e.stopPropagation(); vote(report._id, 'false'); }}
                              disabled={isVoting}
                              style={{ gap: 6, fontSize: '0.7rem' }}
                            >
                              <Flag size={11} /> Wrong report
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        <span>Community trust</span>
                        <span>{confirmCount} confirm · {denyCount} deny</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ height: '100%', width: `${confirmPct}%`, background: confirmPct >= 60 ? 'var(--green-400)' : 'var(--orange-400)', transition: 'width 0.3s' }} />
                        <div style={{ height: '100%', width: `${totalVotes > 0 ? 100 - confirmPct : 0}%`, background: 'var(--red-400)', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  </div>
                );
              }))}
          </div>
          {filteredVerify.length > 0 && (
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
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredVerify.length === 0 ? 0 : (pageVerify - 1) * 5 + 1}-{Math.min(pageVerify * 5, filteredVerify.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{filteredVerify.length}</strong> reports
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageVerify(p => Math.max(1, p - 1))}
                  disabled={pageVerify === 1}
                  style={{ opacity: pageVerify === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Page 
                  <input
                    type="number"
                    min={1}
                    max={totalVerifyPages}
                    value={pageVerify}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= totalVerifyPages) {
                        setPageVerify(val);
                      }
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
                  of {totalVerifyPages}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPageVerify(p => Math.min(totalVerifyPages, p + 1))}
                  disabled={pageVerify === totalVerifyPages}
                  style={{ opacity: pageVerify === totalVerifyPages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── REPORT DETAILS MODAL ── */}
      {selectedReport && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedReport(null)}>
          <div style={{ background: '#111821', borderRadius: 12, width: '100%', maxWidth: 680, border: '1px solid var(--border-dim)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>Report Details</div>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedReport.reporter_id?.full_name
                    ? selectedReport.reporter_id.full_name
                    : (typeof selectedReport.reporter_id === 'string' && !selectedReport.reporter_id.startsWith('guest') ? selectedReport.reporter_id : 'Community Member')}
                </span>
                {(() => {
                  const typeCfg = getTypeInfo(selectedReport.report_type);
                  return (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: typeCfg.color, background: typeCfg.color + '18', border: `1px solid ${typeCfg.color}44`, padding: '2px 8px', borderRadius: 99 }}>{typeCfg.label}</span>
                  );
                })()}
                {severityBadge(selectedReport.severity)}
                {(() => {
                  let statusKey = selectedReport.moderation_status?.toLowerCase() || 'pending';
                  if (selectedReport.lifecycle_status === 'Archived') statusKey = 'archived';
                  return statusBadge[statusKey] || statusBadge.pending;
                })()}
                <AiScoreBadge score={selectedReport.ai_confidence_score ? Math.round(selectedReport.ai_confidence_score * 100) : 0} reportType={selectedReport.report_type} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                <strong>Location:</strong> {selectedReport.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                <strong>Description:</strong> {selectedReport.description}
              </div>

              {selectedReport.images && JSON.parse(selectedReport.images).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Attached Photos</div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                    {JSON.parse(selectedReport.images).map((img, i) => (
                      <img key={i} src={img.url} alt={`img-${i}`} onClick={(e) => { e.stopPropagation(); setFullscreenImage(img.url); }} style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border-dim)', cursor: 'zoom-in' }} />
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const proofUrls = [];
                if (selectedReport.voters && selectedReport.voters.length > 0) {
                  selectedReport.voters.forEach(v => {
                    if (v.photo_url) {
                      try {
                        const parsed = JSON.parse(v.photo_url);
                        if (Array.isArray(parsed)) {
                          proofUrls.push(...parsed);
                        } else {
                          proofUrls.push(v.photo_url);
                        }
                      } catch (e) {
                        proofUrls.push(v.photo_url);
                      }
                    }
                  });
                }
                if (proofUrls.length > 0) {
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Community Proofs</div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                        {proofUrls.map((url, i) => (
                          <img key={`proof-${i}`} src={url} alt={`proof-${i}`} onClick={(e) => { e.stopPropagation(); setFullscreenImage(url); }} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border-dim)', cursor: 'zoom-in' }} />
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Vote / Extend Actions in Modal */}
              {selectedReport.lifecycle_status !== 'Archived' && (
                <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-dim)', marginTop: 16 }}>
                  {(() => {
                    const isCreator = selectedReport.reporter_id && (
                      selectedReport.reporter_id._id === currentUserId ||
                      selectedReport.reporter_id === currentUserId ||
                      (typeof selectedReport.reporter_id === 'object' && selectedReport.reporter_id?._id === currentUserId)
                    );
                    return (
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                        {isCreator ? "Extend your report" : "Verify this report"}
                      </div>
                    );
                  })()}

                  {/* Selected Proof Photos Previews */}
                  {votePhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
                      {votePhotos.map((photo, i) => (
                        <div key={i} style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                          <img src={photo} alt={`Proof ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-dim)' }} />
                          <button onClick={() => setVotePhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--red-400)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} color="white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input ref={voteFileInputRef} type="file" accept="image/*" capture="environment" onChange={handleVotePhotoUpload} style={{ display: 'none' }} />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    {(() => {
                      const isCreator = selectedReport.reporter_id && (
                        selectedReport.reporter_id._id === currentUserId ||
                        selectedReport.reporter_id === currentUserId ||
                        (typeof selectedReport.reporter_id === 'object' && selectedReport.reporter_id?._id === currentUserId)
                      );

                      const hasAlreadySubmittedProof = selectedReport.voters && selectedReport.voters.some(v => {
                        const voterId = typeof v.user_id === 'object' ? v.user_id?._id?.toString() : v.user_id?.toString();
                        return (voterId === currentUserId?.toString()) && !!v.photo_url;
                      });

                      const now = Date.now();
                      const expiredTime = selectedReport.expiredAt ? new Date(selectedReport.expiredAt).getTime() : null;
                      const isWithin30MinsWindow = expiredTime ? (expiredTime - now <= 30 * 60 * 1000) : true;
                      const minsLeftToWindow = expiredTime ? Math.max(1, Math.ceil((expiredTime - now - 30 * 60 * 1000) / 60000)) : 0;

                      if (isCreator) {
                        if (hasAlreadySubmittedProof) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, width: '100%' }}>
                              <CheckCircle size={16} color="var(--green-400)" />
                              <span style={{ fontSize: '0.85rem', color: 'var(--green-400)', fontWeight: 600 }}>
                                Proof photo submitted. Your report has been extended and locked from further edits.
                              </span>
                            </div>
                          );
                        }

                        if (!isWithin30MinsWindow && votePhotos.length === 0) {
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(6,182,212,0.08)', border: '1px solid var(--border-dim)', borderRadius: 8, width: '100%' }}>
                              <Clock size={16} color="var(--cyan-400)" />
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Proof photo attachment will open 30 minutes before report expiration (in approx. {minsLeftToWindow} min).
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', width: '100%' }}>
                            {votePhotos.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => vote(selectedReport._id, 'confirm')}
                                    disabled={isVoting}
                                    style={{ opacity: isVoting ? 0.7 : 1 }}
                                  >
                                    {isVoting ? (
                                      <>
                                        <span className="spinner" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: 6 }}></span>
                                        Saving & Sending...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle size={14} /> Save & Send Proof
                                      </>
                                    )}
                                  </button>
                                  {!isVoting && (
                                    <button className="btn btn-sm btn-ghost" onClick={() => startCamera('vote')} style={{ color: 'var(--cyan-400)' }}>
                                      <Camera size={14} /> Take More Photos
                                    </button>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--orange-400)' }}>
                                  * Photos cannot be edited after submission.
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                  Take proof photo to extend your report duration.
                                </span>
                                <button className="btn btn-sm btn-primary" onClick={() => startCamera('vote')} disabled={isVoting} style={{ gap: 6 }}>
                                  <Camera size={14} /> Take Proof Photo
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', width: '100%' }}>
                          <button className={`btn btn-sm ${votes[selectedReport._id] === 'confirm' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => vote(selectedReport._id, 'confirm')} disabled={isVoting}>
                            <ThumbsUp size={14} /> Still exists
                          </button>
                          <button className={`btn btn-sm ${votes[selectedReport._id] === 'deny' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => vote(selectedReport._id, 'deny')} disabled={isVoting}>
                            <ThumbsDown size={14} /> No more
                          </button>
                          <button className={`btn btn-sm ${votes[selectedReport._id] === 'false' ? 'btn-warning' : 'btn-ghost'}`} onClick={() => vote(selectedReport._id, 'false')} disabled={isVoting}>
                            <Flag size={14} /> Wrong report
                          </button>
                          <div style={{ flex: 1 }}></div>
                          <button className="btn btn-sm btn-ghost" onClick={() => startCamera('vote')} disabled={isVoting} style={{ color: 'var(--cyan-400)', gap: 6 }}>
                            <Camera size={14} /> {votePhotos.length > 0 ? `Proof (${votePhotos.length})` : 'Take Proof Photo'}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN IMAGE LIGHTBOX ── */}
      {fullscreenImage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }} onClick={() => setFullscreenImage(null)}>
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', color: '#fff' }} onClick={() => setFullscreenImage(null)}>
            <X size={24} />
          </button>
          <img src={fullscreenImage} alt="fullscreen" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
        </div>
      )}
      {/* ── CUSTOM WEBCAM CAPTURE MODAL ── */}
      {cameraActive && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 4000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ position: 'relative', width: '95%', maxWidth: 960, borderRadius: 12, overflow: 'hidden', background: '#000', border: '2px solid var(--cyan-400)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block', transform: 'scaleX(1)' }}
            />
            <div style={{
              position: 'absolute', bottom: 20, left: 0, right: 0,
              display: 'flex', justifyContent: 'center', gap: 16
            }}>
              <button
                className="btn btn-primary"
                onClick={capturePhoto}
                style={{ borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <Camera size={28} />
              </button>
              <button
                className="btn btn-ghost"
                onClick={toggleCamera}
                style={{ borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'rgba(255,255,255,0.2)', color: '#fff' }}
                title="Switch Camera"
              >
                <RefreshCw size={24} />
              </button>
              <button
                className="btn btn-danger"
                onClick={stopCamera}
                style={{ borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={28} />
              </button>
            </div>
          </div>
          <div style={{ marginTop: 12, color: '#fff', fontSize: '0.85rem' }}>
            Position yourself and click the capture button to take photo
          </div>
        </div>
      )}
    </div>
  );
}
