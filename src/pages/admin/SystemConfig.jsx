import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import {
  Power, Save, AlertTriangle, CheckCircle, Sliders,
} from 'lucide-react';
const defaultSystemModules = [
  { id: 'module_forum', name: "Community Forum", description: "Enable/Disable community forum for sharing flood and traffic information", status: true, critical: false },
  { id: 'module_chat', name: "Real-time Chat & Notifications", description: "Enable/Disable real-time chat support and emergency system notifications", status: true, critical: false },
  { id: 'module_rescue', name: "SOS & Rescue System", description: "Enable/Disable SOS emergency signals and rescue dispatching system", status: true, critical: true },
  { id: 'module_map', name: "Warning Map & Reports", description: "Enable/Disable real-time warning heatmap and community incident reporting", status: true, critical: true },
  { id: 'module_forecast', name: "Weather Forecast", description: "Enable/Disable weather forecasting banner and forecast detail page", status: true, critical: false },
  { id: 'module_extensions', name: "Extension Features & Rewards", description: "Enable/Disable gamified reward points, honorary leaderboards, and car repair workshop profiles", status: true, critical: false },
];

function ModuleCard({ mod, onToggle }) {
  return (
    <div
      className="card p-5"
      style={{
        borderLeft: `3px solid ${mod.status ? 'var(--green-500)' : 'var(--text-muted)'}`,
        transition: 'all 0.3s',
        ...(mod.status && mod.critical ? { boxShadow: '0 0 16px rgba(34,197,94,0.12)' } : {}),
      }}
    >
      <div className="flex items-start justify-between">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
              {mod.name}
            </span>
            {mod.critical && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red-400)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 7px', borderRadius: 99 }}>
                CRITICAL
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mod.description}</div>
          <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
            <div className={`pulse-dot ${mod.status ? 'green' : ''}`} style={{ width: 8, height: 8, background: mod.status ? 'var(--green-500)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.75rem', color: mod.status ? 'var(--green-400)' : 'var(--text-muted)', fontWeight: 600 }}>
              {mod.status ? "Active" : "Turn off"}
            </span>
          </div>
        </div>
        <label className="toggle" style={{ marginLeft: 16 }}>
          <input type="checkbox" checked={mod.status} onChange={() => onToggle(mod.id)} />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
}

function AlertThresholdSlider({ label, value, onChange, min, max, unit, colorClass }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: `var(--${colorClass}-400)`, fontSize: '1rem' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--${colorClass}-500) 0%, var(--${colorClass}-500) ${((value - min) / (max - min)) * 100}%, var(--bg-elevated) ${((value - min) / (max - min)) * 100}%, var(--bg-elevated) 100%)`,
        }}
      />
      <div className="flex justify-between" style={{ marginTop: 4 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{min}{unit}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function SystemConfig() {
  const [modules, setModules] = useState(defaultSystemModules);
  const [thresholds, setThresholds] = useState({
    waterLevelL1: 20,
    waterLevelL2: 40,
    waterLevelL3: 50,
    waterLevelL4: 60,
  });

  const [risingSpeedThreshold, setRisingSpeedThreshold] = useState(5);
  const [savingSpeed, setSavingSpeed] = useState(false);
  const [savedSpeed, setSavedSpeed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res.success && res.data) {
          const c = res.data;
          setThresholds({
            waterLevelL1: c.water_level_l1 ?? 20,
            waterLevelL2: c.water_level_l2 ?? 40,
            waterLevelL3: c.water_level_l3 ?? 50,
            waterLevelL4: c.water_level_l4 ?? 60,
          });
          setRisingSpeedThreshold(c.water_rising_speed_threshold ?? 5);

          // Map DB states to modules toggles list
          setModules(prev => prev.map(m => ({
            ...m,
            status: c[m.id] !== false
          })));
        }
      } catch (err) {
        console.error('Failed to fetch system config:', err);
      }
    };
    fetchConfig();
  }, []);

  const toggleModule = (id) => {
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, status: !m.status } : m));
  };

  const handleWaterLevelChange = (levelIndex, value) => {
    setThresholds(prev => {
      const current = [
        prev.waterLevelL1,
        prev.waterLevelL2,
        prev.waterLevelL3,
        prev.waterLevelL4
      ];
      
      // Validation: lower level must be strictly less than higher level
      if (levelIndex === 0 && value >= current[1]) return prev;
      if (levelIndex === 1 && (value <= current[0] || value >= current[2])) return prev;
      if (levelIndex === 2 && (value <= current[1] || value >= current[3])) return prev;
      if (levelIndex === 3 && value <= current[2]) return prev;
      
      const keys = ['waterLevelL1', 'waterLevelL2', 'waterLevelL3', 'waterLevelL4'];
      return {
        ...prev,
        [keys[levelIndex]]: value
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        water_level_l1: thresholds.waterLevelL1,
        water_level_l2: thresholds.waterLevelL2,
        water_level_l3: thresholds.waterLevelL3,
        water_level_l4: thresholds.waterLevelL4,
      };

      modules.forEach(m => {
        payload[m.id] = m.status;
      });

      const res = await apiService.put('/auth/admin/config', payload);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSpeed = async () => {
    setSavingSpeed(true);
    try {
      const res = await apiService.put('/auth/admin/config', {
        water_rising_speed_threshold: risingSpeedThreshold,
      });
      if (res.success) {
        setSavedSpeed(true);
        setTimeout(() => setSavedSpeed(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to save rising speed threshold');
    } finally {
      setSavingSpeed(false);
    }
  };

  return (
    <div className="page-enter">
      <style>{`
        .syscfg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .syscfg-module-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .syscfg-threshold-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          column-gap: 40px;
        }
        @media (max-width: 768px) {
          .syscfg-module-grid {
            grid-template-columns: 1fr;
          }
          .syscfg-threshold-grid {
            grid-template-columns: 1fr;
            column-gap: 0;
          }
        }
      `}</style>
      <div className="page-header">
        <div className="syscfg-header">
          <div>
            <h1>System Configuration</h1>
          </div>
          <div className="flex gap-3">
            {saved && (
              <div className="flex items-center gap-2" style={{ color: 'var(--green-400)', fontWeight: 600, fontSize: '0.875rem' }}>
                <CheckCircle size={15} /> Saved successfully!
              </div>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save configuration</>}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, maxWidth: 1000, margin: '0 auto' }}>
        {/* Module toggles */}
        <div className="card p-6">
          <div className="section-header">
            <div className="section-title">
              <Power size={15} style={{ color: 'var(--blue-400)' }} />
              System Module Management
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {modules.filter(m => m.status).length}/{modules.length} running
            </span>
          </div>

          {/* Warning */}
          <div className="alert-banner warning" style={{ marginBottom: 16 }}>
            <AlertTriangle size={16} color="var(--orange-400)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Turn off the module <strong>CRITICAL</strong> will seriously affect system operation.
            </div>
          </div>

          <div className="syscfg-module-grid">
            {modules.map((mod) => (
              <ModuleCard key={mod.id} mod={mod} onToggle={toggleModule} />
            ))}
          </div>
        </div>

        {/* Alert Thresholds */}
        <div>
          {/* Alert Thresholds */}
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 20 }}>
              <Sliders size={15} style={{ color: 'var(--blue-400)' }} />
              Automatic Warning Thresholds
            </div>
            <div className="syscfg-threshold-grid">
              <AlertThresholdSlider
              label="🌊 Water Level Warning (Level 1 - Slight)"
              value={thresholds.waterLevelL1}
              onChange={(v) => handleWaterLevelChange(0, v)}
              min={1} max={100} unit="%" colorClass="gold"
            />
            <AlertThresholdSlider
              label="🌊 Water Level Warning (Level 2 - Moderate)"
              value={thresholds.waterLevelL2}
              onChange={(v) => handleWaterLevelChange(1, v)}
              min={1} max={100} unit="%" colorClass="orange"
            />
            <AlertThresholdSlider
              label="🌊 Water Level Warning (Level 3 - Severe)"
              value={thresholds.waterLevelL3}
              onChange={(v) => handleWaterLevelChange(2, v)}
              min={1} max={100} unit="%" colorClass="red"
            />
            <AlertThresholdSlider
              label="🌊 Water Level Warning (Level 4 - Critical)"
              value={thresholds.waterLevelL4}
              onChange={(v) => handleWaterLevelChange(3, v)}
              min={1} max={100} unit="%" colorClass="purple"
            />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save Thresholds</>}
              </button>
            </div>
          </div>

          {/* Water Rising Speed Threshold */}
          <div className="card p-6" style={{ marginTop: 20 }}>
            <div className="section-title" style={{ marginBottom: 20 }}>
              <Sliders size={15} style={{ color: 'var(--orange-400)' }} />
              Water Rising Speed Threshold
            </div>
            <div style={{ maxWidth: 480 }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>Alert Threshold (cm/min)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--orange-400)', fontSize: '1rem' }}>
                  {risingSpeedThreshold} cm/min
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={risingSpeedThreshold}
                onChange={(e) => setRisingSpeedThreshold(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, var(--orange-500) 0%, var(--orange-500) ${((risingSpeedThreshold - 1) / (30 - 1)) * 100}%, var(--bg-elevated) ${((risingSpeedThreshold - 1) / (30 - 1)) * 100}%, var(--bg-elevated) 100%)`,
                }}
              />
              <div className="flex justify-between" style={{ marginTop: 4 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>1 cm/min</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>30 cm/min</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              {savedSpeed && (
                <div className="flex items-center gap-2" style={{ color: 'var(--green-400)', fontWeight: 600, fontSize: '0.8rem' }}>
                  <CheckCircle size={14} /> Saved!
                </div>
              )}
              <button className="btn btn-primary" onClick={handleSaveSpeed} disabled={savingSpeed}>
                {savingSpeed ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving...</> : <><Save size={14} /> Save Speed Threshold</>}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

