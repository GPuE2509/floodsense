import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { floodTrendData } from '../../data/mockData';

/* ── Premium Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'inherit', fontWeight: 500 }}>{p.name}</span>
          <span style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Live Flood Trend Area Chart ── */
export function FloodTrendChart({ data = floodTrendData }) {
  const [liveData, setLiveData] = useState(data);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData((prev) => {
        const last = prev[prev.length - 1];
        const level  = Math.max(0, Math.round(last.level  + (Math.random() - 0.45) * 14));
        const alerts = Math.max(0, Math.round(last.alerts + (Math.random() - 0.40) * 4));
        const sos    = Math.max(0, Math.round(last.sos    + (Math.random() - 0.60) * 1));
        const h = new Date().getHours();
        const m = new Date().getMinutes();
        const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        return [...prev.slice(-11), { time: t, level, alerts, sos }];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={liveData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="lvlGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00aaff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#00aaff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff7a1a" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sosGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ef1d37" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#ef1d37" stopOpacity={0} />
          </linearGradient>
          <filter id="glow-blue">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.06)" />
        <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="level"  name="Water level (cm)" stroke="#00aaff" strokeWidth={2.5} fill="url(#lvlGrad)" dot={false} activeDot={{ r: 5, fill:'#00aaff', stroke:'#00ddf5', strokeWidth:2 }} />
        <Area type="monotone" dataKey="alerts" name="Warning"      stroke="#ff7a1a" strokeWidth={2}   fill="url(#altGrad)" dot={false} activeDot={{ r: 4, fill:'#ff7a1a' }} />
        <Area type="monotone" dataKey="sos"    name="SOS"           stroke="#ef1d37" strokeWidth={2.5} fill="url(#sosGrad)" dot={false} activeDot={{ r: 5, fill:'#ef1d37', stroke:'#ff4560', strokeWidth:2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── IoT Status Donut ── */
export function IoTStatusChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <defs>
          {data.map((d, i) => (
            <filter key={i} id={`glow-${i}`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          ))}
        </defs>
        <Pie
          data={data}
          cx="50%" cy="50%"
          innerRadius={50} outerRadius={72}
          paddingAngle={3}
          dataKey="value"
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
          strokeWidth={0}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color}
              opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
              filter={activeIndex === i ? `url(#glow-${i})` : undefined}
              style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="custom-tooltip">
                <div style={{ color: payload[0].payload.color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {payload[0].name}: {payload[0].value}
                </div>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── User Growth Bar Chart ── */
export function UserGrowthChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={3}>
        <defs>
          <linearGradient id="userBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00aaff" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#006090" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="activeBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00e689" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#007840" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.05)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="users"  name="Total users"    fill="url(#userBarGrad)"   radius={[4,4,0,0]} maxBarSize={16} />
        <Bar dataKey="active" name="Active users" fill="url(#activeBarGrad)" radius={[4,4,0,0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
