import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complianceApi, policyApi, codeApi, findingsApi } from '../services/api';
import { RiskBadge, FindingModal, LoadingSkeleton, EmptyState, ToastContainer, ConfidenceMeter } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { getRiskColor, formatDate, truncate } from '../utils/helpers';
import {
  GitBranch, Shield, AlertTriangle, CheckCircle, Search,
  RefreshCw, Filter, Sparkles, ArrowRight, Layers, Cpu
} from 'lucide-react';

const RISK_OPTIONS = ['', 'HIGH', 'MEDIUM', 'LOW', 'COMPLIANT'];
const STATUS_OPTIONS = ['', 'open', 'acknowledged', 'resolved', 'false_positive'];

export default function DriftDetection() {
  const [tab, setTab] = useState('compare');
  const [policies, setPolicies] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [policyId, setPolicyId] = useState('');
  const [codeId, setCodeId] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  // Findings tab
  const [findings, setFindings] = useState([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFinding, setSelectedFinding] = useState(null);

  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    policyApi.list().then((r) => {
      setPolicies(r.data);
      if (r.data.length && !policyId) setPolicyId(r.data[0].id.toString());
    }).catch(() => {});

    codeApi.list().then((r) => {
      setAnalyses(r.data);
      if (r.data.length && !codeId) setCodeId(r.data[0].id.toString());
    }).catch(() => {});
  }, []);

  const loadFindings = useCallback(async () => {
    setLoadingFindings(true);
    try {
      const res = await findingsApi.list({
        risk: riskFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setFindings(res.data);
    } catch (e) {
      showToast('Failed to load findings: ' + (e.userMessage || e.message), 'error');
    } finally {
      setLoadingFindings(false);
    }
  }, [riskFilter, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    if (tab === 'findings') loadFindings();
  }, [tab, loadFindings]);

  const handleCompare = useCallback(async () => {
    if (!policyId || !codeId) {
      showToast('Please select both a policy and code analysis to compare.', 'warning');
      return;
    }
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await complianceApi.compare({
        policy_id: parseInt(policyId),
        code_analysis_id: parseInt(codeId),
      });
      setCompareResult(res.data);
      const hasViolation = res.data.findings.some((f) => f.drift_detected && f.risk === 'HIGH');
      if (hasViolation) {
        showToast('CRITICAL POLICY DRIFT DETECTED! Code behavior breaches policy promises.', 'error');
      } else {
        showToast(`Cross-agent analysis complete: ${res.data.total_findings} finding(s) reviewed.`, 'success');
      }
    } catch (e) {
      showToast(e.userMessage || 'Comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  }, [policyId, codeId, showToast]);

  const handleUpdateStatus = async (findingId, newStatus) => {
    try {
      await findingsApi.updateStatus(findingId, newStatus);
      showToast(`Finding status updated to ${newStatus}`, 'success');
      loadFindings();
    } catch (e) {
      showToast('Failed to update finding status.', 'error');
    }
  };

  const highestRiskColor = compareResult ? getRiskColor(compareResult.highest_risk) : null;

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
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.45)'
            }}>
              <GitBranch size={22} color="white" />
            </span>
            <span className="gradient-text">Multi-Agent Drift Detection</span>
          </h1>
          <p>
            Cross-verifies legal obligations extracted by the Legal Agent against static code AST behavior.
            Flags deviations, missing consent checks, and unauthorized external data transfers.
          </p>
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>
          ⚡ Compare Policy vs Code
        </button>
        <button className={`tab ${tab === 'findings' ? 'active' : ''}`} onClick={() => { setTab('findings'); loadFindings(); }}>
          🔍 All Compliance Findings ({findings.length || '...'})
        </button>
      </div>

      {/* ===== COMPARE TAB ===== */}
      {tab === 'compare' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.15fr', gap: '1.75rem', alignItems: 'start' }}>

          {/* Selection Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1.25rem 0', fontFamily: 'Outfit, sans-serif' }}>
                Select Targets for Cross-Agent Verification
              </h3>

              {/* Policy selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  📋 Policy Baseline
                </label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  id="policy-select"
                >
                  <option value="">— Select analyzed policy —</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.id}] {p.name} v{p.version} ({p.rules?.length || 0} rules)
                    </option>
                  ))}
                </select>
                {!policies.length && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    No policies parsed yet. <Link to="/policy" style={{ color: 'var(--accent-indigo)' }}>Analyze policy first →</Link>
                  </div>
                )}
              </div>

              {/* Code analysis selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  💻 Code Analysis Target
                </label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={codeId}
                  onChange={(e) => setCodeId(e.target.value)}
                  id="code-select"
                >
                  <option value="">— Select code analysis —</option>
                  {analyses.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.file_path} ({a.language})
                    </option>
                  ))}
                </select>
                {!analyses.length && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    No code scanned yet. <Link to="/code" style={{ color: 'var(--accent-cyan-bright)' }}>Scan code AST first →</Link>
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
                onClick={handleCompare}
                disabled={comparing || !policyId || !codeId}
                id="compare-btn"
              >
                {comparing ? (
                  <><div className="spinner" /> Synthesizing Multi-Agent Drift Analysis...</>
                ) : (
                  <><GitBranch size={16} /> Execute Compliance Drift Scan</>
                )}
              </button>
            </div>

            {/* Agent Pipeline Architecture Banner */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={16} color="var(--accent-indigo)" />
                Multi-Agent Synthesis Flow
              </div>
              {[
                { agent: 'Legal Agent', role: 'Extracts prohibitive rules & user consent conditions', color: 'var(--accent-purple)' },
                { agent: 'Code Agent', role: 'Identifies PII flow, telemetry calls & external sinks', color: 'var(--accent-cyan-bright)' },
                { agent: 'Compliance Agent', role: 'Cross-examines commitments against actual AST lines', color: 'var(--risk-high-light)' },
                { agent: 'Evidence Agent', role: 'Generates structured audit logs and code diffs', color: 'var(--risk-compliant)' },
              ].map(({ agent, role, color }) => (
                <div key={agent} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                  <div>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color }}>{agent}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 6 }}>— {role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Result Panel */}
          <div>
            {!compareResult && !comparing && (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <GitBranch size={52} color="var(--accent-purple)" style={{ opacity: 0.4, margin: '0 auto 1.25rem' }} />
                <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem' }}>
                  Awaiting Comparison Targets
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
                  Select an extracted policy and code analysis from the left panel to execute multi-agent drift cross-examination.
                </p>
              </div>
            )}

            {comparing && (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3, margin: '0 auto 1.5rem', borderTopColor: 'var(--accent-indigo)' }} />
                <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                  Synthesizing Multi-Agent Analysis...
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Legal Agent → Code AST Sinks → Compliance Agent → Evidence Logger
                </p>
              </div>
            )}

            {compareResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Risk Summary Banner */}
                <div style={{
                  padding: '1.25rem 1.5rem',
                  background: compareResult.highest_risk === 'HIGH'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : compareResult.highest_risk === 'MEDIUM'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${
                    compareResult.highest_risk === 'HIGH'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : compareResult.highest_risk === 'MEDIUM'
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(16, 185, 129, 0.4)'
                  }`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>
                      {compareResult.highest_risk === 'HIGH' ? '🚨' :
                       compareResult.highest_risk === 'MEDIUM' ? '⚠️' :
                       compareResult.highest_risk === 'COMPLIANT' ? '✅' : '🔵'}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        fontFamily: 'Outfit, sans-serif',
                        color: compareResult.highest_risk === 'HIGH' ? 'var(--risk-high-light)' :
                               compareResult.highest_risk === 'MEDIUM' ? 'var(--risk-medium-light)' : 'var(--risk-compliant)'
                      }}>
                        {compareResult.highest_risk === 'HIGH' ? 'CRITICAL POLICY-CODE DRIFT' :
                         compareResult.highest_risk === 'MEDIUM' ? 'MANUAL COMPLIANCE REVIEW' :
                         compareResult.highest_risk === 'COMPLIANT' ? 'FULLY COMPLIANT IMPLEMENTATION' : 'LOW RISK OBSERVED'}
                      </div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {compareResult.total_findings} distinct finding(s) cross-verified against commitments
                      </div>
                    </div>
                  </div>
                  <RiskBadge risk={compareResult.highest_risk} size="large" />
                </div>

                {/* Individual Findings */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Comparison Findings ({compareResult.findings.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Click finding to inspect code snippet & evidence
                  </span>
                </div>

                {compareResult.findings.map((f, i) => (
                  <div
                    key={i}
                    className="card"
                    style={{
                      padding: '1.125rem 1.35rem',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${getRiskColor(f.risk)}`,
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedFinding({ ...f, id: compareResult.saved_finding_ids[i] })}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                          <RiskBadge risk={f.risk} />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {f.title}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                          {truncate(f.reason, 200)}
                        </p>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {f.data_involved && <span className="tag">📊 {f.data_involved}</span>}
                          {f.destination && <span className="tag">🌐 {f.destination}</span>}
                          {f.code_reference && <span className="tag">💻 {f.code_reference}</span>}
                        </div>
                      </div>
                      <div style={{ minWidth: 120 }}>
                        <ConfidenceMeter value={f.confidence} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ALL FINDINGS TAB ===== */}
      {tab === 'findings' && (
        <div>
          {/* Filters Bar */}
          <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Search finding titles, code sinks, data types..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadFindings()}
                />
              </div>

              <select className="select" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option value="">All Risk Levels</option>
                {RISK_OPTIONS.filter(Boolean).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>

              <button className="btn btn-secondary" onClick={loadFindings}>
                <RefreshCw size={14} className={loadingFindings ? 'animate-spin' : ''} /> Filter
              </button>
            </div>
          </div>

          {/* Findings Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loadingFindings ? (
              <div style={{ padding: '2rem' }}><LoadingSkeleton count={3} height={75} /></div>
            ) : !findings.length ? (
              <EmptyState
                icon="🎉"
                title="No findings match your filter"
                description="Run a compliance comparison or clear search filters to view findings."
                action={
                  <button
                    className="btn btn-primary"
                    onClick={() => { setRiskFilter(''); setStatusFilter(''); setSearchQuery(''); }}
                  >
                    Reset All Filters
                  </button>
                }
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Risk</th>
                      <th>Finding Description</th>
                      <th>Code Reference</th>
                      <th>Data / Target</th>
                      <th>Confidence</th>
                      <th>Status Action</th>
                      <th>Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((f) => (
                      <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedFinding(f)}>
                        <td><RiskBadge risk={f.risk} /></td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {truncate(f.title, 50)}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {truncate(f.reason, 75)}
                          </div>
                        </td>
                        <td><span className="tag">💻 {f.code_reference || 'N/A'}</span></td>
                        <td style={{ fontSize: '0.825rem' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{f.data_involved || '—'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{f.destination || ''}</div>
                        </td>
                        <td style={{ minWidth: 110 }}><ConfidenceMeter value={f.confidence} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className="select"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderRadius: 6 }}
                            value={f.status}
                            onChange={(e) => handleUpdateStatus(f.id, e.target.value)}
                          >
                            <option value="open">Open</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="resolved">Resolved</option>
                            <option value="false_positive">False Positive</option>
                          </select>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatDate(f.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedFinding && (
        <FindingModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}
    </div>
  );
}
