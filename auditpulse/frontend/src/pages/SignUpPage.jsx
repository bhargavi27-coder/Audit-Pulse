/**
 * SignUpPage — New account registration page
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  const passed = checks.filter(c => c.ok).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.4rem' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < passed ? colors[passed - 1] : '#e2e8f0',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontSize: '0.72rem', fontWeight: 500,
            color: c.ok ? '#16a34a' : '#94a3b8',
          }}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    organization: '',
    accept_terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect already-authenticated users
  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, authLoading, navigate]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
    if (error) setError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!form.email.trim()) errs.email = 'Email address is required.';
    else if (!emailRegex.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (!form.confirm_password) errs.confirm_password = 'Please confirm your password.';
    else if (form.confirm_password !== form.password) errs.confirm_password = 'Passwords do not match.';
    if (!form.accept_terms) errs.accept_terms = 'You must accept the Terms and Privacy Policy.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await signup({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        organization: form.organization.trim() || null,
      });
      navigate('/signin', {
        state: { registered: result.message || 'Account created! Please sign in.' }
      });
    } catch (err) {
      setError(err.userMessage || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.8rem 1rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    fontSize: '0.95rem',
    fontFamily: "'Outfit', sans-serif",
    color: '#1e293b',
    background: '#fafbff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  const errorStyle = {
    color: '#dc2626',
    fontSize: '0.8rem',
    marginTop: '0.3rem',
    fontWeight: 500,
  };

  const Field = ({ id, label, name, type = 'text', placeholder, extra, children }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
        {label} {type !== 'checkbox' && name !== 'organization' && (
          <span style={{ color: '#dc2626' }}>*</span>
        )}
      </label>
      {children || (
        <input
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          disabled={isLoading}
          style={{
            ...inputStyle,
            ...(fieldErrors[name] ? { borderColor: '#fca5a5' } : {}),
            ...(extra || {}),
          }}
          onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
          onBlur={e => { e.target.style.borderColor = fieldErrors[name] ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
        />
      )}
      {fieldErrors[name] && <p style={errorStyle}>{fieldErrors[name]}</p>}
    </div>
  );

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
        maxWidth: 480,
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
          Create your account
        </h1>
        <p style={{ margin: '0 0 1.75rem', color: '#64748b', fontSize: '0.95rem' }}>
          Start monitoring compliance drift in minutes.
        </p>

        {/* Server error */}
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
          {/* Full name */}
          <Field id="signup-fullname" label="Full name" name="full_name" placeholder="Jane Smith" />

          {/* Email */}
          <Field id="signup-email" label="Email address" name="email" type="email" placeholder="jane@company.com" />

          {/* Organization (optional) */}
          <Field id="signup-org" label="Organization (optional)" name="organization" placeholder="Acme Corp" />

          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
              Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...inputStyle,
                  paddingRight: '3rem',
                  ...(fieldErrors.password ? { borderColor: '#fca5a5' } : {}),
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = fieldErrors.password ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" id="toggle-password" onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <PasswordStrength password={form.password} />
            {fieldErrors.password && <p style={errorStyle}>{fieldErrors.password}</p>}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
              Confirm password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                name="confirm_password"
                placeholder="Repeat your password"
                value={form.confirm_password}
                onChange={handleChange}
                disabled={isLoading}
                style={{
                  ...inputStyle,
                  paddingRight: '3rem',
                  ...(fieldErrors.confirm_password ? { borderColor: '#fca5a5' } : {}),
                }}
                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = fieldErrors.confirm_password ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" id="toggle-confirm" onClick={() => setShowConfirm(p => !p)}
                style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.confirm_password && <p style={errorStyle}>{fieldErrors.confirm_password}</p>}
          </div>

          {/* Terms checkbox */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
              cursor: 'pointer', fontSize: '0.88rem', color: '#374151',
            }}>
              <input
                id="accept-terms"
                type="checkbox"
                name="accept_terms"
                checked={form.accept_terms}
                onChange={handleChange}
                disabled={isLoading}
                style={{ marginTop: 3, accentColor: '#6366f1', width: 16, height: 16, flexShrink: 0 }}
              />
              <span>
                I agree to the{' '}
                <span style={{ color: '#6366f1', fontWeight: 600 }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: '#6366f1', fontWeight: 600 }}>Privacy Policy</span>
              </span>
            </label>
            {fieldErrors.accept_terms && <p style={{ ...errorStyle, marginLeft: '1.5rem' }}>{fieldErrors.accept_terms}</p>}
          </div>

          {/* Submit */}
          <button
            id="signup-submit-btn"
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
                Creating account…
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/signin" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
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
