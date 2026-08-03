import React, { useState, useEffect } from 'react';
import { X, Activity, Droplets, Clock, TrendingUp, Cpu, MapPin, AlertTriangle, Calendar, History, BarChart2, Loader, Zap } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { apiService } from '../../services/apiService';

export default function DeviceLifecycleModal({ device, onClose }) {
  const [activeTab, setActiveTab] = useState('history');
  
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState(null);

  const [speedData, setSpeedData] = useState(null);
  const [speedLoading, setSpeedLoading] = useState(true);

  const [logsData, setLogsData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!device) return;

    const id = device.device_code || device._id;
    
    // Fetch History
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await apiService.get(`/iot/devices/${id}/history`);
        if (res.success && res.data) {
          setHistoryData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    // Fetch Speed
    const fetchSpeed = async () => {
      setSpeedLoading(true);
      try {
        const res = await apiService.get(`/iot/devices/${id}/speed-analysis`);
        if (res.success && res.data) {
          setSpeedData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch speed analysis:', err);
      } finally {
        setSpeedLoading(false);
      }
    };

    // Fetch Logs
    const fetchLogs = async () => {
      setLogsLoading(true);
      try {
        const res = await apiService.get(`/iot/devices/${id}/logs`);
        if (res.success && res.data) {
          setLogsData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch device logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchHistory();
    fetchSpeed();
    fetchLogs();

  }, [device]);

  if (!device) return null;

  const tabs = [
    { id: 'history', label: 'Water Level History', icon: Droplets },
    { id: 'speed', label: 'Rising Speed', icon: TrendingUp },
    { id: 'status', label: 'Status & Events', icon: Clock },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, padding: '20px', backgroundColor: 'rgba(8, 13, 22, 0.85)', backdropFilter: 'blur(8px)' }}>
      <style>{`
        .dlm-modal {
          max-width: 960px;
          width: 100%;
          height: 90vh;
          display: flex;
          flex-direction: column;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 14px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
          overflow: hidden;
        }
        .dlm-tabs-nav {
          display: flex;
          gap: 30px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .dlm-tabs-nav::-webkit-scrollbar { display: none; }
        @media (max-width: 600px) {
          .dlm-modal {
            border-radius: 10px;
            height: 95vh;
          }
        }
      `}</style>
      <div className="modal dlm-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header - Redesigned to look premium */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ padding: 10, background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(59,130,246,0.2) 100%)', borderRadius: 10, border: '1px solid rgba(34,211,238,0.4)', boxShadow: '0 0 15px rgba(34,211,238,0.2)' }}>
                <Activity color="#38bdf8" size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
                  Lifecycle & Telemetry
                </h2>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600, marginTop: 4 }}>
                  {device.name || 'IoT Sensor Station'}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: 8, display: 'flex', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150, background: 'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(3,105,161,0.2) 100%)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
              <div style={{ background: 'rgba(14,165,233,0.2)', padding: 8, borderRadius: 8, color: '#38bdf8' }}><Droplets size={18} /></div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>Current Water Level</div>
                <div style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: 900 }}>{device.current_water_level || 0} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#bae6fd' }}>cm</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
          <div className="dlm-tabs-nav">
            {tabs.map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{ 
                  padding: '16px 0', 
                  display: 'flex', 
                  gap: 8, 
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === t.id ? '2px solid #38bdf8' : '2px solid transparent',
                  color: activeTab === t.id ? '#38bdf8' : '#94a3b8',
                  fontWeight: activeTab === t.id ? 700 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <t.icon size={18} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'radial-gradient(circle at top right, rgba(15, 23, 42, 0.9) 0%, rgba(8, 13, 22, 0.95) 100%)' }}>
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Tab 1: History */}
            {activeTab === 'history' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {historyLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: 14 }}>
                    <Loader size={34} className="spin" color="#38bdf8" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading water level history...</span>
                  </div>
                ) : !historyData || !historyData.cycles || historyData.cycles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: 'rgba(30, 41, 59, 0.3)', borderRadius: 12, border: '1px dashed #334155', margin: 'auto' }}>
                    <AlertTriangle size={32} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>No Flood Cycles Found</div>
                    <div style={{ fontSize: '0.9rem' }}>There are currently no recorded flood events for this station.</div>
                  </div>
                ) : selectedCycle ? (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                    <button
                      onClick={() => setSelectedCycle(null)}
                      style={{
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        padding: '6px 14px',
                        borderRadius: 8,
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        marginBottom: 20
                      }}
                    >
                      ← Back to cycles list
                    </button>
                    <div style={{ marginBottom: 16 }}>
                      <h3 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar color="#38bdf8" size={18} /> {selectedCycle.cycle_name}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, fontSize: '0.85rem', color: '#cbd5e1', background: 'rgba(30, 41, 59, 0.6)', padding: 14, borderRadius: 10, border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Start Time</span> <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{selectedCycle.start_time}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>End Time</span> <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{selectedCycle.end_time}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Duration</span> <strong style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>{selectedCycle.duration}</strong></div>
                        <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700 }}>Peak Level</span> <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '1.05rem' }}>{selectedCycle.peak_level_cm} cm</span></div>
                      </div>
                    </div>

                    <div style={{ background: '#080d16', padding: '20px 20px 10px 10px', borderRadius: 14, border: '1px solid #1e293b', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
                      <div style={{ textAlign: 'center', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Water Level Progression (Recent 15 Readings)</div>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={(selectedCycle.data_points || []).slice(-15)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="time" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                          <YAxis stroke="#38bdf8" unit=" cm" tick={{ fill: '#38bdf8', fontSize: 12 }} label={{ value: 'Water Level (cm)', angle: -90, position: 'insideLeft', fill: '#38bdf8', fontSize: 12, fontWeight: 700 }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', fontSize: '0.85rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} cursor={{ fill: 'rgba(56, 189, 248, 0.08)' }} />
                          <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.85rem' }} />
                          <Bar name="Water Level (cm)" dataKey="waterLevel" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <History size={18} color="#38bdf8" />
                      Select a flood cycle below to view detailed analytics:
                    </div>
                    {historyData.cycles.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCycle(c)}
                        style={{
                          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                          border: '1px solid #334155',
                          borderRadius: 12,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 18px -5px rgba(56, 189, 248, 0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2)'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ padding: 6, background: 'rgba(56, 189, 248, 0.15)', borderRadius: 8, color: '#38bdf8' }}>
                              <Calendar size={18} />
                            </div>
                            <strong style={{ color: '#f8fafc', fontSize: '1.05rem', letterSpacing: 0.2 }}>{c.cycle_name}</strong>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, marginLeft: 36 }}>
                            <span style={{ color: '#64748b' }}>From:</span> <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.start_time}</span> &nbsp;➝&nbsp; <span style={{ color: '#64748b' }}>To:</span> <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{c.end_time}</span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginLeft: 36 }}>
                            ⏱️ Duration: <span style={{ color: '#94a3b8' }}>{c.duration}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.2) 100%)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            padding: '4px 12px',
                            borderRadius: 16,
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            Peak: {c.peak_level_cm} cm
                          </div>
                          <div style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BarChart2 size={15} /> View Analytics →
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Speed */}
            {activeTab === 'speed' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {speedLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 14 }}>
                    <Loader size={36} color="#f97316" className="spin" />
                    <span style={{ color: '#94a3b8', fontSize: '0.95rem', fontWeight: 500 }}>Loading speed data...</span>
                  </div>
                ) : !speedData ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                    <AlertTriangle size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>No rising speed data available for this station.</p>
                  </div>
                ) : (
                  <>
                    {/* Hero Speed Display Card */}
                    <div style={{
                      position: 'relative',
                      background: speedData.is_warning
                        ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(153,27,27,0.25) 100%)'
                        : 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(15,23,42,0.8) 100%)',
                      border: `1px solid ${speedData.is_warning ? '#ef4444' : 'rgba(249,115,22,0.4)'}`,
                      borderRadius: 16,
                      padding: '28px 32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 20,
                      boxShadow: speedData.is_warning ? '0 0 30px rgba(239,68,68,0.2)' : '0 10px 25px rgba(0,0,0,0.3)'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={16} color={speedData.is_warning ? '#ef4444' : '#fb923c'} /> Recorded Rising Speed
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                          <span style={{ fontSize: '3.6rem', fontWeight: 900, color: speedData.is_warning ? '#ef4444' : '#fb923c', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                            {speedData.current_speed}
                          </span>
                          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#cbd5e1' }}>cm/min</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                        <div style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: speedData.is_warning ? '#ef4444' : '#22c55e',
                          color: '#ffffff',
                          boxShadow: speedData.is_warning ? '0 0 15px rgba(239,68,68,0.5)' : '0 0 15px rgba(34,197,94,0.3)'
                        }}>
                          {speedData.is_warning ? '🚨 THRESHOLD EXCEEDED' : '🛡️ WITHIN SAFE LIMITS'}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                          System warning threshold: <strong style={{ color: '#38bdf8' }}>{speedData.speed_threshold} cm/min</strong>
                        </div>
                      </div>
                    </div>

                    {/* Table History - Improved intuitive UI */}
                    <div style={{ background: '#0f172a', borderRadius: 14, border: '1px solid #1e293b', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                      <div style={{ padding: '16px 24px', background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <History size={18} color="#38bdf8" /> Recent Speed Readings
                        </div>
                        <span style={{ fontSize: '0.8rem', background: '#38bdf820', color: '#38bdf8', border: '1px solid #38bdf850', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                          {speedData.speed_history?.length || 0} Records
                        </span>
                      </div>

                      <div style={{ overflowY: 'auto', flex: 1, maxHeight: '350px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(30,41,59,0.5)', color: '#94a3b8', borderBottom: '2px solid #334155', position: 'sticky', top: 0, zIndex: 1 }}>
                              <th style={{ padding: '14px 24px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>Timestamp</th>
                              <th style={{ padding: '14px 24px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>Water Level</th>
                              <th style={{ padding: '14px 24px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: 0.5 }}>Rising Speed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {speedData.speed_history && speedData.speed_history.length > 0 ? (
                              speedData.speed_history.map((item, idx) => {
                                const isDanger = item.speed >= speedData.speed_threshold;
                                return (
                                  <tr key={idx} style={{ 
                                    borderBottom: '1px solid #1e293b', 
                                    transition: 'background 0.2s',
                                    background: isDanger ? 'rgba(239,68,68,0.05)' : 'transparent'
                                  }} 
                                  onMouseEnter={(e) => e.currentTarget.style.background = isDanger ? 'rgba(239,68,68,0.1)' : 'rgba(56,189,248,0.05)'} 
                                  onMouseLeave={(e) => e.currentTarget.style.background = isDanger ? 'rgba(239,68,68,0.05)' : 'transparent'}
                                  >
                                    <td style={{ padding: '16px 24px', color: '#cbd5e1', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                      {item.time}
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#e2e8f0' }}>
                                      <span style={{ fontWeight: 700 }}>{item.waterLevel}</span> <span style={{ color: '#64748b', fontSize: '0.85rem' }}>cm</span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '4px 12px',
                                        borderRadius: 8,
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                        background: isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                                        color: isDanger ? '#ef4444' : '#22c55e',
                                        border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
                                      }}>
                                        {isDanger && <AlertTriangle size={14} />}
                                        {item.speed} <span style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>cm/min</span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                    <History size={32} style={{ opacity: 0.3 }} />
                                    <span>No data recorded for this cycle yet.</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 3: Status & Events (Logs) */}
            {activeTab === 'status' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 20, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle color="#f59e0b" size={20} /> System Event Log
                </div>
                
                {logsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', gap: 14 }}>
                    <Loader size={34} className="spin" color="#38bdf8" />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Loading event logs...</span>
                  </div>
                ) : logsData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8', background: 'rgba(30, 41, 59, 0.3)', borderRadius: 12, border: '1px dashed #334155' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>No Events Recorded</div>
                    <div style={{ fontSize: '0.9rem' }}>The system has not recorded any significant events or warnings for this station.</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 14, padding: '24px 30px', border: '1px solid #1e293b', flex: 1, overflowY: 'auto' }}>
                    <div style={{ position: 'relative', paddingLeft: 30 }}>
                      <div style={{ position: 'absolute', left: 8, top: 10, bottom: 10, width: 2, background: '#334155' }}></div>
                      
                      {logsData.map((item, i) => (
                        <div key={i} style={{ position: 'relative', marginBottom: 28 }}>
                          <div style={{ 
                            position: 'absolute', left: -27, top: 4, width: 12, height: 12, borderRadius: '50%', 
                            background: item.status === 'success' ? '#22c55e' : item.status === 'warning' ? '#f59e0b' : item.status === 'error' ? '#ef4444' : '#38bdf8',
                            boxShadow: `0 0 12px ${item.status === 'success' ? '#22c55e' : item.status === 'warning' ? '#f59e0b' : item.status === 'error' ? '#ef4444' : '#38bdf8'}`,
                            border: '2px solid #0f172a'
                          }}></div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{item.time}</div>
                          <div style={{ fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700, marginBottom: 6 }}>{item.event}</div>
                          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>{item.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
