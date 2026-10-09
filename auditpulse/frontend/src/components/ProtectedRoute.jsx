/**
 * ProtectedRoute — wraps any route that requires authentication.
 * - While auth is loading: shows a spinner
 * - If not authenticated: redirects to /signin (preserving the intended URL)
 * - If authenticated: renders children
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f8fafc',
        flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{
          width: 44, height: 44, border: '3px solid #e2e8f0',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontFamily: 'Outfit, sans-serif', fontWeight: 500 }}>
          Loading AuditPulse…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return children;
}
