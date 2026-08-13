import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CloudLightning, Save, CheckCircle, Edit3, X, Trash2 } from 'lucide-react';
import { apiService } from '../../../services/apiService';

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDateObj = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateDDMMYYYY = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy}`;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const STAFF_COLORS = [
  { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399' }, // Emerald
  { bg: 'rgba(96, 165, 250, 0.15)', text: '#60a5fa' }, // Blue
  { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6' }, // Pink
  { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa' }, // Purple
  { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },  // Amber
  { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' }, // Red
  { bg: 'rgba(45, 212, 191, 0.15)', text: '#2dd4bf' },  // Teal
  { bg: 'rgba(251, 146, 60, 0.15)', text: '#fb923c' },  // Orange
];

export default function ShiftScheduleMatrix({ staffList = [], isOwner = false }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [templates, setTemplates] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const [assignments, setAssignments] = useState([]); // Array of { shiftTemplateId, staffId, date: 'YYYY-MM-DD' }
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [saving, setSaving] = useState(false);
  const setToast = (obj) => {
    if (!obj) return;
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: obj.message,
        type: obj.type || 'info'
      }
    }));
  };
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [duplicateWeeks, setDuplicateWeeks] = useState(1);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const currentWeekEnd = addDays(currentWeekStart, 6);
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));

  useEffect(() => {
    fetchTemplatesAndSchedule();
  }, [currentWeekStart]);

  const fetchTemplatesAndSchedule = async () => {
    try {
      const tplRes = await apiService.get('/workshops/me/shifts/templates');
      setTemplates(tplRes || []);

      const startStr = formatDateObj(currentWeekStart);
      const endStr = formatDateObj(currentWeekEnd);
      const schedRes = await apiService.get(`/workshops/me/shifts/weekly?startDate=${startStr}&endDate=${endStr}`);

      if (schedRes && schedRes.schedule) {
        setScheduleData(schedRes.schedule);

        if (schedRes.assignments) {
          const mapped = schedRes.assignments.map(a => ({
            shiftTemplateId: a.shiftTemplateId,
            staffId: a.staffId._id || a.staffId,
            date: a.date,
            status: a.status
          }));
          setAssignments(mapped);
        } else {
          setAssignments([]);
        }
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
    }
  };

  const handlePreviousWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const handleNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  const handleCellClick = (templateId, dateStr) => {
    if (!isOwner) {
      setToast({ type: 'error', message: 'Only Workshop Owner can edit the schedule.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const todayStr = formatDateObj(new Date());
    if (dateStr < todayStr) {
      setToast({ type: 'error', message: 'Cannot edit schedule for past days.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    if (!selectedStaffId) {
      setToast({ type: 'error', message: 'Please select a staff member to assign.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Check if assignment already exists
    const existingIndex = assignments.findIndex(a =>
      a.shiftTemplateId === templateId &&
      a.date === dateStr &&
      a.staffId === selectedStaffId
    );

    if (existingIndex >= 0) {
      // Remove it
      setAssignments(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add it
      setAssignments(prev => [...prev, { shiftTemplateId: templateId, staffId: selectedStaffId, date: dateStr }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.post('/workshops/me/shifts/weekly', {
        startDate: formatDateObj(currentWeekStart),
        endDate: formatDateObj(currentWeekEnd),
        assignments,
        duplicateWeeks: applyToFuture ? duplicateWeeks : 0
      });
      setToast({ type: 'success', message: 'Schedule saved successfully!' });
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to save schedule.' });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemoveSchedule = async () => {
    setRemoving(true);
    try {
      const todayStr = formatDateObj(new Date());
      const pastAssignments = assignments.filter(a => a.date < todayStr);

      await apiService.post('/workshops/me/shifts/weekly', {
        startDate: formatDateObj(currentWeekStart),
        endDate: formatDateObj(currentWeekEnd),
        assignments: pastAssignments,
        duplicateWeeks: 0
      });
      setAssignments(pastAssignments);
      setToast({ type: 'success', message: 'Schedule deleted successfully!' });
      setConfirmRemove(false);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to delete schedule.' });
    }
    setRemoving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const getDeleteDateText = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const weekEnd = new Date(currentWeekEnd);
    weekEnd.setHours(0,0,0,0);
    const weekStart = new Date(currentWeekStart);
    weekStart.setHours(0,0,0,0);

    let startDelete = weekStart < today ? today : weekStart;
    
    if (startDelete > weekEnd) {
       return "past dates (nothing will be deleted)";
    }

    if (startDelete.getTime() === weekEnd.getTime()) {
       return formatDateDDMMYYYY(startDelete);
    } else {
       return `${formatDateDDMMYYYY(startDelete)} to ${formatDateDDMMYYYY(weekEnd)}`;
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    setSavingTemplate(true);
    try {
      await apiService.put(`/workshops/me/shifts/templates/${editingTemplate._id}`, {
        startTime: editingTemplate.startTime,
        endTime: editingTemplate.endTime
      });
      setToast({ type: 'success', message: 'Shift time updated!' });
      setEditingTemplate(null);
      fetchTemplatesAndSchedule();
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to update shift time.' });
    }
    setSavingTemplate(false);
    setTimeout(() => setToast(null), 3000);
  };

  const calculateHours = (template) => {
    if (template.type === 'fixed') return 8;
    if (template.type === 'on-call') return 8;
    if (template.type === 'flex') return 4;
    return 8;
  };

  // Compute staff stats
  const staffStats = staffList.map(staff => {
    const staffAssignments = assignments.filter(a => a.staffId === staff.userId && a.status !== 'suspended');
    let ftCount = 0;
    let flexCount = 0;
    let oncallCount = 0;
    let totalHours = 0;

    staffAssignments.forEach(a => {
      const t = templates.find(tpl => tpl._id === a.shiftTemplateId);
      if (t) {
        if (t.type === 'fixed') ftCount++;
        else if (t.type === 'flex') flexCount++;
        else if (t.type === 'on-call') oncallCount++;
        totalHours += calculateHours(t);
      }
    });

    return { ...staff, ftCount, flexCount, oncallCount, totalHours };
  });

  const getStaffInitials = (name, index) => {
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      const secondLast = parts[parts.length - 2];
      return `${secondLast[0].toUpperCase()}. ${last} (${index + 1})`;
    }
    return `${name} (${index + 1})`;
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>


      {/* Top Header Section */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
              STORM SEASON SHIFT SCHEDULE - WEEK {formatDateDDMMYYYY(currentWeekStart)} to {formatDateDDMMYYYY(currentWeekEnd)}
            </h2>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handlePreviousWeek}
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer' }}
              >
                <ChevronLeft size={16} /> Prev Week
              </button>
              <button
                onClick={handleNextWeek}
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 6, cursor: 'pointer' }}
              >
                Next Week <ChevronRight size={16} />
              </button>
            </div>
            
            {isOwner && (
              <button
                onClick={() => setConfirmRemove(true)}
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </div>
        {/* Spacer to align with sidebar */}
        <div style={{ width: 300, flexShrink: 0 }}></div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Matrix Table */}
          <div style={{ overflowX: 'auto', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: 700 }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '12px', borderBottom: '1px solid var(--border-dim)', borderRight: '1px solid var(--border-dim)', width: '4%' }}>Shift</th>
                  {daysOfWeek.map((d, i) => (
                    <th key={i} style={{ padding: '12px', borderBottom: '1px solid var(--border-dim)', borderRight: '1px solid var(--border-dim)', textAlign: 'center', width: '12%' }}>
                      <div>{dayNames[d.getDay()]}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({d.getMonth() + 1}/{d.getDate()})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map(tpl => {
                  const name = tpl.name.replace(' On-call', '\nOn\u2011call');
                  const type = tpl.type.replace('-', '\u2011');
                  return (
                    <tr key={tpl._id}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-dim)', borderRight: '1px solid var(--border-dim)', fontWeight: 600 }}>
                        <div style={{ cursor: isOwner ? 'pointer' : 'default', whiteSpace: 'pre-wrap' }} onClick={() => isOwner && setEditingTemplate(tpl)}>
                          <div style={{ fontSize: '0.85rem' }}>{name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({type})</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {tpl.startTime}-{tpl.endTime}
                            {isOwner && <Edit3 size={12} color="var(--text-muted)" />}
                          </div>
                        </div>
                      </td>
                      {daysOfWeek.map((d, i) => {
                        const dateStr = formatDateObj(d);
                        const cellAssignments = assignments.filter(a => a.shiftTemplateId === tpl._id && a.date === dateStr);

                        return (
                          <td
                            key={`${tpl._id}-${dateStr}`}
                            onClick={() => handleCellClick(tpl._id, dateStr)}
                            style={{
                              padding: '6px',
                              borderBottom: '1px solid var(--border-dim)',
                              borderRight: '1px solid var(--border-dim)',
                              verticalAlign: 'top',
                              minHeight: 60,
                              cursor: selectedStaffId ? 'pointer' : 'default',
                              background: selectedStaffId ? 'rgba(255,255,255,0.02)' : 'transparent'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {cellAssignments.map((a, idx) => {
                                const staffIndex = staffList.findIndex(s => s.userId === a.staffId);
                                const staff = staffList[staffIndex];
                                const staffColor = STAFF_COLORS[staffIndex % STAFF_COLORS.length];
                                if (!staff) return null;
                                const isSuspended = a.status === 'suspended' || staff.status === 'suspended';
                                return (
                                  <div key={idx} style={{
                                    background: isSuspended ? 'rgba(156, 163, 175, 0.15)' : staffColor.bg,
                                    color: isSuspended ? '#9ca3af' : staffColor.text,
                                    padding: '4px 6px',
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    textDecoration: isSuspended ? 'line-through' : 'none',
                                    opacity: isSuspended ? 0.7 : 1
                                  }} title={isSuspended ? 'Suspended' : ''}>
                                    {getStaffInitials(staff.name, staffIndex)}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Assignment Bar under Matrix */}
          {isOwner && (
            <div style={{ marginTop: 20, background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>Staff available to assign:</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {staffList.map((staff, idx) => {
                    if (staff.status === 'suspended') return null;
                    const staffColor = STAFF_COLORS[idx % STAFF_COLORS.length];
                    return (
                      <div
                        key={staff.id}
                        onClick={() => setSelectedStaffId(selectedStaffId === staff.userId ? null : staff.userId)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: selectedStaffId === staff.userId ? `2px solid ${staffColor.text}` : '1px solid var(--border-dim)',
                          background: selectedStaffId === staff.userId ? staffColor.bg : 'var(--bg-surface)',
                          color: selectedStaffId === staff.userId ? staffColor.text : 'var(--text-primary)',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: staffColor.text }}></div>
                        {getStaffInitials(staff.name, idx)}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={applyToFuture}
                    onChange={e => setApplyToFuture(e.target.checked)}
                    style={{ accentColor: '#34d399', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  Apply to next
                  <select
                    value={duplicateWeeks}
                    onChange={e => setDuplicateWeeks(parseInt(e.target.value))}
                    style={{
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                  weeks
                </label>

                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  <Save size={18} />
                  {saving ? 'SAVING...' : 'SAVE SCHEDULE'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Reports */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Report 1: Count */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 16 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: 0, marginBottom: 12, textAlign: 'center', textTransform: 'uppercase' }}>STAFF AND SHIFT REPORT</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Staff</th>
                  <th style={{ padding: '6px 4px' }}>FT</th>
                  <th style={{ padding: '6px 4px' }}>Flex</th>
                  <th style={{ padding: '6px 4px' }}>On-call</th>
                  <th style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.05)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px dotted var(--border-dim)' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'left' }}>{getStaffInitials(s.name, idx)}</td>
                    <td style={{ padding: '6px 4px' }}>{s.ftCount}</td>
                    <td style={{ padding: '6px 4px' }}>{s.flexCount}</td>
                    <td style={{ padding: '6px 4px' }}>{s.oncallCount}</td>
                    <td style={{ padding: '6px 4px', background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>{s.ftCount + s.flexCount + s.oncallCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Report 2: Hours */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 16 }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, marginTop: 0, marginBottom: 12, textAlign: 'center', textTransform: 'uppercase' }}>Total hours/Week</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <th style={{ padding: '6px 4px', textAlign: 'left' }}>Staff</th>
                  <th style={{ padding: '6px 4px' }}>FT</th>
                  <th style={{ padding: '6px 4px' }}>Flex</th>
                  <th style={{ padding: '6px 4px' }}>On-call</th>
                  <th style={{ padding: '6px 4px', background: 'rgba(52, 211, 153, 0.1)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px dotted var(--border-dim)' }}>
                    <td style={{ padding: '6px 4px', textAlign: 'left' }}>{getStaffInitials(s.name, idx)}</td>
                    <td style={{ padding: '6px 4px' }}>{s.ftCount * 8}</td>
                    <td style={{ padding: '6px 4px' }}>{s.flexCount * 4}</td>
                    <td style={{ padding: '6px 4px' }}>{s.oncallCount * 8}</td>
                    <td style={{ padding: '6px 4px', background: 'rgba(52, 211, 153, 0.1)', fontWeight: 700, color: '#34d399' }}>{s.totalHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Template Overlay */}
      {editingTemplate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 16, padding: 24, width: '90%', maxWidth: 400,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Edit Shift Time</h3>
              <button onClick={() => setEditingTemplate(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Shift Name</div>
              <div style={{ background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 8, color: 'var(--text-muted)' }}>{editingTemplate.name}</div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Start Time</div>
                <input
                  type="time"
                  value={editingTemplate.startTime}
                  onChange={e => setEditingTemplate({ ...editingTemplate, startTime: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    color: 'white', padding: '10px 14px', borderRadius: 8, outline: 'none'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>End Time</div>
                <input
                  type="time"
                  value={editingTemplate.endTime}
                  onChange={e => setEditingTemplate({ ...editingTemplate, endTime: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                    color: 'white', padding: '10px 14px', borderRadius: 8, outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              style={{
                width: '100%', background: 'white', color: 'black', border: 'none',
                padding: '12px', borderRadius: 8, fontWeight: 800, fontSize: '1rem',
                cursor: savingTemplate ? 'not-allowed' : 'pointer', opacity: savingTemplate ? 0.7 : 1
              }}
            >
              {savingTemplate ? 'SAVING...' : 'SAVE TIME'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Remove Modal */}
      {confirmRemove && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 12, width: 400, maxWidth: '90%', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>Delete Schedule</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to delete the schedule for {getDeleteDateText()}?
              {new Date(currentWeekStart) < new Date(new Date().setHours(0,0,0,0)) && new Date(currentWeekEnd) >= new Date(new Date().setHours(0,0,0,0)) && (
                " Assignments for past days will be kept."
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setConfirmRemove(false)}
                disabled={removing}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-primary)', borderRadius: 6, cursor: removing ? 'not-allowed' : 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleRemoveSchedule}
                disabled={removing}
                style={{ padding: '8px 16px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: 6, fontWeight: 700, cursor: removing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {removing ? 'Deleting...' : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
