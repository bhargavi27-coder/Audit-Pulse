/**
 * Shared utility functions for AuditPulse frontend
 */

/** Map risk level to CSS class */
export function getRiskClass(risk) {
  const map = {
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
    COMPLIANT: 'badge-compliant',
    INSUFFICIENT_EVIDENCE: 'badge-insufficient',
  };
  return map[risk?.toUpperCase()] || 'badge-insufficient';
}

/** Map risk level to icon emoji */
export function getRiskIcon(risk) {
  const map = {
    HIGH: '🚨',
    MEDIUM: '⚠️',
    LOW: '🔵',
    COMPLIANT: '✅',
    INSUFFICIENT_EVIDENCE: '❓',
  };
  return map[risk?.toUpperCase()] || '❓';
}

/** Map risk level to color */
export function getRiskColor(risk) {
  const map = {
    HIGH: '#ef4444',
    MEDIUM: '#f59e0b',
    LOW: '#3b82f6',
    COMPLIANT: '#10b981',
    INSUFFICIENT_EVIDENCE: '#6b7280',
  };
  return map[risk?.toUpperCase()] || '#6b7280';
}

/** Format date to readable string */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/** Format relative time */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/** Truncate string */
export function truncate(str, n = 100) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '...' : str;
}

/** Format confidence as percentage */
export function formatConfidence(val) {
  return `${Math.round((val || 0) * 100)}%`;
}

/** Map finding status to label */
export function getStatusLabel(status) {
  const map = {
    open: 'Open',
    acknowledged: 'Acknowledged',
    resolved: 'Resolved',
    false_positive: 'False Positive',
  };
  return map[status] || status;
}

/** Map language to display name */
export function getLanguageLabel(lang) {
  const map = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    go: 'Go',
  };
  return map[lang?.toLowerCase()] || lang;
}
