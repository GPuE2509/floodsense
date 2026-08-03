import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, ShieldAlert, Activity, FileDown,
  UserCheck, RefreshCw, AlertCircle, MapPin, TrendingDown, ChevronRight
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { apiService } from '../../services/apiService';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Custom Tooltip component matching the dark premium theme
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip" style={{
      background: 'rgba(18, 29, 40, 0.95)',
      border: '1px solid rgba(69, 179, 192, 0.4)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
    }}>
      <div className="tooltip-label" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, fontSize: '0.8rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700, fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p.name}</span>
          <span>{p.value.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  );
};

export default function UserGrowthMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [range, setRange] = useState('30days'); // '7days' | '30days' | '12months'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (targetRange = range, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await apiService.get(`/auth/admin/users/growth-metrics?range=${targetRange}`);
      if (res && res.success && res.metrics) {
        setMetrics(res.metrics);
      } else {
        setError(res?.message || 'Failed to retrieve user growth statistics.');
      }
    } catch (err) {
      console.error('Error in UserGrowthMetrics page:', err);
      setError(err.message || 'Server connection error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics(range);
  }, [range]);

  const handleExport = () => {
    if (!metrics) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(metrics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `user_growth_metrics_${range}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--r-lg)' }} />)}
        </div>
        <div className="skeleton" style={{ height: 350, borderRadius: 'var(--r-lg)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
          <div className="skeleton" style={{ height: 280, borderRadius: 'var(--r-lg)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-enter" style={{ padding: 40, textAlign: 'center' }}>
        <div className="card p-6" style={{ maxWidth: 500, margin: '0 auto', border: '1px solid rgba(239,29,55,0.3)' }}>
          <ShieldAlert size={48} color="var(--red-400)" style={{ marginBottom: 16 }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>An Error Occurred</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchMetrics(range)}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { totalUsers, growthByDate, roleDistribution, statusDistribution, districtDistribution, pendingRoleUpgrades, summary } = metrics;

  // Calculate some trend percentages for KPI cards
  const todayTrend = summary.yesterday === 0
    ? (summary.today > 0 ? 100 : 0)
    : Math.round(((summary.today - summary.yesterday) / summary.yesterday) * 100);

  const monthTrend = summary.lastMonth === 0
    ? (summary.thisMonth > 0 ? 100 : 0)
    : Math.round(((summary.thisMonth - summary.lastMonth) / summary.lastMonth) * 100);

  const activeCount = statusDistribution.find(s => s.status === 'Active')?.count || 0;
  const pendingCount = pendingRoleUpgrades || 0;

  // Map backend roles to nice labels and colors
  const roleColors = {
    'Admin': '#ef1d37',     // Red
    'Manager': '#e1843c',   // Orange
    'Workshop': '#45b3c0',  // Cyan
    'Volunteer': '#ead28e', // Yellow / Gold
    'User': '#3ea97b',      // Green
    'Guest': '#78909c'      // Slate gray
  };

  const roleNameMap = {
    'Admin': 'Administrator (Admin)',
    'Manager': 'Coordinator (Manager)',
    'Workshop': 'Rescue Workshop Owner',
    'Volunteer': 'Volunteer',
    'User': 'User',
    'Guest': 'Guest'
  };

  const formattedRoleData = roleDistribution.map(r => ({
    name: roleNameMap[r.role] || r.role,
    value: r.count,
    color: roleColors[r.role] || '#7c4dff'
  })).filter(r => r.value > 0);

  // Status breakdown formatted data
  const statusColors = {
    'Active': 'var(--green-400)',
    'Pending': 'var(--yellow-400)',
    'Suspended': 'var(--red-400)'
  };

  const statusNameMap = {
    'Active': 'Active',
    'Pending': 'Pending Verification',
    'Suspended': 'Locked'
  };

  return (
    <div className="page-enter">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>User Growth Metrics</h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Monitor system registration growth trends and system-wide role distributions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" onClick={() => fetchMetrics(range, true)} disabled={refreshing}>
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExport}>
              <FileDown size={13} />
              Export JSON Report
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          iconColor="var(--blue-neon)"
          iconBg="rgba(0,170,255,0.12)"
          trend={monthTrend}
          trendValue={monthTrend}
          extra={<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Growth in the last 30 days</span>}
        />
        <StatCard
          title="Registrations Today"
          value={summary.today}
          icon={UserCheck}
          iconColor="var(--green-400)"
          iconBg="rgba(0,230,137,0.1)"
          trend={todayTrend}
          trendValue={todayTrend}
          variant={summary.today > 0 ? "success" : "default"}
          glowing={summary.today > 0}
          extra={<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Compared to yesterday ({summary.yesterday})</span>}
        />
        <StatCard
          title="Active Accounts"
          value={activeCount}
          icon={Activity}
          iconColor="var(--cyan-400)"
          iconBg="rgba(69, 179, 192, 0.12)"
          trend={totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0}
          trendValue={totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0}
          variant="gold"
          extra={<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Proportion system-wide</span>}
        />
        <StatCard
          title="Pending Role Upgrades"
          value={pendingCount}
          icon={AlertCircle}
          iconColor="var(--gold-400)"
          iconBg="rgba(240, 188, 46, 0.12)"
          trend={0}
          trendValue={0}
          variant={pendingCount > 0 ? "warning" : "default"}
          extra={<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Awaiting administrator review</span>}
        />
      </div>

      {/* ── Main Growth Chart Card ── */}
      <div className="card bracketed" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }} className="flex justify-between items-center">
          <div>
            <div className="section-title" style={{ fontSize: '0.75rem', color: 'var(--cyan-400)', letterSpacing: '0.1em' }}>USER GROWTH CHART</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Displays new registrations and cumulative system totals</div>
          </div>
          <div className="tabs-nav" style={{ padding: 3, borderRadius: 'var(--r-md)' }}>
            {[
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: '12months', label: '12 Months' }
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${range === t.id ? 'active' : ''}`}
                onClick={() => setRange(t.id)}
                style={{ padding: '4px 12px', fontSize: '0.72rem', minWidth: 70 }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 20px 14px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={growthByDate} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="totalUsersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00aaff" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00aaff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="newUsersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e689" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00e689" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,170,255,0.04)" />
              <XAxis
                dataKey="period"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: -10 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="totalUsers"
                name="Cumulative Users"
                stroke="#00aaff"
                strokeWidth={2.5}
                fill="url(#totalUsersGrad)"
                activeDot={{ r: 5, fill: '#00aaff', stroke: '#00ddf5', strokeWidth: 2 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="newUsers"
                name="New Registrations"
                stroke="#00e689"
                strokeWidth={2}
                fill="url(#newUsersGrad)"
                activeDot={{ r: 4, fill: '#00e689' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sub Distributions Grid ── */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {/* Pie Chart: Role Distribution */}
        <div className="card bracketed" style={{ gridColumn: 'span 2' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
            <div className="section-title" style={{ fontSize: '0.75rem' }}>ACCOUNT ROLE DISTRIBUTION</div>
          </div>
          <div className="flex items-center gap-4 p-4" style={{ minHeight: 200 }}>
            <div style={{ width: '45%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={formattedRoleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {formattedRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="custom-tooltip">
                          <span style={{ color: payload[0].payload.color, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {payload[0].name}: {payload[0].value} ({Math.round((payload[0].value / totalUsers) * 100)}%)
                          </span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legends */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: '8px 16px', maxHeight: '180px', overflowY: 'auto' }}>
              {formattedRoleData.map((d, i) => (
                <div key={i} className="flex items-center justify-between" style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, boxShadow: `0 0 5px ${d.color}` }} />
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {d.value} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: 10 }}>({Math.round((d.value / totalUsers) * 100)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* List of Status Breakdown */}
        <div className="card bracketed">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
            <div className="section-title" style={{ fontSize: '0.75rem' }}>ACCOUNT STATUS</div>
          </div>
          <div style={{ padding: 20, display: 'grid', gap: 14 }}>
            {statusDistribution.map(s => {
              const name = statusNameMap[s.status] || s.status;
              const color = statusColors[s.status] || '#90a4ae';
              const pct = totalUsers > 0 ? Math.round((s.count / totalUsers) * 100) : 0;
              return (
                <div key={s.status}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: color, fontFamily: 'var(--font-mono)' }}>
                      {s.count} <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 'normal' }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, boxShadow: `0 0 6px ${color}` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
