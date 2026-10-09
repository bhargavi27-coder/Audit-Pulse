import React, { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { codeApi } from '../services/api';
import { ToastContainer } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import {
  Upload, Code2, Sparkles, CheckCircle, AlertTriangle, Shield,
  ArrowRight, Terminal, Network, Layers, Cpu, ArrowDown
} from 'lucide-react';
import { getLanguageLabel } from '../utils/helpers';

const DEMO_VIOLATING = `/**
 * analytics.js — VIOLATING VERSION
 * This code sends user.email to a third-party analytics service
 * WITHOUT checking user consent first.
 */
const analytics = require('analytics-sdk');

function trackUser(user) {
  // VIOLATION: No consent check before sending PII
  analytics.track("user", {
    email: user.email,    // ← PII sent to third party
    name: user.name,
    plan: user.plan
  });
}

function identifyUser(user) {
  analytics.identify(user.id, {
    email: user.email,    // ← Another PII transmission
    plan: user.plan
  });
}

module.exports = { trackUser, identifyUser };`;

const DEMO_COMPLIANT = `/**
 * analytics.js — COMPLIANT VERSION
 * All PII transmissions are wrapped in consent checks.
 */
const analytics = require('analytics-sdk');

function trackUser(user) {
  // COMPLIANT: Consent check before sending any PII
  if (user.consent && user.consent.analytics === true) {
    analytics.track("user", {
      email: user.email,  // Consent verified
      plan: user.plan
    });
  } else {
    analytics.track("user_anonymous", {
      userId: user.anonymizedId
    });
  }
}

module.exports = { trackUser };`;

export default function CodeAnalysis() {
  const [mode, setMode] = useState('text');
  const [language, setLanguage] = useState('javascript');
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();
  const { toasts, showToast, removeToast } = useToast();

  const handleAnalyze = useCallback(async () => {
    if (mode === 'text' && !content.trim()) {
      showToast('Please paste source code or select a sample demo.', 'warning');
      return;
    }
    if (mode === 'file' && !file) {
      showToast('Please upload a source code file.', 'warning');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      let res;
      if (mode === 'text') {
        res = await codeApi.analyze({
          content: content.trim(),
          language,
          file_path: filePath.trim() || 'source.js',
        });
      } else {
        const form = new FormData();
        form.append('file', file);
        form.append('language', language);
        res = await codeApi.upload(form);
      }
      setResult(res.data);
      showToast('AST code analysis completed: Identified components & data flows!', 'success');
    } catch (e) {
      showToast(e.userMessage || 'Code analysis failed. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, content, language, filePath, file, showToast]);

  const getRiskColor = (indicator) => {
    const map = {
      HIGH: 'var(--risk-high-light)',
      MEDIUM: 'var(--risk-medium-light)',
      LOW: 'var(--accent-sky)'
    };
    return map[indicator] || 'var(--text-muted)';
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
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)'
            }}>
              <Code2 size={22} color="white" />
            </span>
            <span className="gradient-text-cyan">Code Analysis & Data Flow Mapping</span>
          </h1>
          <p>
            Scans source code for compliance-critical behavioral sinks, maps affected components,
            and traces end-to-end data flows (Source ➔ Transform ➔ Sink) with consent guard status.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.15fr', gap: '1.75rem', alignItems: 'start' }}>

        {/* Input Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="tab-bar">
              <button className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>
                📝 Paste Code
              </button>
              <button className={`tab ${mode === 'file' ? 'active' : ''}`} onClick={() => setMode('file')}>
                📁 Upload Source File
              </button>
            </div>

            {/* Language Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Programming Language
              </label>
              <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} id="code-language" style={{ width: '100%' }}>
                <option value="javascript">JavaScript (Node / Browser)</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
              </select>
            </div>

            {mode === 'text' ? (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Virtual File Path
                  </label>
                  <input
                    className="input"
                    placeholder="src/services/analytics.js"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                  />
                </div>

                {/* Pre-packaged Demos */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Load Demonstration Code:
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                      onClick={() => { setContent(DEMO_VIOLATING); setFilePath('src/analytics_leak.js'); }}
                    >
                      🚨 Load Violating Code (Email Leak)
                    </button>
                    <button
                      className="btn btn-success"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                      onClick={() => { setContent(DEMO_COMPLIANT); setFilePath('src/analytics_guarded.js'); }}
                    >
                      ✅ Load Compliant Code (Consent Guard)
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <textarea
                    className="textarea"
                    placeholder="Paste your source code here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ minHeight: 280, fontSize: '0.82rem' }}
                    id="code-content"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{content ? content.split('\n').length : 0} lines</span>
                    <span>AST Tree-sitter Enabled</span>
                  </div>
                </div>
              </>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 14,
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-secondary)',
                  marginBottom: '1.25rem'
                }}
              >
                <Upload size={32} color="var(--accent-cyan-bright)" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {file ? file.name : 'Click to select source code file'}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".js,.ts,.jsx,.tsx,.py,.java,.go"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
            )}

            <button
              className="btn btn-cyan"
              style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}
              onClick={handleAnalyze}
              disabled={loading}
              id="analyze-code-btn"
            >
              {loading ? (
                <><div className="spinner" /> Analyzing Syntax Tree & Data Flows...</>
              ) : (
                <><Sparkles size={16} /> Trace Data Flows & Affected Components</>
              )}
            </button>
          </div>

          {/* AST Capabilities */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)'
          }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={16} color="var(--accent-cyan-bright)" />
              What Code Agent Identifies
            </h4>
            {[
              ['Affected Components & Modules', 'Identifies functions, controllers, and service layers executing data sinks'],
              ['End-to-End Data Flows', 'Traces data pipelines: Source (PII) ➔ Transformation ➔ Third-party Sink'],
              ['Conditional Consent Guards', 'Verifies if opt-in verification or consent gates protect the execution'],
              ['Sensitive Data & Sinks', 'Maps user.email, phone, SSN, authToken against Mixpanel, Segment, Stripe'],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem' }}>
                <CheckCircle size={15} color="var(--accent-cyan-bright)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {!result && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <Code2 size={52} color="var(--accent-cyan-bright)" style={{ opacity: 0.5, margin: '0 auto 1.25rem' }} />
              <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
                Ready to Scan Code AST & Data Flows
              </h3>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
                Click "Load Violating Code" or "Load Compliant Code" on the left and run analysis to trace data flow pipelines.
              </p>
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header Card */}
              <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', fontFamily: 'Outfit, sans-serif' }}>
                      {result.file_path}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {getLanguageLabel(result.language)} · Analysis ID #{result.id}
                      {result.ast_used && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--risk-compliant)', fontWeight: 600 }}>
                          • 🌳 Tree-sitter AST Active
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: '0.35rem 0.85rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, color: 'var(--risk-compliant)'
                  }}>
                    PARSED & TRACED
                  </div>
                </div>
              </div>

              {/* Affected Components Section */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-purple)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Layers size={15} /> Affected Application Components ({result.behavior.affected_components?.length || 0})
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {result.behavior.affected_components && result.behavior.affected_components.length > 0 ? (
                    result.behavior.affected_components.map((comp, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(139, 92, 246, 0.08)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: 'var(--accent-purple)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Cpu size={13} /> {comp}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Main file execution module</span>
                  )}
                </div>
              </div>

              {/* End-to-End Data Flow Pipeline Trace */}
              {result.behavior.data_flows && result.behavior.data_flows.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-blue)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Network size={15} /> Identified Data Flows ({result.behavior.data_flows.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {result.behavior.data_flows.map((flow, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-blue)' }}>
                            {flow.id} • Line {flow.line || 1}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: flow.consent_guarded ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: flow.consent_guarded ? 'var(--risk-compliant)' : 'var(--risk-high)',
                            border: `1px solid ${flow.consent_guarded ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {flow.consent_guarded ? '🛡️ Consent Guarded' : '⚠️ Unshielded Flow'}
                          </span>
                        </div>

                        {/* Pipeline Step Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--risk-high)', fontWeight: 800 }}>Source (Data)</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{flow.source}</div>
                          </div>

                          <ArrowRight size={14} color="var(--text-muted)" />

                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Component</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{flow.component}</div>
                          </div>

                          <ArrowRight size={14} color="var(--text-muted)" />

                          <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 8, padding: '0.6rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 800 }}>Sink (Destination)</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{flow.sink}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavior Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                {[
                  { label: '🔐 Sensitive Data Detected', items: result.behavior.sensitive_data, color: 'var(--risk-high-light)', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)' },
                  { label: '🌐 Transmission Destinations', items: result.behavior.destinations, color: 'var(--risk-medium-light)', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)' },
                  { label: '🔌 Third-Party SDK Sinks', items: result.behavior.third_party_sdks, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)' },
                  { label: '📡 Network Egress Requests', items: result.behavior.network_requests, color: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)' },
                ].map(({ label, items, color, bg, border }) => (
                  <div key={label} className="card" style={{ padding: '1rem', background: bg, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                      {label}
                    </div>
                    {items && items.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {items.map((item, i) => (
                          <span key={i} className="tag" style={{ color, borderColor: border, background: 'var(--bg-secondary)', fontWeight: 600 }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None observed</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Detailed AST Findings */}
              {result.behavior.findings_raw && result.behavior.findings_raw.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0.5rem 0 0.75rem', fontFamily: 'Outfit, sans-serif' }}>
                    🔍 AST Invocations & Sink Line Numbers
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {result.behavior.findings_raw.map((f, i) => (
                      <div
                        key={i}
                        className="card"
                        style={{
                          padding: '1rem',
                          borderLeft: `4px solid ${getRiskColor(f.risk_indicator)}`,
                          background: 'rgba(255, 255, 255, 0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px',
                            background: `${getRiskColor(f.risk_indicator)}22`,
                            color: getRiskColor(f.risk_indicator), borderRadius: 4,
                            border: `1px solid ${getRiskColor(f.risk_indicator)}44`
                          }}>
                            {f.risk_indicator || 'INFO'}
                          </span>
                          <span className="tag">Line #{f.line}</span>
                          <span className="tag font-mono">{f.pattern}</span>
                          {f.third_party && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--risk-medium-light)', fontWeight: 600 }}>
                              ⚠️ Third-party SDK call
                            </span>
                          )}
                          {f.consent_check_detected && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--risk-compliant)', fontWeight: 600 }}>
                              ✅ Consent check wrapper found
                            </span>
                          )}
                        </div>
                        {f.data && f.data.length > 0 && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Payload items:</span>
                            {f.data.map((d, j) => (
                              <span key={j} className="tag" style={{ color: 'var(--risk-high-light)', borderColor: 'rgba(239, 68, 68, 0.35)' }}>
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    Ready for Multi-Agent Comparison
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Cross-reference these data flows against policy rules to identify compliance drift.
                  </div>
                </div>
                <Link to="/drift" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}>
                  Run Policy-Code Comparison <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
