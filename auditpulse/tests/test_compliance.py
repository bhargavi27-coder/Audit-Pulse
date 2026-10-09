"""
AuditPulse Test Suite
Tests all 12 Improved AuditPulse capabilities:
- Policy rule extraction & version comparison
- Code behavior, affected components, and data flows
- Multi-agent drift detection
- Numerical Compliance Risk Score + Severity + Confidence
- Verbatim Policy sentence <-> Code line evidence pairing
- Suggested fix diff code patches
- Vendor monitoring with affected components
- AI Feedback loop false-positive suppression
"""
import pytest
import asyncio
from app.agents.legal_agent import LegalAgent
from app.agents.code_agent import CodeAgent
from app.agents.compliance_agent import ComplianceAgent


# ===== Fixtures =====

@pytest.fixture
def legal():
    return LegalAgent()

@pytest.fixture
def coder():
    return CodeAgent()

@pytest.fixture
def compliance():
    return ComplianceAgent()


# ===== Test 1: No Violation — local logging, no third-party transfer =====

@pytest.mark.asyncio
async def test_no_violation_console_log(legal, coder, compliance):
    """
    Policy: Email must not be shared with third parties.
    Code: console.log(user.email) — local only, no external transfer.
    Expected: drift_detected = False
    """
    policy_text = "We do not share customer email addresses with third parties."
    code = "console.log(user.email);"
    language = "javascript"

    rules_data = await legal.analyze(policy_text)
    behavior = await coder.analyze(code, language, "test.js")
    findings = await compliance.compare(
        policy_rules=rules_data.get("rules", []),
        code_behavior=behavior,
        policy_name="Test Policy",
        file_path="test.js"
    )

    assert len(findings) > 0, "Expected at least one finding"
    finding = findings[0]
    assert finding["drift_detected"] == False, (
        f"Expected no drift for console.log, got: {finding['reason']}"
    )


# ===== Test 2: Violation — email sent to analytics without consent =====

@pytest.mark.asyncio
async def test_violation_analytics_email(legal, coder, compliance):
    """
    Policy: Email must not be shared with third parties without consent.
    Code: analytics.track("user", { email: user.email })
    Expected: drift_detected = True, risk = HIGH, risk_score >= 80, exact evidence pair and fix diff present.
    """
    policy_text = "Customer email must not be shared with third parties without explicit user consent."
    code = 'analytics.track("user", { email: user.email });'
    language = "javascript"

    rules_data = await legal.analyze(policy_text)
    behavior = await coder.analyze(code, language, "analytics.js")
    findings = await compliance.compare(
        policy_rules=rules_data.get("rules", []),
        code_behavior=behavior,
        policy_name="Privacy Policy",
        file_path="analytics.js"
    )

    assert len(findings) > 0, "Expected at least one finding"
    finding = findings[0]
    assert finding["drift_detected"] == True, (
        f"Expected drift detected, got drift_detected=False. Reason: {finding['reason']}"
    )
    assert finding["risk"] == "HIGH", f"Expected HIGH risk, got: {finding['risk']}"
    assert finding["risk_score"] >= 80.0, f"Expected Compliance Risk Score >= 80, got {finding.get('risk_score')}"
    assert finding.get("evidence_pair") is not None, "Expected structured evidence pair"
    assert finding.get("suggested_fix") is not None, "Expected suggested fix code diff"


# ===== Test 3: Consent Exists — should NOT trigger violation =====

@pytest.mark.asyncio
async def test_consent_check_compliant(legal, coder, compliance):
    """
    Policy: Email may be shared with third parties when the user has provided consent.
    Code: if (user.consent) { analytics.track("user", { email: user.email }); }
    Expected: drift_detected = False
    """
    policy_text = "Email may be shared with third parties when the user has provided consent."
    code = """
if (user.consent) {
    analytics.track("user", { email: user.email });
}
"""
    language = "javascript"

    rules_data = await legal.analyze(policy_text)
    behavior = await coder.analyze(code, language, "analytics.js")
    findings = await compliance.compare(
        policy_rules=rules_data.get("rules", []),
        code_behavior=behavior,
        policy_name="Privacy Policy",
        file_path="analytics.js"
    )

    assert len(findings) > 0, "Expected at least one finding"
    finding = findings[0]
    assert finding["drift_detected"] == False, (
        f"Expected compliant (consent check present), got drift_detected=True. Reason: {finding['reason']}"
    )


# ===== Test 4: Unrelated Data — page view, no PII =====

@pytest.mark.asyncio
async def test_unrelated_data_no_email(legal, coder, compliance):
    """
    Code: analytics.track("page_view", { page: "/home" })
    Expected: No email sharing detected — COMPLIANT
    """
    policy_text = "Customer email addresses must not be shared with third parties without consent."
    code = 'analytics.track("page_view", { page: "/home" });'
    language = "javascript"

    rules_data = await legal.analyze(policy_text)
    behavior = await coder.analyze(code, language, "analytics.js")
    findings = await compliance.compare(
        policy_rules=rules_data.get("rules", []),
        code_behavior=behavior,
        policy_name="Privacy Policy",
        file_path="analytics.js"
    )

    assert len(findings) > 0
    finding = findings[0]
    assert finding["risk"] in ["COMPLIANT", "LOW", "INSUFFICIENT_EVIDENCE"], (
        f"Expected COMPLIANT/LOW for page-view only tracking, got: {finding['risk']}"
    )


# ===== Test 5: Vendor Policy Change Detection =====

@pytest.mark.asyncio
async def test_vendor_drift_detection():
    """
    Old vendor policy: 30-day retention
    New vendor policy: 180-day retention
    Expected: drift_detected = True and affected components mapped
    """
    from app.services.vendor_service import VendorMonitorService
    monitor = VendorMonitorService()

    old_text = "Customer data retained for 30 days after contract termination."
    new_text = "Customer data retained for 180 days after contract termination."

    result = await monitor.detect_drift(old_text, new_text)

    assert result.get("drift_detected") == True, (
        f"Expected vendor drift detected, got: {result}"
    )
    assert len(result.get("affected_components", [])) > 0 or len(result.get("changes", [])) > 0


# ===== Test 6: Legal Agent Rule Extraction =====

@pytest.mark.asyncio
async def test_legal_agent_extracts_rules(legal):
    """Legal agent should extract at least one rule from policy text."""
    policy_text = """
    Privacy Policy — Version 2.0

    Section 3.2 — Data Sharing
    We do not share customer personal information, including email addresses,
    with third parties without explicit user consent.

    Section 4.1 — Data Retention
    Customer data is retained for no more than 90 days after account closure.
    """

    result = await legal.analyze(policy_text)
    rules = result.get("rules", [])
    assert len(rules) >= 1, f"Expected at least 1 rule, got {len(rules)}: {result}"

    for rule in rules:
        assert "data_type" in rule
        assert "action" in rule
        assert "destination" in rule
        assert "severity" in rule


# ===== Test 7: AST Analyzer Detection =====

def test_ast_analyzer_detects_sensitive_data():
    """AST analyzer should detect user.email and analytics.track."""
    from app.analyzers.ast_analyzer import ASTAnalyzer
    analyzer = ASTAnalyzer()

    code = 'analytics.track("user", { email: user.email });'
    result = analyzer.analyze(code, "javascript")

    all_detected = (
        result.get("sensitive_data_found", []) +
        result.get("third_party_services", [])
    )
    detected_str = " ".join(str(x).lower() for x in all_detected)

    assert "email" in detected_str or "analytics" in detected_str, (
        f"Expected email or analytics detected, got: {result}"
    )


# ===== Test 8: Policy Version Comparison =====

@pytest.mark.asyncio
async def test_policy_version_comparison(legal):
    """
    Test version comparison between Policy v1.0 and Policy v2.0.
    Expected: returns added, removed, or modified rules with risk impact.
    """
    v1 = "Section 3.2: Customer email addresses must not be shared with third parties without opt-in."
    v2 = "Section 3.2: Customer email addresses may be processed by analytics partners. Section 4.1: Retained for 90 days."

    diff_res = await legal.compare_versions(
        policy_a_name="Privacy Policy",
        policy_a_version="1.0",
        policy_a_text=v1,
        policy_b_name="Privacy Policy",
        policy_b_version="2.0",
        policy_b_text=v2,
    )

    assert diff_res is not None
    assert "risk_impact" in diff_res
    assert len(diff_res.get("added_rules", [])) > 0 or len(diff_res.get("modified_rules", [])) > 0


# ===== Test 9: Data Flow & Affected Components Identification =====

@pytest.mark.asyncio
async def test_code_analysis_data_flows_and_components(coder):
    """
    Test that Code Agent extracts structured affected components and end-to-end data flows.
    """
    code = """
    function trackUser(user) {
        analytics.track("user", { email: user.email });
    }
    """
    behavior = await coder.analyze(code, "javascript", "tracker.js")

    assert len(behavior.get("affected_components", [])) > 0, "Expected affected components identified"
    assert len(behavior.get("data_flows", [])) > 0, "Expected data flow pipeline traced"
    flow = behavior["data_flows"][0]
    assert "source" in flow
    assert "sink" in flow


# ===== Test 10: AI Feedback Loop Suppression =====

@pytest.mark.asyncio
async def test_ai_feedback_loop_suppression(legal, coder, compliance):
    """
    When active human feedback exists indicating a false-positive exception,
    compliance comparison should honor the feedback memory and return COMPLIANT.
    """
    policy_text = "Customer email must not be shared without consent."
    code = 'analytics.track("user", { email: user.email });'

    rules_data = await legal.analyze(policy_text)
    behavior = await coder.analyze(code, "javascript", "analytics.js")

    # Pass learned human feedback rule
    feedback_rules = [
        {
            "id": 1,
            "pattern_signature": "analytics.js:18",
            "category": "false_positive",
            "reason": "Approved internal sandbox testing exception. Suppress drift alert."
        }
    ]

    findings = await compliance.compare(
        policy_rules=rules_data.get("rules", []),
        code_behavior=behavior,
        policy_name="Privacy Policy",
        file_path="analytics.js",
        feedback_rules=feedback_rules,
    )

    assert len(findings) > 0
    finding = findings[0]
    assert finding["drift_detected"] == False, "Expected feedback rule to suppress false positive"
    assert finding["risk"] == "COMPLIANT"
