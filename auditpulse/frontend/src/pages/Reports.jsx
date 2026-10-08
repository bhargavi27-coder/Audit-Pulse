import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { findingsApi } from '../services/api';
import { RiskBadge, FindingModal, LoadingSkeleton, ToastContainer } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { formatDate } from '../utils/helpers';
import {
  BarChart3, Download, Filter, Search, CheckCircle2,
  Clock, AlertTriangle, ShieldCheck, FileSpreadsheet,
  FileJson, Printer, ExternalLink, RefreshCw, FileText
} from 'lucide-react';

export default function Reports() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { toasts, showToast, removeToast } = useToast();

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await findingsApi.list();
      setFindings(res.data);
    } catch (err) {
      showToast('Failed to load compliance findings: ' + (err.userMessage || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

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
    const resolved = findings.filter(f => f.status === 'RESOLVED' || f.status === 'resolved').length;
    const open = findings.filter(f => f.status === 'OPEN' || f.status === 'open').length;
    const healthScore = total > 0 ? Math.max(0, Math.round(100 - (high * 25 + medium * 10 + low * 2) / Math.max(1, total / 2))) : 100;
    return { total, high, medium, low, resolved, open, healthScore };
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
    const headers = ['ID', 'Risk', 'Title', 'Code Reference', 'Data Involved', 'Destination', 'Status', 'Date', 'Confidence'];
    const rows = filteredFindings.map(f => [
      f.id,
      `"${f.risk || ''}"`,
      `"${(f.title || '').replace(/"/g, '""')}"`,
      `"${(f.code_reference || '').replace(/"/g, '""')}"`,
      `"${(f.data_involved || '').replace(/"/g, '""')}"`,
      `"${(f.destination || '').replace(/"/g, '""')}"`,
      `"${f.status || ''}"`,
      `"${f.created_at || ''}"`,
      f.confidence || ''
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
              <BarChart3 size={22} color="white" />
            </span>
            <span className="gradient-text-emerald">Compliance Audit Trail & Reports</span>
          </h1>
          <p>
            Executive audit trail, verifiable evidence documentation, exportable compliance sheets (JSON/CSV),
            and status workflow resolution for security and legal officers.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button onClick={fetchFindings} className="btn btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportCSV} className="btn btn-secondary">
            <FileSpreadsheet size={15} color="var(--risk-compliant)" /> Export CSV
          </button>
          <button onClick={exportJSON} className="btn btn-secondary">
            <FileJson size={15} color="var(--accent-sky)" /> Export JSON
          </button>
          <button onClick={printReport} className="btn btn-primary">
            <Printer size={15} /> Print Audit PDF
          </button>
        </div>
      </div>

      {/* Scorecards */}
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
          <div className="stat-label">High Severity Drifts</div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon">
            <Clock size={22} color="var(--risk-medium-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-medium-light)' }}>
            {stats.medium + stats.low}
          </div>
          <div className="stat-label">Medium / Low Findings</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">
            <CheckCircle2 size={22} color="var(--accent-purple)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
            {stats.resolved} <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {stats.total}</span>
          </div>
          <div className="stat-label">
            Resolved Rate ({stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%)
          </div>
        </div>
      </div>

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
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      {loading ? (
        <LoadingSkeleton count={4} height={70} />
      ) : filteredFindings.length === 0 ? (
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
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-primary)' }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>
                        {f.reason?.slice(0, 90)}{f.reason?.length > 90 ? '...' : ''}
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

      {selectedFinding && (
        <FindingModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}
    </div>
  );
}
