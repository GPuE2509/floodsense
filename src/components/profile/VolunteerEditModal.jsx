import React, { useState, useEffect } from 'react';
import { Camera, MapPin, X, Save, AlertTriangle } from 'lucide-react';
import { apiService } from '../../services/apiService';

export default function VolunteerEditModal({ isOpen, onClose, onSuccess, initialData }) {
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [currentLat, setCurrentLat] = useState('');
  const [currentLng, setCurrentLng] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setVehicleType(initialData.vehicle_type || '');
      setVehiclePlate(initialData.vehicle_plate || '');
      setCurrentLat(initialData.current_lat || '');
      setCurrentLng(initialData.current_lng || '');
      setImagePreview(initialData.vehicle_image || '');
      setImageFile(null); // Clear any previously selected file
      setError('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Please choose photos under 5MB.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleGetLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError("Your browser does not support location retrieval.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLat(position.coords.latitude.toFixed(6));
        setCurrentLng(position.coords.longitude.toFixed(6));
      },
      (err) => {
        console.error("Error getting location:", err);
        setError("Unable to get location. Please grant location access or enter manually.");
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!vehicleType) {
      setError("Please select vehicle type.");
      return;
    }

    if (!vehiclePlate || !vehiclePlate.trim()) {
      setError("Please enter vehicle license plate number.");
      return;
    }

    const plateRegex = /^[1-9][0-9][A-Z][A-Z0-9]?[\s-]?[0-9]{3}\.?[0-9]{2}$|^[1-9][0-9][A-Z][A-Z0-9]?[\s-]?[0-9]{4}$/i;
    if (!plateRegex.test(vehiclePlate.trim())) {
      setError("Invalid vehicle license plate (Example: 65H-123.45).");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('vehicle_type', vehicleType);
      formData.append('vehicle_plate', vehiclePlate);
      if (currentLat) formData.append('current_lat', currentLat);
      if (currentLng) formData.append('current_lng', currentLng);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await apiService.upload('/volunteers/me', formData, {}, 'PUT');
      
      onSuccess();
    } catch (err) {
      setError(err.message || "Update error. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="card" style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Update rescue vehicles</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
            You can update the latest vehicle information or license plate here. This does not change the current operating state.
          </p>

          <form id="volunteer-edit-form" onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            
            {/* Loại phương tiện */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                Vehicle type <span style={{ color: 'var(--red-400)' }}>*</span>
              </label>
              <select 
                className="input" 
                value={vehicleType} 
                onChange={(e) => setVehicleType(e.target.value)}
                style={{ width: '100%' }}
                required
              >
                <option value="" disabled>-- Select vehicle type --</option>
                <option value="Canoe">Canoe / Boat</option>
                <option value="Pickup_Truck">Pickup truck (High clearance)</option>
                <option value="Wading_Motorcycle">Amphibious motorbike</option>
                <option value="Other">Other vehicles</option>
              </select>
            </div>

            {/* Biển số phương tiện */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                Vehicle license plate number <span style={{ color: 'var(--red-400)' }}>*</span>
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="For example: 65H-123.45"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                style={{ width: '100%', textTransform: 'uppercase' }}
                required
              />
            </div>

            {/* Hình ảnh */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'block' }}>
                Actual vehicle photos <span style={{ color: 'var(--red-400)' }}>*</span>
              </label>
              <div style={{ 
                border: '1px dashed var(--border-dim)', 
                borderRadius: 'var(--r-md)', 
                padding: '16px', 
                textAlign: 'center',
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
                position: 'relative'
              }}>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                />
                
                {imagePreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 'var(--r-sm)', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--cyan-400)', fontWeight: 500 }}>Click to change to a new photo</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                    <Camera size={24} />
                    <div style={{ fontSize: '0.8rem' }}>Click to upload photo (Max 5MB)</div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--red-400)', padding: '10px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--r-sm)' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
          </form>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" form="volunteer-edit-form" className="btn btn-primary" disabled={isLoading} style={{ background: 'var(--cyan-500)', color: '#fff', border: 'none' }}>
            {isLoading ? "Saving..." : <><Save size={14} /> Save changes</>}
          </button>
        </div>
        
      </div>
    </div>
  );
}
