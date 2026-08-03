import React, { useState, useEffect, useRef } from 'react';
import { CloudLightning, Search, Thermometer, Droplets, Wind, Cloud, ChevronDown } from 'lucide-react';
import WeatherEffects from './WeatherEffects';
import { apiService } from '../../services/apiService';

export default function WeatherBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationName, setLocationName] = useState('Locating...');
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  
  // State for dynamic background & data based on hovered forecast
  const [hoveredForecast, setHoveredForecast] = useState(null);

  const bannerRef = useRef(null);
  const popoverRef = useRef(null);
  const sliderRef = useRef(null);

  // Drag to scroll logic for hourly forecast
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (bannerRef.current && !bannerRef.current.contains(event.target) &&
          popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear error when panel is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setError(null), 400);
    }
  }, [isOpen]);

  // Fetch config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiService.get('/iot/config');
        if (res && res.success) {
          setConfig(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch config in WeatherBanner:', err);
      }
    };
    fetchConfig();
  }, []);

  // Fetch location on mount
  useEffect(() => {
    if (config && config.module_forecast === false) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(null, position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation denied or failed. Defaulting to Ho Chi Minh.", err);
          fetchWeather('Ho Chi Minh');
        }
      );
    } else {
      fetchWeather('Ho Chi Minh');
    }
  }, [config]);

  const fetchWeather = async (cityQuery, lat, lon) => {
    setLoading(true);
    setError(null);
    try {
      let queryStr = cityQuery ? `?q=${cityQuery}` : `?lat=${lat}&lon=${lon}`;

      const [curRes, fcRes] = await Promise.all([
        fetch(`http://localhost:5000/api/weather/current${queryStr}`).then(r => r.json()),
        fetch(`http://localhost:5000/api/weather/forecast${queryStr}`).then(r => r.json())
      ]);

      if (curRes.success) {
        setCurrentWeather(curRes.data);
        setLocationName(curRes.data.name);
      } else setError(curRes.message);

      if (fcRes.success) {
        setForecast(fcRes.data.list || []);
      } else if (!error) setError(fcRes.message);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchWeather(searchQuery.trim());
      setSearchQuery('');
    }
  };

  // Determine active data based on hover or current weather
  const activeData = hoveredForecast || currentWeather;
  const activeWeatherObj = activeData ? activeData.weather[0] : null;
  const activeCondition = activeWeatherObj?.main || 'Clear';
  const activeWeatherId = activeWeatherObj?.id || 800;
  const activeIsDay = activeWeatherObj?.icon?.includes('d') ?? true;

  // Text Contrast logic based on active condition
  const isBrightBackground = activeCondition === 'Clear' && activeIsDay;
  const textColor = isBrightBackground ? '#0f172a' : '#ffffff';
  const textMuted = isBrightBackground ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const textShadow = isBrightBackground ? 'none' : '0 1px 3px rgba(0,0,0,0.5)';

  const formatTime = (dt) => {
    const date = new Date(dt * 1000);
    const now = new Date();
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (date.getDate() !== now.getDate()) {
      return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
    }
    return `Today ${timeStr}`;
  };

  const getDailyForecast = () => {
    if (!forecast || forecast.length === 0) return [];
    const daily = [];
    const seenDays = new Set();
    for (let item of forecast) {
      const day = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
      if (!seenDays.has(day)) {
        seenDays.add(day);
        daily.push(item);
      }
      if (daily.length === 5) break;
    }
    return daily;
  };

  // Slider drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - sliderRef.current.offsetLeft);
    setScrollLeft(sliderRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast
    sliderRef.current.scrollLeft = scrollLeft - walk;
  };

  if (config && config.module_forecast === false) return null;

  return (
    <div style={{ position: 'relative', marginBottom: 20, color: textColor, textShadow: textShadow, transition: 'color 0.5s ease, text-shadow 0.5s ease' }}>
      {/* ── BANNER ── */}
      <div 
        ref={bannerRef}
        className="card p-4" 
        style={{ 
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.1)', 
          position: 'relative', 
          overflow: 'hidden',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          boxShadow: isOpen ? '0 0 15px rgba(6,182,212,0.3)' : 'none',
          transform: isOpen ? 'scale(1.002)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        {/* Banner Dynamic Background Effect */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, opacity: 1, pointerEvents: 'none' }}>
          <WeatherEffects condition={activeCondition} weatherId={activeWeatherId} isDay={activeIsDay} />
        </div>
        
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 0% 50%, rgba(255,255,255,0.1), transparent 40%)', pointerEvents: 'none', zIndex: 0 }} />
        
        <div className="flex items-center gap-4 flex-wrap" style={{ position: 'relative', zIndex: 1, flex: 1 }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentWeather ? (
                <img src={`http://openweathermap.org/img/wn/${currentWeather.weather[0].icon}@2x.png`} alt="icon" style={{ width: 40, height: 40 }} />
              ) : (
                <CloudLightning size={22} color={textColor} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: textColor }}>
                City weather. {locationName}
              </div>
              <div style={{ fontSize: '0.75rem', color: textMuted, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {loading ? <span>Loading...</span> : currentWeather ? (
                  <>
                    <span>Present: <strong>{Math.round(currentWeather.main.temp)}°C</strong> ({currentWeather.weather[0].description})</span>
                    {currentWeather.weather[0].main === 'Rain' && (
                      <span className="badge badge-red" style={{ fontSize: '0.58rem', padding: '1px 5px', backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '4px', textShadow: 'none' }}>WARNING OF HEAVY RAIN</span>
                    )}
                  </>
                ) : <span>Failed to load</span>}
              </div>
            </div>
          </div>
          
          {/* Mini Forecast inside Banner */}
          <div className="flex items-center gap-5" style={{ marginLeft: 'auto', marginRight: 20 }}>
            {getDailyForecast().slice(1, 3).map((f, i) => (
              <div key={i} className="flex items-center gap-2" style={{ borderLeft: `1px solid ${textMuted}`, paddingLeft: 20 }}>
                 <img src={`http://openweathermap.org/img/wn/${f.weather[0].icon}.png`} alt="icon" style={{ width: 30, height: 30 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: textMuted }}>
                    {i === 0 ? 'Tomorrow' : 'Day after'}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: textColor }}>
                    {Math.round(f.main.temp)}°C · {f.weather[0].main}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Details Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '8px 16px', borderRadius: '20px',
            color: textColor, fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s', textShadow: textShadow,
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          View Details
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
        </button>
      </div>

      {/* ── INLINE ACCORDION DETAILS ── */}
      <div 
        style={{ 
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), margin-top 0.4s',
          marginTop: isOpen ? 10 : 0,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div 
            ref={popoverRef}
            style={{
              position: 'relative',
              background: 'transparent',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              color: textColor,
              textShadow: textShadow,
              transition: 'color 0.5s ease, text-shadow 0.5s ease'
            }}
          >
          {/* Dynamic Background Effect based on Hover */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1, opacity: 1, transition: 'all 0.5s ease' }}>
            <WeatherEffects condition={activeCondition} weatherId={activeWeatherId} isDay={activeIsDay} />
          </div>

          <style>{`
            @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .hourly-slider::-webkit-scrollbar { display: none; }
            .hourly-item {
              transition: all 0.2s ease;
              background: transparent;
            }
            .hourly-item:hover {
              background: rgba(255,255,255,0.2);
              transform: translateY(-4px) scale(1.05);
              border-radius: 12px;
            }
            .glass-panel {
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 16px;
              padding: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .weather-search-input::placeholder {
              color: ${textMuted};
              opacity: 1;
            }
          `}</style>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: textMuted }} />
              <input 
                className="weather-search-input"
                type="text" 
                placeholder="Search for a city..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 45px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  color: textColor,
                  fontSize: '0.95rem',
                  outline: 'none',
                  textShadow: textShadow
                }}
              />
            </div>
            <button type="submit" style={{
              padding: '0 20px', background: 'rgba(255,255,255,0.2)', color: textColor, border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, textShadow: textShadow,
              transition: 'background 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}>Search</button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>Fetching weather data...</div>
          ) : error ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px 0', textShadow: 'none', fontWeight: 'bold' }}>{error}</div>
          ) : activeData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              {/* Main Weather Card (Updates on Hover) */}
              <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '24px' }}>
                <img 
                  src={`http://openweathermap.org/img/wn/${activeWeatherObj.icon}@4x.png`} 
                  alt="weather" 
                  style={{ width: 100, height: 100, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }} 
                />
                <div>
                  <div style={{ fontSize: '3.5rem', fontWeight: 300, lineHeight: 1 }}>
                    {Math.round(activeData.main.temp)}°C
                  </div>
                  <div style={{ fontSize: '1.2rem', color: textColor, textTransform: 'capitalize', marginTop: 8, fontWeight: 500 }}>
                    {activeCondition} - {activeWeatherObj.description}
                  </div>
                  {hoveredForecast && (
                    <div style={{ fontSize: '0.85rem', color: textMuted, marginTop: 4 }}>
                      Forecast for {formatTime(hoveredForecast.dt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-panel">
                  <div style={{ color: textMuted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Thermometer size={16} /> Feels like
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{Math.round(activeData.main.feels_like)}°C</div>
                </div>
                <div className="glass-panel">
                  <div style={{ color: textMuted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Droplets size={16} /> Humidity
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{activeData.main.humidity}%</div>
                </div>
                <div className="glass-panel">
                  <div style={{ color: textMuted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Wind size={16} /> Wind
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{activeData.wind.speed} m/s</div>
                </div>
                <div className="glass-panel">
                  <div style={{ color: textMuted, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Cloud size={16} /> Cloudiness
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>{activeData.clouds.all}%</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Hourly Forecast Slider */}
          {forecast.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: textColor, fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 16 }}>
                Hourly Forecast (Drag to scroll, Hover to preview effect)
              </div>
              <div 
                ref={sliderRef}
                className="hourly-slider"
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  overflowX: 'auto', 
                  cursor: isDragging ? 'grabbing' : 'grab',
                  paddingBottom: '10px'
                }}
              >
                {forecast.map((f, i) => (
                  <div 
                    key={i} 
                    className="hourly-item"
                    onMouseEnter={() => setHoveredForecast(f)}
                    onMouseLeave={() => setHoveredForecast(null)}
                    style={{ 
                      minWidth: '80px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      padding: '12px',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', color: textMuted, fontWeight: 500 }}>{formatTime(f.dt)}</div>
                    <img src={`http://openweathermap.org/img/wn/${f.weather[0].icon}.png`} alt="icon" style={{ width: 40, height: 40, margin: '8px 0', pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{Math.round(f.main.temp)}°</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
}
