import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Star, ShieldCheck, Wrench, User, Gift, Loader } from 'lucide-react';
import { apiService } from '../../services/apiService';

const policyItemsAll = [
  { label: "New report", value: "+5 points" },
  { label: "Verified report (Light/Medium/Serious)", value: "+8/12/20 points" },
  { label: "Report vote feedback", value: "+2 points" },
  { label: "Rescue support", value: "+20 points" },
  { label: "Repair support", value: "+8 points" },
  { label: "Wrong report", value: "-15 points" },
];

const policyItemsUser = [
  { label: "Report flooded area", value: "+10 points" },
  { label: "Report accident/tree fallen", value: "+15 points" },
  { label: "Verify community report", value: "+2 points" },
  { label: "Post on forum", value: "+5 points" },
  { label: "Fake report penalty", value: "-30 points" },
];

const policyItemsVolunteer = [
  { label: "Complete rescue mission", value: "+50 points" },
  { label: "Assist at flooded area", value: "+50 points" },
  { label: "Cancel mission without reason", value: "-50 points" },
];

const policyItemsWorkshop = [
  { label: "Complete mobile repair", value: "+50 points" },
  { label: "Receive positive review", value: "+10 points" },
  { label: "Cancel request unexpectedly", value: "-50 points" },
];

const tabs = [
  { id: 'All', label: 'Overall', icon: Trophy },
  { id: 'User', label: 'User', icon: User },
  { id: 'Volunteer', label: 'Volunteer', icon: ShieldCheck },
  { id: 'Workshop', label: 'Workshop', icon: Wrench },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth(); // 0-11
const currentQuarter = Math.floor(currentMonth / 3) + 1;
const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

export default function GuestLeaderboard() {
  const [activeTab, setActiveTab] = useState('All');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [timeFilter, setTimeFilter] = useState('AllTime');
  const [limit, setLimit] = useState(5);
  const [page, setPage] = useState(1);

  const [leaders, setLeaders] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [rewardPage, setRewardPage] = useState(1);

  // Time filter options based on year
  const timeOptions = useMemo(() => {
    const options = [];
    if (parseInt(selectedYear) === currentYear) {
      options.push({ value: 'Weekly', label: 'This Week' });
      options.push({ value: 'Monthly', label: 'This Month' });
      for (let i = 1; i <= currentQuarter; i++) {
        options.push({ value: `Q${i}`, label: `Quarter ${i}` });
      }
      options.push({ value: 'AllTime', label: 'All-Time' });
    } else {
      for (let i = 1; i <= 4; i++) {
        options.push({ value: `Q${i}`, label: `Quarter ${i}` });
      }
      options.push({ value: 'AllTime', label: 'All-Time' });
    }
    return options;
  }, [selectedYear]);

  // Effect to reset time filter if it's invalid for new year
  useEffect(() => {
    const validValues = timeOptions.map(t => t.value);
    if (!validValues.includes(timeFilter)) {
      setTimeFilter('AllTime');
    }
  }, [selectedYear, timeOptions, timeFilter]);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await apiService.get('/leaderboard/rewards');
        if (res.success) setRewards(res.data);
      } catch (err) {
        console.error("Failed to fetch rewards:", err);
      }
    };
    fetchRewards();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await apiService.get(`/leaderboard?tab=${activeTab}&time=${timeFilter}&page=${page}&limit=${limit}`);
        setLeaders(data.data || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [activeTab, timeFilter, page, limit]);

  let currentPolicy = policyItemsAll;
  if (activeTab === 'User') currentPolicy = policyItemsUser;
  if (activeTab === 'Volunteer') currentPolicy = policyItemsVolunteer;
  if (activeTab === 'Workshop') currentPolicy = policyItemsWorkshop;

  return (
    <div className="page-enter">
      <div className="page-header flex justify-between items-end">
        <div>
          <h1>Honor board & Point Policy</h1>
          <p>Honor community contributions and transparent point accumulation mechanism</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setPage(1); }}
            style={{
              background: 'rgba(18,29,40,0.8)', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
            }}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={timeFilter}
            onChange={e => { setTimeFilter(e.target.value); setPage(1); }}
            style={{
              background: 'rgba(18,29,40,0.8)', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer'
            }}
          >
            {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 20, marginTop: 16 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy size={20} color="var(--gold-400)" />
              <div style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-primary)' }}>Hall of Fame</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  style={{
                    background: activeTab === tab.id ? 'var(--gold-400)' : 'transparent',
                    color: activeTab === tab.id ? '#000' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: activeTab === tab.id ? 'var(--gold-400)' : 'var(--border-dim)',
                    padding: '6px 16px',
                    borderRadius: '16px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s'
                  }}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, padding: '16px', flex: 1, alignContent: 'start', minHeight: (totalPages > 1 ? limit : Math.max(1, leaders.length)) * 76 + ((totalPages > 1 ? limit : Math.max(1, leaders.length)) - 1) * 10 + 32 }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: 'var(--gold-400)' }}>
                <Loader className="animate-spin" size={24} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading leaderboard...</span>
              </div>
            ) : leaders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No data available</div>
            ) : (
              leaders.map((leader, index) => {
                const rank = (page - 1) * limit + index + 1;
                let rankColor = 'var(--text-muted)';
                let borderLeftColor = 'var(--border-default)';

                if (rank === 1) { rankColor = 'var(--gold-400)'; borderLeftColor = 'var(--gold-400)'; }
                else if (rank === 2) { rankColor = '#C0C0C0'; borderLeftColor = '#C0C0C0'; } // Silver
                else if (rank === 3) { rankColor = '#CD7F32'; borderLeftColor = '#CD7F32'; } // Bronze

                const getOrdinalSuffix = (n) => {
                  if (n > 3 && n < 21) return 'th';
                  switch (n % 10) {
                    case 1: return "st";
                    case 2: return "nd";
                    case 3: return "rd";
                    default: return "th";
                  }
                };
                const rankSuffix = getOrdinalSuffix(rank);

                return (
                  <div key={leader.id} className="card" style={{ padding: '14px 16px', borderLeft: `4px solid ${borderLeftColor}`, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 50, flexShrink: 0 }}>
                      {rank <= 3 ? (
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                          <Trophy size={46} color={rankColor} strokeWidth={1.5} />
                          <span style={{
                            position: 'absolute',
                            top: 4,
                            fontSize: '1rem',
                            fontWeight: 900,
                            color: rankColor
                          }}>
                            {rank}
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: rankColor, lineHeight: 1, display: 'flex', alignItems: 'flex-start' }}>
                          {rank}<span style={{ fontSize: '0.7rem', lineHeight: '1.2', paddingLeft: 1 }}>{rankSuffix}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-elevated)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {leader.avatar_url ? (
                        <img src={leader.avatar_url} alt={leader.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={22} color="var(--text-muted)" />
                      )}
                    </div>

                    <div className="flex items-center justify-between" style={{ flex: 1 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{leader.name}</div>
                        {leader.info && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{leader.info}</div>}
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-400)' }}>{leader.points}</div>
                          <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{leader.badge}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(18,29,40,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Show
              <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: '4px', padding: '4px 8px', outline: 'none', cursor: 'pointer' }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              entries
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Prev</button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0 8px', fontWeight: 600 }}>{page} / {totalPages === 0 ? 1 : totalPages}</span>
              <button disabled={page >= totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '6px', cursor: (page >= totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', color: (page >= totalPages || totalPages === 0) ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>Next</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card p-6">
            <div className="section-title" style={{ marginBottom: 12 }}>Bonus points policy ({tabs.find(t => t.id === activeTab)?.label})</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {currentPolicy.map((item) => (
                <div key={item.label} className="flex items-center justify-between" style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'rgba(61,125,176,0.08)', border: '1px solid var(--border-dim)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.value.startsWith('-') ? 'var(--red-400)' : 'var(--green-400)' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="alert-banner info" style={{ marginTop: 12 }}>
              <ShieldCheck size={16} color="var(--green-400)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Points will be updated periodically and displayed when you log in.
              </div>
            </div>
          </div>

          <div className="card p-6" style={{ flex: 1 }}>
            <div className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gift size={18} color="var(--cyan-400)" />
              Available Rewards
            </div>
            {rewards.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phần thưởng nào được thiết lập</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rewards.slice((rewardPage - 1) * 5, rewardPage * 5).map((r) => {
                    const badgeMatch = r.description?.match(/Badge:\s*(.+)/);
                    const badge = badgeMatch ? badgeMatch[1] : null;
                    return (
                      <div key={r._id} style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, paddingRight: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.name}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--gold-400)', fontSize: '0.9rem' }}>{r.points_cost} pts</div>
                          {badge ? (
                            <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{badge}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {rewards.length > 5 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                    <button disabled={rewardPage === 1} onClick={() => setRewardPage(p => p - 1)} style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '4px', cursor: rewardPage === 1 ? 'not-allowed' : 'pointer', color: rewardPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.8rem' }}>Prev</button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', alignSelf: 'center' }}>{rewardPage} / {Math.ceil(rewards.length / 5)}</span>
                    <button disabled={rewardPage >= Math.ceil(rewards.length / 5)} onClick={() => setRewardPage(p => p + 1)} style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-dim)', borderRadius: '4px', cursor: rewardPage >= Math.ceil(rewards.length / 5) ? 'not-allowed' : 'pointer', color: rewardPage >= Math.ceil(rewards.length / 5) ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '0.8rem' }}>Next</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="section-title" style={{ marginBottom: 12 }}>How to accumulate points</div>
        <div className="grid grid-3">
          {[
            { title: "Report accurately", desc: "Submit a report with photos and clear location.", icon: Star },
            { title: "Community support", desc: "Participate in feedback or share safety experiences.", icon: ShieldCheck },
            { title: "Volunteer rescue", desc: "Support according to system coordination.", icon: Trophy },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-dim)', background: 'rgba(18,29,40,0.7)' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <Icon size={14} color="var(--cyan-400)" />
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{card.title}</div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{card.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
