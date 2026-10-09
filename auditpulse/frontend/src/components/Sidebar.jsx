import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FileText, Code2, GitBranch,
  Eye, BarChart3, Settings, Zap, AlertTriangle, Globe,
  LogOut, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';


const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { to: '/policy', label: 'Policy Analysis', icon: FileText, badge: 'Agent' },
  { to: '/code', label: 'Code Analysis', icon: Code2, badge: 'AST' },
  { to: '/drift', label: 'Drift Detection', icon: GitBranch, badge: 'Core' },
  { to: '/vendors', label: 'Vendor Monitoring', icon: Eye, badge: 'Playwright' },
  { to: '/reports', label: 'Reports', icon: BarChart3, badge: null },
  { to: '/settings', label: 'Settings', icon: Settings, badge: null },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (

    <aside className="sidebar">
      {/* Brand Logo */}
      <div style={{ padding: '0.5rem 1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 42, height: 42,
            background: 'var(--gradient-primary)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Shield size={22} color="white" />
          </div>
          <div>
            <div style={{
              fontWeight: 900,
              fontSize: '1.2rem',
              letterSpacing: '-0.03em',
              fontFamily: 'Outfit, sans-serif',
              background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AuditPulse
            </div>
            <div style={{
              fontSize: '0.6875rem',
              color: 'var(--accent-cyan-bright)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              AI Compliance Sentinel
            </div>
          </div>
        </div>
      </div>

      {/* Engine Status Cards */}
      <div style={{ margin: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* Multi-Agent status */}
        <div style={{
          padding: '0.55rem 0.85rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="status-dot status-active" />
            <span style={{ color: 'var(--risk-compliant)', fontWeight: 700 }}>AI Multi-Agent</span>
          </div>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(16, 185, 129, 0.2)',
            color: 'var(--risk-compliant-light)',
            padding: '1px 6px',
            borderRadius: 4,
            fontWeight: 700
          }}>
            ACTIVE
          </span>
        </div>

        {/* Playwright status */}
        <div style={{
          padding: '0.55rem 0.85rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={13} color="var(--accent-blue)" />
            <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>Playwright v1.63</span>
          </div>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(59, 130, 246, 0.2)',
            color: 'var(--accent-blue)',
            padding: '1px 6px',
            borderRadius: 4,
            fontWeight: 700
          }}>
            READY
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '0 0.5rem' }}>
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            style={{ borderRadius: 10, margin: '3px 0' }}
          >
            <Icon size={18} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && (
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '2px 6px',
                borderRadius: 4,
                background: badge === 'Playwright'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : badge === 'Core'
                  ? 'rgba(236, 72, 153, 0.18)'
                  : 'rgba(139, 92, 246, 0.15)',
                color: badge === 'Playwright'
                  ? 'var(--accent-blue)'
                  : badge === 'Core'
                  ? '#f472b6'
                  : 'var(--accent-purple)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile + Logout */}
      {user && (
        <div style={{ padding: '0 1.25rem 0.75rem' }}>
          <div style={{
            padding: '0.75rem 0.85rem',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={16} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 700, color: '#e2e8ff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.full_name}
              </div>
              <div style={{
                fontSize: '0.65rem', color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '4px',
                borderRadius: 6, display: 'flex', alignItems: 'center',
                transition: 'color 0.2s',
                flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Legal Disclaimer */}
      <div style={{
        padding: '0.5rem 1.25rem 1rem',
        borderTop: '1px solid var(--border)',
        marginTop: '0.5rem',
      }}>
        <div style={{
          padding: '0.75rem 0.85rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          borderRadius: 10,
          display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
        }}>
          <AlertTriangle size={15} color="var(--risk-medium)" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--risk-medium)', lineHeight: 1.45, fontWeight: 500 }}>
            AI-assisted drift analysis. Does not substitute professional legal counsel.
          </span>
        </div>
      </div>
    </aside>

  );
}
