import React, { useState } from 'react';
import {
  UserCheck, Save, CheckCircle, AlertTriangle,
  Phone, Calendar, Award, PauseCircle, XCircle, Edit3, LogOut,
} from 'lucide-react';
import { message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import VolunteerEditModal from '../../components/profile/VolunteerEditModal';
import ConfirmModal from '../../components/common/ConfirmModal';


const initialProfile = {
  status: 'active', // 'active' | 'suspended' | 'inactive'
  joinDate: new Date().toLocaleDateString('en-US'),
  totalMissions: 0,
};

export default function VolunteerProfile() {
  const { logout, userName, avatarUrl } = useAuth();
  const [profile, setProfile] = useState(initialProfile);
  const [email, setEmail] = useState('');

  React.useEffect(() => {
    const fetchVolunteerData = async () => {
      try {
        const res = await apiService.get('/volunteers/me');
        if (res && res.volunteer) {
          const vol = res.volunteer;
          setProfile(prev => ({
            ...prev,
            status: (vol.status === 'Approved' || vol.status === 'Available') ? 'active' : vol.status === 'Inactive' ? 'inactive' : 'suspended',
            vehicleType: vol.vehicle_type,
            vehiclePlate: vol.vehicle_plate,
            vehicleImage: vol.vehicle_image,
            totalMissions: vol.total_missions || 0,
          }));
        }

        // Fetch user profile to get email
        const userRes = await apiService.get('/auth/profile');
        if (userRes && userRes.user) {
          setEmail(userRes.user.email || '');
        }
      } catch (err) {
        console.error('Failed to fetch volunteer details:', err);
      }
    };
    fetchVolunteerData();
  }, []);

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showVolunteerEditModal, setShowVolunteerEditModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const showToast = (type, msg) => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: msg,
        type: type
      }
    }));
  };

  const handleToggleVolunteerStatus = async (action) => {
    setIsTogglingStatus(true);
    try {
      const response = await apiService.put('/volunteers/me/status', { action });
      if (response && response.volunteer) {
        const vol = response.volunteer;
        setProfile(prev => ({
          ...prev,
          status: (vol.status === 'Approved' || vol.status === 'Available') ? 'active' : vol.status === 'Inactive' ? 'inactive' : 'suspended',
        }));
        setShowSuspendConfirm(false);
        showToast('success', "Update status successfully.");
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      showToast('error', error.message || "Status update error.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleCancelVolunteerRequest = async () => {
    try {
      await apiService.put('/volunteers/me/cancel');
      showToast('success', "Successfully withdrawn from the Rescue Team.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to cancel/resign:', error);
      showToast('error', error.response?.data?.message || "Error while performing operation.");
    }
  };



  const statusColor = {
    active: 'var(--green-400)',
    suspended: 'var(--orange-400)',
    inactive: 'var(--orange-400)',
  };

  const statusLabel = {
    active: "Ready",
    suspended: "Pause",
    inactive: "Suspended",
  };

  return (
    <div style={{
      maxWidth: 1000,
      margin: '0 auto',
      animation: 'fadeIn 0.4s ease-out',
      paddingBottom: 40
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Volunteer Profile
          </h2>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Manage profile and activity status</div>
        </div>

      </div>

      {saved && (
        <div className="alert-banner" style={{ marginBottom: 20 }}>
          <CheckCircle size={15} color="var(--green-400)" />
          <span style={{ fontSize: '0.85rem' }}>Profile changes saved successfully!</span>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 20,
        alignItems: 'start'
      }}>

        {/* Left: Identity Card */}
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>

          {/* Profile Card */}
          <div className="card p-6" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(239,29,55,0.08), transparent 60%)' }} />
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #dc2626, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.4rem', fontWeight: 800, color: 'white', boxShadow: '0 0 24px rgba(239,29,55,0.4)', backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
              {!avatarUrl && userName ? userName.split(' ').slice(-2).map(n => n[0]).join('') : ''}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{userName || "Volunteer"}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: `rgba(34,197,94,0.1)`, border: `1px solid rgba(34,197,94,0.25)`, fontSize: '0.72rem', fontWeight: 700, color: statusColor[profile.status], marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[profile.status], boxShadow: `0 0 6px ${statusColor[profile.status]}` }} />
              {statusLabel[profile.status]}
            </div>

            {/* User info preview */}
            <div style={{ padding: '8px 10px', borderRadius: 'var(--r-md)', background: 'rgba(6,182,212,0.05)', border: '1px solid var(--border-dim)', textAlign: 'left', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 2 }}>{userName || "User"}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>{email}</div>
              <span className="badge badge-cyan" style={{ fontSize: '0.58rem', padding: '2px 8px' }}>
                RESCUE VOLUNTEERS
              </span>
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {[
                { icon: Calendar, label: "Join date", value: profile.joinDate },
                { icon: Award, label: "Total missions", value: profile.totalMissions },
              ].map(row => {
                const Icon = row.icon;
                return (
                  <div key={row.label} className="flex items-center gap-3" style={{ padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(61,125,176,0.06)' }}>
                    <Icon size={13} color="var(--text-muted)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{row.label}</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Edit Form */}
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>

          {/* Status Controls */}
          <div className="card p-5">
            <div className="section-title" style={{ marginBottom: 12 }}>Operating status</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleToggleVolunteerStatus('resume')}
                disabled={profile.status === 'active' || isTogglingStatus}
              >
                <CheckCircle size={13} /> {isTogglingStatus && profile.status !== 'active' ? "Processing..." : "Activate activity"}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ borderColor: 'var(--orange-400)', color: 'var(--orange-400)' }}
                onClick={() => setShowSuspendConfirm(true)}
                disabled={profile.status !== 'active'}
              >
                <PauseCircle size={13} /> Pause activity
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ borderColor: 'var(--red-400)', color: 'var(--red-400)' }}
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle size={13} /> Cancel volunteer registration
              </button>
            </div>
          </div>

          {/* Vehicle Info */}
          {profile.vehicleType && (
            <div className="card p-6">
              <div className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Registered Vehicle</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowVolunteerEditModal(true)}
                  style={{ fontSize: '0.7rem', color: 'var(--cyan-400)', padding: '4px 8px' }}
                >
                  <Edit3 size={12} /> Update vehicle
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: 'var(--r-md)', background: 'var(--bg-elevated)', overflow: 'hidden', border: '1px solid var(--border-dim)', flexShrink: 0 }}>
                  {profile.vehicleImage ? (
                    <img src={profile.vehicleImage} alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.7rem' }}>No Image</div>
                  )}
                </div>
                <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle type</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{
                      profile.vehicleType === 'Canoe' ? "Canoe / Boat" :
                        profile.vehicleType === 'Pickup_Truck' ? "Pickup Truck" :
                          profile.vehicleType === 'Wading_Motorcycle' ? "Amphibious Motorbike" : "Other"
                    }</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>License plate</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--orange-400)', textTransform: 'uppercase' }}>{profile.vehiclePlate}</div>
                  </div>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {showVolunteerEditModal && (
        <VolunteerEditModal
          isOpen={showVolunteerEditModal}
          onClose={() => setShowVolunteerEditModal(false)}
          onSuccess={() => window.location.reload()}
          initialData={{ vehicle_type: profile.vehicleType, vehicle_plate: profile.vehiclePlate, vehicle_image: profile.vehicleImage }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="card p-6" style={{ maxWidth: 400, width: '90%', border: '1px solid rgba(239,29,55,0.3)', background: 'var(--bg-elevated)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,29,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red-400)' }}>
                <LogOut size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Confirm logout</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to log out of the system?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                className="btn btn-ghost"
                onClick={() => setShowLogoutConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  logout();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showSuspendConfirm}
        title="Confirm Pause Activity"
        message="Are you sure you want to temporarily suspend your volunteer activity? You will not receive new SOS rescue requests."
        confirmText="Confirm"
        type="warning"
        loading={isTogglingStatus}
        onConfirm={() => handleToggleVolunteerStatus('pause')}
        onCancel={() => setShowSuspendConfirm(false)}
      />

      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Confirm Withdrawal"
        message="Are you sure you want to leave your current role? Your account will revert to a regular member, but previously earned contributions and credits will still be credited."
        confirmText="Confirm withdrawal"
        type="danger"
        onConfirm={handleCancelVolunteerRequest}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
