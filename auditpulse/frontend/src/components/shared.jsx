import React, { useState } from 'react';
import { getRiskClass, getRiskIcon, formatDate } from '../utils/helpers';
import {
  X, ExternalLink, AlertTriangle, CheckCircle, Shield,
  Copy, Check, FileText, Code2, Sparkles, ArrowRight,
  UserCheck, ThumbsUp, ThumbsDown, ShieldAlert, Wrench,
  Clock, GitPullRequest, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { findingsApi } from '../services/api';

/**
 * Risk badge component with optional numerical risk score
 */
export function RiskBadge({ risk, score, size = 'normal' }) {
  const cls = getRiskClass(risk);
  const icon = getRiskIcon(risk);
  return (
    <span
      className={`badge ${cls}`}
      style={size === 'large' ? { fontSize: '0.8125rem', padding: '0.45rem 1rem', borderRadius: 10 } : {}}
    >
      {icon} {risk} {score !== undefined && score !== null && score > 0 ? `(${Math.round(score)}/100)` : ''}
    </span>
  );
}

/**
 * Compliance Risk Score gauge / badge
 */
export function ComplianceRiskGauge({ score, risk, size = 'normal' }) {
  const num = Math.round(score || 0);
  const color = num >= 75 ? 'var(--risk-high)' : num >= 45 ? 'var(--risk-medium)' : 'var(--risk-compliant)';
  const label = num >= 75 ? 'HIGH RISK' : num >= 45 ? 'MODERATE RISK' : 'LOW RISK';

  if (size === 'mini') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: 6,
        background: num >= 75 ? 'var(--risk-high-bg)' : num >= 45 ? 'var(--risk-medium-bg)' : 'var(--risk-compliant-bg)',
        border: `1px solid ${num >= 75 ? 'var(--risk-high-border)' : num >= 45 ? 'var(--risk-medium-border)' : 'var(--risk-compliant-border)'}`,
        color,
        fontSize: '0.72rem',
        fontWeight: 800,
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        ⚡ {num}/100
      </span>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.5rem 1rem',
      borderRadius: 12,
      background: 'var(--bg-secondary)',
      border: `1px solid ${num >= 75 ? 'var(--risk-high-border)' : num >= 45 ? 'var(--risk-medium-border)' : 'var(--risk-compliant-border)'}`,
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.85rem',
        fontWeight: 900,
        fontFamily: 'Outfit, sans-serif',
        color
      }}>
        {num}
      </div>
      <div>
        <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
          Compliance Risk Score
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color }}>
          {label} {risk ? `• ${risk}` : ''}
        </div>
      </div>
    </div>
  );
}

/**
 * Confidence meter component
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
 * Compliance Lifecycle Stepper: Detected -> Reviewed -> Remediating -> Fixed & Verified
 */
export function ComplianceTimelineStepper({ timelines = [], status = 'open' }) {
  const stages = [
    { key: 'detected', label: '1. Detected', icon: ShieldAlert, desc: 'AI Sentinel Scan' },
    { key: 'reviewed', label: '2. Reviewed', icon: UserCheck, desc: 'Legal/Security' },
    { key: 'assigned', label: '3. Remediating', icon: Wrench, desc: 'Patch Generated' },
    { key: 'fixed', label: '4. Fixed & Verified', icon: CheckCircle, desc: 'Compliant' }
  ];

  const getActiveIndex = () => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved') return 3;
    if (s === 'approved' || s === 'acknowledged') return 2;
    if (s === 'rejected' || s === 'dismissed' || s === 'false_positive') return 1;
    return 0;
  };

  const activeIdx = getActiveIndex();

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          ⏳ Compliance Lifecycle Timeline
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          Current Status: <strong style={{ color: 'var(--accent-blue)', textTransform: 'uppercase' }}>{status}</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', position: 'relative' }}>
        {stages.map((st, i) => {
          const isDone = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const IconComp = st.icon;
          const color = isDone
            ? (status === 'rejected' || status === 'dismissed' ? 'var(--risk-medium)' : 'var(--risk-compliant)')
            : 'var(--text-muted)';

          return (
            <div
              key={st.key}
              style={{
                background: isCurrent ? 'rgba(59, 130, 246, 0.08)' : (isDone ? 'var(--bg-card)' : 'transparent'),
                border: `1px solid ${isCurrent ? 'var(--accent-blue)' : (isDone ? 'var(--border)' : 'rgba(0,0,0,0.06)')}`,
                borderRadius: 10,
                padding: '0.75rem',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isDone ? (isCurrent ? 'var(--gradient-primary)' : 'rgba(16, 185, 129, 0.15)') : 'var(--bg-tertiary)',
                color: isCurrent ? 'white' : color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 6px',
                fontWeight: 800
              }}>
                <IconComp size={14} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {st.label}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {st.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Exact Policy Sentence <-> Exact Code Line Side-by-Side Evidence Lock
 */
export function EvidencePairCard({ finding }) {
  const [copied, setCopied] = useState(false);
  const ep = finding.evidence_pair || {};
  const policyQuote = ep.policy_quote || finding.policy_evidence || 'No policy quote captured';
  const codeSnippet = ep.code_snippet || finding.code_evidence || '// No code snippet captured';
  const policySec = ep.policy_section || finding.policy_reference || 'Privacy Policy Mandate';
  const codeLine = ep.code_line || 1;
  const codeFile = ep.file_path || finding.code_reference || 'source.js';

  const handleCopy = () => {
    navigator.clipboard.writeText(`POLICY CLAUSE [${policySec}]:\n"${policyQuote}"\n\nCODE EVIDENCE [${codeFile}:Line ${codeLine}]:\n${codeSnippet}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚖️ Exact Evidence Pair (Policy Sentence ⟷ Code Line)
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleCopy}
          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
        >
          {copied ? <Check size={13} color="var(--risk-compliant)" /> : <Copy size={13} />}
          {copied ? 'Copied Pair' : 'Copy Evidence'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Policy sentence */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.28)',
          borderRadius: 10,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <FileText size={13} /> {policySec}
          </div>
          <blockquote style={{
            margin: 0,
            fontSize: '0.86rem',
            fontStyle: 'italic',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            flex: 1
          }}>
            "{policyQuote}"
          </blockquote>
        </div>

        {/* Code line */}
        <div style={{
          background: '#0F172A',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 10,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Code2 size={13} /> {codeFile} (Line {codeLine})
          </div>
          <pre style={{
            margin: 0,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.8rem',
            color: '#F8FAFC',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            lineHeight: 1.5,
            flex: 1
          }}>
            {codeSnippet}
          </pre>
        </div>
      </div>

      {ep.conflict_vector && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.65rem 0.85rem',
          background: 'rgba(239, 68, 68, 0.06)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 8,
          fontSize: '0.78rem',
          color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--risk-high)' }}>Conflict Vector:</strong> {ep.conflict_vector}
        </div>
      )}
    </div>
  );
}

/**
 * Concrete Suggested Fix Diff & Patch Card
 */
export function SuggestedFixCard({ finding }) {
  const [copied, setCopied] = useState(false);
  const sf = finding.suggested_fix || {};
  const diff = sf.diff || `- ${finding.code_evidence || 'violating_code();'}\n+ // Remediate with consent check\n+ if (user.consent) {\n+   ${finding.code_evidence || 'violating_code();'}\n+ }`;
  const explanation = sf.explanation || finding.recommendation || 'Apply consent verification before transmitting personal data.';

  const handleCopy = () => {
    navigator.clipboard.writeText(sf.code_patch || diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Wrench size={15} color="var(--risk-compliant)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🛠️ Concrete Suggested Fix & Code Patch
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCopy}
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', gap: '0.35rem' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied Patch' : 'Copy Code Fix'}
        </button>
      </div>

      <div style={{
        background: '#0F172A',
        borderRadius: 10,
        padding: '0.85rem 1rem',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '0.78rem',
        lineHeight: 1.6,
        overflowX: 'auto',
        marginBottom: '0.75rem'
      }}>
        {diff.split('\n').map((line, idx) => {
          const isAdd = line.startsWith('+');
          const isDel = line.startsWith('-');
          return (
            <div
              key={idx}
              style={{
                color: isAdd ? '#4ade80' : isDel ? '#f87171' : '#94a3b8',
                background: isAdd ? 'rgba(74, 222, 128, 0.12)' : isDel ? 'rgba(248, 113, 113, 0.12)' : 'transparent',
                padding: '1px 6px',
                borderRadius: 4
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong>Remediation Rationale:</strong> {explanation}
      </div>

      {sf.policy_adjustment && (
        <div style={{
          marginTop: '0.65rem',
          padding: '0.6rem 0.85rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          borderRadius: 8,
          fontSize: '0.78rem',
          color: 'var(--risk-medium)'
        }}>
          <strong>Policy Alignment Option:</strong> {sf.policy_adjustment}
        </div>
      )}
    </div>
  );
}

/**
 * Finding card for list view
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <RiskBadge risk={finding.risk} score={finding.risk_score} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {finding.title}
            </span>
            {finding.status && (
              <span style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 800,
                textTransform: 'uppercase',
                background: finding.status === 'approved' ? 'rgba(239, 68, 68, 0.12)' : (finding.status === 'resolved' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-tertiary)'),
                color: finding.status === 'approved' ? 'var(--risk-high)' : (finding.status === 'resolved' ? 'var(--risk-compliant)' : 'var(--text-muted)'),
                border: '1px solid var(--border)'
              }}>
                {finding.status}
              </span>
            )}
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
 * Finding detail modal incorporating Human Review and all 12 improvements
 */
export function FindingModal({ finding, onClose, onReviewComplete }) {
  const [reviewRole, setReviewRole] = useState('Legal Counsel');
  const [reviewName, setReviewName] = useState('Sarah Chen');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('false_positive');

  if (!finding) return null;

  const handleReview = async (decision) => {
    setReviewing(true);
    try {
      await findingsApi.review(finding.id, {
        decision,
        reviewer_role: reviewRole,
        reviewer_name: reviewName,
        notes: reviewNotes,
        feedback_category: decision === 'reject' ? feedbackCategory : null,
      });
      if (onReviewComplete) onReviewComplete();
      onClose();
    } catch (e) {
      alert('Review action failed: ' + (e.userMessage || e.message));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <RiskBadge risk={finding.risk} score={finding.risk_score} size="large" />
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
          {/* Score & Confidence Banner */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <ComplianceRiskGauge score={finding.risk_score} risk={finding.risk} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Multi-Agent AI Confidence Score
              </div>
              <ConfidenceMeter value={finding.confidence} />
            </div>
          </div>

          {/* Compliance Lifecycle Timeline */}
          <ComplianceTimelineStepper timelines={finding.timeline} status={finding.status} />

          {/* Side-by-Side Exact Evidence Pair */}
          <EvidencePairCard finding={finding} />

          {/* Suggested Fix Diff & Patch */}
          <SuggestedFixCard finding={finding} />

          {/* Human Review & Governance Action Box */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.04)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 14,
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={16} color="var(--accent-blue)" /> Legal & Security Team Governance Review
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Decision logs into audit trail & AI memory
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Reviewer Role
                </label>
                <select
                  className="input"
                  value={reviewRole}
                  onChange={(e) => setReviewRole(e.target.value)}
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <option value="Legal Counsel">Legal Counsel (Privacy & Compliance)</option>
                  <option value="Security Engineer">Security Engineer (Application Security)</option>
                  <option value="CISO">Chief Information Security Officer (CISO)</option>
                  <option value="Data Protection Officer">Data Protection Officer (DPO)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Reviewer Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="e.g. Sarah Chen"
                  style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Review Justification / AI Feedback Rationale
              </label>
              <textarea
                className="input"
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review decision notes, waiver explanation, or why this is a false positive..."
                style={{ fontSize: '0.82rem', resize: 'vertical' }}
              />
            </div>

            {showFeedbackInput && (
              <div style={{ marginBottom: '0.85rem', padding: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  False Positive Category (AI Feedback Loop)
                </label>
                <select
                  className="input"
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  style={{ padding: '0.45rem', fontSize: '0.82rem' }}
                >
                  <option value="internal_mock">Internal Test / Mock Code</option>
                  <option value="anonymized">Data is Anonymized / Pseudonymized Prior to Send</option>
                  <option value="global_consent">Consent Handled Upstream in Global Middleware</option>
                  <option value="contractual_exception">Approved Subprocessor Contractual Exception</option>
                  <option value="other">Other Valid Compliance Exception</option>
                </select>
              </div>
            )}

            {/* Governance Action Buttons */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleReview('approve')}
                disabled={reviewing}
                style={{ background: 'var(--risk-high)', borderColor: 'var(--risk-high)', fontSize: '0.78rem' }}
              >
                <ThumbsDown size={14} /> Approve Violation (Flag for Engineering)
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (!showFeedbackInput) {
                    setShowFeedbackInput(true);
                  } else {
                    handleReview('reject');
                  }
                }}
                disabled={reviewing}
                style={{ borderColor: 'var(--risk-medium)', color: 'var(--risk-medium)', fontSize: '0.78rem' }}
              >
                <ThumbsUp size={14} /> Reject (False Positive & Feed AI)
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleReview('dismiss')}
                disabled={reviewing}
                style={{ fontSize: '0.78rem' }}
              >
                Dismiss (Waive Risk)
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handleReview('resolve')}
                disabled={reviewing}
                style={{ color: 'var(--risk-compliant)', borderColor: 'var(--risk-compliant)', fontSize: '0.78rem' }}
              >
                <CheckCircle size={14} /> Mark as Fixed & Remediated
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close Window</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton
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
 * Toast notifications
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
