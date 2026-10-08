import React, { useState } from 'react';
import { getRiskClass, getRiskIcon, formatDate, formatConfidence } from '../utils/helpers';
import {
  X, ExternalLink, AlertTriangle, CheckCircle, Shield,
  Copy, Check, FileText, Code2, Sparkles, ArrowRight
} from 'lucide-react';

/**
 * Risk badge component using the shared risk palette
 */
export function RiskBadge({ risk, size = 'normal' }) {
  const cls = getRiskClass(risk);
  const icon = getRiskIcon(risk);
  return (
    <span
      className={`badge ${cls}`}
      style={size === 'large' ? { fontSize: '0.8125rem', padding: '0.45rem 1rem', borderRadius: 10 } : {}}
    >
      {icon} {risk}
    </span>
  );
}

/**
 * Confidence meter component with glowing gradient fill
 */
export function ConfidenceMeter({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? 'var(--risk-high)' : pct >= 60 ? 'var(--risk-medium)' : 'var(--accent-cyan-bright)';
  const gradient = pct >= 80
    ? 'linear-gradient(90deg, #EF4444, #F87171)'
    : pct >= 60
    ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    : 'linear-gradient(90deg, #3B82F6, #8B5CF6)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <div className="progress-bar" style={{ flex: 1, minWidth: 60 }}>
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: gradient, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
      <span style={{ fontSize: '0.78rem', color, fontWeight: 800, minWidth: 36, fontFamily: 'JetBrains Mono, monospace' }}>
        {pct}%
      </span>
    </div>
  );
}

/**
 * Finding card — sleek glass display for list views
 */
export function FindingCard({ finding, onClick }) {
  const riskBorderColor =
    finding.risk === 'HIGH' ? 'var(--risk-high)' :
    finding.risk === 'MEDIUM' ? 'var(--risk-medium)' :
    finding.risk === 'COMPLIANT' ? 'var(--risk-compliant)' :
    'var(--risk-low)';

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        marginBottom: '0.85rem',
        borderLeft: `4px solid ${riskBorderColor}`,
        padding: '1.25rem 1.5rem',
      }}
      onClick={() => onClick && onClick(finding)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.25rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <RiskBadge risk={finding.risk} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {finding.title}
            </span>
          </div>
          {finding.reason && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.6 }}>
              {finding.reason.slice(0, 180)}{finding.reason.length > 180 ? '...' : ''}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {finding.code_reference && <span className="tag">💻 {finding.code_reference}</span>}
            {finding.data_involved && <span className="tag">📊 {finding.data_involved}</span>}
            {finding.destination && <span className="tag">🌐 {finding.destination}</span>}
            {finding.finding_type && (
              <span className="tag" style={{ color: 'var(--accent-purple)', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                ⚡ {finding.finding_type}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 120 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {formatDate(finding.created_at)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2 }}>
              Confidence
            </span>
            <ConfidenceMeter value={finding.confidence} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Finding detail modal
 */
export function FindingModal({ finding, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!finding) return null;

  const handleCopyEvidence = () => {
    const text = `Policy: ${finding.policy_evidence || 'N/A'}\n\nCode: ${finding.code_evidence || 'N/A'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <RiskBadge risk={finding.risk} size="large" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{finding.title}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Audit ID #{finding.id || 'N/A'} • Detected on {formatDate(finding.created_at)}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.45rem', borderRadius: 8 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Confidence banner */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Multi-Agent AI Confidence Score
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Cross-verified between Legal Agent AST Parser and Code Sinks
              </div>
            </div>
            <div style={{ width: 140 }}>
              <ConfidenceMeter value={finding.confidence} />
            </div>
          </div>

          {/* References Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <InfoField label="Policy Reference" value={finding.policy_reference} />
            <InfoField label="Code Reference" value={finding.code_reference} />
            <InfoField label="Data Involved" value={finding.data_involved} />
            <InfoField label="Destination / Recipient" value={finding.destination} />
          </div>

          {/* Analysis Reason */}
          <Section title="🔍 Multi-Agent Audit Analysis">
            <div style={{
              padding: '1.125rem 1.25rem',
              background: 'rgba(59, 130, 246, 0.06)',
              border: '1px solid rgba(59, 130, 246, 0.22)',
              borderRadius: 12,
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              lineHeight: 1.7
            }}>
              {finding.reason}
            </div>
          </Section>

          {/* Evidence Comparison */}
          {(finding.policy_evidence || finding.code_evidence) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  📋 Side-by-Side Evidence
                </span>
                <button
                  className="btn btn-secondary"
                  onClick={handleCopyEvidence}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                >
                  {copied ? <Check size={13} color="var(--risk-compliant)" /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy Evidence'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Policy evidence */}
                <div style={{
                  padding: '1rem',
                  background: 'rgba(59, 130, 246, 0.06)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-sky)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={13} /> Policy Clause
                  </div>
                  <blockquote style={{
                    margin: 0,
                    fontStyle: 'italic',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    color: 'var(--text-secondary)'
                  }}>
                    "{finding.policy_evidence || 'No direct text quote recorded.'}"
                  </blockquote>
                </div>

                {/* Code evidence */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--risk-high-light)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Code2 size={13} /> Code Implementation
                  </div>
                  <div className="code-block" style={{ margin: 0, padding: '0.75rem', fontSize: '0.8rem' }}>
                    {finding.code_evidence || '// No code snippet attached'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Remediation Recommendation */}
          {finding.recommendation && (
            <Section title="💡 Recommended Engineering Remediation">
              <div className="alert alert-info">
                <CheckCircle size={18} color="var(--accent-cyan-bright)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.65 }}>
                  {finding.recommendation}
                </p>
              </div>
            </Section>
          )}

          {/* Legal Disclaimer — Clean, High-Contrast Amber */}
          <div style={{
            marginTop: '1.5rem',
            padding: '0.85rem 1.15rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            fontSize: '0.78rem',
            color: 'var(--risk-medium)',
            display: 'flex',
            gap: '0.625rem',
            alignItems: 'center'
          }}>
            <AlertTriangle size={16} color="var(--risk-medium)" style={{ flexShrink: 0 }} />
            <span>This is automated compliance intelligence. Review critical decisions with internal legal counsel.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close Window</button>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      padding: '0.75rem 1rem',
      borderRadius: 10,
      border: '1px solid var(--border)'
    }}>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace', color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
        {value || 'N/A'}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.35rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.625rem' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Loading skeleton placeholder
 */
export function LoadingSkeleton({ lines = 3, height = 70, count = 3 }) {
  const items = lines || count;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, width: '100%' }} />
      ))}
    </div>
  );
}

/**
 * Empty state
 */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: '3.25rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.35))' }}>
        {icon || '🛡️'}
      </div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0', fontFamily: 'Outfit, sans-serif' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
        {description}
      </p>
      {action}
    </div>
  );
}

/**
 * Toast notification container
 */
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onDismiss && onDismiss(toast.id)}
          style={{ cursor: 'pointer' }}
        >
          {toast.type === 'success' && <CheckCircle size={18} color="var(--risk-compliant)" style={{ flexShrink: 0 }} />}
          {toast.type === 'error' && <AlertTriangle size={18} color="var(--risk-high)" style={{ flexShrink: 0 }} />}
          {toast.type === 'warning' && <AlertTriangle size={18} color="var(--risk-medium)" style={{ flexShrink: 0 }} />}
          {toast.type === 'info' && <Sparkles size={18} color="var(--accent-cyan-bright)" style={{ flexShrink: 0 }} />}
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
