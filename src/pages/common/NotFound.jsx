import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import AnimatedBackground from '../../components/background/AnimatedBackground';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <>
      <AnimatedBackground />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#080d16',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
        padding: 24,
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          background: 'rgba(13, 22, 35, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-dim, rgba(255,255,255,0.08))',
          borderRadius: 'var(--r-lg, 16px)',
          padding: '48px 32px',
          width: '100%',
          maxWidth: 480,
          textAlign: 'center',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20
        }}>
          {/* Animated Glow Icon */}
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)',
            animation: 'pulse-glow 2s infinite alternate'
          }}>
            <style>{`
              @keyframes pulse-glow {
                0% { transform: scale(1); box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); }
                100% { transform: scale(1.05); box-shadow: 0 0 35px rgba(239, 68, 68, 0.4); }
              }
            `}</style>
            <AlertTriangle size={40} color="#ef4444" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, var(--text-muted) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              404 - PAGE NOT FOUND
            </h1>
            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0
            }}>
              The coordinates you requested do not exist on our navigation charts. You may have typed an incorrect address, or this zone has been evacuated.
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="btn btn-primary"
            style={{
              marginTop: 12,
              padding: '10px 24px',
              fontSize: '0.88rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              justifyContent: 'center',
              background: 'var(--cyan-400)',
              border: 'none',
              color: '#000',
              borderRadius: 'var(--r-md, 8px)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(6,182,212,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6,182,212,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(6,182,212,0.4)';
            }}
          >
            <Home size={16} /> BACK TO SAFETY
          </button>
        </div>
      </div>
    </>
  );
}
