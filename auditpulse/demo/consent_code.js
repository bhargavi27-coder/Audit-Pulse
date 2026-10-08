/**
 * DEMO: CONSENT CODE — analytics.js (with proper consent implementation)
 *
 * This code shows HOW to fix the violations in violating_code.js.
 * All PII transmissions are wrapped in consent checks.
 *
 * AuditPulse should detect: drift_detected = false
 */

const analytics = require('analytics-sdk');
const ConsentManager = require('./consent-manager');

/**
 * COMPLIANT: Checks user consent before sending any PII
 */
async function trackUser(user) {
    const consent = await ConsentManager.getConsent(user.id);

    if (consent.analytics === true) {
        // User has explicitly consented to analytics tracking with PII
        analytics.track("user", {
            email: user.email,    // COMPLIANT: Consent verified
            userId: user.id,
            plan: user.plan
        });
    } else {
        // No consent — track anonymously only
        analytics.track("user_anonymous", {
            userId: user.anonymizedId,
            plan: user.plan
        });
    }
}

/**
 * COMPLIANT: Granular consent check per operation
 */
async function identifyForPersonalization(user) {
    if (user.consent && user.consent.marketing === true) {
        analytics.identify(user.id, {
            email: user.email,    // COMPLIANT: marketing consent checked
            plan: user.plan
        });
    }
}

/**
 * COMPLIANT: Page tracking with no PII
 */
function trackPageView(path, sessionId) {
    analytics.track("page_view", {
        path: path,
        session: sessionId    // Session ID — not PII
    });
}

/**
 * COMPLIANT: Error reporting without PII
 */
function reportError(error, userId) {
    analytics.track("error", {
        userId: userId,       // Anonymized user ID only
        error: error.message,
        stack: error.stack
        // NO email or personal data sent
    });
}

module.exports = { trackUser, identifyForPersonalization, trackPageView, reportError };
