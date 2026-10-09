/**
 * SignInPage — Authentication login page
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const successMessage = location.state?.registered;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, authLoading, navigate, from]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.userMessage || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    fontSize: '0.95rem',
    fontFamily: "'Outfit', sans-serif",
    color: '#1e293b',
    background: '#fafbff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f8f9ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: '1.75rem', display: 'flex', gap: '0.1rem' }}>
        <span style={{
          fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #1e293b 40%, #6366f1 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Audit</span>
        <span style={{
          fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Pulse</span>
      </Link>

      {/* Card */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '2.5rem 2.5rem',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 20px 60px rgba(99,102,241,0.12), 0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid rgba(99,102,241,0.1)',
      }}>
        <h1 style={{
          margin: '0 0 0.35rem',
          fontSize: '1.6rem',
          fontWeight: 800,
          color: '#1e293b',
          letterSpacing: '-0.02em',
        }}>
          Welcome back
        </h1>
        <p style={{ margin: '0 0 1.75rem', color: '#64748b', fontSize: '0.95rem' }}>
          Sign in to your AuditPulse account.
        </p>

        {/* Success banner from registration */}
        {successMessage && (
          <div style={{
            padding: '0.85rem 1rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            marginBottom: '1.25rem',
            color: '#166534',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            marginBottom: '1.25rem',
            color: '#991b1b',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
              Email address
            </label>
            <input
              id="signin-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                style={{ ...inputStyle, paddingRight: '3rem' }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '0.9rem', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 0, fontSize: '0.85rem',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            id="signin-submit-btn"
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.9rem',
              background: isLoading ? '#c7d2fe' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s, transform 0.15s',
              boxShadow: isLoading ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {isLoading ? (
              <>
                <span style={{
                  width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Signing in…
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </p>
      </div>

      <p style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to AuditPulse</Link>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
