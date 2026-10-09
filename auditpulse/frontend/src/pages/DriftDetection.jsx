import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { complianceApi, policyApi, codeApi, findingsApi } from '../services/api';
import {
  RiskBadge, FindingModal, FindingCard, LoadingSkeleton,
  EmptyState, ToastContainer, ConfidenceMeter, ComplianceRiskGauge,
  EvidencePairCard, SuggestedFixCard
} from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { getRiskColor, formatDate, truncate } from '../utils/helpers';
import {
  GitBranch, Shield, AlertTriangle, CheckCircle, Search,
  RefreshCw, Filter, Sparkles, ArrowRight, Layers, Cpu,
  Clock, Activity, Zap, Play, UserCheck, ShieldAlert
} from 'lucide-react';

const RISK_OPTIONS = ['', 'HIGH', 'MEDIUM', 'LOW', 'COMPLIANT'];
const STATUS_OPTIONS = ['', 'open', 'approved', 'rejected', 'dismissed', 'resolved'];

export default function DriftDetection() {
  const [tab, setTab] = useState('compare'); // 'compare' | 'history' | 'findings'
  const [policies, setPolicies] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [policyId, setPolicyId] = useState('');
  const [codeId, setCodeId] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  // History tab
  const [historyRuns, setHistoryRuns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [continuousSweeping, setContinuousSweeping] = useState(false);

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

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await complianceApi.getHistory(30);
      setHistoryRuns(res.data);
    } catch (e) {
      showToast('Failed to load history: ' + (e.userMessage || e.message), 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (tab === 'findings') loadFindings();
    if (tab === 'history') loadHistory();
  }, [tab, loadFindings, loadHistory]);

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
        showToast(`CRITICAL DRIFT: Compliance Risk Score ${res.data.compliance_risk_score}/100!`, 'error');
      } else {
        showToast(`Cross-agent analysis complete: ${res.data.total_findings} finding(s) evaluated.`, 'success');
      }
    } catch (e) {
      showToast(e.userMessage || 'Comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  }, [policyId, codeId, showToast]);

  const handleContinuousSweep = async () => {
    setContinuousSweeping(true);
    try {
      const res = await complianceApi.continuousCheck();
      showToast(res.data.message || 'Continuous monitoring sweep complete!', 'success');
      if (tab === 'history') loadHistory();
      if (tab === 'findings') loadFindings();
    } catch (e) {
      showToast('Continuous sweep failed: ' + (e.userMessage || e.message), 'error');
    } finally {
      setContinuousSweeping(false);
    }
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
              boxShadow: '0 0 20px rgba(236, 72, 153, 0.45)'
            }}>
              <GitBranch size={22} color="white" />
            </span>
            <span className="gradient-text">Multi-Agent Drift & Continuous Sentinel</span>
          </h1>
          <p>
            Continuous cross-verification between legal policy covenants and static code AST sinks.
            Gives numerical Compliance Risk Scores, verbatim evidence pairs, remediation diffs, and governance review actions.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleContinuousSweep}
          disabled={continuousSweeping}
          style={{ padding: '0.55rem 1.15rem' }}
        >
          {continuousSweeping ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
          {continuousSweeping ? 'Sweeping All Services...' : 'Trigger Continuous Sweep Now'}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-bar">
        <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>
          ⚡ Multi-Agent Comparison
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); loadHistory(); }}>
          🔄 Continuous Runs & History Trend ({historyRuns.length || '...'})
        </button>
        <button className={`tab ${tab === 'findings' ? 'active' : ''}`} onClick={() => { setTab('findings'); loadFindings(); }}>
          🔍 All Compliance Findings & Governance ({findings.length || '...'})
        </button>
      </div>

      {/* Tab 1: Compare */}
      {tab === 'compare' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '1.75rem', alignItems: 'start' }}>
          {/* Controls */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1.25rem', fontFamily: 'Outfit, sans-serif' }}>
              Select Artifacts for Cross-Agent Verification
            </h3>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                📜 Policy Document (Obligations & Covenants)
              </label>
              <select className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)} style={{ width: '100%' }}>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                💻 Source Code Analysis (AST Behavior & Sinks)
              </label>
              <select className="select" value={codeId} onChange={(e) => setCodeId(e.target.value)} style={{ width: '100%' }}>
                {analyses.map((a) => (
                  <option key={a.id} value={a.id}>{a.file_path} ({a.language})</option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', justifyContent: 'center' }}
              onClick={handleCompare}
              disabled={comparing}
            >
              {comparing ? (
                <><RefreshCw size={16} className="animate-spin" /> Cross-Referencing Agents & AST...</>
              ) : (
                <><Play size={16} /> Run Multi-Agent Drift Scan</>
              )}
            </button>
          </div>

          {/* Results */}
          <div>
            {compareResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Result Score Banner */}
                <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <ComplianceRiskGauge score={compareResult.compliance_risk_score} risk={compareResult.highest_risk} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Audit Status
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: compareResult.highest_risk === 'HIGH' ? 'var(--risk-high)' : 'var(--risk-compliant)' }}>
                      {compareResult.highest_risk === 'HIGH' ? 'CRITICAL POLICY DRIFT' : 'COMPLIANCE BASELINE VERIFIED'}
                    </div>
                  </div>
                </div>

                {/* Findings itemized */}
                {compareResult.findings.map((finding, idx) => (
                  <div key={idx} className="card" style={{ padding: '1.5rem', borderLeft: `4px solid ${getRiskColor(finding.risk)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <RiskBadge risk={finding.risk} score={finding.risk_score} />
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{finding.title}</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {finding.reason}
                        </p>
                      </div>
                    </div>

                    {/* Exact Evidence Pair */}
                    <EvidencePairCard finding={finding} />

                    {/* Suggested Fix Diff */}
                    {finding.suggested_fix && <SuggestedFixCard finding={finding} />}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedFinding(finding)}
                        style={{ fontSize: '0.8rem', gap: 5 }}
                      >
                        <UserCheck size={14} /> Open Human Review & Governance Actions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!compareResult && !comparing && (
              <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <GitBranch size={48} color="var(--text-muted)" style={{ opacity: 0.5, margin: '0 auto 1.25rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 800 }}>
                  Ready to Run Multi-Agent Drift Scan
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                  Select policy and code artifacts on the left to verify legal covenants against actual data flows.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: History & Continuous Runs */}
      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Continuous Drift Runs & Historical Trend
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Chronological record of automated continuous sweeps, manual checks, and GitHub PR scans over time.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={loadHistory} disabled={loadingHistory} style={{ fontSize: '0.78rem' }}>
                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} /> Refresh History
              </button>
            </div>

            {loadingHistory ? (
              <LoadingSkeleton count={4} />
            ) : historyRuns.length === 0 ? (
              <EmptyState
                icon="🔄"
                title="No Historical Runs Logged Yet"
                description="Trigger a continuous sweep or run a comparison to begin tracking compliance trends over time."
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Run ID</th>
                      <th style={{ padding: '0.75rem' }}>Trigger Type</th>
                      <th style={{ padding: '0.75rem' }}>Target Artifacts</th>
                      <th style={{ padding: '0.75rem' }}>Risk Score</th>
                      <th style={{ padding: '0.75rem' }}>Violations</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRuns.map((run) => (
                      <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                          #{run.id}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="tag" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {run.trigger_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 700 }}>{run.policy_name || 'System Baseline'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{run.file_path || 'All Monitored Services'}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <ComplianceRiskGauge score={run.compliance_risk_score} risk={run.highest_risk} size="mini" />
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: run.violations_count > 0 ? 'var(--risk-high)' : 'var(--risk-compliant)' }}>
                          {run.violations_count} violation(s)
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            background: run.status === 'flagged' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                            color: run.status === 'flagged' ? 'var(--risk-high)' : 'var(--risk-compliant)'
                          }}>
                            {run.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                          {formatDate(run.created_at)}
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

      {/* Tab 3: All Findings */}
      {tab === 'findings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters Bar */}
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Search findings by code, reason, or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
              </div>

              <select
                className="select"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">All Severity Levels</option>
                <option value="HIGH">Critical / High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="COMPLIANT">Compliant</option>
              </select>

              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 160 }}
              >
                <option value="">All Review Statuses</option>
                <option value="open">Open (Unreviewed)</option>
                <option value="approved">Approved Violation</option>
                <option value="rejected">Rejected (False Positive)</option>
                <option value="dismissed">Dismissed (Waived)</option>
                <option value="resolved">Resolved & Fixed</option>
              </select>

              <button className="btn btn-secondary" onClick={loadFindings}>
                <Filter size={14} /> Filter
              </button>
            </div>
          </div>

          {/* List */}
          {loadingFindings ? (
            <LoadingSkeleton count={4} />
          ) : findings.length === 0 ? (
            <EmptyState
              icon="🛡️"
              title="No Compliance Drift Findings Found"
              description="No findings matching your filter criteria. Run new scans to evaluate codebases."
            />
          ) : (
            <div>
              {findings.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  onClick={(finding) => setSelectedFinding(finding)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal with Human Review & Timeline */}
      {selectedFinding && (
        <FindingModal
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
          onReviewComplete={() => {
            loadFindings();
            if (tab === 'history') loadHistory();
          }}
        />
      )}
    </div>
  );
}
