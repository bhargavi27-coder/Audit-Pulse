/**
 * ForgotPasswordPage — Password recovery request page
 * NOTE: Without an email provider configured, this page accepts the email
 * but informs the user that email delivery requires configuration.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    // Show the same message regardless of whether the email is registered
    // (prevents email enumeration)
    setSubmitted(true);
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

      <Link to="/" style={{ textDecoration: 'none', marginBottom: '1.75rem', display: 'flex', gap: '0.1rem' }}>
        <span style={{ fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #1e293b 40%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Audit</span>
        <span style={{ fontWeight: 900, fontSize: '1.75rem', letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pulse</span>
      </Link>

      <div style={{
        background: '#fff', borderRadius: 20, padding: '2.5rem',
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(99,102,241,0.12), 0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid rgba(99,102,241,0.1)',
      }}>
        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
            <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>
              Check your inbox
            </h1>
            <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', background: '#f8fafc', padding: '0.85rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              ⚙️ <strong>Note:</strong> Email delivery requires SMTP configuration in the backend environment variables. Contact your administrator if you don't receive an email.
            </p>
            <Link to="/signin" style={{
              display: 'block', marginTop: '1.5rem',
              color: '#6366f1', fontWeight: 700, textDecoration: 'none',
            }}>
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>
              Reset your password
            </h1>
            <p style={{ margin: '0 0 1.75rem', color: '#64748b', fontSize: '0.95rem' }}>
              Enter the email address associated with your account.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#374151', marginBottom: '0.4rem' }}>
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0.8rem 1rem',
                    border: '1.5px solid #e2e8f0', borderRadius: 10,
                    fontSize: '0.95rem', fontFamily: "'Outfit', sans-serif",
                    color: '#1e293b', background: '#fafbff',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button type="submit" id="forgot-submit-btn" style={{
                width: '100%', padding: '0.9rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: '1rem', fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
              }}>
                Send Reset Link
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.9rem', color: '#64748b' }}>
              Remembered it?{' '}
              <Link to="/signin" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
