/**
 * DEMO: COMPLIANT CODE — analytics.js (compliant version)
 *
 * This code COMPLIES with the Privacy Policy because:
 * 1. It checks user consent before sending any PII to analytics
 * 2. It uses anonymized identifiers where possible
 * 3. Personal email is only sent when explicit consent exists
 *
 * AuditPulse should detect: drift_detected = false
 */

const Analytics = require('./analytics-sdk');

/**
 * Track user actions with proper consent checking.
 * Always verify consent before transmitting personal data.
 */
function trackUserAction(user, action, properties = {}) {
    // CONSENT CHECK: Required before sending any PII to third parties
    if (!user.hasConsented('analytics')) {
        console.log('[Analytics] Skipped: user has not consented to analytics tracking');
        return;
    }

    // Safe: consent verified before this point
    Analytics.track(action, {
        userId: user.anonymizedId,  // Anonymized - not raw PII
        ...properties
    });
}

/**
 * User registration tracking — compliant implementation.
 * Only sends anonymized identifier to analytics.
 */
function trackRegistration(user) {
    // SAFE: Uses anonymized ID, not email
    Analytics.track('user_registered', {
        userId: user.anonymizedId,
        plan: user.plan,
        timestamp: new Date().toISOString()
    });
}

/**
 * Page view tracking — safe, no PII involved.
 */
function trackPageView(pagePath) {
    Analytics.track('page_view', {
        page: pagePath,
        timestamp: new Date().toISOString()
    });
}

/**
 * Email can ONLY be included in analytics with explicit consent.
 */
function trackWithEmail(user, event) {
    if (user.consent && user.consent.analyticsWithEmail === true) {
        Analytics.track(event, {
            email: user.email,  // Consent verified above
            userId: user.id
        });
    } else {
        // Fallback: track without email
        Analytics.track(event, { userId: user.anonymizedId });
    }
}

module.exports = { trackUserAction, trackRegistration, trackPageView, trackWithEmail };
