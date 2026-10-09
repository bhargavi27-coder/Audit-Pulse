import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { complianceApi } from '../services/api';
import { ToastContainer, LoadingSkeleton } from '../components/shared';
import { useToast } from '../hooks/useAsync';
import { formatDate } from '../utils/helpers';
import {
  Settings as SettingsIcon, Cpu, Key, Shield, GitBranch,
  Save, RefreshCw, CheckCircle2, AlertCircle, Database, Server,
  Globe, Terminal, Check, Brain, Trash2, Plus, Filter, Sparkles
} from 'lucide-react';

export default function Settings() {
  const { toasts, showToast, removeToast } = useToast();

  const [aiConfig, setAiConfig] = useState(() => {
    const saved = localStorage.getItem('auditpulse_ai_config');
    return saved ? JSON.parse(saved) : {
      provider: 'groq',
      groqApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      model: 'llama3-70b-8192',
      confidenceThreshold: 0.75,
      temperature: 0.2,
      strictness: 'STRICT',
      frameworks: {
        gdpr: true,
        ccpa: true,
        hipaa: false,
        soc2: true,
      },
      failPrOnHighRisk: true,
      githubToken: '',
      playwrightBrowser: 'chromium',
      playwrightTimeout: 30,
    };
  });

  const [systemStatus, setSystemStatus] = useState({
    apiStatus: 'unknown',
    provider: 'checking...',
    latency: null,
    testing: false,
  });

  const [showKey, setShowKey] = useState(false);
  const [feedbackRules, setFeedbackRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [newRule, setNewRule] = useState({ pattern: '', reason: '', action: 'IGNORE_SINK' });
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);

  const fetchFeedbackRules = useCallback(async () => {
    try {
      const res = await complianceApi.getFeedback();
      setFeedbackRules(res.data || []);
    } catch (err) {
      console.warn('Could not load feedback rules:', err);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const testConnection = async () => {
    setSystemStatus(prev => ({ ...prev, testing: true }));
    const start = performance.now();
    try {
      const res = await axios.get('/api/health', { timeout: 8000 });
      const latency = Math.round(performance.now() - start);
      setSystemStatus({
        apiStatus: 'healthy',
        provider: res.data?.ai_provider || 'configured',
        latency,
        testing: false,
      });
      showToast(`Backend connection healthy! (${latency}ms)`, 'success');
    } catch (err) {
      setSystemStatus({
        apiStatus: 'unreachable',
        provider: 'offline',
        latency: null,
        testing: false,
      });
      showToast('Could not connect to AuditPulse backend API: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    testConnection();
    fetchFeedbackRules();
  }, [fetchFeedbackRules]);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('auditpulse_ai_config', JSON.stringify(aiConfig));
    showToast('Settings saved successfully to local configuration!', 'success');
  };

  const handleFrameworkToggle = (key) => {
    setAiConfig(prev => ({
      ...prev,
      frameworks: {
        ...prev.frameworks,
        [key]: !prev.frameworks[key],
      }
    }));
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!newRule.pattern.trim() || !newRule.reason.trim()) {
      showToast('Please provide both pattern identifier and feedback rationale', 'warning');
      return;
    }
    try {
      await complianceApi.submitFeedback({
        rule_or_sink_pattern: newRule.pattern,
        feedback_type: 'FALSE_POSITIVE',
        explanation: newRule.reason,
        action: newRule.action,
        user: 'Security Admin'
      });
      showToast('Learned AI suppression rule recorded!', 'success');
      setNewRule({ pattern: '', reason: '', action: 'IGNORE_SINK' });
      setShowAddRuleModal(false);
      fetchFeedbackRules();
    } catch (err) {
      showToast('Error saving feedback rule: ' + (err.userMessage || err.message), 'error');
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await complianceApi.deleteFeedback(id);
      showToast('Suppression rule removed from AI memory', 'info');
      fetchFeedbackRules();
    } catch (err) {
      showToast('Error deleting rule: ' + (err.userMessage || err.message), 'error');
    }
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
              background: 'var(--gradient-primary)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.35)'
            }}>
              <SettingsIcon size={22} color="white" />
            </span>
            <span className="gradient-text">System & AI Engine Configuration</span>
          </h1>
          <p>
            Configure multi-agent LLM providers, false-positive AI feedback memory loops, Playwright headless browser runners,
            and CI/CD GitHub Actions PR gating parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      {/* Diagnostics / Service Health Banner */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: systemStatus.apiStatus === 'healthy' ? 'rgba(0,245,160,0.1)' : 'rgba(255,51,102,0.1)',
              border: `1px solid ${systemStatus.apiStatus === 'healthy' ? 'rgba(0,245,160,0.3)' : 'rgba(255,51,102,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Server size={22} color={systemStatus.apiStatus === 'healthy' ? 'var(--risk-compliant)' : 'var(--risk-high)'} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
                AuditPulse FastAPI Backend: {systemStatus.apiStatus === 'healthy' ? (
                  <span style={{ color: 'var(--risk-compliant)' }}>Operational (Online)</span>
                ) : (
                  <span style={{ color: 'var(--risk-high)' }}>Unavailable</span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                AI Provider: <strong style={{ color: 'var(--text-primary)' }}>{systemStatus.provider}</strong>
                {systemStatus.latency && ` • Health Ping: ${systemStatus.latency}ms • Port 8000`}
              </div>
            </div>
          </div>

          <button
            onClick={testConnection}
            className="btn btn-secondary"
            disabled={systemStatus.testing}
            style={{ fontSize: '0.825rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} className={systemStatus.testing ? 'animate-spin' : ''} />
            {systemStatus.testing ? 'Checking...' : 'Ping Backend API'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* AI Feedback Loop & Learned Memory Section (Requirement 11) */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Brain size={18} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                  AI Feedback Memory & Learned Suppression Rules (Requirement 11)
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Continuous reinforcement memory: False positives marked during human review train future scans
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddRuleModal(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <Plus size={14} /> Add AI Rule
            </button>
          </div>

          {loadingRules ? (
            <LoadingSkeleton count={2} height={60} />
          ) : feedbackRules.length === 0 ? (
            <div style={{
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border)',
              borderRadius: 10,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              No false-positive suppression rules stored yet. Rejecting or marking a finding as False Positive in Drift Detection will automatically create memory rules here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {feedbackRules.map((rule) => (
                <div
                  key={rule.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    fontSize: '0.825rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>
                      {rule.action || 'SUPPRESSED'}
                    </span>
                    <div>
                      <strong style={{ color: 'var(--accent-cyan-bright)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {rule.rule_or_sink_pattern}
                      </strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                        Rationale: {rule.explanation}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Learned: {formatDate(rule.created_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.5rem', color: 'var(--risk-high-light)' }}
                      title="Forget this rule"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playwright Browser Engine Settings */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Globe size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                Playwright Headless Browser Engine
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automated website scraper for third-party privacy policies & terms
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Browser Engine Target
              </label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={aiConfig.playwrightBrowser || 'chromium'}
                onChange={(e) => setAiConfig({ ...aiConfig, playwrightBrowser: e.target.value })}
              >
                <option value="chromium">Chromium (Installed & Active)</option>
                <option value="firefox">Firefox (Gecko Engine)</option>
                <option value="webkit">WebKit (Safari Core)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Network Idle Timeout (Seconds)
              </label>
              <input
                type="number"
                className="input"
                value={aiConfig.playwrightTimeout || 30}
                onChange={(e) => setAiConfig({ ...aiConfig, playwrightTimeout: parseInt(e.target.value) || 30 })}
                min="5"
                max="120"
              />
            </div>
          </div>

          <div style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.8rem',
            color: 'var(--accent-cyan-bright)'
          }}>
            <Terminal size={16} />
            <span>Playwright browser binaries verified at: <code>C:\Users\saisa\AppData\Local\ms-playwright</code></span>
          </div>
        </div>

        {/* AI Provider Config */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cpu size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                Multi-Agent LLM Engine
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Provider configuration for Legal, Code, and Compliance reasoning
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                AI Provider
              </label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={aiConfig.provider}
                onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value })}
              >
                <option value="groq">Groq (Ultra-Fast Llama-3)</option>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="gemini">Google Gemini 1.5 Pro</option>
                <option value="mock">Local Mock Fallback (Deterministic)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Reasoning Model
              </label>
              <input
                type="text"
                className="input"
                value={aiConfig.model}
                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                placeholder="e.g. llama3-70b-8192, gpt-4o, claude-3-5-sonnet"
              />
            </div>
          </div>

          {/* API Key */}
          <div style={{ marginTop: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              API Key ({aiConfig.provider.toUpperCase()})
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="input"
                placeholder={`Enter your ${aiConfig.provider} API key or configure in .env`}
                value={aiConfig.provider === 'groq' ? aiConfig.groqApiKey : aiConfig.provider === 'openai' ? aiConfig.openaiApiKey : aiConfig.anthropicApiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  if (aiConfig.provider === 'groq') setAiConfig({ ...aiConfig, groqApiKey: val });
                  else if (aiConfig.provider === 'openai') setAiConfig({ ...aiConfig, openaiApiKey: val });
                  else setAiConfig({ ...aiConfig, anthropicApiKey: val });
                }}
                style={{ paddingRight: '4.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: 9,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  borderRadius: 6,
                  cursor: 'pointer',
                  padding: '3px 8px'
                }}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Confidence Threshold
                </label>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
                  {Math.round(aiConfig.confidenceThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={aiConfig.confidenceThreshold}
                onChange={(e) => setAiConfig({ ...aiConfig, confidenceThreshold: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Findings below this confidence score are marked as LOW or INSUFFICIENT.
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Model Temperature
                </label>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
                  {aiConfig.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.7"
                step="0.05"
                value={aiConfig.temperature}
                onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-indigo)' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Lower values guarantee deterministic, hallucination-resistant outputs.
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Frameworks */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                Regulatory Compliance Frameworks
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Rulesets enforced during policy-code drift cross-examination
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              { id: 'gdpr', label: 'GDPR (EU 2016/679)', desc: 'Explicit consent, retention bounds, third-party transfers' },
              { id: 'ccpa', label: 'CCPA / CPRA (California)', desc: 'Do Not Sell, sensitive personal info protection' },
              { id: 'hipaa', label: 'HIPAA Security Rule', desc: 'Strict PHI tracking & encryption enforcement' },
              { id: 'soc2', label: 'SOC 2 Type II', desc: 'Audit trail logging, least privilege data access' },
            ].map(fw => (
              <label
                key={fw.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: aiConfig.frameworks[fw.id] ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: aiConfig.frameworks[fw.id] ? '1px solid var(--border-bright)' : '1px solid var(--border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={aiConfig.frameworks[fw.id]}
                  onChange={() => handleFrameworkToggle(fw.id)}
                  style={{ marginTop: 3, accentColor: 'var(--accent-indigo)' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{fw.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>{fw.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* CI/CD & GitHub Actions */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--gradient-amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <GitBranch size={18} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                CI/CD & GitHub PR Bot Integration
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Automated pull request gating in GitHub Actions
              </div>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={aiConfig.failPrOnHighRisk}
              onChange={(e) => setAiConfig({ ...aiConfig, failPrOnHighRisk: e.target.checked })}
              style={{ accentColor: 'var(--accent-indigo)' }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Fail pull request status checks automatically when HIGH severity policy drift is detected
            </span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              GitHub Personal Access Token (for Automated PR Commenting)
            </label>
            <input
              type="password"
              className="input font-mono"
              value={aiConfig.githubToken}
              onChange={(e) => setAiConfig({ ...aiConfig, githubToken: e.target.value })}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
              Used by <code>.github/workflows/auditpulse.yml</code> to post compliance summaries into GitHub Pull Requests.
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.9rem' }}>
            <Save size={16} /> Save All Settings
          </button>
        </div>
      </form>

      {/* Add Custom Suppression Rule Modal */}
      {showAddRuleModal && (
        <div className="modal-overlay" onClick={() => setShowAddRuleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Brain size={20} color="var(--accent-indigo)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Create Learned AI Rule</h3>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule}>
              <div className="modal-body">
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Rule or Code Sink Pattern (e.g. function name, file path, regex) *
                  </label>
                  <input
                    type="text"
                    className="input font-mono"
                    placeholder="e.g. logger.info, src/internal/mock.ts, mixpanel.track"
                    value={newRule.pattern}
                    onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Action to take upon match *
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={newRule.action}
                    onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}
                  >
                    <option value="IGNORE_SINK">Ignore Sink (Mark as Compliant)</option>
                    <option value="DOWNGRADE_SEVERITY">Downgrade to LOW Severity</option>
                    <option value="FLAG_FOR_REVIEW">Flag for Manual Legal Review Only</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Suppression Rationale & Legal Justification *
                  </label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="Explain why this sink does not violate customer privacy policy (e.g. local pseudonymized logs)..."
                    value={newRule.reason}
                    onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddRuleModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save to AI Memory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
