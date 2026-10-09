/**
 * LandingPage — Public AuditPulse home page (no auth required)
 * Matches the supplied design reference exactly.
 */
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 10.5c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.25-8.25-3.286z" />
      </svg>
    ),
    label: 'Monitor\nSaaS Terms',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    label: 'Analyze\nCode Changes',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    label: 'Detect\nPolicy Drift',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    label: 'Stay\nCompliant',
  },
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Google Font ── */}
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* ─────────────────── TOP NAV ─────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.1rem 3rem',
        borderBottom: '1px solid #f0f0f5',
        position: 'sticky',
        top: 0,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: '1.5rem',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #1e293b 40%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Audit
          </span>
          <span style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            fontSize: '1.5rem',
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Pulse
          </span>
        </div>

        {/* Nav Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/signin"
            id="landing-signin-btn"
            style={{
              padding: '0.55rem 1.4rem',
              border: '1.5px solid #6366f1',
              borderRadius: 8,
              color: '#6366f1',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
              fontFamily: "'Outfit', sans-serif",
            }}
            onMouseEnter={e => { e.target.style.background = '#f5f3ff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            id="landing-signup-btn"
            style={{
              padding: '0.55rem 1.4rem',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              transition: 'opacity 0.2s',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* ─────────────────── HERO SECTION ─────────────────── */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '4rem 3rem 3rem',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Left — Text content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Main heading */}
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(2.8rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #1e293b 40%, #6366f1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Audit</span>
              <span style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Pulse</span>
            </h1>
            <p style={{
              marginTop: '1rem',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#334155',
              fontWeight: 500,
              lineHeight: 1.55,
              maxWidth: 440,
            }}>
              Multi-Agent AI System for Real-Time Legal &amp; Technical Drift Detection in SaaS Terms &amp; Codebases.
            </p>
          </div>

          {/* Feature icons row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 0.5rem',
                borderRadius: 12,
                border: '1px solid #e8eaf6',
                background: '#fafbff',
                textAlign: 'center',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.12)';
                e.currentTarget.style.borderColor = '#c7d2fe';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e8eaf6';
              }}
              >
                <div style={{ color: '#6366f1' }}>{f.icon}</div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-line',
                }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              to="/signup"
              id="hero-signup-btn"
              style={{
                padding: '0.85rem 2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(99,102,241,0.38)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(99,102,241,0.45)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.38)';
              }}
            >
              Get Started Free
            </Link>
            <Link
              to="/signin"
              id="hero-signin-btn"
              style={{
                padding: '0.85rem 2rem',
                background: 'transparent',
                color: '#6366f1',
                border: '1.5px solid #6366f1',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '1rem',
                textDecoration: 'none',
                transition: 'background 0.15s',
                fontFamily: "'Outfit', sans-serif",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Right — Hero illustration */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <img
            src="/hero.jpg"
            alt="AuditPulse — AI compliance drift detection illustration showing a laptop with shield, Terms of Service panel, code panel, and results"
            style={{
              width: '100%',
              maxWidth: 520,
              borderRadius: 16,
              filter: 'drop-shadow(0 20px 60px rgba(99,102,241,0.18))',
            }}
          />
        </div>
      </main>

      {/* ─────────────────── BOTTOM TAGLINE ─────────────────── */}
      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '1.5rem 3rem',
        borderTop: '1px solid #f0f0f5',
      }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #cbd5e1)' }} />
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          {['DETECT', 'ANALYZE', 'PROTECT'].map((word, i) => (
            <React.Fragment key={word}>
              {i > 0 && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>/</span>}
              <span style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.78rem',
                letterSpacing: '0.14em',
                color: '#6366f1',
              }}>
                {word}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #cbd5e1, transparent)' }} />
      </footer>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          main {
            grid-template-columns: 1fr !important;
            padding: 2.5rem 1.5rem 2rem !important;
          }
          main > div:last-child {
            display: none !important;
          }
          header {
            padding: 1rem 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
