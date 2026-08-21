import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Cpu, Battery, AlertTriangle, X, PowerOff, Edit, Upload, Power, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import DeviceLifecycleModal from '../../components/common/DeviceLifecycleModal';
import ConfirmModal from '../../components/common/ConfirmModal';


function FloodWarningBadge({ level, warn, danger }) {
  const current = level || 0;
  if (current > 5) {
    return <span className="badge badge-green"><span style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%', display: 'inline-block' }} /> {Math.round(current * 10) / 10} cm</span>;
  }
  return <span className="badge badge-gray" style={{ color: 'var(--text-muted)' }}><span style={{ width: 6, height: 6, background: '#64748b', borderRadius: '50%', display: 'inline-block' }} /> No water</span>;
}

function AddDeviceModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    device_code: '',
    name: '',
    location: '',
    lat: '',
    lng: '',
    calib_empty_cm: '',
    sleep_interval_minutes: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    setErrors({});
    const device_code = formData.device_code.trim();
    const name = formData.name.trim();
    const location = formData.location.trim();
    const { lat, lng, calib_empty_cm, sleep_interval_minutes } = formData;

    const newErrors = {};
    if (!device_code) newErrors.device_code = 'Device code is required';
    else if (/\s/.test(device_code)) newErrors.device_code = 'Device code cannot contain spaces';
    if (!name) newErrors.name = 'Device name is required';
    if (!location) newErrors.location = 'Location is required';
    
    if (lat === '') newErrors.lat = 'Latitude is required';
    else if (Number(lat) < -90 || Number(lat) > 90) newErrors.lat = 'Latitude must be between -90 and 90';
    
    if (lng === '') newErrors.lng = 'Longitude is required';
    else if (Number(lng) < -180 || Number(lng) > 180) newErrors.lng = 'Longitude must be between -180 and 180';
    
    if (calib_empty_cm === '') newErrors.calib_empty_cm = 'Calibration height is required';
    else if (Number(calib_empty_cm) < 0) newErrors.calib_empty_cm = 'Calibration height cannot be negative';
    
    if (sleep_interval_minutes === '') newErrors.sleep_interval_minutes = 'Sleep interval is required';
    else if (Number(sleep_interval_minutes) < 1) newErrors.sleep_interval_minutes = 'Sleep interval cannot be less than 1 minute';

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    setLoading(true);
    try {
      const form = new FormData();
      form.append('device_code', device_code);
      form.append('name', name);
      form.append('location', location);
      form.append('lat', lat);
      form.append('lng', lng);
      form.append('calib_empty_cm', calib_empty_cm);
      form.append('sleep_interval_minutes', sleep_interval_minutes);
      if (imageFile) form.append('image', imageFile);

      await onAdd(form);
      onClose();
    } catch (err) {
      if (err.message && err.message.includes('E11000 duplicate key')) {
        setErrors({ device_code: 'This Device Code already exists.' });
      } else {
        setErrors({ global: err.message || 'Error occurred.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700 }}>Add New IoT Device</div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errors.global && <div className="alert-banner critical"><AlertTriangle size={18} /><div>{errors.global}</div></div>}
          <div>
            <input className="input" style={{ borderColor: errors.device_code ? 'var(--red-500)' : undefined }} placeholder="Device Code (e.g. IOT-001)" value={formData.device_code} onChange={e => { setFormData({...formData, device_code: e.target.value}); setErrors({...errors, device_code: ''}); }} />
            {errors.device_code && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.device_code}</div>}
          </div>
          <div>
            <input className="input" style={{ borderColor: errors.name ? 'var(--red-500)' : undefined }} placeholder="Device Name" value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} />
            {errors.name && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.name}</div>}
          </div>
          <div>
            <input className="input" style={{ borderColor: errors.location ? 'var(--red-500)' : undefined }} placeholder="Location" value={formData.location} onChange={e => { setFormData({...formData, location: e.target.value}); setErrors({...errors, location: ''}); }} />
            {errors.location && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.location}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <input className="input" style={{ borderColor: errors.lat ? 'var(--red-500)' : undefined }} placeholder="Latitude" type="number" value={formData.lat} onChange={e => { setFormData({...formData, lat: e.target.value}); setErrors({...errors, lat: ''}); }} onWheel={e => e.target.blur()} />
              {errors.lat && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.lat}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <input className="input" style={{ borderColor: errors.lng ? 'var(--red-500)' : undefined }} placeholder="Longitude" type="number" value={formData.lng} onChange={e => { setFormData({...formData, lng: e.target.value}); setErrors({...errors, lng: ''}); }} onWheel={e => e.target.blur()} />
              {errors.lng && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.lng}</div>}
            </div>
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Calibration Height (cm)</label>
            <input className="input" style={{ borderColor: errors.calib_empty_cm ? 'var(--red-500)' : undefined }} type="number" value={formData.calib_empty_cm} onChange={e => { setFormData({...formData, calib_empty_cm: e.target.value}); setErrors({...errors, calib_empty_cm: ''}); }} onWheel={e => e.target.blur()} />
            {errors.calib_empty_cm && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.calib_empty_cm}</div>}
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Sleep Time (min)</label>
            <input className="input" style={{ borderColor: errors.sleep_interval_minutes ? 'var(--red-500)' : undefined }} type="number" value={formData.sleep_interval_minutes} onChange={e => { setFormData({...formData, sleep_interval_minutes: e.target.value}); setErrors({...errors, sleep_interval_minutes: ''}); }} onWheel={e => e.target.blur()} />
            {errors.sleep_interval_minutes && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.sleep_interval_minutes}</div>}
          </div>
          <div>
            <label style={{fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8}}>Device Image (Optional)</label>
            <div style={{ position: 'relative', background: 'rgba(30, 41, 59, 0.4)', border: '2px dashed var(--border-subtle)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
              ) : (
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><Upload size={24} color="var(--text-muted)" /></div>
              )}
              <div style={{ fontSize: '0.9rem', color: imageFile ? 'var(--cyan-400)' : 'var(--text-secondary)', fontWeight: 500 }}>{imageFile ? imageFile.name : 'Click to select an image'}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function EditDeviceModal({ device, onClose, onEdit }) {
  const [formData, setFormData] = useState({
    device_code: device.device_code || '',
    name: device.name || '',
    location: device.location || '',
    lat: device.lat !== undefined ? device.lat : '',
    lng: device.lng !== undefined ? device.lng : '',
    calib_empty_cm: device.calib_empty_cm !== undefined ? device.calib_empty_cm : '',
    sleep_interval_minutes: device.sleep_interval_minutes !== undefined ? device.sleep_interval_minutes : ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    setErrors({});
    const device_code = String(formData.device_code).trim();
    const name = String(formData.name).trim();
    const location = String(formData.location).trim();
    const { lat, lng, calib_empty_cm, sleep_interval_minutes } = formData;

    const newErrors = {};
    if (!device_code) newErrors.device_code = 'Device code is required';
    else if (/\s/.test(device_code)) newErrors.device_code = 'Device code cannot contain spaces';
    if (!name) newErrors.name = 'Device name is required';
    if (!location) newErrors.location = 'Location is required';
    
    if (lat === '') newErrors.lat = 'Latitude is required';
    else if (Number(lat) < -90 || Number(lat) > 90) newErrors.lat = 'Latitude must be between -90 and 90';
    
    if (lng === '') newErrors.lng = 'Longitude is required';
    else if (Number(lng) < -180 || Number(lng) > 180) newErrors.lng = 'Longitude must be between -180 and 180';
    
    if (calib_empty_cm === '') newErrors.calib_empty_cm = 'Calibration height is required';
    else if (Number(calib_empty_cm) < 0) newErrors.calib_empty_cm = 'Calibration height cannot be negative';
    
    if (sleep_interval_minutes === '') newErrors.sleep_interval_minutes = 'Sleep interval is required';
    else if (Number(sleep_interval_minutes) < 1) newErrors.sleep_interval_minutes = 'Sleep interval cannot be less than 1 minute';

    if (Object.keys(newErrors).length > 0) return setErrors(newErrors);

    setLoading(true);
    try {
      const form = new FormData();
      form.append('device_code', device_code);
      form.append('name', name);
      form.append('location', location);
      form.append('lat', lat);
      form.append('lng', lng);
      form.append('calib_empty_cm', calib_empty_cm);
      form.append('sleep_interval_minutes', sleep_interval_minutes);
      if (imageFile) form.append('image', imageFile);

      await onEdit(device.device_code || device._id, form);
      onClose();
    } catch (err) {
      if (err.message && err.message.includes('E11000 duplicate key')) {
        setErrors({ device_code: 'This Device Code already exists.' });
      } else {
        setErrors({ global: err.message || 'Error occurred.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ fontWeight: 700 }}>Edit IoT Device</div>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errors.global && <div className="alert-banner critical"><AlertTriangle size={18} /><div>{errors.global}</div></div>}
          <div>
            <input className="input" style={{ borderColor: errors.device_code ? 'var(--red-500)' : undefined }} placeholder="Device Code (e.g. IOT-001)" value={formData.device_code} onChange={e => { setFormData({...formData, device_code: e.target.value}); setErrors({...errors, device_code: ''}); }} />
            {errors.device_code && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.device_code}</div>}
          </div>
          <div>
            <input className="input" style={{ borderColor: errors.name ? 'var(--red-500)' : undefined }} placeholder="Device Name" value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); setErrors({...errors, name: ''}); }} />
            {errors.name && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.name}</div>}
          </div>
          <div>
            <input className="input" style={{ borderColor: errors.location ? 'var(--red-500)' : undefined }} placeholder="Location" value={formData.location} onChange={e => { setFormData({...formData, location: e.target.value}); setErrors({...errors, location: ''}); }} />
            {errors.location && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.location}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <input className="input" style={{ borderColor: errors.lat ? 'var(--red-500)' : undefined }} placeholder="Latitude" type="number" value={formData.lat} onChange={e => { setFormData({...formData, lat: e.target.value}); setErrors({...errors, lat: ''}); }} onWheel={e => e.target.blur()} />
              {errors.lat && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.lat}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <input className="input" style={{ borderColor: errors.lng ? 'var(--red-500)' : undefined }} placeholder="Longitude" type="number" value={formData.lng} onChange={e => { setFormData({...formData, lng: e.target.value}); setErrors({...errors, lng: ''}); }} onWheel={e => e.target.blur()} />
              {errors.lng && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.lng}</div>}
            </div>
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Calibration Height (cm)</label>
            <input className="input" style={{ borderColor: errors.calib_empty_cm ? 'var(--red-500)' : undefined }} type="number" value={formData.calib_empty_cm} onChange={e => { setFormData({...formData, calib_empty_cm: e.target.value}); setErrors({...errors, calib_empty_cm: ''}); }} onWheel={e => e.target.blur()} />
            {errors.calib_empty_cm && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.calib_empty_cm}</div>}
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Sleep Time (min)</label>
            <input className="input" style={{ borderColor: errors.sleep_interval_minutes ? 'var(--red-500)' : undefined }} type="number" value={formData.sleep_interval_minutes} onChange={e => { setFormData({...formData, sleep_interval_minutes: e.target.value}); setErrors({...errors, sleep_interval_minutes: ''}); }} onWheel={e => e.target.blur()} />
            {errors.sleep_interval_minutes && <div style={{ color: 'var(--red-400)', fontSize: '0.75rem', marginTop: 4, marginLeft: 4 }}>{errors.sleep_interval_minutes}</div>}
          </div>
          <div>
            <label style={{fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 8}}>Device Image (Change Image)</label>
            <div style={{ position: 'relative', background: 'rgba(30, 41, 59, 0.4)', border: '2px dashed var(--border-subtle)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 2 }} />
              {imageFile ? (
                <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
              ) : device.image_url ? (
                <img src={device.image_url} alt="Current" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
              ) : (
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}><Upload size={24} color="var(--text-muted)" /></div>
              )}
              <div style={{ fontSize: '0.9rem', color: imageFile ? 'var(--cyan-400)' : 'var(--text-secondary)', fontWeight: 500 }}>{imageFile ? imageFile.name : 'Click to select a new image'}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

function BatteryBar({ value }) {
  const color = value > 50 ? 'var(--green-500)' : value > 20 ? 'var(--yellow-500)' : 'var(--red-500)';
  return (
    <div className="flex items-center gap-2">
      <Battery size={13} color={color} />
      <div style={{ width: 50, height: 5, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{value}%</span>
    </div>
  );
}

// Hiển thị badge trạng thái thiết bị, ưu tiên is_disabled > status
function DeviceStatusBadge({ device }) {
  if (device.is_disabled) {
    return (
      <span className="badge" style={{ background: 'rgba(100,116,139,0.18)', color: 'var(--text-muted)', border: '1px solid rgba(100,116,139,0.3)' }}>
        <span style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Disabled
      </span>
    );
  }
  if (device.status === 'Maintenance') {
    return (
      <span className="badge badge-orange">
        <span style={{ width: 6, height: 6, background: 'var(--orange-400)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Maintenance
      </span>
    );
  }
  const isOnline = (device.current_water_level || device.waterLevel || 0) > 5;
  if (isOnline) {
    return (
      <span className="badge badge-green">
        <span style={{ width: 6, height: 6, background: 'var(--green-400)', borderRadius: '50%', display: 'inline-block' }} />
        {' '}Online
      </span>
    );
  }
  return (
    <span className="badge badge-red">
      <span style={{ width: 6, height: 6, background: 'var(--red-400)', borderRadius: '50%', display: 'inline-block' }} />
      {' '}Offline
    </span>
  );
}

export default function IotDeviceManagement() {
  const [deviceList, setDeviceList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [togglingId, setTogglingId] = useState(null); // track which device is being toggled
  const [lifecycleDevice, setLifecycleDevice] = useState(null);

  const fetchDevices = async (isSilent = false, searchQuery = search) => {
    if (!isSilent) setLoading(true);
    try {
      const url = searchQuery && searchQuery.trim() !== '' 
        ? `/iot/devices?search=${encodeURIComponent(searchQuery.trim())}` 
        : '/iot/devices';
      const response = await apiService.get(url);
      if (response && response.success && response.data) {
        setDeviceList(response.data);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleAddNewDevice = async (formData) => {
    const res = await apiService.upload('/iot/devices', formData, {}, 'POST');
    if (res && res.success) {
      await fetchDevices();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "IoT Device registered successfully!", type: 'success' } }));
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: res.message || 'Failed to add device', type: 'error' } }));
      throw new Error(res.message || 'Failed to add device');
    }
  };

  const handleEditDevice = async (deviceId, formData) => {
    const res = await apiService.upload('/iot/devices/' + deviceId, formData, {}, 'PUT');
    if (res && res.success) {
      await fetchDevices();
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: "IoT Device updated successfully!", type: 'success' } }));
    } else {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: res.message || 'Failed to update device', type: 'error' } }));
      throw new Error(res.message || 'Failed to update device');
    }
  };

  // ── Toggle Disable/Enable ─────────────────────────────────────────────────
  const handleToggleDisable = (device) => {
    const willDisable = !device.is_disabled;
    setConfirmModal({
      title: willDisable ? 'Disable IoT Device' : 'Enable IoT Device',
      message: willDisable
        ? `Device "${device.name}" will be disabled and completely removed from the map.`
        : `Device "${device.name}" will be re-enabled and appear on the map at its registered location.`,
      onConfirm: async () => {
        setConfirmModal(null);
        setTogglingId(device.device_code || device._id);

        // Snapshot for rollback
        const prevList = deviceList;

        // Optimistic update immediately
        setDeviceList(prev =>
          prev.map(d =>
            (d.device_code === device.device_code || d._id === device._id)
              ? { ...d, is_disabled: willDisable }
              : d
          )
        );

        try {
          const res = await apiService.patch(
            `/iot/devices/${device.device_code || device._id}/disable`,
            { is_disabled: willDisable }
          );
          if (res?.success) {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: `Device ${willDisable ? 'disabled' : 'enabled'} successfully!`, type: 'success' } }));
          } else {
            setDeviceList(prevList); // rollback on server error
            window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: res?.message || 'Operation failed', type: 'error' } }));
          }
        } catch {
          setDeviceList(prevList); // rollback on network error
          window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Network connection error', type: 'error' } }));
        } finally {
          setTogglingId(null);
        }
      },
      onCancel: () => setConfirmModal(null),
      confirmText: willDisable ? 'Disable' : 'Enable',
      variant: willDisable ? 'warning' : 'primary',
    });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDevices(false, search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    fetchDevices();

    const intervalId = setInterval(() => {
      fetchDevices(true);
    }, 5000);

    let ws = null;
    const connectWebSocket = () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'https://floodsenseapi.onrender.com/api';
      const wsUrl = backendUrl.replace('http', 'ws').replace('/api', '');
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Real-time telemetry: update water/battery for active devices
          if (msg.type === 'iot_telemetry' && msg.device) {
            setDeviceList(prev => prev.map(d => {
              if (d.device_code !== msg.device.device_code) return d;
              return {
                ...d,
                current_water_level: msg.device.current_water_level,
                current_battery_level: msg.device.current_battery_level,
                last_reading_time: msg.device.last_reading_time,
                status: 'Online'
              };
            }));
          }

          // Admin broadcast: another admin tab toggled a device
          if (msg.type === 'device_status_changed') {
            setDeviceList(prev => prev.map(d =>
              d.device_code === msg.device_code
                ? { ...d, is_disabled: msg.is_disabled }
                : d
            ));
          }
        } catch {}
      };

      ws.onclose = () => setTimeout(connectWebSocket, 3000);
    };

    connectWebSocket();
    return () => {
      if (ws) ws.close();
      clearInterval(intervalId);
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const listTopRef = useRef(null);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setTimeout(() => {
      if (listTopRef.current) {
        listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredDevices = deviceList;
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDevices = filteredDevices.slice(startIndex, startIndex + itemsPerPage);

  const getPageNumbers = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = currentPage - 1;
    if (start < 1) start = 1;
    if (start + 2 > totalPages) start = totalPages - 2;
    return [start, start + 1, start + 2];
  };

  const totalDevices = deviceList.length;
  const activeDevices = deviceList.filter(d => !d.is_disabled && d.status === 'Online').length;
  const disabledDevices = deviceList.filter(d => d.is_disabled).length;
  const offlineDevices = deviceList.filter(d => !d.is_disabled && d.status !== 'Online').length;

  return (
    <div className="page-enter">
      <style>{`
        /* Hide spin-button arrows for number inputs */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        .iot-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .iot-search-wrap {
          flex: 1;
          max-width: 300px;
        }
        .iot-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .iot-table-card {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .iot-table-card .data-table {
          min-width: 800px;
        }
        @media (max-width: 900px) {
          .iot-stat-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .iot-stat-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .iot-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .iot-search-wrap {
            max-width: 100%;
            width: 100%;
          }
        }
      `}</style>
      <div className="page-header">
        <h1>IoT Device Management</h1>
      </div>

      <div className="iot-stat-grid">
        {[
          { label: 'Total Devices', value: totalDevices, color: 'var(--blue-400)' },
          { label: 'Online', value: activeDevices, color: 'var(--green-400)' },
          { label: 'Offline', value: offlineDevices, color: 'var(--red-400)' },
          { label: 'Disabled', value: disabledDevices, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div ref={listTopRef} className="iot-toolbar">
        <div className="iot-search-wrap">
          <div className="input-group" style={{ width: '100%' }}>
            <Search size={15} className="input-icon" />
            <input
              className="input"
              placeholder="Find devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddDeviceModal(true)} style={{display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'}}>
          + Add New IoT Device
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading devices...</div>
      ) : (
        <div className="card iot-table-card" style={{ overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Image</th>
                <th>Location</th>
                <th>Settings (cm)</th>
                <th>Battery</th>
                <th>Map Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDevices.map(d => {
                const isToggling = togglingId === (d.device_code || d._id);
                return (
                  <tr
                    key={d._id || d.device_code}
                    style={{
                      opacity: d.is_disabled ? 0.55 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        <DeviceStatusBadge device={d} />
                      </div>
                    </td>
                    <td>
                      <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {d.image_url ? (
                          <img src={d.image_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: d.is_disabled ? 'grayscale(100%)' : 'none', transition: 'filter 0.3s' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.is_disabled ? 'var(--text-dim)' : 'var(--text-muted)' }}><Cpu size={18} /></div>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: '250px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: 1.4 }}>
                        {d.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calib Height: <span style={{ color: 'var(--text-secondary)' }}>{d.calib_empty_cm} cm</span></div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <BatteryBar value={d.is_disabled ? 0 : (d.current_battery_level || 0)} />
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4 }}>
                        {d.is_disabled ? '—' : `Ping: ${d.last_reading_time ? new Date(d.last_reading_time).toLocaleTimeString() : '--'}`}
                      </div>
                    </td>
                    <td>
                      {d.is_disabled ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(100,116,139,0.12)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(100,116,139,0.2)' }}>
                          Hidden from map
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--green-400)', background: 'rgba(34,197,94,0.08)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.2)' }}>
                          Visible on map
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setLifecycleDevice(d)}
                          title="Device Lifecycle"
                          disabled={isToggling}
                        >
                          <Activity size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => setEditingDevice(d)}
                          title="Edit Device"
                          disabled={isToggling}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => handleToggleDisable(d)}
                          style={{
                            color: d.is_disabled ? 'var(--green-400)' : 'var(--red-400)',
                            opacity: isToggling ? 0.5 : 1,
                            transition: 'all 0.2s',
                          }}
                          title={d.is_disabled ? 'Enable Device (show on map)' : 'Disable Device (hide from map)'}
                          disabled={isToggling}
                        >
                          {isToggling ? (
                            <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                          ) : d.is_disabled ? (
                            <Power size={16} />
                          ) : (
                            <PowerOff size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedDevices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>No IoT devices found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

          {/* Clean Centered Pagination Controls (10 items per page, max 3 pages shown, < and > arrow buttons) */}
          {totalPages >= 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: '12px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <span className="pagination-showing-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Show {filteredDevices.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredDevices.length)} / {filteredDevices.length} Device
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Previous Arrow < */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Exactly up to 3 Page Numbers */}
                {getPageNumbers().map(pageNum => (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handlePageChange(pageNum)}
                    style={{ width: 32, height: 32, padding: 0, fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {pageNum}
                  </button>
                ))}

                {/* Next Arrow > */}
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddDeviceModal && <AddDeviceModal onClose={() => setShowAddDeviceModal(false)} onAdd={handleAddNewDevice} />}
      {editingDevice && <EditDeviceModal device={editingDevice} onClose={() => setEditingDevice(null)} onEdit={handleEditDevice} />}
      {confirmModal && <ConfirmModal isOpen={!!confirmModal} {...confirmModal} />}
      {lifecycleDevice && <DeviceLifecycleModal device={lifecycleDevice} onClose={() => setLifecycleDevice(null)} />}
    </div>
  );
}

