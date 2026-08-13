import React, { useState, useEffect, useContext } from 'react';
import { Trophy, Star, Gift, Save, Plus, Trash2, ArrowUpRight, ArrowDownRight, UserPlus, CheckCircle, XCircle, Send, Search } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { AuthContext } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';

const leaderboardSeed = [
  { rank: 1, name: 'Nguyen Van An', district: 'Quan 12', points: 1240, badge: 'HERO' },
  { rank: 2, name: 'Tran Thi Binh', district: 'Hoc Mon', points: 1095, badge: 'SUPPORT' },
  { rank: 3, name: 'Le Minh Chau', district: 'Thu Duc', points: 980, badge: 'VOLUNTEER' },
  { rank: 4, name: 'Hoang Minh Tuan', district: 'Binh Thanh', points: 910, badge: 'REPORTER' },
  { rank: 5, name: 'Nguyen Thi Lan', district: 'Quan 7', points: 870, badge: 'COMMUNITY' },
];

const rewardSeed = [
  { id: 'rw-01', name: '50k repair voucher', points: 120, badge: 'BRONZE' },
  { id: 'rw-02', name: 'Free rescue support package', points: 250, badge: 'SILVER' },
  { id: 'rw-03', name: 'Community event ticket', points: 400, badge: 'GOLD' },
];

const policySeed = {
  reportSubmit: 3,
  reportVerifiedLight: 8,
  reportVerifiedMedium: 12,
  reportVerifiedSerious: 20,
  volunteerAssist: 20,
  workshopAssist: 8,
  falseReportPenalty: -15,
  reportFeedback: 2,
};

function PolicySlider({ label, value, min, max, unit, color, onChange, disabled }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color, fontSize: '1rem' }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, var(--bg-elevated) ${pct}%, var(--bg-elevated) 100%)`,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      />
      <div className="flex justify-between" style={{ marginTop: 4 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{min}{unit}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function PointsManagement() {
  const { role } = useContext(AuthContext);
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [policy, setPolicy] = useState(policySeed);
  const [rewards, setRewards] = useState([]);
  const [newReward, setNewReward] = useState({ name: '', points: '', badge: '' });
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [rewardToDelete, setRewardToDelete] = useState(null);

  const [users, setUsers] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sendingReward, setSendingReward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }));
  };

  useEffect(() => {
    apiService.get('/admin/points-config')
      .then(res => {
        if (res.success && res.data) {
          setPolicy({
            reportSubmit: res.data.points_report_submit || 3,
            reportVerifiedLight: res.data.points_report_verified_light || 8,
            reportVerifiedMedium: res.data.points_report_verified_medium || 12,
            reportVerifiedSerious: res.data.points_report_verified_serious || 20,
            volunteerAssist: res.data.points_volunteer_assist || 20,
            workshopAssist: res.data.points_workshop_assist || 8,
            falseReportPenalty: res.data.points_false_report_penalty || -15,
            reportFeedback: res.data.points_report_feedback || 2,
          });
        }
      })
      .catch(console.error);

    apiService.get('/admin/rewards')
      .then(res => {
        if (res.success) setRewards(res.data);
      })
      .catch(console.error);
  }, []);

  const addReward = async () => {
    if (!newReward.name || !newReward.points) return showToast('Enter name and reward points', 'error');
    try {
      const res = await apiService.post('/admin/rewards', {
        name: newReward.name,
        points_cost: Number(newReward.points),
        description: newReward.badge ? `Badge: ${newReward.badge}` : '',
        stock: -1
      });
      if (res.success) {
        setRewards([res.data, ...rewards]);
        setNewReward({ name: '', points: '', badge: '' });
        showToast('Reward added successfully!');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to add reward', 'error');
    }
  };

  const removeReward = (id) => {
    setRewardToDelete(id);
  };

  const executeRemoveReward = async (id) => {
    try {
      setSaving(true);
      await apiService.delete(`/admin/rewards/${id}`);
      setRewards(rewards.filter(r => r._id !== id));
      showToast('Reward deleted successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to delete reward', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      await apiService.put('/admin/points-config', {
        points_report_submit: policy.reportSubmit,
        points_report_verified_light: policy.reportVerifiedLight,
        points_report_verified_medium: policy.reportVerifiedMedium,
        points_report_verified_serious: policy.reportVerifiedSerious,
        points_volunteer_assist: policy.volunteerAssist,
        points_workshop_assist: policy.workshopAssist,
        points_false_report_penalty: policy.falseReportPenalty,
        points_report_feedback: policy.reportFeedback,
      });
      showToast('Policy saved successfully!');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to save policy', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openSendModal = async (reward) => {
    setSelectedReward(reward);
    setSelectedUsers([]);
    setSearchQuery('');
    try {
      const res = await apiService.get('/admin/users');
      if (res.success && res.users) {
        // filter out Admin and Manager
        const filtered = res.users.filter(u => u.role && u.role.toLowerCase() !== 'admin' && u.role.toLowerCase() !== 'manager');
        setUsers(filtered);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch users for sending reward', 'error');
    }
  };

  const closeSendModal = () => {
    setSelectedReward(null);
    setSelectedUsers([]);
  };

  const handleSendReward = async () => {
    if (selectedUsers.length === 0) return showToast('Please select at least one user', 'error');
    setSendingReward(true);
    try {
      const res = await apiService.post(`/admin/rewards/${selectedReward._id}/send`, { userIds: selectedUsers });
      if (res.success) {
        showToast(res.message || 'Reward sent successfully!');
        closeSendModal();
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send reward', 'error');
    } finally {
      setSendingReward(false);
    }
  };

  const toggleUserSelect = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.name && u.name.toLowerCase().includes(q)) || 
           (u.email && u.email.toLowerCase().includes(q)) || 
           (u.phone && u.phone.toLowerCase().includes(q));
  });

  return (
    <div className="page-enter">
      <div className="page-header">
        <h1>Points Management & Leaderboard</h1>
        <p>Leaderboard, points policy and rewards</p>
      </div>

      <div className="tabs-nav" style={{ marginBottom: 16, maxWidth: 720 }}>
        <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          <Trophy size={13} /> Leaderboard
        </button>
        <button className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`} onClick={() => setActiveTab('policy')}>
          <Star size={13} /> Points policy
        </button>
        <button className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
          <Gift size={13} /> Rewards
        </button>
      </div>

      {activeTab === 'leaderboard' && (
        <div className="card table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Area</th>
                <th>Points</th>
                <th>Badge</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardSeed.map(row => (
                <tr key={row.rank}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>#{row.rank}</td>
                  <td style={{ fontWeight: 700 }}>{row.name}</td>
                  <td>{row.district}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-400)', fontWeight: 700 }}>{row.points}</td>
                  <td><span className="badge badge-cyan">{row.badge}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'policy' && (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 16 }}>Points addition policy</div>
            
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <PolicySlider label="New report" value={policy.reportSubmit} min={1} max={5} unit=" pts" color="var(--blue-400)" onChange={(v) => setPolicy(prev => ({ ...prev, reportSubmit: v }))} disabled={!isAdmin} />
                <PolicySlider label="Verified report (Light)" value={policy.reportVerifiedLight} min={5} max={15} unit=" pts" color="var(--green-400)" onChange={(v) => setPolicy(prev => ({ ...prev, reportVerifiedLight: v }))} disabled={!isAdmin} />
                <PolicySlider label="Verified report (Medium)" value={policy.reportVerifiedMedium} min={5} max={25} unit=" pts" color="var(--green-500)" onChange={(v) => setPolicy(prev => ({ ...prev, reportVerifiedMedium: v }))} disabled={!isAdmin} />
                <PolicySlider label="Verified report (Serious)" value={policy.reportVerifiedSerious} min={10} max={40} unit=" pts" color="var(--green-600)" onChange={(v) => setPolicy(prev => ({ ...prev, reportVerifiedSerious: v }))} disabled={!isAdmin} />
              </div>
              <div>
                <PolicySlider label="Report vote feedback" value={policy.reportFeedback} min={1} max={5} unit=" pts" color="var(--purple-400)" onChange={(v) => setPolicy(prev => ({ ...prev, reportFeedback: v }))} disabled={!isAdmin} />
                <PolicySlider label="Rescue support" value={policy.volunteerAssist} min={5} max={40} unit=" pts" color="var(--orange-400)" onChange={(v) => setPolicy(prev => ({ ...prev, volunteerAssist: v }))} disabled={!isAdmin} />
                <PolicySlider label="Workshop support" value={policy.workshopAssist} min={5} max={20} unit=" pts" color="var(--cyan-400)" onChange={(v) => setPolicy(prev => ({ ...prev, workshopAssist: v }))} disabled={!isAdmin} />
                <PolicySlider label="False report penalty" value={policy.falseReportPenalty} min={-30} max={-5} unit=" pts" color="var(--red-400)" onChange={(v) => setPolicy(prev => ({ ...prev, falseReportPenalty: v }))} disabled={!isAdmin} />
              </div>
            </div>

            {isAdmin && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={savePolicy} disabled={saving}>
                  {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save policy</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="grid" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
          <div className="card table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rewards</th>
                  <th>Points</th>
                  <th>Badge</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map(r => {
                  const badgeMatch = r.description?.match(/Badge:\s*(.+)/);
                  const badgeText = badgeMatch ? badgeMatch[1] : '';
                  return (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan-400)', fontWeight: 700 }}>{r.points_cost}</td>
                      <td>{badgeText ? <span className="badge badge-cyan">{badgeText}</span> : '-'}</td>
                      <td>
                        <button className="btn btn-primary btn-sm" style={{ marginRight: 8 }} onClick={() => openSendModal(r)}><Gift size={12} style={{ marginRight: 4 }}/> Send</button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-sm" onClick={() => removeReward(r._id)}><Trash2 size={12} /> Delete</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="card p-6">
              <div className="section-title" style={{ marginBottom: 12 }}>Add reward</div>
              <input className="input" placeholder="Reward name" value={newReward.name} onChange={(e) => setNewReward(prev => ({ ...prev, name: e.target.value }))} />
              <input className="input" type="number" placeholder="Contribution Point" style={{ marginTop: 8 }} value={newReward.points} onChange={(e) => setNewReward(prev => ({ ...prev, points: e.target.value }))} />
              <input className="input" placeholder="Badge (optional)" style={{ marginTop: 8 }} value={newReward.badge} onChange={(e) => setNewReward(prev => ({ ...prev, badge: e.target.value }))} />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={addReward}><Plus size={12} /> Add reward</button>
            </div>
          )}
        </div>
      )}

      {/* Send Reward Modal */}
      {selectedReward && (
        <div className="modal-overlay" onClick={closeSendModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card p-6" style={{ width: '95%', maxWidth: 1100, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
              <div className="section-title">Send Reward: {selectedReward.name}</div>
              <button className="btn btn-ghost" onClick={closeSendModal}><XCircle size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                className="input" 
                placeholder="Search by name, email or phone..." 
                style={{ paddingLeft: 36, width: '100%' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-dim)', borderRadius: 'var(--r-md)' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 40 }}><input type="checkbox" checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length} onChange={toggleAllUsers} /></th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px 0' }}>No eligible users found.</td></tr>
                  ) : filteredUsers.map(u => {
                    const r = (u.role || '').toLowerCase();
                    let bgColor = 'rgba(59,130,246,0.15)';
                    let color = '#3b82f6';
                    let label = 'User';
                    
                    if (r === 'volunteer') {
                      bgColor = 'rgba(239,68,68,0.15)';
                      color = '#ef4444';
                      label = 'Volunteer';
                    } else if (r.includes('workshop')) {
                      bgColor = 'rgba(234,179,8,0.15)';
                      color = '#eab308';
                      label = r === 'workshop_staff' ? 'Workshop (Staff)' : 'Workshop (Owner)';
                    }
                    
                    return (
                      <tr key={u.id} onClick={() => toggleUserSelect(u.id)} style={{ cursor: 'pointer' }}>
                        <td><input type="checkbox" checked={selectedUsers.includes(u.id)} readOnly /></td>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: bgColor, color: color, whiteSpace: 'nowrap'
                          }}>
                            {label}
                          </span>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone === 'None' || !u.phone ? '-' : u.phone}</td>
                        <td style={{ color: 'var(--cyan-400)', fontWeight: 700 }}>{u.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center" style={{ marginTop: 20 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUsers.length} user(s) selected</span>
              <button className="btn btn-primary" onClick={handleSendReward} disabled={sendingReward || selectedUsers.length === 0}>
                {sendingReward ? 'Sending...' : 'Send Reward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: 80, right: 24, zIndex: 9999,
          background: toastType === 'error' ? 'var(--red-400)' : 'var(--green-400)',
          color: 'white', padding: '12px 20px', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontWeight: 500, fontSize: '0.9rem',
          animation: 'slideUp 0.3s ease-out'
        }}>
          {toastType === 'error' ? <XCircle size={18} /> : <CheckCircle size={18} />}
          {toastMessage}
        </div>
      )}
      <ConfirmModal
        isOpen={!!rewardToDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this reward?"
        loading={saving}
        onConfirm={async () => {
          const id = rewardToDelete;
          await executeRemoveReward(id);
          setRewardToDelete(null);
        }}
        onCancel={() => setRewardToDelete(null)}
      />
    </div>
  );
}
