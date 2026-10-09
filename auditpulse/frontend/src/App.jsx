import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PolicyAnalysis from './pages/PolicyAnalysis';
import CodeAnalysis from './pages/CodeAnalysis';
import DriftDetection from './pages/DriftDetection';
import VendorMonitoring from './pages/VendorMonitoring';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { GitBranch, Globe } from 'lucide-react';

function TopNav() {
  const location = useLocation();

  const getPageInfo = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return { title: 'Executive Compliance Overview', category: 'Analytics' };
      case '/policy':
        return { title: 'Policy Parser & Rule Extractor', category: 'Legal Agent' };
      case '/code':
        return { title: 'Static Code Behavior Analyzer', category: 'AST Engine' };
      case '/drift':
        return { title: 'Multi-Agent Drift Detector', category: 'Compliance Engine' };
      case '/vendors':
        return { title: 'Third-Party Vendor Monitor (Playwright)', category: 'Surveillance' };
      case '/reports':
        return { title: 'Compliance Reports & Audits', category: 'Governance' };
      case '/settings':
        return { title: 'Configuration & AI Engine', category: 'System' };
      default:
        return { title: 'AuditPulse Compliance Sentinel', category: 'Overview' };
    }
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 2.25rem',
      background: 'rgba(255, 255, 255, 0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      marginLeft: 260,
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)'
    }}>
      {/* Breadcrumb Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--accent-blue)',
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.28)',
          padding: '2px 8px',
          borderRadius: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {pageInfo.category}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/</span>
        <span style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          fontFamily: 'Outfit, sans-serif',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em'
        }}>
          {pageInfo.title}
        </span>
      </div>

      {/* Action Badges & Quick Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Playwright Headless Signal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--accent-blue)'
        }}>
          <Globe size={13} color="var(--accent-blue)" />
          <span>Playwright Active</span>
        </div>

        {/* Realtime Engine Signal */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.75rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--risk-compliant)'
        }}>
          <span className="pulse-dot" style={{ background: 'var(--risk-compliant)', width: 6, height: 6 }} />
          <span>Multi-Agent Engine</span>
        </div>

        {/* Quick Drift Action */}
        <Link
          to="/drift"
          className="btn btn-primary"
          style={{ padding: '0.42rem 0.95rem', fontSize: '0.78rem', textDecoration: 'none' }}
        >
          <GitBranch size={14} /> Run Drift Check
        </Link>

        {/* GitHub Link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          style={{
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            padding: '7px',
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            transition: 'all 0.2s ease'
          }}
          title="GitHub Integration"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
}

/** Layout wrapper used for all protected dashboard pages */
function DashboardLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopNav />
        <main className="main-content" style={{ marginTop: 0, paddingTop: '1.75rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* ── Protected dashboard routes ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout><Dashboard /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/policy"
            element={
              <ProtectedRoute>
                <DashboardLayout><PolicyAnalysis /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/code"
            element={
              <ProtectedRoute>
                <DashboardLayout><CodeAnalysis /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/drift"
            element={
              <ProtectedRoute>
                <DashboardLayout><DriftDetection /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendors"
            element={
              <ProtectedRoute>
                <DashboardLayout><VendorMonitoring /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout><Reports /></DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout><Settings /></DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all: redirect to landing ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
