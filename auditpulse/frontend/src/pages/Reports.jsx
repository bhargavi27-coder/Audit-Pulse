import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { findingsApi, reportsApi } from '../services/api';
import { RiskBadge, FindingModal, LoadingSkeleton, ToastContainer, ComplianceRiskGauge } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { formatDate } from '../utils/helpers';
import {
  BarChart3, Download, Filter, Search, CheckCircle2,
  Clock, AlertTriangle, ShieldCheck, FileSpreadsheet,
  FileJson, Printer, ExternalLink, RefreshCw, FileText,
  Award, Shield, Layers, Users, BookOpen, AlertCircle, Sparkles
} from 'lucide-react';

export default function Reports() {
  const [findings, setFindings] = useState([]);
  const [auditReport, setAuditReport] = useState(null);
  const [viewMode, setViewMode] = useState('executive'); // 'executive' | 'table'
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { toasts, showToast, removeToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [findingsRes, reportRes] = await Promise.all([
        findingsApi.list(),
        reportsApi.getAuditReport().catch(() => ({ data: null }))
      ]);
      setFindings(findingsRes.data);
      if (reportRes.data) {
        setAuditReport(reportRes.data);
      }
    } catch (err) {
      showToast('Failed to load compliance audit data: ' + (err.userMessage || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await findingsApi.updateStatus(id, newStatus);
      showToast(`Finding status updated to ${newStatus}`, 'success');
      setFindings(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
      if (selectedFinding?.id === id) {
        setSelectedFinding(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast('Error updating finding: ' + (err.userMessage || err.message), 'error');
    }
  };

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      const matchesRisk = filterRisk === 'ALL' || f.risk === filterRisk;
      const matchesStatus = filterStatus === 'ALL' || f.status?.toUpperCase() === filterStatus;
      const matchesSearch = !searchQuery.trim() ||
        f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.code_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.data_involved?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRisk && matchesStatus && matchesSearch;
    });
  }, [findings, filterRisk, filterStatus, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = findings.length;
    const high = findings.filter(f => f.risk === 'HIGH').length;
    const medium = findings.filter(f => f.risk === 'MEDIUM').length;
    const low = findings.filter(f => f.risk === 'LOW').length;
    const resolved = findings.filter(f => f.status === 'RESOLVED' || f.status === 'resolved' || f.status === 'APPROVED').length;
    const open = findings.filter(f => f.status === 'OPEN' || f.status === 'open').length;
    const healthScore = total > 0 ? Math.max(0, Math.round(100 - (high * 30 + medium * 12 + low * 4) / Math.max(1, total / 2))) : 100;
    const avgRiskScore = total > 0 ? Math.round(findings.reduce((acc, f) => acc + (f.risk_score || 0), 0) / total) : 0;
    return { total, high, medium, low, resolved, open, healthScore, avgRiskScore };
  }, [findings]);

  // Export handlers
  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredFindings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AuditPulse_Compliance_Report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported JSON audit report', 'success');
  };

  const exportCSV = () => {
    const headers = ['ID', 'Risk', 'Risk Score', 'Title', 'Code Reference', 'Data Involved', 'Destination', 'Status', 'Reviewer', 'Date'];
    const rows = filteredFindings.map(f => [
      f.id,
      `"${f.risk || ''}"`,
      f.risk_score || 0,
      `"${(f.title || '').replace(/"/g, '""')}"`,
      `"${(f.code_reference || '').replace(/"/g, '""')}"`,
      `"${(f.data_involved || '').replace(/"/g, '""')}"`,
      `"${(f.destination || '').replace(/"/g, '""')}"`,
      `"${f.status || ''}"`,
      `"${f.reviewed_by || 'Unassigned'}"`,
      `"${f.created_at || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `AuditPulse_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported CSV audit spreadsheet', 'success');
  };

  const exportCertifiedHTML = () => {
    window.open(reportsApi.getExportHtmlUrl(), '_blank');
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="page-container">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38, height: 38,
              borderRadius: 10,
              background: 'var(--gradient-emerald)',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)'
            }}>
              <Award size={22} color="white" />
            </span>
            <span className="gradient-text-emerald">Executive Compliance & Audit Reports</span>
          </h1>
          <p>
            Board-ready compliance certifications, regulatory framework mappings (GDPR, CCPA, SOC 2, ISO 27001),
            verifiable line-level evidence trails, and multi-format exports.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="btn btn-secondary">
            <FileSpreadsheet size={15} color="var(--risk-compliant)" /> Export CSV
          </button>
          <button onClick={exportJSON} className="btn btn-secondary">
            <FileJson size={15} color="var(--accent-sky)" /> Export JSON
          </button>
          <button onClick={exportCertifiedHTML} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExternalLink size={15} /> Export Certified HTML
          </button>
          <button onClick={printReport} className="btn btn-primary">
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <button
          onClick={() => setViewMode('executive')}
          className={`btn ${viewMode === 'executive' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
        >
          <Award size={16} />
          Executive Audit Report (CISO / DPO)
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
        >
          <BarChart3 size={16} />
          Findings Data Grid & Action Table ({findings.length})
        </button>
      </div>

      {/* Scorecards Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card green">
          <div className="stat-icon">
            <ShieldCheck size={22} color="var(--risk-compliant)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-compliant)' }}>
            {stats.healthScore}%
          </div>
          <div className="stat-label">Calculated Health Score</div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">
            <AlertTriangle size={22} color="var(--risk-high-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-high-light)' }}>
            {stats.high}
          </div>
          <div className="stat-label">High Severity Violations</div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon">
            <Clock size={22} color="var(--risk-medium-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-medium-light)' }}>
            {stats.avgRiskScore}/100
          </div>
          <div className="stat-label">Average Risk Index</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <CheckCircle2 size={22} color="var(--accent-purple)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
            {stats.resolved} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {stats.total}</span>
          </div>
          <div className="stat-label">
            Resolved / Approved ({stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%)
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} height={90} />
      ) : viewMode === 'executive' ? (
        /* Executive CISO / Board Audit Report View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Executive Header Banner */}
          <div className="card" style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-compliant" style={{ marginBottom: '0.5rem', display: 'inline-flex' }}>
                  CERTIFIED CONTINUOUS AUDIT REPORT
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.35rem 0', fontFamily: 'Outfit, sans-serif' }}>
                  {auditReport?.title || 'AuditPulse Multi-Agent Compliance Audit'}
                </h2>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Generated on {formatDate(auditReport?.generated_at || new Date().toISOString())} • Assessment Scope: Production Repositories & Vendor Subprocessors
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem 1.25rem', borderRadius: 12 }}>
                <ComplianceRiskGauge score={stats.avgRiskScore} size={85} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Overall Posture</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: stats.avgRiskScore > 50 ? 'var(--risk-high-light)' : 'var(--risk-compliant)' }}>
                    {stats.avgRiskScore > 50 ? 'Action Required' : 'Compliant Posture'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{findings.length} findings evaluated</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Executive Summary:
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {auditReport?.executive_summary ||
                  `AuditPulse performed static AST analysis and automated NLP policy parsing. The codebase exhibits a calculated health score of ${stats.healthScore}%, with ${stats.high} high-severity policy divergences detected in external transmission channels and vendor agreements.`}
              </div>
            </div>
          </div>

          {/* Regulatory Framework Matrix */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              <Shield size={18} color="var(--accent-indigo)" />
              Regulatory Framework Alignment Matrix
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {auditReport?.frameworks ? (
                Object.entries(auditReport.frameworks).map(([fwKey, fwData]) => (
                  <div
                    key={fwKey}
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      borderLeft: `4px solid ${fwData.status === 'COMPLIANT' ? 'var(--risk-compliant)' : fwData.status === 'ATTENTION' ? 'var(--risk-medium)' : 'var(--risk-high)'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{fwKey.toUpperCase()}</strong>
                      <span className={`badge ${fwData.status === 'COMPLIANT' ? 'badge-compliant' : fwData.status === 'ATTENTION' ? 'badge-medium' : 'badge-high'}`}>
                        {fwData.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      {fwData.summary || 'Coverage verified against current policy baseline and telemetry AST rules.'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Violations: <strong>{fwData.violations || 0}</strong></span>
                      <span>Score: <strong style={{ color: 'var(--accent-cyan-bright)' }}>{fwData.score || 100}%</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                ['GDPR (EU 2016/679)', 'CCPA / CPRA', 'SOC 2 Type II', 'ISO/IEC 27001'].map((fw, i) => (
                  <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, borderLeft: '4px solid var(--accent-indigo)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: 4 }}>{fw}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automated clause verification active</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Key Violations & Evidence Table */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              <AlertTriangle size={18} color="var(--risk-high-light)" />
              Priority Findings & Verifiable Evidence Trails
            </h3>

            {findings.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active compliance findings recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {findings.slice(0, 5).map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '1.25rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedFinding(f)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <RiskBadge risk={f.risk} />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{f.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Risk Score:</span>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--risk-high-light)' }}>{f.risk_score || 0}/100</strong>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                      {f.reason}
                    </p>

                    {f.evidence_pair && (
                      <div style={{
                        padding: '0.6rem 0.85rem',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: 8,
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        marginBottom: '0.75rem'
                      }}>
                        <div>
                          <strong style={{ color: 'var(--risk-high-light)' }}>Policy: </strong>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{f.evidence_pair.policy_quote}"</span>
                        </div>
                        <div>
                          <strong style={{ color: 'var(--accent-cyan-bright)' }}>Code: </strong>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{f.evidence_pair.code_snippet}</span>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Sink: <code style={{ color: 'var(--accent-indigo)' }}>{f.code_reference}</code></span>
                      <span>Review: <strong>{f.reviewed_by ? `${f.reviewed_by} (${f.reviewer_role})` : 'Pending Governance Review'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Remediation & Action Roadmap */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              <BookOpen size={18} color="var(--risk-compliant)" />
              Remediation Roadmap & Governance Actions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 10 }}>
                <strong style={{ color: 'var(--accent-indigo)', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>1. Codebase Patch Implementation</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Apply AI suggested fix diffs to hash or sanitize sensitive user telemetry payloads before transmission.
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10 }}>
                <strong style={{ color: 'var(--risk-compliant)', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>2. Vendor Terms Alignment</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Review updated vendor retention policies to verify GDPR Article 28 data processing agreement compliance.
                </p>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 10 }}>
                <strong style={{ color: 'var(--accent-purple)', fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>3. Continuous PR Gatekeeper</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Maintain automated GitHub Action checks to prevent non-compliant data sinks from merging into main.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Findings Data Grid View */
        <div>
          {/* Filter Toolbar */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Search findings, code sinks, sensitive data, reasons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Risk Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 700 }}>Risk:</span>
                <select
                  className="select"
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                >
                  <option value="ALL">All Severities</option>
                  <option value="HIGH">High Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="LOW">Low Risk</option>
                  <option value="COMPLIANT">Compliant</option>
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 700 }}>Status:</span>
                <select
                  className="select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="ACKNOWLEDGED">Acknowledged</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="APPROVED">Approved (Legal)</option>
                  <option value="REJECTED">Rejected (Block)</option>
                  <option value="FALSE_POSITIVE">False Positive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          {filteredFindings.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <ShieldCheck size={52} color="var(--risk-compliant)" style={{ margin: '0 auto 1.25rem', opacity: 0.6 }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                No Matching Compliance Findings
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>
                {findings.length === 0
                  ? 'Run Multi-Agent Drift Detection to generate compliance audit trail entries.'
                  : 'Try clearing your filters or search keywords to view other findings.'}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Risk Score</th>
                      <th>Finding Title & Context</th>
                      <th>Source File & Sink</th>
                      <th>Protected Field</th>
                      <th>Status Action</th>
                      <th>Logged Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f) => (
                      <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedFinding(f)}>
                        <td><RiskBadge risk={f.risk} /></td>
                        <td>
                          <span style={{
                            fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: '0.85rem',
                            color: (f.risk_score || 0) > 70 ? 'var(--risk-high-light)' : (f.risk_score || 0) > 40 ? 'var(--risk-medium-light)' : 'var(--risk-compliant)'
                          }}>
                            {f.risk_score || 0}
                          </span>
                        </td>
                        <td style={{ maxWidth: 300 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                            {f.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>
                            {f.reason?.slice(0, 85)}{f.reason?.length > 85 ? '...' : ''}
                          </div>
                        </td>
                        <td><span className="tag">💻 {f.code_reference || 'N/A'}</span></td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {f.data_involved ? <span className="tag font-mono">📊 {f.data_involved}</span> : '—'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className="select"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', borderRadius: 8 }}
                            value={f.status?.toUpperCase() || 'OPEN'}
                            onChange={(e) => handleStatusChange(f.id, e.target.value)}
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="APPROVED">APPROVED</option>
                            <option value="REJECTED">REJECTED</option>
                            <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
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
            </div>
          )}
        </div>
      )}

      {selectedFinding && (
        <FindingModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}
    </div>
  );
}
