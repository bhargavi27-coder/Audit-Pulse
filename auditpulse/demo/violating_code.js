/**
 * DEMO: VIOLATING CODE — analytics.js (violating version)
 *
 * This code VIOLATES the Privacy Policy because:
 * 1. It sends user.email directly to a third-party analytics service
 * 2. There is NO consent check before the PII is transmitted
 * 3. The Privacy Policy (Section 3.2) explicitly prohibits this
 *
 * AuditPulse should detect:
 *   drift_detected = true
 *   risk = HIGH
 *   confidence = 0.94
 *
 * THIS IS THE "WOW MOMENT" FILE FOR THE HACKATHON DEMO
 */

const analytics = require('analytics-sdk');
const Mixpanel = require('mixpanel');
const Sentry = require('@sentry/node');

// Initialize third-party services
const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN);

/**
 * ⚠️ POLICY VIOLATION: Sends email to third-party analytics WITHOUT consent check
 * Privacy Policy Section 3.2: "Customer email addresses MUST NOT be shared with
 * third-party analytics services without explicit, informed user consent."
 */
function trackUser(user) {
    // LINE 22: VIOLATION — no consent check before sending PII
    analytics.track("user", {
        email: user.email,        // ← POLICY VIOLATION: PII sent to third party
        name: user.name,          // ← Additional PII sent without consent
        userId: user.id,
        plan: user.plan
    });
}

/**
 * ⚠️ POLICY VIOLATION: User email sent to Mixpanel without consent
 */
function identifyUser(user) {
    // LINE 34: VIOLATION
    mixpanel.people.set(user.email, {
        '$email': user.email,     // ← Directly sends email to Mixpanel
        '$name': user.name,
        'plan': user.plan
    });
}

/**
 * ⚠️ POLICY VIOLATION: Error reporting sends user email to Sentry
 */
function reportError(error, user) {
    // LINE 44: VIOLATION — PII in error reporting context sent to third party
    Sentry.setUser({
        email: user.email,        // ← Email sent to Sentry (third-party)
        id: user.id
    });
    Sentry.captureException(error);
}

/**
 * ⚠️ POLICY VIOLATION: Bulk user data export to analytics pipeline
 */
async function syncUsersToAnalytics(users) {
    for (const user of users) {
        // LINE 55: VIOLATION — batch sending emails without consent
        await analytics.track("user_sync", {
            email: user.email,    // ← Mass PII transfer to third party
            phone: user.phone,    // ← Additional sensitive data
            address: user.address
        });
    }
}

// ADDITIONAL VIOLATION: Logging PII to external logging service
function logUserActivity(user, action) {
    // This sends PII to a third-party logging aggregator
    fetch('https://logs.third-party-service.com/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: user.email,    // ← PII in external API call
            action: action,
            timestamp: Date.now()
        })
    });
}

module.exports = { trackUser, identifyUser, reportError, syncUsersToAnalytics, logUserActivity };
