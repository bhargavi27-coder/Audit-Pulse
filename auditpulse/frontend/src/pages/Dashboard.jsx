import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { dashboardApi } from '../services/api';
import { RiskBadge, FindingModal, LoadingSkeleton, EmptyState } from '../components/shared';
import { getRiskColor, formatDate, truncate } from '../utils/helpers';
import {
  Shield, FileText, Code2, Eye, TrendingUp, AlertTriangle,
  CheckCircle, Activity, RefreshCw, Zap, ArrowRight, Sparkles, Globe
} from 'lucide-react';

const RISK_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#f59e0b',
  LOW: '#3B82F6',
  COMPLIANT: '#10B981'
};

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.summary();
      setSummary(res.data);
    } catch (e) {
      setError(e.userMessage || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = summary ? [
    {
      label: 'Policies Parsed',
      value: summary.policies_analyzed,
      icon: FileText,
      color: 'purple',
      accent: 'var(--accent-purple)',
      trend: 'Legal Agent Active'
    },
    {
      label: 'Code Files Scanned',
      value: summary.code_files_scanned,
      icon: Code2,
      color: 'cyan',
      accent: 'var(--accent-cyan-bright)',
      trend: 'AST Tree-sitter'
    },
    {
      label: 'Active Risk Leaks',
      value: summary.active_risks,
      icon: AlertTriangle,
      color: 'red',
      accent: 'var(--risk-high-light)',
      trend: summary.active_risks > 0 ? 'Action Required' : 'Zero Critical Drifts'
    },
    {
      label: 'Monitored Vendors',
      value: summary.vendors_monitored,
      icon: Globe,
      color: 'green',
      accent: 'var(--risk-compliant)',
      trend: 'Playwright Automated'
    },
  ] : [];

  const pieData = summary ? Object.entries(summary.risk_distribution)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value })) : [];

  const totalFindings = pieData.reduce((acc, curr) => acc + curr.value, 0);

  // Risk matrix data (impact vs confidence)
  const matrixData = summary?.recent_findings?.map(f => ({
    confidence: Math.round((f.confidence || 0) * 10),
    impact: f.risk === 'HIGH' ? 9 : f.risk === 'MEDIUM' ? 6 : f.risk === 'LOW' ? 3 : 1,
    name: f.title,
    risk: f.risk,
    id: f.id,
  })) || [];

  return (
    <div className="page-container">
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
              <Shield size={22} color="white" />
            </span>
            <span className="gradient-text">Executive Compliance Dashboard</span>
          </h1>
          <p>
            Real-time compliance monitoring, multi-agent drift detection, and Playwright vendor surveillance overview.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
          <Link to="/drift" className="btn btn-primary">
            <Zap size={15} /> Run New Drift Scan
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-high" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={18} color="var(--risk-high)" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />
          ))
        ) : (
          statCards.map(({ label, value, icon: Icon, color, accent, trend }) => (
            <div key={label} className={`stat-card ${color}`}>
              <div className="stat-icon">
                <Icon size={22} color={accent} />
              </div>
              <div className="stat-value" style={{ color: accent }}>{value}</div>
              <div className="stat-label">{label}</div>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                {trend}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Risk Distribution Donut with Glowing Center */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              <Activity size={18} color="var(--accent-indigo)" />
              Risk Distribution Breakdown
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalFindings} Total Finding(s)
            </span>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 210, borderRadius: 12 }} />
          ) : pieData.length === 0 ? (
            <EmptyState icon="📊" title="No findings recorded" description="Run policy + code analyses to see risk distribution." />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 190, height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={4}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border-bright)',
                        borderRadius: 10,
                        boxShadow: '0 8px 25px rgba(15,23,42,0.12)',
                        fontSize: '0.8rem'
                      }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut Center Info */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
                    {totalFindings}
                  </span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Findings
                  </span>
                </div>
              </div>

              {/* Custom Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 150 }}>
                {pieData.map(({ name, value }) => {
                  const color = RISK_COLORS[name] || '#64748b';
                  const pct = totalFindings > 0 ? Math.round((value / totalFindings) * 100) : 0;
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: 12, height: 12, borderRadius: 3,
                        background: color,
                        boxShadow: `0 0 10px ${color}`
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {pct}% of scans
                        </div>
                      </div>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color, fontFamily: 'Outfit, sans-serif' }}>
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2x2 Risk Matrix (Impact vs Confidence) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
              <Zap size={18} color="var(--accent-cyan-bright)" />
              Risk Quadrant Matrix (Impact × Confidence)
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Top-Right: Urgent Remediation
            </span>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 210, borderRadius: 12 }} />
          ) : matrixData.length === 0 ? (
            <EmptyState icon="🎯" title="No findings plotted" description="Run compliance analysis to populate the risk matrix." />
          ) : (
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={210}>
                <ScatterChart margin={{ top: 15, right: 25, bottom: 25, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(36, 53, 75, 0.8)" />
                  <XAxis
                    dataKey="confidence"
                    name="Confidence"
                    type="number"
                    domain={[0, 10]}
                    label={{ value: 'AI Confidence →', position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 11 }}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  />
                  <YAxis
                    dataKey="impact"
                    name="Impact"
                    type="number"
                    domain={[0, 10]}
                    label={{ value: 'Severity Impact →', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  />
                  <ZAxis range={[90, 160]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: '#FFFFFF',
                          border: '1px solid var(--border-bright)',
                          borderRadius: 10,
                          padding: '0.75rem 1rem',
                          fontSize: '0.8rem',
                          maxWidth: 240,
                          boxShadow: '0 8px 30px rgba(15,23,42,0.14)'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                            {truncate(d.name, 45)}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <RiskBadge risk={d.risk} />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                              Score {d.impact * d.confidence}/100
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={matrixData}>
                    {matrixData.map((entry, index) => {
                      const color = RISK_COLORS[entry.risk] || '#3B82F6';
                      return (
                        <Cell
                          key={index}
                          fill={color}
                          fillOpacity={0.85}
                          stroke="#FFFFFF"
                          strokeWidth={1.5}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Findings Table */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 2px 0', fontFamily: 'Outfit, sans-serif' }}>
              Detected Compliance Deviations
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click on any finding to inspect evidence snippets and AI remediation instructions
            </span>
          </div>
          <Link
            to="/drift"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            Detailed Drift View →
          </Link>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} height={70} />
        ) : !summary?.recent_findings?.length ? (
          <EmptyState
            icon="🎉"
            title="Clean Compliance Slate"
            description="No policy-code drift detected yet. Upload a privacy policy and scan code to monitor ongoing compliance."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Risk Level</th>
                  <th>Finding Title & Root Reason</th>
                  <th>Code Sink</th>
                  <th>Protected Data</th>
                  <th>Status</th>
                  <th>Detected On</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_findings.map((f) => (
                  <tr
                    key={f.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedFinding(f)}
                  >
                    <td><RiskBadge risk={f.risk} /></td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {truncate(f.title, 55)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>
                        {truncate(f.reason, 85)}
                      </div>
                    </td>
                    <td><span className="tag">💻 {f.code_reference || 'N/A'}</span></td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {f.data_involved ? <span className="tag">📊 {f.data_involved}</span> : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: f.status === 'open' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: f.status === 'open' ? '#F59E0B' : '#10B981',
                        border: `1px solid ${f.status === 'open' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                      }}>
                        {f.status?.toUpperCase() || 'OPEN'}
                      </span>
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

      {/* Quick Launchpad Guide */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Sparkles size={18} color="var(--accent-cyan-bright)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            AuditPulse Multi-Agent Workflow Pipeline
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          {[
            { step: '01', label: 'Extract Legal Rules', desc: 'Parses privacy policies with Legal Agent', to: '/policy', icon: '📋' },
            { step: '02', label: 'Scan Code AST', desc: 'Identifies PII sources & transmission sinks', to: '/code', icon: '💻' },
            { step: '03', label: 'Detect Policy Drift', desc: 'Multi-agent cross-verification comparison', to: '/drift', icon: '🔍' },
            { step: '04', label: 'Playwright Monitor', desc: 'Automated 3rd-party vendor surveillance', to: '/vendors', icon: '🌐' },
            { step: '05', label: 'Generate Reports', desc: 'Export executive compliance audit logs', to: '/reports', icon: '📊' },
          ].map((item) => (
            <Link
              key={item.step}
              to={item.to}
              style={{
                display: 'block',
                padding: '1.125rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              className="card-hover-effect"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-cyan-bright)', fontFamily: 'JetBrains Mono, monospace' }}>
                  STEP {item.step}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {item.desc}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {selectedFinding && (
        <FindingModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      )}
    </div>
  );
}
