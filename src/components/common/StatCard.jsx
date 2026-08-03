import React, { useEffect, useRef, useState } from 'react';

/* ── Animated Count-Up ── */
export function CountUp({ target, duration = 2000, prefix = '', suffix = '', decimals = 0 }) {
  const [current, setCurrent] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out-expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(eased * target);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  const fmt = decimals > 0
    ? current.toFixed(decimals)
    : Math.floor(current).toLocaleString('vi-VN');

  return <>{prefix}{fmt}{suffix}</>;
}

/* ── Premium Stat Card ── */
export function StatCard({
  title, value, suffix = '', prefix = '',
  icon: Icon, iconColor = '#00aaff', iconBg = 'rgba(0,170,255,0.12)',
  trend, trendValue,
  variant = 'default',   // 'default' | 'alert' | 'success' | 'warning' | 'gold'
  glowing = false,
  extra,
}) {
  const variantClass = variant !== 'default' ? `variant-${variant}` : '';

  return (
    <div
      className={`stat-card bracketed ${variantClass}`}
      style={{
        animation: 'slide-up 0.4s ease-out',
        ...(glowing ? { animation: 'slide-up 0.4s ease-out, glow-pulse-red 2s ease-in-out infinite' } : {}),
      }}
    >
      {/* Top row: label + icon */}
      <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sans)' }}>
          {title}
        </div>
        {Icon && (
          <div className="stat-icon" style={{ background: iconBg, boxShadow: '0 6px 14px rgba(20, 40, 58, 0.35)' }}>
            <Icon size={18} color={iconColor} />
          </div>
        )}
      </div>

      {/* Big number */}
      <div className="stat-value">
        <CountUp target={typeof value === 'number' ? value : 0} prefix={prefix} suffix={suffix} />
      </div>

      {/* Trend */}
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '▲' : '▼'}
          &nbsp;{Math.abs(trendValue ?? trend)}%
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>vs. Yesterday</span>
        </div>
      )}

      {extra}

      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '20%', right: '20%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, var(--cyan-500), transparent)',
        opacity: 0.3,
      }} />
    </div>
  );
}
