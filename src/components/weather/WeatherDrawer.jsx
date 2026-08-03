import React, { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, Thermometer, MapPin, X } from 'lucide-react';
import WeatherEffects from './WeatherEffects';

export default function WeatherDrawer({ isOpen, onClose }) {
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (!currentWeather || forecast.length === 0) {
        fetchWeather();
      }
    } else {
      // Clear error slightly after closing starts so it doesn't blink abruptly
      setTimeout(() => setError(null), 200);
    }
  }, [isOpen]);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }).catch(() => null);

      let queryStr = '?q=Ho Chi Minh';
      if (pos && pos.coords) {
        queryStr = `?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`;
      }

      const [curRes, fcRes] = await Promise.all([
        fetch(`http://localhost:5000/api/weather/current${queryStr}`).then(r => r.json()),
        fetch(`http://localhost:5000/api/weather/forecast${queryStr}`).then(r => r.json())
      ]);

      if (curRes.success) setCurrentWeather(curRes.data);
      else setError(curRes.message);

      if (fcRes.success) setForecast(fcRes.data.list || []);
      else if (!error) setError(fcRes.message);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const getCondition = () => {
    return currentWeather?.weather?.[0]?.main || 'Clear';
  };
  
  const getWeatherId = () => {
    return currentWeather?.weather?.[0]?.id || 800;
  };

  const isDay = () => {
    return currentWeather?.weather?.[0]?.icon?.includes('d') ?? true;
  };

  const formatTime = (dt) => {
    const date = new Date(dt * 1000);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  const formatDate = (dt) => {
    const date = new Date(dt * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`weather-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s'
        }}
      />

      {/* Drawer */}
      <div 
        className={`weather-drawer ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
          backgroundColor: '#121d28', zIndex: 9999,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-out',
          boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Dynamic Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, opacity: 0.6 }}>
          <WeatherEffects condition={getCondition()} weatherId={getWeatherId()} isDay={isDay()} />
        </div>

        {/* Header */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin size={20} color="var(--cyan-400)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>
              {currentWeather ? currentWeather.name : 'Loading...'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 5 }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#fff', marginTop: 50 }}>Loading weather data...</div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: 'var(--red-400)', marginTop: 50 }}>{error}</div>
          ) : currentWeather ? (
            <>
              {/* Main Temp */}
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <img 
                  src={`http://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@4x.png`} 
                  alt="weather" 
                  style={{ width: 120, height: 120, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }} 
                />
                <div style={{ fontSize: '4.5rem', fontWeight: 200, color: '#fff', lineHeight: 1 }}>
                  {Math.round(currentWeather.main.temp)}°C
                </div>
                <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize', marginTop: 10 }}>
                  {currentWeather.weather[0].description}
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Thermometer size={14} /> Feels like
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600, marginTop: 5 }}>
                    {Math.round(currentWeather.main.feels_like)}°C
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Droplets size={14} /> Humidity
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600, marginTop: 5 }}>
                    {currentWeather.main.humidity}%
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Wind size={14} /> Wind Speed
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600, marginTop: 5 }}>
                    {currentWeather.wind.speed} m/s
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Cloud size={14} /> Cloudiness
                  </div>
                  <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 600, marginTop: 5 }}>
                    {currentWeather.clouds.all}%
                  </div>
                </div>
              </div>

              {/* Forecast */}
              {forecast.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, marginBottom: 15 }}>5-Day Forecast (3h)</div>
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10 }}>
                    {forecast.map((item, idx) => (
                      <div key={idx} style={{ 
                        background: 'rgba(0,0,0,0.4)', padding: '15px 10px', borderRadius: 15, 
                        border: '1px solid rgba(255,255,255,0.1)', minWidth: 80, display: 'flex', 
                        flexDirection: 'column', alignItems: 'center', flexShrink: 0 
                      }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{formatTime(item.dt)}</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{formatDate(item.dt)}</div>
                        <img src={`http://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`} alt="icon" style={{ width: 40, height: 40, margin: '5px 0' }} />
                        <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>{Math.round(item.main.temp)}°</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
