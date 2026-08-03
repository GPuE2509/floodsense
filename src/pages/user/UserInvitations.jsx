import React, { useState, useEffect } from 'react';
import { Mail, MapPin, Check, X, Loader } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function UserInvitations({ onNavigate }) {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await apiService.get('/workshops/staff/invitations');
      if (res && res.invitations) {
        setInvitations(res.invitations);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleRespondInvite = async (id, action) => {
    try {
      await apiService.put(`/workshops/staff/invitations/${id}/${action}`);
      setInvitations(prev => prev.map(inv => inv._id === id ? { ...inv, status: action === 'accept' ? 'Available' : 'Rejected' } : inv));
      if (action === 'accept') {
        setToast({ type: 'success', message: 'Joined workshop successfully! Redirecting...' });
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (err) {
      console.error(`Failed to ${action} invite:`, err);
    }
  };

  return (
    <div className="page-enter" style={{ position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 500,
          animation: 'slideInRight 0.3s ease-out forwards',
        }}>
          <Check size={18} />
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: 8, cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="card" style={{ padding: 24, minHeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ background: 'var(--cyan-900)', padding: 10, borderRadius: 12 }}>
            <Mail size={24} color="var(--cyan-400)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Workshop Staff Invitations
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Manage your invitations to join workshop staff
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <Loader className="spin" size={32} color="var(--cyan-400)" />
          </div>
        ) : invitations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px dashed var(--border-dim)' }}>
            <Mail size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>No pending invitations</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>You don't have any pending workshop staff invitations at the moment.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {invitations.map(inv => (
              <div key={inv._id} style={{
                padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)',
                border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'stretch', gap: 20
              }}>
                {/* Left: Workshop Image */}
                <div style={{ width: 140, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-surface)' }}>
                   <img 
                     src={inv.workshop_id?.cover_photo || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&q=80&w=300'} 
                     alt="Workshop" 
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                   />
                </div>

                {/* Middle: Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--cyan-900)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan-400)', fontWeight: 700 }}>
                      {inv.workshop_id?.owner?.avatar_url ? (
                        <img 
                          src={inv.workshop_id.owner.avatar_url} 
                          alt="Owner avatar" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        inv.workshop_id?.owner?.full_name?.charAt(0) || 'O'
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inv.workshop_id?.owner?.full_name || 'Workshop Owner'} <span style={{ fontSize: '0.85rem', color: 'var(--cyan-300)', fontWeight: 600, marginLeft: 8 }}>invited you to be a Workshop Staff</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {inv.workshop_id?.owner?.email || inv.workshop_id?.owner?.phone || 'No contact info'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                    border: '1px dashed var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                        {inv.workshop_id?.name || 'Unknown Workshop'}
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {inv.workshop_id?.address || 'Unknown address'}
                      </div>
                    </div>
                    <button 
                      title="Pin workshop on map"
                      onClick={() => {
                        if (onNavigate) onNavigate('user-dashboard', { state: { pinWorkshopId: inv.workshop_id?._id } });
                      }}
                      style={{
                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', 
                        color: 'var(--cyan-400)', cursor: 'pointer', padding: 8, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <MapPin size={18} />
                    </button>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 130, flexShrink: 0, justifyContent: 'center' }}>
                  {inv.status === 'Available' || inv.status === 'Active' || inv.status === 'Busy' || inv.status === 'Inactive' ? (
                    <button
                      disabled
                      style={{ padding: '10px 0', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--green-500)', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Check size={16} /> Accepted
                    </button>
                  ) : inv.status === 'Rejected' ? (
                    <button
                      disabled
                      style={{ padding: '10px 0', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <X size={16} /> Rejected
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRespondInvite(inv._id, 'accept')}
                        style={{ padding: '10px 0', background: 'var(--green-500)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <Check size={16} /> Accept
                      </button>
                      <button
                        onClick={() => handleRespondInvite(inv._id, 'decline')}
                        style={{ padding: '10px 0', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        <X size={16} /> Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
