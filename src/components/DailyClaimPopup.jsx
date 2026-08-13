import React, { useState, useEffect } from 'react';
import { Gift } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../services/apiService';
import { useAuth } from '../hooks/useAuth';

export default function DailyClaimPopup() {
  const { role, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (role === 'admin' || role === 'manager' || role === 'guest') return;

    apiService.get('/auth/profile')
      .then(res => {
        if (res.user) {
          setProfile(res.user);
          if (!isClaimedToday(res.user)) {
             setVisible(true);
          }
        }
      })
      .catch(err => console.error("Failed to fetch profile for daily claim", err));
  }, [isLoggedIn, role]);

  const isClaimedToday = (p) => {
    if (!p || !p.last_daily_claim) return false;
    const now = new Date();
    const vnNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3600000 * 7));
    const lastClaim = new Date(p.last_daily_claim);
    const vnLastClaim = new Date(lastClaim.getTime() + (lastClaim.getTimezoneOffset() * 60000) + (3600000 * 7));
    return vnNow.getFullYear() === vnLastClaim.getFullYear() && vnNow.getMonth() === vnLastClaim.getMonth() && vnNow.getDate() === vnLastClaim.getDate();
  };

  const isStreakBroken = (p) => {
    if (!p || !p.last_daily_claim) return false;
    const now = new Date();
    const vnNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (3600000 * 7));
    const lastClaim = new Date(p.last_daily_claim);
    const vnLastClaim = new Date(lastClaim.getTime() + (lastClaim.getTimezoneOffset() * 60000) + (3600000 * 7));
    
    vnNow.setHours(0, 0, 0, 0);
    vnLastClaim.setHours(0, 0, 0, 0);
    
    const diffTime = vnNow.getTime() - vnLastClaim.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    
    return diffDays > 1 && p.daily_streak > 0;
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await apiService.post('/auth/profile/daily-claim');
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Daily Reward Claimed',
          body: `+${res.pointsAwarded} points! You are on a ${res.newStreak}-day streak 🔥`,
          isNotification: true,
          showAction: false
        }
      }));
      setVisible(false);
      setProfile(prev => prev ? {
        ...prev,
        contribution_points: res.totalPoints,
        daily_streak: res.newStreak,
        last_daily_claim: new Date().toISOString()
      } : prev);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('show-toast', {
        detail: {
          title: 'Claim Failed',
          body: err.message || 'Failed to claim',
          isNotification: true,
          showAction: false
        }
      }));
    } finally {
      setClaiming(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card p-5" style={{ width: '90%', maxWidth: 500, background: 'var(--bg-card)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gift size={24} color="var(--orange-400)" />
            <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)' }}>Daily Engagement Rewards</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, overflowX: 'auto', paddingBottom: 24 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const pointsForDay = day === 3 ? 4 : day === 7 ? 6 : 2;
            const currentStreak = isStreakBroken(profile) ? 0 : (profile?.daily_streak || 0);
            let status = 'upcoming'; 
            if (day <= currentStreak) status = 'claimed';
            else if (day === currentStreak + 1 && !isClaimedToday(profile)) status = 'today';

            let colorHex = 'var(--green-400)';
            let bgRgb = '74,222,128';
            if (pointsForDay === 4) {
              colorHex = 'var(--gold-400)';
              bgRgb = '234,179,8';
            } else if (pointsForDay === 6) {
              colorHex = 'var(--orange-400)';
              bgRgb = '251,146,60';
            }

            let bg = 'var(--bg-elevated)';
            let border = '1px solid var(--border-subtle)';
            let opacity = 1;
            let activeColor = 'var(--text-muted)';
            let activeTextColor = 'var(--text-primary)';

            if (status === 'claimed' || status === 'today') {
              bg = `rgba(${bgRgb},0.15)`;
              border = `1px solid ${colorHex}`;
              activeColor = colorHex;
              activeTextColor = colorHex;
            } else {
              opacity = 0.6;
            }

            return (
              <div key={day} style={{ 
                flex: 1, minWidth: 50, padding: '12px 4px', borderRadius: 'var(--r-md)', 
                background: bg, border, textAlign: 'center', opacity,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Day {day}</div>
                <Gift size={18} color={activeColor} />
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: activeTextColor }}>+{pointsForDay}P</div>
              </div>
            );
          })}
        </div>

        {isStreakBroken(profile) && (
          <div style={{ color: 'var(--gold-400)', fontSize: '0.95rem', textAlign: 'center', marginBottom: 16 }}>
            You lost your {profile.daily_streak}-day streak!
          </div>
        )}

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '12px', fontSize: '1.05rem', justifyContent: 'center' }}
          onClick={handleClaim} 
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : 'Claim Daily Reward'}
        </button>
      </div>
    </div>
  );
}
