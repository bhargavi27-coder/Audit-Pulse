import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { policyApi } from '../services/api';
import { RiskBadge, ToastContainer } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import {
  Upload, FileText, Sparkles, ChevronDown, ChevronUp,
  ArrowRight, GitCompare,
  PlusCircle, MinusCircle, RefreshCw
} from 'lucide-react';

const DEMO_POLICY_V1 = `AuditCorp Privacy Policy — Version 1.0

Section 3.2 — Data Sharing Restrictions
Customer email addresses and personally identifiable information (PII) MUST NOT be shared with
third-party analytics services, advertising networks, or data brokers without explicit, informed
user consent. Users must actively opt in before any PII is transmitted to third parties.

Section 4.1 — Data Retention
Personal data is retained for the minimum period necessary, not to exceed 30 days after account
closure unless required by law.`;

const DEMO_POLICY_V2 = `AuditCorp Privacy Policy — Version 2.0 (Updated)

Section 3.2 — Data Processing & Trusted Partners
Customer email addresses and usage telemetry may be processed by trusted third-party analytics
partners to improve service delivery and product personalization.

Section 4.1 — Extended Data Retention
Personal data is retained for up to 180 days after account closure for business reporting.

Section 6.2 — Cloud Telemetry
Aggregated usage data and diagnostics may be transmitted to cloud partners under Legitimate Interests.`;

export default function PolicyAnalysis() {
  const [mainTab, setMainTab] = useState('parse'); // 'parse' | 'compare'
  const [mode, setMode] = useState('text'); // 'text' | 'file'
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedRule, setExpandedRule] = useState(null);

  // Version Comparison State
  const [policies, setPolicies] = useState([]);
  const [comparePolicyA, setComparePolicyA] = useState('');
  const [comparePolicyB, setComparePolicyB] = useState('');
  const [newVersionText, setNewVersionText] = useState(DEMO_POLICY_V2);
  const [compareResult, setCompareResult] = useState(null);
  const [comparing, setComparing] = useState(false);

  const fileInputRef = useRef();
  const { toasts, showToast, removeToast } = useToast();

  const loadPolicies = useCallback(async () => {
    try {
      const res = await policyApi.list();
      setPolicies(res.data);
      if (res.data.length > 0 && !comparePolicyA) {
        setComparePolicyA(res.data[0].id.toString());
      }
    } catch (_e) {
      // ignore
    }
  }, [comparePolicyA]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

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
      loadPolicies();
    } catch (e) {
      showToast(e.userMessage || 'Analysis failed. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, name, version, content, file, showToast, loadPolicies]);

  const handleCompareVersions = async () => {
    if (!comparePolicyA) {
      showToast('Please select baseline Policy Version A.', 'warning');
      return;
    }
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await policyApi.compareVersions({
        policy_id_a: parseInt(comparePolicyA),
        policy_id_b: comparePolicyB ? parseInt(comparePolicyB) : null,
        new_content: comparePolicyB ? null : newVersionText,
        new_version: '2.0',
      });
      setCompareResult(res.data);
      showToast('Policy version comparison complete!', 'success');
    } catch (e) {
      showToast(e.userMessage || 'Version comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
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
            <span className="gradient-text">Policy Parser & Version Evolution</span>
          </h1>
          <p>
            Extract structured legal rules from privacy documents and track policy changes across versions.
            Identify removed protections, loosened consent gates, and retention prolongations.
          </p>
        </div>
      </div>

      {/* Main Mode Selector */}
      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab ${mainTab === 'parse' ? 'active' : ''}`} onClick={() => setMainTab('parse')}>
          📄 Rule Extraction & Parsing
        </button>
        <button className={`tab ${mainTab === 'compare' ? 'active' : ''}`} onClick={() => { setMainTab('compare'); loadPolicies(); }}>
          ⚖️ Version Diff & Policy Evolution Comparison
        </button>
      </div>

      {mainTab === 'parse' ? (
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
                    type="text"
                    className="input"
                    placeholder="e.g. AuditCorp Privacy Policy"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Version
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="1.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>

              {mode === 'text' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Policy Text Content *
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
                      onClick={() => {
                        setName('AuditCorp Privacy Policy');
                        setVersion('1.0');
                        setContent(DEMO_POLICY_V1);
                      }}
                    >
                      <Sparkles size={12} color="var(--accent-purple)" />
                      Load Demo Policy
                    </button>
                  </div>
                  <textarea
                    className="input"
                    rows={12}
                    placeholder="Paste full privacy policy text, Terms of Service, or GDPR clauses here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem' }}
                  />
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 14,
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Upload size={32} color="var(--accent-purple)" style={{ margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {file ? file.name : 'Click to select or drag and drop document'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supports TXT, MD, and PDF (Max 10MB)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem' }}
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Legal Agent Decomposing Rules...' : 'Extract Compliance Rules (Legal Agent)'}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div>
            {result ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      Extracted Rules ({result.rules_extracted})
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {result.policy.name} • v{result.policy.version}
                    </span>
                  </div>
                  <Link to="/drift" className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}>
                    Verify Code AST <ArrowRight size={13} />
                  </Link>
                </div>

                <div style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1.25rem'
                }}>
                  <strong>Summary:</strong> {result.analysis_summary}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {result.policy.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '1rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedRule(expandedRule === idx ? null : idx)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <RiskBadge risk={rule.severity} />
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {rule.section && `[${rule.section}] `}{rule.action} → {rule.data_type}
                          </span>
                        </div>
                        {expandedRule === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>

                      {expandedRule === idx && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div><strong>Destination:</strong> {rule.destination}</div>
                            <div><strong>Condition:</strong> {rule.condition || 'None'}</div>
                          </div>
                          {rule.raw_text && (
                            <blockquote style={{ margin: '0.5rem 0 0', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                              "{rule.raw_text}"
                            </blockquote>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>No Policy Analyzed Yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Enter policy text or upload a document on the left and trigger Legal Agent analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Version Comparison Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Compare Policy Versions (Evolution & Risk Drift)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Evaluate modifications between policy versions to determine if user safeguards were removed or data retention expanded.
                </p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setNewVersionText(DEMO_POLICY_V2);
                  showToast('Loaded demo Policy v2.0 text for comparison', 'info');
                }}
                style={{ fontSize: '0.75rem' }}
              >
                <Sparkles size={13} color="var(--accent-purple)" /> Load Demo v2.0 Text
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Baseline Policy (Version A) *
                </label>
                <select
                  className="input"
                  value={comparePolicyA}
                  onChange={(e) => setComparePolicyA(e.target.value)}
                >
                  <option value="">-- Select Saved Baseline Policy --</option>
                  {policies.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Comparison Target (Version B)
                </label>
                <select
                  className="input"
                  value={comparePolicyB}
                  onChange={(e) => setComparePolicyB(e.target.value)}
                >
                  <option value="">-- Or type new version text below --</option>
                  {policies.filter(p => p.id.toString() !== comparePolicyA).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                  ))}
                </select>
              </div>
            </div>

            {!comparePolicyB && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Version B Content (Draft / New Release)
                </label>
                <textarea
                  className="input"
                  rows={6}
                  value={newVersionText}
                  onChange={(e) => setNewVersionText(e.target.value)}
                  placeholder="Paste revised policy version text..."
                  style={{ fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleCompareVersions}
              disabled={comparing}
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {comparing ? <RefreshCw size={16} className="animate-spin" /> : <GitCompare size={16} />}
              {comparing ? 'AI Comparing Policy Versions...' : 'Run Policy Version Diff & Risk Impact Assessment'}
            </button>
          </div>

          {compareResult && (
            <div className="card">
              {/* Header Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Version Comparison
                  </div>
                  <h2 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                    {compareResult.policy_a_name} ({compareResult.policy_a_version}) ➔ {compareResult.policy_b_name} ({compareResult.policy_b_version})
                  </h2>
                </div>
                <span style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  background: compareResult.risk_impact === 'INCREASED_RISK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: compareResult.risk_impact === 'INCREASED_RISK' ? 'var(--risk-high)' : 'var(--risk-compliant)',
                  border: `1px solid ${compareResult.risk_impact === 'INCREASED_RISK' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`
                }}>
                  {compareResult.risk_impact === 'INCREASED_RISK' ? '⚠️ INCREASED COMPLIANCE RISK' : '✅ NEUTRAL / LOW RISK SHIFT'}
                </span>
              </div>

              {/* Summary */}
              <div style={{
                padding: '1rem 1.25rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontSize: '0.88rem',
                lineHeight: 1.65,
                color: 'var(--text-primary)',
                marginBottom: '1.5rem'
              }}>
                <strong>Executive Assessment:</strong> {compareResult.summary}
              </div>

              {/* Added, Removed, Modified Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Added Rules */}
                <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--risk-compliant)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PlusCircle size={14} /> Added Rules ({compareResult.added_rules?.length || 0})
                  </div>
                  {compareResult.added_rules?.length > 0 ? (
                    compareResult.added_rules.map((r, i) => (
                      <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 700 }}>{r.section && `[${r.section}] `}{r.action} → {r.data_type}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>Destination: {r.destination}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No new rules added.</div>
                  )}
                </div>

                {/* Removed Rules */}
                <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--risk-high)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MinusCircle size={14} /> Removed Protections ({compareResult.removed_rules?.length || 0})
                  </div>
                  {compareResult.removed_rules?.length > 0 ? (
                    compareResult.removed_rules.map((r, i) => (
                      <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--risk-high)' }}>{r.section && `[${r.section}] `}{r.action} → {r.data_type}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>Condition removed: {r.condition || 'None'}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No safeguards deleted.</div>
                  )}
                </div>
              </div>

              {/* Modified Rules */}
              {compareResult.modified_rules?.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    🔄 Modified Covenants & Terms
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {compareResult.modified_rules.map((m, i) => (
                      <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {m.section && `[${m.section}] `}{m.data_type}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--risk-medium)', fontWeight: 800, textTransform: 'uppercase' }}>
                            {m.severity} MODIFICATION
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                          <strong>Impact:</strong> {m.change_description}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.78rem' }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '0.5rem', borderRadius: 6 }}>
                            <strong style={{ color: 'var(--risk-high)' }}>Old Text (v{compareResult.policy_a_version}):</strong> {m.old_text}
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.5rem', borderRadius: 6 }}>
                            <strong style={{ color: 'var(--risk-compliant)' }}>New Text (v{compareResult.policy_b_version}):</strong> {m.new_text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Unified Diff */}
              {compareResult.detailed_diff && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    Unified Text Diff
                  </h4>
                  <pre style={{
                    background: '#0F172A',
                    color: '#F8FAFC',
                    padding: '1rem',
                    borderRadius: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    overflowX: 'auto'
                  }}>
                    {compareResult.detailed_diff}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
