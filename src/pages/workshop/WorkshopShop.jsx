import React, { useState, useEffect } from 'react';
import {
  Wrench, Save, CheckCircle, AlertTriangle, MapPin,
  Phone, Clock, Edit3, Plus, Trash2, ToggleLeft, ToggleRight,
  PauseCircle, XCircle, Camera, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import ConfirmModal from '../../components/common/ConfirmModal';

const UNIT_SUGGESTIONS = ["job", "service", "item", "piece", "liter", "km", "hour", "set"];
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import GoongMaplibreLayer from '../../components/common/GoongMaplibreLayer';

const customMarkerIcon = typeof window !== 'undefined' ? new L.divIcon({
  html: `<div style="display: flex; justify-content: center; align-items: center;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--orange-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3" fill="rgba(255,140,0,0.3)"/></svg></div>`,
  className: 'custom-pin-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
}) : null;

const initialShop = {
  name: "",
  owner: "",
  phone: '',
  phone2: '',
  email: '',
  address: "",
  district: "",
  mapLink: '',
  description: "",
  isOpen: true,
  openTime: '08:00',
  closeTime: '17:00',
  isMobile: false,
  coverageRadius: 0,
  joinDate: '',
  rating_average: 0,
  rating_count: 0,
  cover_photo: '',
  status: 'active', // 'active' | 'suspended' | 'cancelled'
  services: [],
  weeklyCalendar: [
    { day_group: "Monday – Friday", open_time: '08:00', close_time: '17:00', is_active: true },
    { day_group: "Saturday", open_time: '08:00', close_time: '17:00', is_active: true },
    { day_group: "Sunday", open_time: '08:00', close_time: '17:00', is_active: true }
  ],
};

import WorkshopEditModal from '../../components/profile/WorkshopEditModal';

const TimeInputTrigger = ({ value, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--r-sm)',
        color: 'var(--text-primary)',
        fontSize: '0.8rem',
        fontWeight: 600,
        width: '105px',
        height: '34px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s ease',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange-400)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-dim)'}
    >
      <Clock size={12} style={{ marginRight: 6, color: 'var(--text-muted)' }} />
      {value}
    </div>
  );
};

const CircularClockPicker = ({ isOpen, value, onClose, onSave }) => {
  if (!isOpen) return null;

  const [tempValue, setTempValue] = useState(value || "08:00");
  const [activeTab, setActiveTab] = useState('hour'); // 'hour' | 'minute'

  const [hour24, minuteStr] = tempValue.split(':');
  const currentHour24 = Number(hour24);
  const currentMinute = Number(minuteStr);

  const handleNumberClick = (num) => {
    if (activeTab === 'hour') {
      const newH = num.toString().padStart(2, '0');
      const newTime = `${newH}:${minuteStr}`;
      setTempValue(newTime);
      setActiveTab('minute');
    } else {
      const newM = num.toString().padStart(2, '0');
      const newTime = `${hour24}:${newM}`;
      setTempValue(newTime);
    }
  };

  const handleOk = () => {
    onSave(tempValue);
    onClose();
  };

  const renderDialNumbers = () => {
    const center = 95;

    if (activeTab === 'hour') {
      const outerHours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const innerHours = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

      const outerElements = outerHours.map((num, i) => {
        const angle = ((i * 30) - 90) * Math.PI / 180;
        const x = center + 72 * Math.cos(angle);
        const y = center + 72 * Math.sin(angle);
        const isSelected = currentHour24 === num;

        return (
          <button
            key={`outer-${num}`}
            onClick={() => handleNumberClick(num)}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: isSelected ? 'var(--orange-400)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: isSelected ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              transition: 'all 0.15s ease'
            }}
          >
            {num}
          </button>
        );
      });

      const innerElements = innerHours.map((num, i) => {
        const angle = ((i * 30) - 90) * Math.PI / 180;
        const x = center + 44 * Math.cos(angle);
        const y = center + 44 * Math.sin(angle);
        const isSelected = currentHour24 === num;

        return (
          <button
            key={`inner-${num}`}
            onClick={() => handleNumberClick(num)}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              border: 'none',
              background: isSelected ? 'var(--orange-400)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--text-muted)',
              fontSize: '0.68rem',
              fontWeight: isSelected ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              transition: 'all 0.15s ease'
            }}
          >
            {num === 0 ? "00" : num}
          </button>
        );
      });

      return [...outerElements, ...innerElements];
    } else {
      const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      return minutes.map((num, i) => {
        const angle = ((i * 30) - 90) * Math.PI / 180;
        const x = center + 72 * Math.cos(angle);
        const y = center + 72 * Math.sin(angle);
        const isSelected = currentMinute === num;

        return (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: isSelected ? 'var(--orange-400)' : 'transparent',
              color: isSelected ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: isSelected ? 700 : 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 2,
              transition: 'all 0.15s ease'
            }}
          >
            {num.toString().padStart(2, '0')}
          </button>
        );
      });
    }
  };

  const getHandAngle = () => {
    if (activeTab === 'hour') {
      const val = currentHour24 % 12;
      return (val * 30) - 90;
    } else {
      return (currentMinute * 6) - 90;
    }
  };

  const getHandLength = () => {
    if (activeTab === 'hour') {
      const isInner = currentHour24 === 0 || (currentHour24 >= 13 && currentHour24 <= 23);
      return isInner ? '38px' : '66px';
    }
    return '66px';
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0 }}>
      <div className="card p-5" style={{ width: 240, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', borderRadius: 'var(--r-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 14, background: 'rgba(0,0,0,0.15)', padding: '10px 0', borderRadius: 'var(--r-sm)' }}>
          <button
            onClick={() => setActiveTab('hour')}
            style={{ background: 'none', border: 'none', fontSize: '1.8rem', fontWeight: 700, color: activeTab === 'hour' ? 'var(--orange-400)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            {hour24}
          </button>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>:</span>
          <button
            onClick={() => setActiveTab('minute')}
            style={{ background: 'none', border: 'none', fontSize: '1.8rem', fontWeight: 700, color: activeTab === 'minute' ? 'var(--orange-400)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            {minuteStr}
          </button>
        </div>

        <div style={{ position: 'relative', width: 190, height: 190, margin: '0 auto 16px', background: 'rgba(0,0,0,0.1)', borderRadius: '50%', border: '1px solid var(--border-dim)' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--orange-400)', zIndex: 3 }} />

          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: getHandLength(),
            height: '2px',
            background: 'var(--orange-400)',
            transformOrigin: '0% 50%',
            transform: `rotate(${getHandAngle()}deg)`,
            zIndex: 1
          }} />

          {renderDialNumbers()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '0.78rem' }}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleOk} style={{ fontSize: '0.78rem', background: 'var(--orange-400)', borderColor: 'var(--orange-400)', color: '#fff' }}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default function WorkshopShop() {
  const [shop, setShop] = useState(initialShop);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [currentPageServices, setCurrentPageServices] = useState(1);
  const itemsPerPageServices = 5;
  const [pageInputServices, setPageInputServices] = useState('1');

  useEffect(() => {
    setPageInputServices(currentPageServices.toString());
  }, [currentPageServices]);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showLargeMap, setShowLargeMap] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [activeClock, setActiveClock] = useState(null); // { value, onSave }
  const [isSavingService, setIsSavingService] = useState(false);

  const showToast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: message,
        type: type
      }
    }));
  };

  const fetchShopData = async () => {
    try {
      const res = await apiService.get('/workshops/me');
      if (res && res.workshop) {
        const ws = res.workshop;
        setIsOwner(ws.isOwner || false);
        setShop(prev => ({
          ...prev,
          name: ws.name,
          phone: ws.phone,
          phone2: ws.owner_phone || prev.phone2,
          email: ws.owner_email || prev.email,
          address: ws.address,
          owner: ws.owner_name || prev.owner,
          status: ws.status === 'Active' ? 'active' : ws.status === 'Suspended' ? 'suspended' : 'cancelled',
          isOpen: ws.is_open,
          openTime: ws.open_time || '08:00',
          closeTime: ws.close_time || '17:00',
          isMobile: ws.is_mobile !== undefined ? ws.is_mobile : prev.isMobile,
          coverageRadius: ws.coverage_radius !== undefined ? ws.coverage_radius : prev.coverageRadius,
          cover_photo: ws.cover_photo || prev.cover_photo,
          lat: ws.lat,
          lng: ws.lng,
          rating_average: ws.rating_average !== undefined ? ws.rating_average : prev.rating_average,
          rating_count: ws.rating_count !== undefined ? ws.rating_count : prev.rating_count,
          joinDate: ws.created_at ? new Date(ws.created_at).toLocaleDateString('en-US') : prev.joinDate,
          weeklyCalendar: (ws.weekly_calendar && ws.weekly_calendar.length > 0 ? ws.weekly_calendar : prev.weeklyCalendar).filter(day => day.day_group !== 'Holiday'),
          services: ws.services || [],
        }));
      }
    } catch (err) {
      console.error('Failed to fetch workshop details in shop page:', err);
    }
  };

  const handleCoverPhotoChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast("File is too large. Please choose photos under 3MB.", 'error');
      return;
    }

    setIsUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiService.upload('/workshops/me/cover-photo', formData);
      if (response && response.cover_url) {
        setShop(prev => ({
          ...prev,
          cover_photo: response.cover_url
        }));
        showToast("Updated Workshop cover photo successfully.");
      }
    } catch (error) {
      console.error('Failed to upload workshop cover photo:', error);
      showToast(error.message || "Error uploading cover image to the server.", 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleUpdateStatusField = async (fields) => {
    const newOpenTime = fields.openTime !== undefined ? fields.openTime : shop.openTime;
    const newCloseTime = fields.closeTime !== undefined ? fields.closeTime : shop.closeTime;

    if (fields.openTime !== undefined || fields.closeTime !== undefined) {
      const [openH, openM] = newOpenTime.split(':').map(Number);
      const [closeH, closeM] = newCloseTime.split(':').map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;

      if (openMin >= closeMin) {
        showToast("Open time must be earlier than close time.", 'error');
        fetchShopData(); // Revert local state
        return;
      }
    }

    try {
      const updatedData = {};
      if (fields.isOpen !== undefined) updatedData.is_open = fields.isOpen;
      if (fields.isMobile !== undefined) updatedData.is_mobile = fields.isMobile;
      if (fields.coverageRadius !== undefined) updatedData.coverage_radius = fields.coverageRadius;
      if (fields.openTime !== undefined) updatedData.open_time = fields.openTime;
      if (fields.closeTime !== undefined) updatedData.close_time = fields.closeTime;

      const res = await apiService.put('/workshops/me', updatedData);
      if (res && res.workshop) {
        const ws = res.workshop;
        setShop(prev => ({
          ...prev,
          isOpen: ws.is_open,
          openTime: ws.open_time || '08:00',
          closeTime: ws.close_time || '17:00',
          isMobile: ws.is_mobile,
          coverageRadius: ws.coverage_radius,
          weeklyCalendar: (ws.weekly_calendar && ws.weekly_calendar.length > 0 ? ws.weekly_calendar : prev.weeklyCalendar).filter(day => day.day_group !== 'Holiday'),
        }));
        showToast("Updated operating hours successfully.");
      }
    } catch (err) {
      console.error('Failed to update workshop fields:', err);
      showToast(err.response?.data?.message || "Status update error.", 'error');
      fetchShopData(); // Revert local state
    }
  };

  const handleUpdateWeeklyCalendar = async (index, fields) => {
    try {
      const updatedCalendar = shop.weeklyCalendar.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          open_time: fields.openTime !== undefined ? fields.openTime : item.open_time,
          close_time: fields.closeTime !== undefined ? fields.closeTime : item.close_time,
          is_active: fields.isActive !== undefined ? fields.isActive : item.is_active,
        };
      });

      // Validate the single updated day
      const updatedItem = updatedCalendar[index];
      const [openH, openM] = updatedItem.open_time.split(':').map(Number);
      const [closeH, closeM] = updatedItem.close_time.split(':').map(Number);
      if (openH * 60 + openM >= closeH * 60 + closeM) {
        showToast(`Open time must be earlier than close time for ${updatedItem.day_group}.`, 'error');
        return;
      }

      setShop(prev => ({ ...prev, weeklyCalendar: updatedCalendar }));

      const res = await apiService.put('/workshops/me', { weekly_calendar: updatedCalendar });
      if (res && res.workshop) {
        const ws = res.workshop;
        setShop(prev => ({
          ...prev,
          weeklyCalendar: (ws.weekly_calendar || prev.weeklyCalendar).filter(day => day.day_group !== 'Holiday')
        }));
        showToast("Weekly calendar updated successfully.");
      }
    } catch (err) {
      console.error('Failed to update weekly calendar:', err);
      showToast(err.response?.data?.message || "Weekly calendar update error.", 'error');
      fetchShopData();
    }
  };

  useEffect(() => {
    fetchShopData();
  }, []);

  const handleCancelWorkshop = async () => {
    setShowCancel(false);
    try {
      await apiService.put('/workshops/me/cancel');
      showToast("Car workshop registration has been successfully canceled.");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to cancel workshop registration:', error);
      showToast(error.response?.data?.message || "Error while canceling store registration.", 'error');
    }
  };

  const handleToggleSuspend = async (action) => {
    try {
      const res = await apiService.put('/workshops/me/status', { action });
      if (res && res.workshop) {
        const ws = res.workshop;
        setShop(prev => ({
          ...prev,
          status: ws.status === 'Active' ? 'active' : ws.status === 'Suspended' ? 'suspended' : 'cancelled',
          isOpen: ws.is_open,
        }));
        showToast(action === 'pause' ? "The workshop has been successfully temporarily suspended." : "The workshop has been successfully reactivated.");
      }
    } catch (err) {
      console.error('Failed to toggle workshop status:', err);
      showToast(err.response?.data?.message || "Error when changing operating status.", 'error');
    }
  };
  const [newService, setNewService] = useState({ name: '', category: "Basic repair", price: '', unit: "turn", desc: '' });
  const [newServiceErrors, setNewServiceErrors] = useState({});
  const [addingService, setAddingService] = useState(false);

  const handleSave = async () => {
    try {
      await apiService.put('/workshops/me', {
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        lat: parseFloat(shop.lat),
        lng: parseFloat(shop.lng),
      });
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save workshop details:', err);
      showToast(err.response?.data?.message || "Error when saving Workshop information.", 'error');
    }
  };

  const toggleServiceActive = (id) => {
    setShop(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, active: !s.active } : s),
    }));
  };


  const addService = async () => {
    let errors = {};
    if (!newService.name.trim()) errors.name = "Please enter a service name.";

    const priceVal = parseFloat(newService.price.toString().replace(/\D/g, ''));
    if (!newService.price.toString().trim() || isNaN(priceVal)) {
      errors.price = "Please enter a price.";
    } else if (priceVal < 1000) {
      errors.price = "Price must be at least 1,000 VND.";
    }

    if (Object.keys(errors).length > 0) {
      setNewServiceErrors(errors);
      return;
    }

    if (isSavingService) return;
    setIsSavingService(true);

    try {
      const res = await apiService.post('/workshops/me/services', newService);
      if (res && res.workshop) {
        showToast("Service added successfully.");
        setShop(prev => ({
          ...prev,
          services: res.workshop.services
        }));
        setNewService({ name: '', category: "Basic repair", price: '', unit: "turn", desc: '' });
        setNewServiceErrors({});
        setAddingService(false);
      }
    } catch (err) {
      console.error('Failed to add service:', err);
      showToast(err.response?.data?.message || "Failed to add service.", 'error');
    } finally {
      setIsSavingService(false);
    }
  };

  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceData, setEditingServiceData] = useState({});
  const [editingServiceErrors, setEditingServiceErrors] = useState({});

  const startEditService = (service) => {
    setEditingServiceId(service.id || service._id);
    setEditingServiceData({
      name: service.service_name || service.name || '',
      category: service.category || 'Basic repair',
      price: service.base_price?.toString() || service.price?.toString() || '',
      unit: service.unit || 'turn',
      desc: service.desc || ''
    });
    setEditingServiceErrors({});
  };

  const saveEditedService = async () => {
    let errors = {};
    if (!editingServiceData.name.trim()) errors.name = "Please enter a service name.";

    const priceVal = parseFloat(editingServiceData.price.toString().replace(/\D/g, ''));
    if (!editingServiceData.price.toString().trim() || isNaN(priceVal)) {
      errors.price = "Please enter a price.";
    } else if (priceVal < 1000) {
      errors.price = "Price must be at least 1,000 VND.";
    }

    if (Object.keys(errors).length > 0) {
      setEditingServiceErrors(errors);
      return;
    }

    if (isSavingService) return;
    setIsSavingService(true);

    try {
      const res = await apiService.put(`/workshops/me/services/${editingServiceId}`, editingServiceData);
      if (res && res.workshop) {
        showToast("Service updated successfully.");
        setShop(prev => ({
          ...prev,
          services: res.workshop.services
        }));
        setEditingServiceId(null);
      }
    } catch (err) {
      console.error('Failed to update service:', err);
      if (err.response?.data?.message) {
        showToast(err.response.data.message, 'error');
      } else {
        showToast("Failed to update service.", 'error');
      }
    } finally {
      setIsSavingService(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const confirmDeleteService = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsSavingService(true);
      const res = await apiService.delete(`/workshops/me/services/${deleteConfirmId}`);
      if (res && res.success) {
        showToast("Service deleted successfully.");
        setShop(prev => ({
          ...prev,
          services: prev.services.filter(s => (s.id || s._id) !== deleteConfirmId)
        }));
      }
    } catch (err) {
      console.error('Failed to delete service:', err);
      showToast(err.response?.data?.message || "Failed to delete service.", 'error');
    } finally {
      setIsSavingService(false);
      setDeleteConfirmId(null);
    }
  };

  const statusColor = { active: 'var(--green-400)', suspended: 'var(--orange-400)', cancelled: 'var(--text-muted)' };
  const statusLabel = { active: "Work", suspended: "Pause", cancelled: "Unsubscribed" };
  const statusBg = { active: 'rgba(34,197,94,0.1)', suspended: 'rgba(249,115,22,0.1)', cancelled: 'rgba(148,163,184,0.1)' };
  const statusBorder = { active: 'rgba(34,197,94,0.25)', suspended: 'rgba(249,115,22,0.25)', cancelled: 'rgba(148,163,184,0.25)' };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1>Workshop Profile & Services</h1>
            <p>Manage workshop information, service list, prices and operating status</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <div className="flex items-center gap-2" style={{ color: 'var(--green-400)', fontWeight: 600, fontSize: '0.875rem' }}>
                <CheckCircle size={15} /> Saved
              </div>
            )}
            {isOwner && (
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                <Edit3 size={14} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20, maxWidth: 500 }}>
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <Wrench size={13} /> Shop information
        </button>
        <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
          <Edit3 size={13} /> Services & Prices
        </button>
        <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
          <ToggleRight size={13} /> Status
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="grid" style={{ gridTemplateColumns: '0.65fr 1.35fr', gap: 16 }}>
          {/* Identity card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
            <div className="card p-6" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden', paddingTop: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              {isUploadingCover && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  gap: 8
                }}>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div style={{ width: 24, height: 24, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Loading cover art...
                </div>
              )}
              {shop.cover_photo ? (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${shop.cover_photo})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  borderTopLeftRadius: 'var(--r-lg)',
                  borderBottomLeftRadius: 'var(--r-lg)'
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(15, 23, 42, 0.9) 100%)', borderTopLeftRadius: 'var(--r-lg)', borderBottomLeftRadius: 'var(--r-lg)' }} />
                </div>
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(217,119,6,0.08), transparent 60%)', zIndex: 0 }} />
              )}

              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: shop.cover_photo ? '#ffffff' : 'var(--text-primary)', marginBottom: 4, position: 'relative', zIndex: 1, textShadow: shop.cover_photo ? '0 1px 4px rgba(0,0,0,0.8)' : 'none', marginTop: shop.cover_photo ? '24px' : '0px' }}>{shop.name}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: statusBg[shop.status] || 'rgba(148,163,184,0.1)', border: `1px solid ${statusBorder[shop.status] || 'rgba(148,163,184,0.25)'}`, fontSize: '0.72rem', fontWeight: 700, color: statusColor[shop.status], marginBottom: 14, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor[shop.status], boxShadow: `0 0 6px ${statusColor[shop.status]}` }} />
                {statusLabel[shop.status]}
              </div>

              {/* User info preview */}
              <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', background: shop.cover_photo ? 'rgba(15, 23, 42, 0.5)' : 'rgba(6,182,212,0.05)', backdropFilter: shop.cover_photo ? 'blur(10px)' : 'none', border: shop.cover_photo ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-dim)', textAlign: 'left', marginBottom: 14, width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1, boxShadow: shop.cover_photo ? '0 4px 12px rgba(0,0,0,0.2)' : 'none' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: shop.cover_photo ? '#ffffff' : 'var(--text-primary)', marginBottom: 2 }}>{shop.owner || "Owner"}</div>
                <div style={{ fontSize: '0.75rem', color: shop.cover_photo ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: 8 }}>{shop.email}</div>
                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '3px 10px', background: shop.cover_photo ? 'rgba(6,182,212,0.2)' : undefined, border: shop.cover_photo ? '1px solid rgba(6,182,212,0.4)' : undefined, color: shop.cover_photo ? '#67e8f9' : undefined }}>
                  CAR REPAIR SHOP OWNER
                </span>
              </div>

              {/* Upload cover photo */}
              <label
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 2,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: isUploadingCover ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={e => {
                  if (!isUploadingCover) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isUploadingCover) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                title="Change cover photo"
              >
                {isUploadingCover ? (
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Camera size={18} />
                )}
                <input type="file" accept="image/*" onChange={handleCoverPhotoChange} style={{ display: 'none' }} disabled={isUploadingCover || !isOwner} />
              </label>
            </div>

            {/* Quick stats */}
            <div className="card p-5" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="section-title" style={{ marginBottom: 10 }}>Workshop statistics</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {[
                  { label: "Registration date", value: shop.joinDate },
                  { label: "Current service", value: `${shop.services.filter(s => s.active).length} service` },
                  { label: "Average rating", value: `${shop.rating_average ? Number(shop.rating_average).toFixed(1) : '0.0'} ★ (${shop.rating_count || 0} Evaluate)` },
                ].map(s => (
                  <div key={s.label} className="flex justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-dim)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 16 }}>Detailed information</div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              {[
                { key: 'name', label: "Workshop name" },
                { key: 'phone', label: "Workshop phone number" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{field.label}</label>
                  {field.type === 'select' ? (
                    <select className="input" value={shop[field.key]} onChange={e => setShop(p => ({ ...p, [field.key]: e.target.value }))} disabled={!editing}>
                      {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <input className="input" value={shop[field.key]} onChange={e => setShop(p => ({ ...p, [field.key]: e.target.value }))} disabled={!editing} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Full address</label>
              <div className="input-group">
                <MapPin size={14} className="input-icon" />
                <input className="input" value={shop.address} onChange={e => setShop(p => ({ ...p, address: e.target.value }))} disabled={!editing} />
              </div>
            </div>

            {/* Vị trí trên bản đồ */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Location on map</label>
              {shop.lat && shop.lng ? (
                <div
                  onClick={() => setShowLargeMap(true)}
                  style={{
                    position: 'relative',
                    height: '180px',
                    width: '100%',
                    borderRadius: 'var(--r-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-dim)',
                    cursor: 'pointer'
                  }}
                >
                  <MapContainer
                    key={`${shop.lat}-${shop.lng}`}
                    center={[shop.lat, shop.lng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    dragging={false}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                  >
                    <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />
                    <Marker position={[shop.lat, shop.lng]} icon={customMarkerIcon} />
                  </MapContainer>

                  {/* Hover visual label overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      zIndex: 1001,
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                  >
                    Click to expand the map
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Map coordinates have not been updated
                </div>
              )}
            </div>


          </div>
        </div>
      )}

      {/* Tab: Services */}
      {activeTab === 'services' && (
        <div>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {shop.services.filter(s => s.active).length} service is active
            </div>
            {isOwner && (
              <button className="btn btn-primary btn-sm" onClick={() => { setAddingService(true); setNewService({ name: '', category: "Basic repair", price: '', unit: "turn", desc: '' }); setNewServiceErrors({}); }}>
                <Plus size={13} /> Add services
              </button>
            )}
          </div>

          {addingService && (
            <div className="card p-5" style={{ marginBottom: 16, border: '1px solid rgba(217,119,6,0.3)' }}>
              <div className="section-title" style={{ marginBottom: 12 }}>Add new service</div>
              <div className="grid grid-3" style={{ gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service name</label>
                  <input className="input" maxLength={100} value={newService.name} onChange={e => { setNewService(p => ({ ...p, name: e.target.value })); setNewServiceErrors(p => ({ ...p, name: '' })); }} placeholder="Example: Dry the flooded car" style={{ borderColor: newServiceErrors.name ? 'var(--red-400)' : undefined }} />
                  {newServiceErrors.name && <div style={{ fontSize: '0.7rem', color: 'var(--red-400)', marginTop: 4 }}>{newServiceErrors.name}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Price (VND)</label>
                  <input className="input" maxLength={15} value={newService.price} onChange={e => { setNewService(p => ({ ...p, price: e.target.value.replace(/\D/g, '') })); setNewServiceErrors(p => ({ ...p, price: '' })); }} placeholder="VD: 1000" style={{ borderColor: newServiceErrors.price ? 'var(--red-400)' : undefined }} />
                  {newServiceErrors.price && <div style={{ fontSize: '0.7rem', color: 'var(--red-400)', marginTop: 4 }}>{newServiceErrors.price}</div>}
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Unit</label>
                  <input className="input" maxLength={30} value={newService.unit} onChange={e => setNewService(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. turn, piece..." />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {UNIT_SUGGESTIONS.filter(u => u.toLowerCase().includes((newService.unit || '').toLowerCase())).map(u => (
                      <button
                        key={u}
                        type="button"
                        className="badge"
                        style={{ cursor: 'pointer', background: newService.unit === u ? 'var(--cyan-400)' : 'rgba(255,255,255,0.05)', color: newService.unit === u ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-dim)', fontSize: '0.6rem', padding: '2px 5px' }}
                        onClick={() => setNewService(p => ({ ...p, unit: u }))}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea className="input" maxLength={300} rows={2} placeholder="Service description..." value={newService.desc} onChange={e => setNewService(p => ({ ...p, desc: e.target.value }))} style={{ marginBottom: 10 }} />
              <div className="flex gap-3">
                <button className="btn btn-success btn-sm" onClick={addService} disabled={isSavingService}>
                  <CheckCircle size={13} /> {isSavingService ? "Adding..." : "Add"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingService(false); setNewService({ name: '', category: "Basic repair", price: '', unit: "turn", desc: '' }); setNewServiceErrors({}); }} disabled={isSavingService}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {(() => {
              const totalPagesServices = Math.ceil(shop.services.length / itemsPerPageServices);
              const paginatedServices = shop.services.slice((currentPageServices - 1) * itemsPerPageServices, currentPageServices * itemsPerPageServices);
              return (
                <>
                  {paginatedServices.map(s => (
                    editingServiceId === (s.id || s._id) ? (
                      <div key={s.id || s._id} className="card p-5" style={{ border: '1px solid var(--border-dim)' }}>
                        <div className="section-title" style={{ marginBottom: 12 }}>Edit service</div>
                        <div className="grid grid-3" style={{ gap: 10, marginBottom: 10 }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service name</label>
                            <input className="input" maxLength={100} value={editingServiceData.name} onChange={e => { setEditingServiceData(p => ({ ...p, name: e.target.value })); setEditingServiceErrors(p => ({ ...p, name: '' })); }} placeholder="Example: Dry the flooded car" style={{ borderColor: editingServiceErrors.name ? 'var(--red-400)' : undefined }} />
                            {editingServiceErrors.name && <div style={{ fontSize: '0.7rem', color: 'var(--red-400)', marginTop: 4 }}>{editingServiceErrors.name}</div>}
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Price (VND)</label>
                            <input className="input" maxLength={15} value={editingServiceData.price} onChange={e => { setEditingServiceData(p => ({ ...p, price: e.target.value.replace(/\D/g, '') })); setEditingServiceErrors(p => ({ ...p, price: '' })); }} placeholder="VD: 1000" style={{ borderColor: editingServiceErrors.price ? 'var(--red-400)' : undefined }} />
                            {editingServiceErrors.price && <div style={{ fontSize: '0.7rem', color: 'var(--red-400)', marginTop: 4 }}>{editingServiceErrors.price}</div>}
                          </div>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Unit</label>
                            <input className="input" maxLength={30} value={editingServiceData.unit} onChange={e => setEditingServiceData(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. turn, piece..." />
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {UNIT_SUGGESTIONS.filter(u => u.toLowerCase().includes((editingServiceData.unit || '').toLowerCase())).map(u => (
                                <button
                                  key={u}
                                  type="button"
                                  className="badge"
                                  style={{ cursor: 'pointer', background: editingServiceData.unit === u ? 'var(--cyan-400)' : 'rgba(255,255,255,0.05)', color: editingServiceData.unit === u ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-dim)', fontSize: '0.6rem', padding: '2px 5px' }}
                                  onClick={() => setEditingServiceData(p => ({ ...p, unit: u }))}
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <textarea className="input" maxLength={300} rows={2} placeholder="Service description..." value={editingServiceData.desc} onChange={e => setEditingServiceData(p => ({ ...p, desc: e.target.value }))} style={{ marginBottom: 10 }} />
                        <div className="flex gap-3">
                          <button className="btn btn-success btn-sm" onClick={saveEditedService} disabled={isSavingService}>
                            <CheckCircle size={13} /> {isSavingService ? "Saving..." : "Save"}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingServiceId(null)} disabled={isSavingService}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div key={s.id || s._id} className="card" style={{
                        padding: '14px 18px',
                        borderLeft: s.active ? '3px solid #f59e0b' : '3px solid var(--border-dim)',
                        opacity: s.active ? 1 : 0.55,
                      }}>
                        <div className="flex items-start justify-between gap-4">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {!s.active && (
                              <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                                <span className="badge" style={{ fontSize: '0.62rem', background: 'rgba(71,85,105,0.2)', color: 'var(--text-muted)', border: 'none' }}>TURN OFF</span>
                              </div>
                            )}
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: 3, wordBreak: 'break-word' }}>{s.service_name || s.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{s.desc}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f59e0b', fontSize: '0.92rem', wordBreak: 'break-word' }}>
                              {parseInt((s.base_price?.toString() || s.price?.toString() || '0').replace(/\D/g, '')).toLocaleString('vi-VN')} VND / {s.unit || 'turn'}
                            </div>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-2">
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--text-primary)' }} onClick={() => startEditService(s)}>
                                <Edit3 size={13} style={{ marginRight: 4 }} /> Edit
                              </button>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--red-400)' }} onClick={() => setDeleteConfirmId(s.id || s._id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                  {shop.services.length > 0 && (
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
                        Showing <strong style={{ color: 'var(--text-primary)' }}>{shop.services.length === 0 ? 0 : (currentPageServices - 1) * itemsPerPageServices + 1}-{Math.min(currentPageServices * itemsPerPageServices, shop.services.length)}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{shop.services.length}</strong> services
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setCurrentPageServices(p => Math.max(1, p - 1))}
                          disabled={currentPageServices === 1}
                          style={{ opacity: currentPageServices === 1 ? 0.5 : 1 }}
                        >
                          Previous
                        </button>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          Page
                          <input
                            type="number"
                            min={1}
                            max={totalPagesServices}
                            value={pageInputServices}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              setPageInputServices(valStr);
                              const val = parseInt(valStr, 10);
                              if (!isNaN(val) && val >= 1 && val <= totalPagesServices) {
                                setCurrentPageServices(val);
                              }
                            }}
                            onBlur={() => {
                              setPageInputServices(currentPageServices.toString());
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
                          of {totalPagesServices}
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setCurrentPageServices(p => Math.min(totalPagesServices, p + 1))}
                          disabled={currentPageServices === totalPagesServices}
                          style={{ opacity: currentPageServices === totalPagesServices ? 0.5 : 1 }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab: Status */}
      {activeTab === 'status' && (
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 14 }}>Adjust operating status</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{
                padding: '16px',
                borderRadius: 'var(--r-md)',
                border: shop.isOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border-dim)',
                background: shop.isOpen ? 'rgba(34,197,94,0.06)' : 'rgba(148,163,184,0.05)',
                transition: 'all 0.2s ease'
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Open status</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Update immediately on the system</div>
                  </div>
                  <label className="toggle" style={{ transform: 'scale(1.15)' }}>
                    <input type="checkbox" checked={shop.isOpen} onChange={(e) => handleUpdateStatusField({ isOpen: e.target.checked })} disabled={!isOwner} />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div style={{ marginTop: 10, fontSize: '0.82rem', fontWeight: 700, color: shop.isOpen ? 'var(--green-400)' : 'var(--text-muted)' }}>
                  {shop.isOpen ? "● OPEN – customers can find the Workshop" : "○ IS CLOSED – the workshop is hidden from search"}
                </div>
              </div>

              {/* Cứu hộ lưu động */}
              <div style={{ padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: 'rgba(61,125,176,0.04)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Mobile rescue</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>On-site vehicle repair support when rescue is required</div>
                  </div>
                  <label className="toggle" style={{ transform: 'scale(1.15)' }}>
                    <input type="checkbox" checked={shop.isMobile} onChange={(e) => handleUpdateStatusField({ isMobile: e.target.checked })} disabled={!isOwner} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {/* Phạm vi hoạt động */}
              {shop.isMobile && (
                <div style={{ padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: 'rgba(61,125,176,0.04)' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Operating range (Radius)</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Maximum service radius for mobile rescue applications</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={shop.coverageRadius}
                      onChange={e => setShop(p => ({ ...p, coverageRadius: Number(e.target.value) }))}
                      onMouseUp={e => handleUpdateStatusField({ coverageRadius: Number(e.target.value) })}
                      onTouchEnd={e => handleUpdateStatusField({ coverageRadius: Number(e.target.value) })}
                      style={{ flex: 1 }}
                      disabled={!isOwner}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem', minWidth: 50, textAlign: 'right' }}>{shop.coverageRadius} km</span>
                  </div>
                </div>
              )}

              {isOwner && (
                <>
                  {shop.status === 'active' ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ borderColor: 'var(--orange-400)', color: 'var(--orange-400)' }}
                      onClick={() => setShowSuspend(true)}
                    >
                      <PauseCircle size={13} /> Temporarily stopped operating
                    </button>
                  ) : shop.status === 'suspended' ? (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ background: 'var(--green-500)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => handleToggleSuspend('resume')}
                    >
                      <CheckCircle size={13} style={{ marginRight: 6 }} /> Enable activity again
                    </button>
                  ) : null}
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: 'var(--red-400)', color: 'var(--red-400)' }}
                    onClick={() => setShowCancel(true)}
                  >
                    <XCircle size={13} /> Cancel the workshop registration
                  </button>
                </>
              )}

            </div>
          </div>

          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 14 }}>Hours of operation</div>

            {shop.weeklyCalendar && shop.weeklyCalendar.some(day => day.is_active) ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--orange-400)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} />
                <span>* Custom operating hours are active</span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Open time</label>
                  <TimeInputTrigger
                    value={shop.openTime}
                    onClick={() => setActiveClock({
                      value: shop.openTime,
                      onSave: val => {
                        setShop(p => ({ ...p, openTime: val }));
                        handleUpdateStatusField({ openTime: val });
                      }
                    })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Close time</label>
                  <TimeInputTrigger
                    value={shop.closeTime}
                    onClick={() => setActiveClock({
                      value: shop.closeTime,
                      onSave: val => {
                        setShop(p => ({ ...p, closeTime: val }));
                        handleUpdateStatusField({ closeTime: val });
                      }
                    })}
                  />
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 14 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>Weekly reference calendar</div>
              {(shop.weeklyCalendar || []).map((row, index) => (
                <div key={row.day_group || index} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-dim)', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{row.day_group}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {row.is_active ? `${row.open_time} – ${row.close_time}` : "Closed"}
                    </div>
                  </div>

                  {row.is_active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TimeInputTrigger
                        value={row.open_time}
                        onClick={isOwner ? () => setActiveClock({
                          value: row.open_time,
                          onSave: val => {
                            setShop(p => ({
                              ...p,
                              weeklyCalendar: p.weeklyCalendar.map((item, idx) => idx === index ? { ...item, open_time: val } : item)
                            }));
                            handleUpdateWeeklyCalendar(index, { openTime: val });
                          }
                        }) : undefined}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                      <TimeInputTrigger
                        value={row.close_time}
                        onClick={isOwner ? () => setActiveClock({
                          value: row.close_time,
                          onSave: val => {
                            setShop(p => ({
                              ...p,
                              weeklyCalendar: p.weeklyCalendar.map((item, idx) => idx === index ? { ...item, close_time: val } : item)
                            }));
                            handleUpdateWeeklyCalendar(index, { closeTime: val });
                          }
                        }) : undefined}
                      />
                    </div>
                  )}

                  <label className="toggle" style={{ transform: 'scale(0.85)' }}>
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={e => handleUpdateWeeklyCalendar(index, { isActive: e.target.checked })}
                      disabled={!isOwner}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>

            <div className="alert-banner info" style={{ marginTop: 14 }}>
              <Clock size={14} color="var(--cyan-400)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                During the rainy season, operating hours should be expanded to support the community and receive additional contribution points.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals rendered at the root viewport level */}
      <ConfirmModal
        isOpen={showSuspend}
        title="Temporarily Close Workshop"
        message="Are you sure you want to temporarily suspend your workshop? The workshop will not accept new applications or appear in search results during the temporary suspension period."
        confirmText="Confirm"
        type="warning"
        onConfirm={() => { handleToggleSuspend('pause'); setShowSuspend(false); }}
        onCancel={() => setShowSuspend(false)}
      />

      <ConfirmModal
        isOpen={showCancel}
        title="Cancel Registration"
        message="Are you sure you want to deregister your workshop and withdraw from being a Workshop Owner? This action will remove the workshop from the system."
        confirmText="Confirm"
        onConfirm={handleCancelWorkshop}
        onCancel={() => setShowCancel(false)}
      />

      {showLargeMap && (
        <div className="modal-overlay" onClick={() => setShowLargeMap(false)} style={{ zIndex: 10000 }}>
          <div className="modal" style={{ maxWidth: 640, width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Workshop location map</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowLargeMap(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
              <MapContainer
                key={`large-${shop.lat}-${shop.lng}`}
                center={[shop.lat, shop.lng]}
                zoom={17}
                style={{ height: '100%', width: '100%' }}
              >
                <GoongMaplibreLayer apiKey="S6RMPleSOa7QXQgi5byo4rewtt9pRnwzzHjetKjf" />
                <Marker position={[shop.lat, shop.lng]} icon={customMarkerIcon} />
              </MapContainer>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '75%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {shop.address}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLargeMap(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <WorkshopEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        initialData={shop}
        onSuccess={async () => {
          setShowEditModal(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          await fetchShopData();
        }}
      />

      <CircularClockPicker
        isOpen={!!activeClock}
        value={activeClock?.value}
        onClose={() => setActiveClock(null)}
        onSave={activeClock?.onSave}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        loading={isSavingService}
        onConfirm={confirmDeleteService}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
