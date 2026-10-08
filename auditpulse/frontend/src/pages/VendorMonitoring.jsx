import React, { useState, useEffect, useCallback } from 'react';
import { vendorsApi } from '../services/api';
import { RiskBadge, LoadingSkeleton, ToastContainer } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { formatDate } from '../utils/helpers';
import {
  Eye, Plus, RefreshCw, Trash2, ExternalLink, AlertTriangle,
  CheckCircle, Globe, Shield, Clock, Sparkles, AlertCircle, FileText,
  Terminal, ArrowRight, Layers, Cpu, Zap
} from 'lucide-react';

const COMMON_VENDORS = [
  { name: 'Stripe', url: 'https://stripe.com/privacy' },
  { name: 'Segment', url: 'https://segment.com/legal/privacy' },
  { name: 'Mixpanel', url: 'https://mixpanel.com/legal/privacy-policy' },
  { name: 'OpenAI', url: 'https://openai.com/policies/privacy-policy' },
];

export default function VendorMonitoring() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [diffViewMode, setDiffViewMode] = useState('summary'); // 'summary' | 'diff'
  const [formData, setFormData] = useState({ name: '', url: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  const fetchVendors = useCallback(async () => {
    try {
      const res = await vendorsApi.list();
      setVendors(res.data);
      // Auto-select first vendor or keep current
      if (res.data.length > 0 && !selectedVendor) {
        setSelectedVendor(res.data[0]);
      }
    } catch (err) {
      showToast('Failed to load monitored vendors: ' + (err.userMessage || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedVendor]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.url.trim()) {
      showToast('Please provide both vendor name and policy URL', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await vendorsApi.create(formData);
      showToast(`Vendor ${formData.name} added to Playwright monitoring!`, 'success');
      setFormData({ name: '', url: '' });
      setShowAddModal(false);
      fetchVendors();
    } catch (err) {
      showToast('Error adding vendor: ' + (err.userMessage || err.message), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdd = (preset) => {
    setFormData({ name: preset.name, url: preset.url });
    setShowAddModal(true);
  };

  const handleCheck = async (id, name) => {
    setCheckingId(id);
    try {
      const res = await vendorsApi.check(id);
      if (res.data.drift_detected) {
        showToast(`Policy drift detected for ${name}! Review changes.`, 'warning');
      } else {
        showToast(`Playwright checked ${name}: Policy matched baseline.`, 'success');
      }
      fetchVendors();
    } catch (err) {
      showToast(`Playwright check failed for ${name}: ` + (err.userMessage || err.message), 'error');
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to stop monitoring ${name}?`)) return;
    try {
      await vendorsApi.delete(id);
      showToast(`Vendor ${name} removed from monitoring`, 'info');
      if (selectedVendor?.id === id) setSelectedVendor(null);
      fetchVendors();
    } catch (err) {
      showToast('Error removing vendor: ' + (err.userMessage || err.message), 'error');
    }
  };

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const res = await vendorsApi.loadDemo();
      showToast(res.data.message || 'Demo vendor loaded with simulated policy drift!', 'success');
      await fetchVendors();
    } catch (err) {
      showToast('Error loading demo: ' + (err.userMessage || err.message), 'error');
    } finally {
      setLoading(false);
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
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)'
            }}>
              <Globe size={22} color="white" />
            </span>
            <span className="gradient-text-cyan">Vendor Surveillance & Policy Drift</span>
          </h1>
          <p>
            Continuous headless browser monitoring powered by Playwright. Detects covert Terms of Service,
            GDPR subprocessor, and data retention policy modifications by third-party SaaS vendors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleLoadDemo}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles size={16} color="var(--accent-purple)" />
            Load Demo Drift
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} />
            Monitor Vendor
          </button>
        </div>
      </div>

      {/* Playwright Engine Hero Banner */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        borderRadius: 16,
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 30px rgba(59, 130, 246, 0.12)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)'
          }}>
            <Terminal size={24} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                Playwright Headless Browser Engine
              </span>
              <span className="badge badge-compliant" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                ONLINE • v1.63.0
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Chromium & WebKit headless runners ready. Supports Single-Page Apps (SPA), React/Vue renders, and dynamic JS payloads.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quick Monitor:</span>
          {COMMON_VENDORS.map((v) => (
            <button
              key={v.name}
              onClick={() => handleQuickAdd(v)}
              className="tag"
              style={{
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--border)',
                transition: 'all 0.15s ease'
              }}
              title={`Add ${v.name} to monitoring`}
            >
              + {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card cyan">
          <div className="stat-icon">
            <Globe size={22} color="var(--accent-cyan-bright)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-cyan-bright)' }}>{vendors.length}</div>
          <div className="stat-label">Monitored Vendors</div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon">
            <AlertTriangle size={22} color="var(--risk-high-light)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-high-light)' }}>
            {vendors.filter(v => v.drift_detected).length}
          </div>
          <div className="stat-label">Active Policy Drifts</div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <Shield size={22} color="var(--risk-compliant)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--risk-compliant)' }}>
            {vendors.length > 0 ? Math.round(((vendors.length - vendors.filter(v => v.drift_detected).length) / vendors.length) * 100) : 100}%
          </div>
          <div className="stat-label">Vendor Health Score</div>
        </div>
      </div>

      {/* Main Vendor List & Inspector */}
      {loading ? (
        <LoadingSkeleton count={3} height={100} />
      ) : vendors.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Globe size={52} color="var(--accent-cyan-bright)" style={{ margin: '0 auto 1.25rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
            No Monitored Vendors Configured
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Track any vendor Terms of Service or Privacy Policy URL. AuditPulse uses Playwright to capture snapshots and detect silent clauses that violate your compliance.
          </p>
          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
            <button onClick={handleLoadDemo} className="btn btn-secondary">
              <Sparkles size={16} color="var(--accent-purple)" style={{ marginRight: 6 }} />
              Load AnalyticsPro Demo Drift
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
              <Plus size={16} style={{ marginRight: 6 }} />
              Add Vendor URL
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedVendor ? '1.15fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Vendor List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Monitored Providers ({vendors.length})
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={fetchVendors}
              >
                <RefreshCw size={13} style={{ marginRight: 4 }} /> Refresh List
              </button>
            </div>

            {vendors.map(vendor => {
              const isSelected = selectedVendor?.id === vendor.id;
              const isChecking = checkingId === vendor.id;

              return (
                <div
                  key={vendor.id}
                  className="card"
                  style={{
                    padding: '1.35rem 1.5rem',
                    border: isSelected ? '1px solid var(--accent-indigo)' : undefined,
                    boxShadow: isSelected ? '0 0 25px rgba(59, 130, 246, 0.2)' : undefined,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderLeft: vendor.drift_detected ? '4px solid var(--risk-high)' : '4px solid var(--risk-compliant)'
                  }}
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>
                          {vendor.name}
                        </span>
                        {vendor.drift_detected ? (
                          <span className="badge badge-high">
                            <AlertTriangle size={13} />
                            Policy Drift
                          </span>
                        ) : (
                          <span className="badge badge-compliant">
                            <CheckCircle size={13} />
                            Verified Intact
                          </span>
                        )}
                      </div>
                      <a
                        href={vendor.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--accent-cyan-bright)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 4,
                          textDecoration: 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.url}
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                        disabled={isChecking}
                        onClick={() => handleCheck(vendor.id, vendor.name)}
                        title="Fetch live URL with Playwright and test for changes"
                      >
                        <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} style={{ marginRight: 4 }} />
                        {isChecking ? 'Scanning...' : 'Scan Now'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', color: 'var(--risk-high-light)' }}
                        onClick={() => handleDelete(vendor.id, vendor.name)}
                        title="Delete vendor"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.75rem',
                    marginTop: '0.75rem'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={13} />
                      Checked: {vendor.last_checked ? formatDate(vendor.last_checked) : 'Pending initial run'}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem' }}>
                      Hash: {vendor.current_hash ? vendor.current_hash.slice(0, 10) + '...' : 'None'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Drift / Vendor Inspector Panel */}
          {selectedVendor && (
            <div className="card" style={{ padding: '1.75rem', alignSelf: 'start', position: 'sticky', top: '5.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Inspector Panel
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                    {selectedVendor.name}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {selectedVendor.url}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                >
                  ✕
                </button>
              </div>

              {/* View Mode Toggle: Summary vs Full Diff */}
              {selectedVendor.drift_detected && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <button
                    onClick={() => setDiffViewMode('summary')}
                    className={`btn ${diffViewMode === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                  >
                    AI Change Summary
                  </button>
                  <button
                    onClick={() => setDiffViewMode('diff')}
                    className={`btn ${diffViewMode === 'diff' ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '0.45rem', fontSize: '0.78rem' }}
                  >
                    Side-by-Side Diff
                  </button>
                </div>
              )}

              {selectedVendor.drift_detected ? (
                diffViewMode === 'diff' ? (
                  /* Full Diff View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="diff-box">
                      <div className="diff-header">
                        <span style={{ color: 'var(--risk-high-light)' }}>Previous Baseline Terms</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SHA-256 Verified</span>
                      </div>
                      <div style={{ padding: '0.75rem', maxHeight: 180, overflowY: 'auto' }}>
                        {selectedVendor.previous_content ? (
                          selectedVendor.previous_content.split('\n').map((line, i) => (
                            <div key={i} className={line.includes('30 days') || line.includes('not shared') ? 'diff-line-removed' : 'diff-line-unchanged'}>
                              {line}
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No previous baseline recorded</div>
                        )}
                      </div>
                    </div>

                    <div className="diff-box">
                      <div className="diff-header">
                        <span style={{ color: 'var(--risk-compliant)' }}>New Playwright Captured Terms</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live Page Extract</span>
                      </div>
                      <div style={{ padding: '0.75rem', maxHeight: 180, overflowY: 'auto' }}>
                        {selectedVendor.current_content ? (
                          selectedVendor.current_content.split('\n').map((line, i) => (
                            <div key={i} className={line.includes('180 days') || line.includes('analytics partners') || line.includes('improvement') ? 'diff-line-added' : 'diff-line-unchanged'}>
                              {line}
                            </div>
                          ))
                        ) : (
                          <div style={{ color: 'var(--text-muted)' }}>No current content</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Summary View */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                      padding: '1.125rem',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--risk-high-light)', fontWeight: 800, fontSize: '0.9rem', marginBottom: 6 }}>
                        <AlertCircle size={18} />
                        Automated Drift Alert
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                        {typeof selectedVendor.drift_summary === 'object' && selectedVendor.drift_summary?.summary
                          ? selectedVendor.drift_summary.summary
                          : 'Significant policy text changes detected since previous baseline check.'}
                      </div>
                    </div>

                    {/* Identified Changes */}
                    {selectedVendor.drift_summary?.changes && selectedVendor.drift_summary.changes.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Identified Clause Deviations
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {selectedVendor.drift_summary.changes.map((ch, idx) => (
                            <div key={idx} style={{
                              padding: '0.85rem 1rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              fontSize: '0.825rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <strong style={{ color: 'var(--accent-cyan-bright)' }}>{ch.type || ch.section || 'Policy Clause'}</strong>
                                <RiskBadge risk={ch.severity || 'HIGH'} />
                              </div>
                              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {ch.impact || ch.new_value || ch.description || JSON.stringify(ch)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Recommendation */}
                    <div style={{
                      padding: '1rem 1.125rem',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.28)',
                      borderRadius: 12
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-indigo)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={16} /> Compliance Guidance
                      </div>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                        Review your customer privacy notice. If data retention exceeded your promised window, update contract terms or reconfigure third-party integration pipelines.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                /* No Drift View */
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 14
                }}>
                  <CheckCircle size={42} color="var(--risk-compliant)" style={{ margin: '0 auto 0.85rem' }} />
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4, fontFamily: 'Outfit, sans-serif' }}>
                    Policy Synced & Intact
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 320, margin: '0 auto' }}>
                    Playwright confirmed no textual modifications since the baseline check. Terms remain valid.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--gradient-cyan)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Globe size={18} color="white" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Add Vendor for Playwright Tracking</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem', borderRadius: 8 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVendor}>
              <div className="modal-body">
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Vendor / Provider Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Stripe, Segment, Mixpanel, OpenAI"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Policy or Terms URL *
                  </label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://example.com/privacy-policy"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                    Playwright will launch a headless browser session to extract full DOM text, including client-side rendered Single Page Apps.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Connecting...' : 'Start Monitoring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
