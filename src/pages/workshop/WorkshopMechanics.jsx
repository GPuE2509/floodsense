import React, { useState, useEffect, useContext } from 'react';
import {
  Users, Plus, Edit3, Trash2, Save, CheckCircle,
  Clock, Star, Phone, Wrench, Calendar, ToggleRight, XCircle, Play, Pause, Mail
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { AuthContext } from '../../context/AuthContext';
import ShiftScheduleMatrix from '../../components/workshop/shift/ShiftScheduleMatrix';

const SHIFTS = ["Morning (6am–2pm)", "Afternoon (2pm–10pm)", "Night (10pm–6am)", "All day"];
const SKILLS = ["Basic motorbike", "Car flooded", "Electricity & electronics", "Replace tire", "Towing the car", "Battery", "Tram"];

export default function WorkshopMechanics({ linkRequests = [], onApproveLink, onRejectLink }) {
  const [error, setError] = useState(null);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  const { role } = useContext(AuthContext);
  const [mechanics, setMechanics] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // mechanic ID being edited
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [suspendingStaff, setSuspendingStaff] = useState(null);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  // Local state for interactive schedule demo
  const [schedules, setSchedules] = useState({});
  const [newMechanic, setNewMechanic] = useState({
    name: '', phone: '', age: '', experience: '', skills: [], shift: "Morning (6am–2pm)", salary: '',
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await apiService.get('/workshops/me/staff');
      if (res && res.staff) {
        setIsCurrentUserOwner(res.isOwner || false);
        // Map backend schema to UI format
        const mapped = res.staff.map(s => ({
          id: s._id,
          userId: s.user_id?._id || s.user_id,
          name: s.user_id?.full_name || 'Unknown User',
          phone: s.user_id?.phone || s.user_id?.email || 'N/A',
          rawEmail: s.user_id?.email,
          rawPhone: s.user_id?.phone,
          avatarUrl: s.user_id?.avatar_url,
          isOwner: s.is_owner,
          age: 0,
          experience: 'N/A',
          skills: [],
          shift: 'Morning (6am–2pm)',
          status: (s.status === 'Pending_Invite' || s.status === 'Pending Invite') ? 'pending' : s.status === 'Rejected' ? 'rejected' : s.status === 'Suspended' ? 'suspended' : (s.status === 'Inactive' ? 'inactive' : 'active'),
          onDuty: s.isOnDuty || false,
          tasks: 0,
          rating: 5.0,
          invitedAt: s.invited_at ? new Date(s.invited_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Unknown',
          joinDate: s.joined_at ? new Date(s.joined_at).toLocaleDateString('vi-VN') : (s.invited_at ? new Date(s.invited_at).toLocaleDateString('vi-VN') : 'Unknown'),
          salary: 0,
          currentTask: null
        }));
        setMechanics(mapped);
      } else {
        setToast({ type: 'error', message: 'No staff data returned from server.' });
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      setToast({ type: 'error', message: error.message || 'Failed to fetch staff. Make sure you belong to a workshop.' });
    }
  };

  const toggleSkill = (mechId, skill) => {
    setMechanics(prev => prev.map(m => m.id === mechId
      ? { ...m, skills: m.skills.includes(skill) ? m.skills.filter(s => s !== skill) : [...m.skills, skill] }
      : m
    ));
  };

  const toggleNewSkill = (skill) => {
    setNewMechanic(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }));
  };

  const toggleOnDuty = (id) => {
    setMechanics(prev => prev.map(m => m.id === id ? { ...m, onDuty: !m.onDuty } : m));
  };

  const toggleStatus = (id) => {
    setMechanics(prev => prev.map(m => m.id === id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active', onDuty: false } : m));
  };

  const confirmSuspend = async () => {
    if (!suspendingStaff) return;
    try {
      const res = await apiService.put(`/workshops/me/staff/${suspendingStaff.userId}/suspend`);
      if (res) {
        setToast({ type: 'success', message: res.message || 'Suspension status toggled!' });
        fetchStaff();
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to toggle suspension.' });
    }
    setSuspendingStaff(null);
  };

  const deleteMechanic = (id) => {
    setMechanics(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const addMechanic = async () => {
    if (!newMechanic.phone.trim()) return;
    try {
      const res = await apiService.post('/workshops/me/staff/invite', { phone_or_email: newMechanic.phone });
      if (res) {
        setToast({ type: 'success', message: 'Invitation sent successfully!' });
        setNewMechanic({ name: '', phone: '', age: '', experience: '', skills: [], shift: "Morning (6am–2pm)", salary: '' });
        setAdding(false);
        fetchStaff(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to invite staff:', err);
      setToast({ type: 'error', message: err.message || 'Failed to invite user.' });
    }
    setTimeout(() => setToast(null), 4000);
  };

  const saveEdit = () => {
    setSaved(true);
    setEditing(null);
    setTimeout(() => setSaved(false), 2000);
  };

  const onDutyCount = mechanics.filter(m => m.onDuty && m.status !== 'pending').length;
  const activeCount = mechanics.filter(m => m.status === 'active').length;
  const activeMechanics = mechanics.filter(m => m.status === 'active' || m.status === 'inactive' || m.status === 'suspended');
  const pendingMechanics = mechanics.filter(m => m.status === 'pending' || m.status === 'rejected');
  const pendingCount = mechanics.filter(m => m.status === 'pending').length;
  const averageRating = activeMechanics.length > 0 
    ? (activeMechanics.reduce((s, m) => s + m.rating, 0) / activeMechanics.length).toFixed(1) 
    : '0';

  return (
    <div className="page-enter" style={{ position: 'relative' }}>
      
      {/* Toast Notification */}
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
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: 8, cursor: 'pointer' }}>
            <XCircle size={14} />
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Workshop Staff Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Invite and manage Workshop Staff, shifts, and track performance</p>
          </div>
          {saved && <div className="flex items-center gap-2" style={{ color: 'var(--green-400)', fontWeight: 600, fontSize: '0.875rem' }}><CheckCircle size={15} /> Saved</div>}
          {role === 'workshop' && isCurrentUserOwner && (
            <button className="btn btn-primary" onClick={() => { setAdding(true); setSelected(null); }}>
              <Plus size={16} /> Invite User
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Staff", value: activeMechanics.length, color: 'var(--cyan-400)' },
          { label: "Active", value: activeCount, color: 'var(--green-400)' },
          { label: "On duty", value: onDutyCount, color: '#f59e0b' },
          { label: "Average Rating", value: averageRating + '★', color: 'var(--gold-400)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 600 }}>
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          <Users size={13} /> Staff List
        </button>
        <button className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
          <Calendar size={13} /> Shift Schedule
        </button>
        {isCurrentUserOwner && (
          <button className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
            <Clock size={13} /> Waiting for respond
            {(linkRequests.filter(r => r.status === 'pending').length + pendingCount) > 0 && (
              <span style={{ marginLeft: 6, padding: '2px 6px', background: 'var(--red-500)', color: 'white', borderRadius: 10, fontSize: '0.62rem', fontWeight: 700 }}>
                {linkRequests.filter(r => r.status === 'pending').length + pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Invite/Add mechanic form */}
      {adding && (
        <div className="card p-6" style={{ marginBottom: 20, border: '1px solid rgba(217,119,6,0.3)' }}>
          <div className="section-title" style={{ marginBottom: 16 }}>Invite User to Workshop Staff</div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>User Phone / Email</label>
            <input 
              className="input" 
              placeholder="Enter phone number or email to invite..." 
              value={newMechanic.phone} 
              onChange={e => setNewMechanic(p => ({ ...p, phone: e.target.value }))} 
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
              The user will receive a notification in their app. Once they accept, their profile details will be displayed here automatically.
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary" onClick={addMechanic}><CheckCircle size={14} /> Send Invite</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tab: List */}
      {activeTab === 'list' && (
        <div className="grid" style={{ gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            {activeMechanics.length === 0 ? (
              <div className="card p-6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No staff added yet</div>
                <div style={{ fontSize: '0.85rem' }}>Please invite users to manage your workshop staff.</div>
              </div>
            ) : (
              activeMechanics.map(m => (
                <div key={m.id} className="card" style={{
                padding: '16px 18px',
                borderLeft: m.onDuty ? '3px solid #f59e0b' : m.status === 'inactive' ? '3px solid var(--border-dim)' : '3px solid var(--border-default)',
                opacity: m.status === 'inactive' ? 0.6 : 1,
                cursor: 'pointer',
                background: selected?.id === m.id ? 'rgba(217,119,6,0.06)' : undefined,
                transition: 'background 0.15s',
              }} onClick={() => setSelected(m)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3" style={{ flex: 1 }}>
                    <div className="user-avatar" style={{ width: 44, height: 44, fontSize: '0.85rem', flexShrink: 0, background: m.onDuty ? 'linear-gradient(135deg, #d97706, #f59e0b)' : undefined, overflow: 'hidden' }}>
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        m.name.split(' ').slice(-2).map(n => n[0]).join('')
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 3 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{m.name}</span>
                        {m.isOwner && <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(71,85,105,0.2)', color: 'var(--text-secondary)' }}>Owner</span>}
                        <span className={`badge ${m.status === 'active' ? (m.onDuty ? 'badge-orange' : 'badge-green') : m.status === 'pending' ? 'badge-blue' : ''}`} style={{ fontSize: '0.62rem', ...(m.status === 'inactive' ? { background: 'rgba(71,85,105,0.3)', color: 'var(--text-muted)' } : m.status === 'suspended' ? { background: 'rgba(234,179,8,0.2)', color: 'var(--yellow-400)' } : {}) }}>
                          {m.status === 'inactive' ? "Resigned" : m.status === 'pending' ? "Pending Invite" : m.status === 'suspended' ? "SUSPENDED" : m.onDuty ? "ON DUTY" : "AVAILABLE"}
                        </span>
                        {m.currentTask && <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>{m.currentTask}</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {m.rawEmail ? <Mail size={11} style={{ display: 'inline', marginRight: 3 }} /> : <Phone size={11} style={{ display: 'inline', marginRight: 3 }} />}
                        {[m.rawEmail, m.rawPhone].filter(Boolean).join(' / ') || 'N/A'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {m.skills.slice(0, 3).map(s => (
                          <span key={s} className="badge" style={{ fontSize: '0.6rem', background: 'rgba(217,119,6,0.1)', color: '#f59e0b', border: 'none', padding: '1px 6px' }}>{s}</span>
                        ))}
                        {m.skills.length > 3 && <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(71,85,105,0.2)', color: 'var(--text-muted)', border: 'none' }}>+{m.skills.length - 3}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end', marginBottom: 4 }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={11} fill={s <= Math.round(m.rating) ? '#f59e0b' : 'none'} color={s <= Math.round(m.rating) ? '#f59e0b' : 'var(--border-default)'} />)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.tasks} tasks</div>
                      <div className="flex gap-2" style={{ marginTop: 6 }}>
                        {isCurrentUserOwner && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: m.status === 'suspended' ? 'var(--green-400)' : 'var(--yellow-400)' }} onClick={e => { e.stopPropagation(); setSuspendingStaff(m); }}>
                              {m.status === 'suspended' ? <Play size={12} /> : <Pause size={12} />}
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={e => { e.stopPropagation(); setEditing(m.id); setSelected(m); }}>
                              <Edit3 size={12} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: 'var(--red-400)' }} onClick={e => { e.stopPropagation(); deleteMechanic(m.id); }}>
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

          {/* Detail panel */}
          {selected && (
            <div className="card p-6" style={{ position: 'sticky', top: 20 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div className="section-title">Workshop Staff information</div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); setEditing(null); }}><XCircle size={14} /></button>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.1rem', margin: '0 auto 10px', background: selected.onDuty ? 'linear-gradient(135deg, #d97706, #f59e0b)' : undefined, overflow: 'hidden' }}>
                  {selected.avatarUrl ? (
                    <img src={selected.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selected.name.split(' ').slice(-2).map(n => n[0]).join('')
                  )}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selected.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selected.experience} experience</div>
              </div>

              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Phone Number", value: selected.phone },
                  { label: "Age", value: selected.age + " years old" },
                  { label: "Shift", value: selected.shift },
                  { label: "Join Date", value: selected.joinDate },
                  { label: "Salary", value: `${parseInt(selected.salary?.toString().replace(/\D/g, '') || '0').toLocaleString('vi-VN')}₫/month` },
                  { label: "Total Tasks", value: `${selected.tasks} tasks` },
                  { label: "Rating", value: `${selected.rating} ★` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Skill {editing === selected.id && "(click to edit)"}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {SKILLS.map(skill => {
                    const isActive = mechanics.find(m => m.id === selected.id)?.skills.includes(skill);
                    return (
                      <button key={skill} onClick={() => editing === selected.id && toggleSkill(selected.id, skill)} style={{
                        padding: '3px 8px', fontSize: '0.68rem', borderRadius: 999,
                        cursor: editing === selected.id ? 'pointer' : 'default',
                        border: isActive ? '1px solid rgba(217,119,6,0.4)' : '1px solid var(--border-dim)',
                        background: isActive ? 'rgba(217,119,6,0.12)' : 'transparent',
                        color: isActive ? '#f59e0b' : 'var(--text-muted)',
                      }}>{isActive ? '✓ ' : ''}{skill}</button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle controls - Only for owner */}
              {isCurrentUserOwner && (
                <div style={{ display: 'grid', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-dim)' }}>
                  <div className="flex items-center justify-between" style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-dim)', background: 'rgba(61,125,176,0.04)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>On duty</span>
                    <label className="toggle">
                      <input type="checkbox" checked={mechanics.find(m => m.id === selected.id)?.onDuty || false} onChange={() => toggleOnDuty(selected.id)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <button className={`btn btn-sm ${mechanics.find(m => m.id === selected.id)?.status === 'active' ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(selected.id)}>
                    <ToggleRight size={13} /> {mechanics.find(m => m.id === selected.id)?.status === 'active' ? "Suspend Activities" : "Reactivate"}
                  </button>
                  {editing === selected.id ? (
                    <button className="btn btn-success btn-sm" onClick={saveEdit}><Save size={13} /> Save changes</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(selected.id)}><Edit3 size={13} /> Edit</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Schedule */}
      {activeTab === 'schedule' && (
        <ShiftScheduleMatrix 
          staffList={mechanics.filter(m => m.status === 'active' || m.status === 'inactive' || m.status === 'suspended' || m.isOwner)} 
          isOwner={isCurrentUserOwner}
        />
      )}

      {/* Tab: Link Approvals & Invites */}
      {isCurrentUserOwner && activeTab === 'approvals' && (
        <div className="card p-6">
          <div className="section-title" style={{ marginBottom: 16 }}>Waiting for respond</div>
          
          {(linkRequests.length === 0 && pendingMechanics.length === 0) ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No requests or pending invitations at the moment.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {/* Incoming Join Requests */}
              {linkRequests.map((req) => (
                <div key={req.id} className="card p-4" style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                        {req.userName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span className="badge badge-orange" style={{ marginRight: 6 }}>Join Request</span>
                        Requested to join workshop: <strong>{req.requestedShop}</strong> · Date: {req.date}
                      </div>
                    </div>
                    <div>
                      {req.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => {
                              if (onApproveLink) onApproveLink(req.id);
                              // Add to mechanics list for visual simulation
                              const isExist = mechanics.some(m => m.name === req.userName);
                              if (!isExist) {
                                setMechanics(prev => [
                                  {
                                    id: `M-${Date.now()}`,
                                    name: req.userName,
                                    phone: '0988777666',
                                    age: 26,
                                    experience: "3 years",
                                    skills: ["Basic motorbike", "Car flooded"],
                                    shift: "Morning (6am–2pm)",
                                    status: 'active',
                                    onDuty: false,
                                    tasks: 0,
                                    rating: 5.0,
                                    joinDate: new Date().toLocaleDateString('vi-VN'),
                                    salary: '8.000.000',
                                    currentTask: null
                                  },
                                  ...prev
                                ]);
                              }
                            }}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => onRejectLink && onRejectLink(req.id)}
                          >
                            Refuse
                          </button>
                        </div>
                      ) : (
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                    background: req.status === 'pending' ? 'rgba(56,189,248,0.1)' : req.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: req.status === 'pending' ? 'var(--cyan-400)' : req.status === 'rejected' ? 'var(--red-400)' : 'var(--green-400)'
                  }}>
                    {req.status === 'pending' ? 'PENDING' : req.status === 'rejected' ? 'REJECTED' : 'ACCEPTED'}
                  </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Outgoing Invitations */}
              {pendingMechanics.map((m) => (
                <div key={m.id} className="card p-4" style={{ border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)' }}>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                        {m.name} {(m.rawEmail || m.rawPhone) ? `(${[m.rawEmail, m.rawPhone].filter(Boolean).join('/')})` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span className="badge badge-blue" style={{ marginRight: 6 }}>Invitation Sent</span>
                        Waiting for user to accept the staff invitation. {m.invitedAt !== 'Unknown' && <span style={{ marginLeft: 4 }}>· Invited at: {m.invitedAt}</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                        background: m.status === 'pending' ? 'rgba(56,189,248,0.1)' : m.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: m.status === 'pending' ? 'var(--cyan-400)' : m.status === 'rejected' ? 'var(--red-400)' : 'var(--green-400)'
                      }}>
                        {m.status === 'pending' ? 'PENDING' : m.status === 'rejected' ? 'REJECTED' : 'ACCEPTED'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suspend Modal */}
      {suspendingStaff && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card p-6" style={{ width: '90%', maxWidth: 400, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              {suspendingStaff.status === 'suspended' ? 'Lift Suspension' : 'Suspend Staff'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              {suspendingStaff.status === 'suspended'
                ? `Are you sure you want to lift the suspension for ${suspendingStaff.name}? They will be able to resume their shifts.`
                : `Are you sure you want to suspend ${suspendingStaff.name}? All their future shifts will be marked as suspended.`
              }
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setSuspendingStaff(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--yellow-500)', color: '#000', fontWeight: 600 }} onClick={confirmSuspend}>
                {suspendingStaff.status === 'suspended' ? 'Lift Suspension' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
