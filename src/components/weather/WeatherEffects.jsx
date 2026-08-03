import React, { useMemo } from 'react';
import './WeatherEffects.css';

export default function WeatherEffects({ condition = 'Clear', weatherId = 800, isDay = true }) {
  
  const themeClass = useMemo(() => {
    if (['Thunderstorm'].includes(condition)) return 'weather-theme-thunder';
    if (['Rain', 'Drizzle'].includes(condition)) return 'weather-theme-rain';
    if (['Clouds'].includes(condition)) return 'weather-theme-clouds';
    return isDay ? 'weather-theme-clear-day' : 'weather-theme-clear-night';
  }, [condition, isDay]);

  const renderElements = () => {
    // Raindrops
    if (['Rain', 'Drizzle', 'Thunderstorm'].includes(condition)) {
      const dropCount = condition === 'Thunderstorm' ? 40 : (condition === 'Drizzle' ? 15 : 30);
      return Array.from({ length: dropCount }).map((_, i) => (
        <div 
          key={`rain-${i}`} 
          className="effect-rain" 
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`,
            opacity: 0.3 + Math.random() * 0.5
          }}
        />
      ));
    }

    // Clouds
    if (['Clouds', 'Mist', 'Fog'].includes(condition)) {
      return (
        <>
          <div className="effect-cloud cloud-1" />
          <div className="effect-cloud cloud-2" />
          <div className="effect-cloud cloud-3" />
        </>
      );
    }

    // Stars at night for clear weather
    if (condition === 'Clear' && !isDay) {
      return Array.from({ length: 30 }).map((_, i) => (
        <div 
          key={`star-${i}`} 
          className="effect-star" 
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`
          }}
        />
      ));
    }

    // Sun at day for clear weather
    if (condition === 'Clear' && isDay) {
      return <div className="effect-sun" />;
    }

    return null;
  };

  return (
    <div className={`weather-effects-container ${themeClass}`}>
      {renderElements()}
    </div>
  );
}
