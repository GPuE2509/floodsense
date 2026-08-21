import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { Plus, Edit, Trash2, Shield, Phone, AlertTriangle, Heart, Car, Activity, X, Info, Baby, LifeBuoy, FireExtinguisher, Waves, HeartPulse, Truck, ChevronDown, Loader } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

const ICON_MAP = {
  'info': Info,
  'phone': Phone,
  'shield': Shield,
  'alert': AlertTriangle,
  'heart': Heart,
  'car': Car,
  'activity': Activity,
  'baby': Baby,
  'lifebuoy': LifeBuoy,
  'fire': FireExtinguisher,
  'waves': Waves,
  'heartpulse': HeartPulse,
  'truck': Truck
};

const ICONS_LIST = [
  { value: 'info', label: 'Info' },
  { value: 'phone', label: 'Phone' },
  { value: 'shield', label: 'Shield' },
  { value: 'alert', label: 'Alert' },
  { value: 'heart', label: 'Heart' },
  { value: 'car', label: 'Car' },
  { value: 'activity', label: 'Activity' },
  { value: 'baby', label: 'Baby (Child)' },
  { value: 'lifebuoy', label: 'LifeBuoy (Rescue)' },
  { value: 'fire', label: 'Fire' },
  { value: 'waves', label: 'Waves (Flood)' },
  { value: 'heartpulse', label: 'Medical (Heart)' },
  { value: 'truck', label: 'Truck (Traffic)' },
  { value: 'other', label: 'Other (Custom SVG)' }
];

export default function ManagerGuidelines() {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showIconDropdown, setShowIconDropdown] = useState(false);
  const [focusedTipIndex, setFocusedTipIndex] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null });

  // Form State
  const [formData, setFormData] = useState({
    type: 'hotline',
    title: '',
    phone_number: '',
    description: '',
    tips: [''],
    is_active: true,
    icon: 'info',
    customIconSvg: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    try {
      const data = await apiService.getAdminEmergencyGuidelines();
      setGuidelines(data.data || data);
    } catch (err) {
      console.error('Failed to fetch guidelines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTip = () => {
    setFormData({ ...formData, tips: [...formData.tips, ''] });
  };

  const handleTipChange = (index, value) => {
    const newTips = [...formData.tips];
    newTips[index] = value;
    setFormData({ ...formData, tips: newTips });
  };

  const handleRemoveTip = (index) => {
    const newTips = formData.tips.filter((_, i) => i !== index);
    setFormData({ ...formData, tips: newTips });
  };

  const handleEdit = (g) => {
    let iconVal = g.icon || 'info';
    let customSvg = '';

    // Map legacy Flutter icon strings to new Lucide icon keys
    const legacyMap = {
      'Icons.warning': 'alert',
      'Icons.car_crash': 'car',
      'Icons.shield': 'shield',
      'Icons.local_hospital': 'heart',
      'Icons.call': 'phone',
      'Icons.health_and_safety': 'activity',
      'Icons.info': 'info'
    };
    if (legacyMap[iconVal]) {
      iconVal = legacyMap[iconVal];
    }

    if (iconVal.startsWith('<svg')) {
      customSvg = iconVal;
      iconVal = 'other';
    } else if (!ICON_MAP[iconVal]) {
      iconVal = 'info';
    }
    
    setFormData({
      type: g.type,
      title: g.title,
      phone_number: g.phone_number || '',
      description: g.description || '',
      tips: (g.tips && g.tips.length > 0) ? g.tips : [''],
      is_active: g.is_active !== false,
      icon: iconVal,
      customIconSvg: customSvg,
      color: g.color || '#3b82f6'
    });
    setEditingId(g._id);
    setShowModal(true);
  };
  
  const resetForm = () => {
    setFormData({
      type: 'hotline', title: '', phone_number: '', description: '', tips: [''], is_active: true,
      icon: 'info', customIconSvg: '', color: '#3b82f6'
    });
    setEditingId(null);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Please enter a title.';
    }

    if (formData.type === 'hotline') {
      if (!formData.phone_number.trim()) {
        newErrors.phone_number = 'Please enter a phone number.';
      } else {
        const phoneDigits = formData.phone_number.replace(/[^0-9]/g, '');
        if (phoneDigits.length > 10) {
          newErrors.phone_number = 'Phone number must not exceed 10 digits.';
        }
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    
    setSaving(true);
    try {
      // Clean up empty tips and excessive whitespaces
      const cleanText = (text) => (text || '').replace(/\s+/g, ' ').trim();
      const payload = { 
        type: formData.type,
        title: cleanText(formData.title),
        phone_number: formData.phone_number,
        description: cleanText(formData.description),
        is_active: formData.is_active,
        icon: formData.icon === 'other' ? formData.customIconSvg : formData.icon,
        color: formData.color,
        tips: formData.type === 'guideline' 
          ? formData.tips.map(cleanText).filter(t => t !== '') 
          : [],
        actions: []
      };
      
      if (editingId) {
        await apiService.updateEmergencyGuideline(editingId, payload);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Guideline updated successfully!", type: 'success' } }));
      } else {
        await apiService.createEmergencyGuideline(payload);
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Guideline created successfully!", type: 'success' } }));
      }
      
      setShowModal(false);
      resetForm();
      fetchGuidelines();
    } catch (err) {
      console.error('Failed to save:', err);
      let msg = 'An error occurred while saving the data.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      setFormErrors({ global: msg });
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: msg, type: 'error' } }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ open: true, id });
  };

  const executeDelete = async (id) => {
    try {
      setSaving(true);
      await apiService.deleteEmergencyGuideline(id);
      fetchGuidelines();
      setConfirmModal({ open: false, id: null });
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "Guideline deleted successfully!", type: 'success' } }));
    } catch (err) {
      console.error('Failed to delete guideline:', err);
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: err.message || 'Failed to delete guideline. Please try again.', type: 'error' } }));
    } finally {
      setSaving(false);
    }
  };

  const renderTable = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.5px' }}>{title}</h3>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-bright)' }}>
                <th style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Type</th>
                <th style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Title</th>
                <th style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Details</th>
                <th style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g._id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {g.type === 'hotline' ? <Phone size={16} color="var(--blue-400)" /> : <Shield size={16} color="var(--green-400)" />}
                      <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{g.type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontWeight: 700, color: 'var(--text-primary)', minWidth: 140, maxWidth: '250px' }}>
                    <div style={{ 
                      overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', 
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 
                    }} title={g.title}>
                      {g.title}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: 160 }}>
                    {g.type === 'hotline' ? (
                      <div>
                        <div style={{ marginBottom: g.description ? '4px' : '0' }}><strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong> {g.phone_number}</div>
                        {g.description && (
                          <div style={{ 
                            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', 
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 
                          }} title={g.description}>
                            <strong style={{ color: 'var(--text-secondary)' }}>Desc:</strong> {g.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: (g.tips && g.tips.length > 0) ? '4px' : '0' }}><strong style={{ color: 'var(--text-secondary)' }}>Tips:</strong> {g.tips?.length || 0} items</div>
                        {g.tips && g.tips.length > 0 && (
                          <div style={{ 
                            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', 
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 
                          }} title={g.tips[0]}>
                            <strong style={{ color: 'var(--text-secondary)' }}>Preview:</strong> {g.tips[0]}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button 
                        onClick={() => handleEdit(g)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--cyan-400)', cursor: 'pointer', padding: 4 }}
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(g._id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--red-400)', cursor: 'pointer', padding: 4 }}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: 12, padding: '32px', color: 'var(--cyan-400)' }}>
      <Loader className="animate-spin" size={24} />
      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading guidelines...</span>
    </div>
  );

  return (
    <div className="page-enter" style={{ padding: '24px', maxWidth: 1100, margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Manage Guidelines</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Configure emergency hotlines and survival tips</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={18} /> Add Guideline
        </button>
      </div>

      {/* Tables rendered separately */}
      {renderTable('EMERGENCY HOTLINES', guidelines.filter(g => g.type === 'hotline'))}
      {renderTable('DISASTER & EMERGENCY GUIDELINES', guidelines.filter(g => g.type === 'guideline'))}

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="hide-scrollbar" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{editingId ? 'Edit Emergency Guideline' : 'Add Emergency Guideline'}</h2>
              <button type="button" onClick={() => { resetForm(); setShowModal(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} noValidate style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {formErrors.global && (
                <div style={{ padding: '12px', background: 'var(--red-glow)', border: '1px solid var(--red-400)', borderRadius: '8px', color: 'var(--red-400)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> {formErrors.global}
                </div>
              )}
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => {
                    setFormErrors({});
                    setFormData({...formData, type: e.target.value});
                  }}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)' }}
                >
                  <option value="hotline">Hotline</option>
                  <option value="guideline">Survival Guideline</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Card Icon</label>
                  <div style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setShowIconDropdown(!showIconDropdown)}
                      style={{ 
                        width: '100%', height: '42px', padding: '0 12px', background: 'var(--bg-elevated)', 
                        border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      {formData.icon === 'other' ? (
                        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: formData.customIconSvg || '<svg></svg>' }} />
                      ) : (
                        (() => {
                          const IconComp = ICON_MAP[formData.icon] || Info;
                          return <IconComp size={20} color="var(--text-secondary)" />;
                        })()
                      )}
                      <span style={{ flex: 1 }}>
                        {formData.icon === 'other' ? 'Other (Custom SVG)' : (ICONS_LIST.find(i => i.value === formData.icon)?.label || 'Info')}
                      </span>
                      <ChevronDown size={16} color="var(--text-secondary)" style={{ transform: showIconDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
                    </div>
                    
                    {/* Dropdown Menu */}
                    {showIconDropdown && (
                      <div style={{ 
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', 
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', 
                        borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)', padding: '4px' 
                      }} className="hide-scrollbar">
                        {ICONS_LIST.map((item) => {
                          const IconCmp = ICON_MAP[item.value] || Info;
                          return (
                            <div 
                              key={item.value}
                              onClick={() => {
                                setFormData({...formData, icon: item.value});
                                setShowIconDropdown(false);
                              }}
                              style={{ 
                                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px', 
                                cursor: 'pointer', borderRadius: '6px', 
                                background: formData.icon === item.value ? 'var(--bg-hover)' : 'transparent',
                                color: formData.icon === item.value ? 'var(--cyan-400)' : 'var(--text-primary)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = formData.icon === item.value ? 'var(--bg-hover)' : 'transparent'}
                            >
                              {item.value === 'other' ? (
                                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                </div>
                              ) : (
                                <IconCmp size={18} />
                              )}
                              <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Color Theme</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', padding: '0 8px', height: '42px', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
                    <input 
                      type="color" 
                      value={formData.color} 
                      onChange={(e) => setFormData({...formData, color: e.target.value})} 
                      style={{ width: '30px', height: '30px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', borderRadius: '4px' }} 
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formData.color}</span>
                  </div>
                </div>
              </div>

              {formData.icon === 'other' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paste Custom SVG Code</label>
                  <textarea 
                    value={formData.customIconSvg}
                    onChange={(e) => setFormData({...formData, customIconSvg: e.target.value})}
                    placeholder="<svg>...</svg>"
                    rows={3}
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'monospace', resize: 'vertical' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Title</label>
                <input 
                  type="text" 
                  maxLength={100}
                  value={formData.title} 
                  onChange={(e) => {
                    setFormErrors({...formErrors, title: null});
                    setFormData({...formData, title: e.target.value});
                  }}
                  placeholder="e.g., First Aid / Emergency"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: `1px solid ${formErrors.title ? 'var(--red-400)' : 'var(--border-dim)'}`, borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                {formErrors.title && (
                  <div style={{ color: 'var(--red-400)', fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} /> {formErrors.title}
                  </div>
                )}
              </div>

              {formData.type === 'hotline' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      maxLength={10}
                      value={formData.phone_number} 
                      onChange={(e) => {
                        setFormErrors({...formErrors, phone_number: null});
                        setFormData({...formData, phone_number: e.target.value.replace(/[^0-9+]/g, '')});
                      }}
                      placeholder="e.g., 115"
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: `1px solid ${formErrors.phone_number ? 'var(--red-400)' : 'var(--border-dim)'}`, borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    {formErrors.phone_number && (
                      <div style={{ color: 'var(--red-400)', fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={14} /> {formErrors.phone_number}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description (Optional)</label>
                    <textarea 
                      maxLength={500}
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="e.g., Call in case of a medical emergency"
                      rows={3}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {formData.type === 'guideline' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Survival Tips</label>
                  {formData.tips.map((tip, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <textarea 
                        value={tip} 
                        onChange={(e) => handleTipChange(index, e.target.value)}
                        onFocus={() => setFocusedTipIndex(index)}
                        onBlur={() => setFocusedTipIndex(null)}
                        placeholder={`Step ${index + 1}`}
                        rows={focusedTipIndex === index ? 4 : 1}
                        maxLength={500}
                        style={{ 
                          flex: 1, padding: '10px', background: 'var(--bg-elevated)', 
                          border: '1px solid var(--border-dim)', borderRadius: '8px', 
                          color: 'var(--text-primary)', resize: 'none', 
                          fontFamily: 'inherit', lineHeight: '1.5', 
                          overflow: focusedTipIndex === index ? 'auto' : 'hidden',
                          whiteSpace: focusedTipIndex === index ? 'normal' : 'nowrap',
                          textOverflow: 'ellipsis',
                          transition: 'all 0.2s ease'
                        }}
                      />
                      <button type="button" onClick={() => handleRemoveTip(index)} style={{ background: 'var(--red-glow)', color: 'var(--red-400)', border: 'none', borderRadius: '8px', width: '40px', cursor: 'pointer' }}>
                        <Trash2 size={16} style={{ margin: 'auto' }}/>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={handleAddTip} style={{ background: 'transparent', border: '1px dashed var(--border-bright)', color: 'var(--cyan-400)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '4px' }}>
                    + Add Tip
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid var(--border-dim)' }}>
                <button type="button" onClick={() => { resetForm(); setShowModal(false); }} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : (editingId ? 'Update Guideline' : 'Save Guideline')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        title="Delete Guideline"
        message="Are you sure you want to delete this guideline? This action cannot be undone."
        confirmText="Confirm"
        loading={saving}
        onConfirm={() => executeDelete(confirmModal.id)}
        onCancel={() => setConfirmModal({ open: false, id: null })}
      />
    </div>
  );
}