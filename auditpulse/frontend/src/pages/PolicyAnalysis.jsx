import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { policyApi } from '../services/api';
import { RiskBadge, ToastContainer } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { Upload, FileText, Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Shield, ArrowRight } from 'lucide-react';

const DEMO_POLICY = `AuditCorp Privacy Policy — Version 2.0

Section 3.2 — Data Sharing Restrictions
Customer email addresses and personally identifiable information (PII) MUST NOT be shared with
third-party analytics services, advertising networks, or data brokers without explicit, informed
user consent. Users must actively opt in before any PII is transmitted to third parties.

Section 4.1 — Data Retention
Personal data is retained for the minimum period necessary, not to exceed 90 days after account
closure unless required by law.

Section 5.1 — Security
Access to personal data is restricted to authorized personnel only.`;

export default function PolicyAnalysis() {
  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedRule, setExpandedRule] = useState(null);
  const fileInputRef = useRef();
  const { toasts, showToast, removeToast } = useToast();

  const handleAnalyze = useCallback(async () => {
    if (!name.trim()) { showToast('Please enter a policy name.', 'warning'); return; }
    if (mode === 'text' && !content.trim()) { showToast('Please paste policy text or use the demo.', 'warning'); return; }
    if (mode === 'file' && !file) { showToast('Please select a file.', 'warning'); return; }

    setLoading(true);
    setResult(null);
    try {
      let res;
      if (mode === 'text') {
        res = await policyApi.analyze({ name: name.trim(), content: content.trim(), version });
      } else {
        const form = new FormData();
        form.append('name', name.trim());
        form.append('version', version);
        form.append('file', file);
        res = await policyApi.upload(form);
      }
      setResult(res.data);
      showToast(`Extracted ${res.data.rules_extracted} compliance rule(s) successfully!`, 'success');
    } catch (e) {
      showToast(e.userMessage || 'Analysis failed. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, name, version, content, file, showToast]);

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const SEVERITY_CONFIG = {
    HIGH: { label: 'Critical Obligation', color: 'var(--risk-high-light)', border: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.08)' },
    MEDIUM: { label: 'Important Rule', color: 'var(--risk-medium-light)', border: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.08)' },
    LOW: { label: 'General Guideline', color: 'var(--risk-low-light)', border: 'rgba(59, 130, 246, 0.4)', bg: 'rgba(59, 130, 246, 0.08)' },
  };

  return (
    <div className="page-container">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38, height: 38,
              borderRadius: 10,
              background: 'var(--gradient-primary)',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.35)'
            }}>
              <FileText size={22} color="white" />
            </span>
            <span className="gradient-text">Policy Parser & Legal Rule Extractor</span>
          </h1>
          <p>
            Upload or paste your company's privacy policy, terms of service, or GDPR/CCPA declarations.
            The Legal AI Agent decomposes unstructured legal clauses into machine-verifiable compliance rules.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.15fr', gap: '1.75rem', alignItems: 'start' }}>

        {/* Input Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            {/* Mode Tabs */}
            <div className="tab-bar">
              <button className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
                📝 Paste Policy Text
              </button>
              <button className={`tab ${mode === 'file' ? 'active' : ''}`} onClick={() => setMode('file')}>
                📁 Upload Document (.txt / .md / .pdf)
              </button>
            </div>

            {/* Policy Name & Version */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Policy Document Name *
                </label>
                <input
                  className="input"
                  placeholder="e.g. AuditCorp Privacy Policy, ToS v2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  id="policy-name"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Version
                </label>
                <input
                  className="input"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                />
              </div>
            </div>

            {/* Content Input */}
            {mode === 'text' ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Policy Text *
                  </label>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => { setContent(DEMO_POLICY); setName('AuditCorp Privacy Policy'); setVersion('2.0'); }}
                  >
                    <Sparkles size={13} color="var(--accent-purple)" />
                    Load Sample Policy
                  </button>
                </div>
                <textarea
                  className="textarea"
                  placeholder="Paste your privacy policy, terms of service, or compliance agreement here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ minHeight: 260 }}
                  id="policy-content"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{content.length} characters</span>
                  <span>Supports Markdown, plain text, and numbered clauses</span>
                </div>
              </div>
            ) : (
              <div
                className={`upload-zone ${file ? 'dragover' : ''}`}
                style={{ marginBottom: '1.25rem' }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".txt,.md,.pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                />
                {file ? (
                  <div>
                    <CheckCircle size={36} color="var(--risk-compliant)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{file.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {(file.size / 1024).toFixed(1)} KB • Click to swap file
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={36} color="var(--accent-indigo)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Drop policy file here or click to browse</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Supports: .txt, .md, .pdf (extracts text automatically)
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
              onClick={handleAnalyze}
              disabled={loading}
              id="analyze-policy-btn"
            >
              {loading ? (
                <><div className="spinner" /> Parsing Clauses with Legal Agent...</>
              ) : (
                <><Sparkles size={16} /> Extract Structured Compliance Rules</>
              )}
            </button>
          </div>

          {/* Legal Agent Architecture Callout */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)'
          }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={16} color="var(--accent-purple)" />
              How the Legal Agent Works
            </h4>
            {[
              ['Identifies Legal Obligations', 'Scans for prohibitive vs permissive statements regarding user privacy.'],
              ['Extracts Data Classes', 'Discovers personal emails, PII, financial credentials, health indicators.'],
              ['Evaluates Required Conditions', 'Maps prerequisite conditions such as explicit user opt-in consent.'],
              ['Assigns Severity Levels', 'Categorizes obligations into Critical (High), Important (Medium), and Low.'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <CheckCircle size={15} color="var(--risk-compliant)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {!result && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <FileText size={52} color="var(--accent-purple)" style={{ opacity: 0.5, margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
                Ready to Extract Rules
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
                Click "Load Sample Policy" on the left and run analysis to inspect structured compliance obligations.
              </p>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Summary Banner */}
              <div className="alert alert-compliant">
                <CheckCircle size={20} color="var(--risk-compliant)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--risk-compliant)', fontSize: '0.95rem' }}>
                    Extraction Succeeded — {result.rules_extracted} Verifiable Rules Discovered
                  </div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', marginTop: 2 }}>
                    {result.analysis_summary}
                  </div>
                </div>
              </div>

              {/* Policy Header Card */}
              <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', fontFamily: 'Outfit, sans-serif' }}>
                      {result.policy.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Version {result.policy.version} · Policy ID #{result.policy.id}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.35rem 0.85rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, color: 'var(--risk-compliant)'
                  }}>
                    DATABASE SAVED
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Extracted Obligations ({result.policy.rules.length})
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click rule card to view conditions
                </span>
              </div>

              {result.policy.rules.map((rule, i) => {
                const expanded = expandedRule === i;
                const conf = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.MEDIUM;

                return (
                  <div
                    key={i}
                    className="card"
                    style={{
                      padding: '1.125rem 1.35rem',
                      borderLeft: `4px solid ${conf.color}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setExpandedRule(expanded ? null : i)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <RiskBadge risk={rule.severity} />
                        {rule.section && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan-bright)', fontFamily: 'JetBrains Mono, monospace' }}>
                            §{rule.section}
                          </span>
                        )}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {rule.data_type} → {rule.action} → {rule.destination}
                        </span>
                      </div>
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>

                    {expanded && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                          {[
                            ['Data Type', rule.data_type],
                            ['Required Action', rule.action],
                            ['Destination', rule.destination],
                            ['Condition / Consent', rule.condition || 'None (Unconditional)'],
                            ['Severity Level', conf.label],
                            ['Document Section', rule.section || 'General'],
                          ].map(([lbl, val]) => (
                            <div key={lbl} style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              padding: '0.6rem 0.85rem',
                              borderRadius: 8,
                              border: '1px solid var(--border)'
                            }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                                {lbl}
                              </div>
                              <div style={{ fontSize: '0.825rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {val}
                              </div>
                            </div>
                          ))}
                        </div>

                        {rule.raw_text && (
                          <blockquote style={{
                            margin: 0, padding: '0.85rem 1rem',
                            background: 'rgba(59, 130, 246, 0.08)',
                            borderLeft: '3px solid var(--accent-indigo)',
                            borderRadius: '0 8px 8px 0',
                            fontSize: '0.825rem', fontStyle: 'italic', color: 'var(--text-secondary)'
                          }}>
                            "{rule.raw_text}"
                          </blockquote>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Next Step Banner */}
              <div style={{
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '1px solid var(--border-bright)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Rules Ready for Code Verification
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Now scan your application source code to test if developer implementations match these promises.
                  </div>
                </div>
                <Link to="/code" className="btn btn-cyan" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                  Analyze Code AST <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
