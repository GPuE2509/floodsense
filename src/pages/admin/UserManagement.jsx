import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, Filter, Lock, Unlock, Eye, Cpu, Battery,
  Wifi, AlertTriangle, CheckCircle, X, PowerOff,
  MapPin, Clock, User as UserIcon, Shield, ChevronLeft, ChevronRight,
  Activity, Zap, Camera, Upload,
} from 'lucide-react';
import { users } from '../../data/mockData';
import { apiService } from '../../services/apiService';
import ConfirmModal from '../../components/common/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';

function FloodWarningBadge({ level, config, calib_empty_cm }) {
  const current = level || 0;
  if (current > 5) {
    return <span className="badge badge-green"><span style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%', display: 'inline-block' }} /> {Math.round(current * 10) / 10} cm</span>;
  }
  return <span className="badge badge-gray" style={{ color: 'var(--text-muted)' }}><span style={{ width: 6, height: 6, background: '#64748b', borderRadius: '50%', display: 'inline-block' }} /> No water</span>;
}


function ChangeRoleModal({ user, onClose, onConfirm }) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  if (!user) return null;

  const handleSubmit = async () => {
    setUpdating(true);
    setError(null);
    try {
      await onConfirm(user.id, selectedRole);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Role update failed.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Change roles: {user.name}</div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ marginBottom: 12, color: 'var(--red-400)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Choose a new role</label>
            <select
              className="input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ width: '100%' }}
              disabled={updating}
            >
              <option value="user">User (User)</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Note: The new role will change this account's access to the corresponding features immediately.
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={updating}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={updating}>
            {updating ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleRequestDetailModal({ request, onClose, onAction, loading }) {
  if (!request) return null;

  const details = request.details || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="var(--blue-400)" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
              Registration details: {request.requestedRole === 'volunteer' ? "Volunteer" : "Workshop Owner"}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} disabled={loading}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '16px 20px' }}>
          {/* Thông tin người đăng ký */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: 'var(--blue-400)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Registrant information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div style={{ color: 'var(--text-muted)' }}>Full name:</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{request.userName}</div>
              <div style={{ color: 'var(--text-muted)' }}>Email:</div>
              <div style={{ fontFamily: 'var(--font-mono)' }}>{request.userEmail}</div>
              <div style={{ color: 'var(--text-muted)' }}>Phone number:</div>
              <div>{request.userPhone}</div>
              <div style={{ color: 'var(--text-muted)' }}>Registration date:</div>
              <div>{request.date}</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          {/* Chi tiết theo vai trò */}
          {request.requestedRole === 'volunteer' ? (
            <div>
              <h4 style={{ color: 'var(--blue-400)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Rescue vehicle information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                <div style={{ color: 'var(--text-muted)' }}>Vehicle type:</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {details.vehicleType === 'Canoe' ? '💧 Cano' :
                    details.vehicleType === 'Pickup_Truck' ? "🛻 Pickup truck" :
                      details.vehicleType === 'Wading_Motorcycle' ? "🏍️ Amphibious motorbike" : "🛠️ Other"}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>License plate number:</div>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{details.vehiclePlate}</div>
                <div style={{ color: 'var(--text-muted)' }}>Coordinates (Lat, Lng):</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{details.currentLat || 'N/A'}, {details.currentLng || 'N/A'}</div>
              </div>
              {details.vehicleImage && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6 }}>Photo of registered vehicle:</div>
                  <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'center' }}>
                    <img src={details.vehicleImage} alt="Vehicle" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h4 style={{ color: 'var(--blue-400)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Workshop information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                <div style={{ color: 'var(--text-muted)' }}>Workshop name:</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{details.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>Workshop hotline:</div>
                <div>{details.phone}</div>
                <div style={{ color: 'var(--text-muted)' }}>Address:</div>
                <div>{details.address}</div>
                <div style={{ color: 'var(--text-muted)' }}>Coordinates (Lat, Lng):</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{details.lat}, {details.lng}</div>
              </div>

              {details.services && details.services.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 8 }}>Registration service table:</div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>Service name</th>
                          <th style={{ padding: '6px 12px', color: 'var(--text-muted)', textAlign: 'right' }}>Base price (VND)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.services.map((srv, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < details.services.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                            <td style={{ padding: '6px 12px', color: 'var(--text-primary)' }}>{srv.service_name}</td>
                            <td style={{ padding: '6px 12px', color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{srv.base_price.toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '12px 20px' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-danger btn-sm" onClick={() => onAction(request.id, request.requestedRole, 'reject')} disabled={loading}>
              Refuse
            </button>
            <button className="btn btn-success btn-sm" onClick={() => onAction(request.id, request.requestedRole, 'approve')} disabled={loading} style={{ background: 'var(--green-400)', color: 'black', border: 'none' }}>
              {loading ? "Browsing..." : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement({ onApproveRequest, onRejectRequest }) {
  const { role: currentUserRole } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('users');
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [detailRequestModal, setDetailRequestModal] = useState(null);
  const [roleRequests, setRoleRequests] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [systemConfig, setSystemConfig] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const requestId = params.get('requestId');
    if (tab) {
      setActiveTab(tab);
    }
    if (requestId && roleRequests.length > 0) {
      const match = roleRequests.find(r => r.id === requestId || r._id === requestId);
      if (match) {
        setDetailRequestModal(match);
        setTimeout(() => {
          const element = document.getElementById(`request-row-${requestId}`);
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
  }, [location.search, roleRequests]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res.success && res.data) {
          setSystemConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch system config in UserManagement:', err);
      }
    };
    fetchConfig();
  }, []);



  const fetchRoleRequests = async () => {
    try {
      const response = await apiService.get('/auth/admin/role-requests');
      if (response && response.success) {
        setRoleRequests(response.requests);
      }
    } catch (err) {
      console.error('Error fetching role requests:', err);
    }
  };

  const handleActionRequest = async (requestId, type, action) => {
    setActionLoading(true);
    try {
      const response = await apiService.put(`/auth/admin/role-requests/${requestId}`, {
        type,
        action
      });
      if (response && response.success) {
        await fetchRoleRequests();
        const usersResponse = await apiService.get('/auth/admin/users');
        if (usersResponse && usersResponse.success) {
          setUserList(usersResponse.users);
        }
        setDetailRequestModal(null);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Request successfully ${action === 'approve' ? 'approved' : 'rejected'}!`, type: 'success' } }));
      }
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || "Operation failed.", type: 'error' } }));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchRoleRequests();
    }
  }, [activeTab]);

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await apiService.patch(`/auth/admin/users/${userId}/role`, { role: newRole });
      if (response && response.success) {
        setUserList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Role updated successfully!", type: 'success' } }));
      } else {
        throw new Error(response.message || "Role update failed.");
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || "An error occurred while connecting to the server.", type: 'error' } }));
      throw new Error(err.message || "An error occurred while connecting to the server.");
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
          const queryParams = new URLSearchParams({
            search,
            role: filterRole,
            status: filterStatus
          }).toString();

          const response = await apiService.get(`/auth/admin/users?${queryParams}`);
          if (response && response.success) {
            setUserList(response.users);
          } else {
            setError("Unable to get account list.");
          }
        } catch (err) {
          console.error('Error fetching users:', err);
          setError(err.message || "Server connection error.");
        } finally {
          setLoading(false);
        }
      };

      const delayDebounce = setTimeout(() => {
        fetchUsers();
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [activeTab, search, filterRole, filterStatus]);

  const filteredUsers = userList;

  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const toggleUserLock = (id) => {
    const u = userList.find(u => u.id === id);
    setConfirmModal({
      title: u.status === 'active' ? "Account lock" : "Unlock account",
      message: u.status === 'active'
        ? `Are you sure you want to block your account?${u.name}"? This user will not be able to log in.`
        : `Unlock account for "${u.name}"? The user will be able to log in again.`,
      onConfirm: async () => {
        const nextStatus = u.status === 'active' ? 'locked' : 'active';
        try {
          setConfirmModal(prev => ({ ...prev, loading: true }));
          const response = await apiService.patch(`/auth/admin/users/${id}/status`, { status: nextStatus });
          if (response && response.success) {
            setUserList(prev => prev.map(uu => uu.id === id ? { ...uu, status: nextStatus } : uu));
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Account status updated successfully to ${nextStatus}!`, type: 'success' } }));
          } else {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: response.message || "Status update failed.", type: 'error' } }));
          }
        } catch (err) {
          console.error('Error toggling lock:', err);
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || "Server connection error.", type: 'error' } }));
        } finally {
          setConfirmModal(null);
        }
      },
      onCancel: () => setConfirmModal(null),
      confirmText: u.status === 'active' ? 'Lock' : 'Unlock',
      variant: u.status === 'active' ? 'warning' : 'primary',
    });
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage account portfolios and roles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: "Total users", value: userList.length, color: 'var(--blue-400)' },
          { label: "Active", value: userList.filter(u => u.status === 'active').length, color: 'var(--green-400)' },
          { label: "Locked", value: userList.filter(u => u.status === 'locked').length, color: 'var(--red-400)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 360 }}>
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); setSearch(''); }}>
          <UserIcon size={14} /> User ({userList.length})
        </button>
        <button className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => { setActiveTab('approvals'); setSearch(''); }}>
          <Shield size={14} /> Browse roles ({roleRequests.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <div className="flex items-center gap-3">
          <div className="input-group" style={{ maxWidth: 300 }}>
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder={
                activeTab === 'users'
                  ? "Find users..."
                  : "Find username..."
              }
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {activeTab === 'users' && (
            <>
              <select className="input" style={{ maxWidth: 150 }} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">All roles</option>
                <option value="user">User</option>
                <option value="volunteer">Volunteer</option>
                <option value="workshop_owner">Workshop Owner</option>
                <option value="workshop_staff">Workshop staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              <select className="input" style={{ maxWidth: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="locked">Locked</option>
                <option value="pending">Wait for confirmation</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Users Table */}
      {activeTab === 'users' && (
        <>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading account list...
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--red-400)' }}>
              {error}
            </div>
          ) : (
            <>
              <div className="card table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last activity</th>
                      <th>Operation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.status === 'locked' ? 'rgba(71,85,105,0.3)' : 'linear-gradient(135deg,#1a6cff,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const sibling = e.target.nextSibling;
                                    if (sibling) sibling.style.display = 'block';
                                  }}
                                />
                              ) : null}
                              <span style={{ display: u.avatar_url ? 'none' : 'block' }}>
                                {u.name.split(' ').pop().slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: u.status === 'locked' ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.875rem' }}>{u.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.phone}</div>
                        </td>
                        <td>
                          {u.role === 'admin' && <span className="badge badge-red"><Shield size={10} /> Admin</span>}
                          {u.role === 'manager' && <span className="badge badge-orange"><Shield size={10} /> Manager</span>}
                          {u.role === 'workshop_owner' && <span className="badge badge-blue"><Shield size={10} /> Workshop owner</span>}
                          {u.role === 'workshop_staff' && <span className="badge badge-blue"><Shield size={10} /> Workshop staff</span>}
                          {u.role === 'volunteer' && <span className="badge badge-yellow"><Shield size={10} /> Volunteer</span>}
                          {u.role === 'user' && <span className="badge badge-gray">User</span>}
                          {u.role === 'guest' && <span className="badge badge-gray" style={{ opacity: 0.7 }}>Guest</span>}
                          {!['admin', 'manager', 'workshop_owner', 'workshop_staff', 'volunteer', 'user', 'guest'].includes(u.role) && <span className="badge badge-gray">{u.role}</span>}
                        </td>
                        <td>
                          {u.status === 'active' && <span className="badge badge-green">Work</span>}
                          {u.status === 'locked' && <span className="badge badge-red">Locked</span>}
                          {u.status === 'pending' && <span className="badge badge-yellow">Wait for confirmation</span>}
                        </td>
                        <td><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.lastSeen}</span></td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                              onClick={() => toggleUserLock(u.id)}
                              disabled={u.role === 'admin'}
                              style={{
                                padding: '4px 10px',
                                opacity: u.role === 'admin' ? 0.4 : 1,
                                cursor: u.role === 'admin' ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {u.status === 'active' ? <><Lock size={12} /> Lock</> : <><Unlock size={12} /> Open</>}
                            </button>
                            {currentUserRole !== 'manager' && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setRoleModal(u)}
                                disabled={!['user', 'manager'].includes(u.role)}
                                style={{
                                  padding: '4px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  opacity: !['user', 'manager'].includes(u.role) ? 0.4 : 1,
                                  cursor: !['user', 'manager'].includes(u.role) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Shield size={12} /> Role
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 16 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', position: 'absolute', left: 0 }}>
                  Show {filteredUsers.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredUsers.length)} / {filteredUsers.length} User
                </span>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ padding: '5px 10px' }}
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button className="btn btn-ghost btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* IoT Devices Table */}
      {activeTab === 'devices' && (
        <div className="card table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Image</th>
                <th>Location</th>
                <th>Warning</th>
                <th>Settings (cm)</th>
                <th>Battery</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((d) => (
                <tr key={d.id} style={{ verticalAlign: 'middle' }}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{d.name || 'Unnamed'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.device_code || d.id}</div>
                    </div>
                  </td>
                  <td>
                    {d.image_url ? (
                      <img src={d.image_url} alt="Device" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Camera size={16} color="var(--text-muted)" />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} color="var(--text-muted)" />
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.location}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.lat}, {d.lng}</div>
                      </div>
                    </div>
                  </td>
                  <td><FloodWarningBadge level={d.current_water_level !== undefined ? d.current_water_level : (d.waterLevel || 0)} config={systemConfig} calib_empty_cm={d.calib_empty_cm} /></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                      <div className="flex items-center justify-between" style={{ fontSize: '0.7rem', background: 'rgba(6, 182, 214, 0.05)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(6, 182, 214, 0.15)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Calib</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.calib_empty_cm || '-'} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>cm</span></span>
                      </div>

                      <div className="flex items-center justify-between" style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.05)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                        <span style={{ color: 'var(--blue-400)', fontWeight: 500 }}>Sleep</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue-400)' }}>{d.sleep_interval_minutes || 1} <span style={{ fontSize: '10px', fontWeight: 'normal' }}>min</span></span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(d.current_battery_level !== undefined || d.battery_level !== undefined) ? <BatteryBar value={d.current_battery_level !== undefined ? d.current_battery_level : d.battery_level} /> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Upgrade Approvals Console */}
      {activeTab === 'approvals' && (
        <div className="card table-wrapper" style={{ animation: 'fadeIn 0.4s' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User registration</th>
                <th>Role required</th>
                <th>Sending time</th>
                <th>Status</th>
                <th>Approval operation</th>
              </tr>
            </thead>
            <tbody>
              {roleRequests.map((req) => (
                <tr id={`request-row-${req.id || req._id}`} key={req.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.userName}</div>
                  </td>
                  <td>
                    <span className={`badge ${req.requestedRole === 'volunteer' ? 'badge-yellow' :
                        req.requestedRole === 'workshop' ? 'badge-orange' : 'badge-green'
                      }`}>
                      {req.requestedRole === 'volunteer' ? "🛡️ Volunteer" :
                        req.requestedRole === 'workshop' ? "💼 Car workshop owner" : "🔧 Car repairman"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.date}</span>
                  </td>
                  <td>
                    <span className={`badge ${req.status === 'approved' ? 'badge-green' :
                        req.status === 'rejected' ? 'badge-red' : 'badge-orange'
                      }`}>
                      {req.status === 'approved' ? "Approved" :
                        req.status === 'rejected' ? "Refuse" : "Waiting for approval"}
                    </span>
                  </td>
                  <td>
                    {req.status === 'pending' ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setDetailRequestModal(req)}
                        style={{ padding: '4px 10px', background: 'var(--blue-500)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Shield size={12} /> Browse application
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {roleRequests.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    There are no role upgrades required.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmModal && <ConfirmModal isOpen={!!confirmModal} {...confirmModal} />}
      {roleModal && <ChangeRoleModal user={roleModal} onClose={() => setRoleModal(null)} onConfirm={handleUpdateRole} />}
      {detailRequestModal && <RoleRequestDetailModal request={detailRequestModal} onClose={() => setDetailRequestModal(null)} onAction={handleActionRequest} loading={actionLoading} />}
    </div>
  );
}
