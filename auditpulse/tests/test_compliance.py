"""
AuditPulse Test Suite
Tests the core multi-agent compliance detection pipeline.
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
    Expected: drift_detected = True, risk = HIGH
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
    assert finding["risk"] == "HIGH", (
        f"Expected HIGH risk, got: {finding['risk']}"
    )


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
    # Should be compliant — no PII involved
    assert finding["risk"] in ["COMPLIANT", "LOW", "INSUFFICIENT_EVIDENCE"], (
        f"Expected COMPLIANT/LOW for page-view only tracking, got: {finding['risk']}"
    )


# ===== Test 5: Vendor Policy Change Detection =====

@pytest.mark.asyncio
async def test_vendor_drift_detection():
    """
    Old vendor policy: 30-day retention
    New vendor policy: 180-day retention
    Expected: drift_detected = True
    """
    from app.services.vendor_service import VendorMonitorService
    monitor = VendorMonitorService()

    old_text = "Customer data retained for 30 days after contract termination."
    new_text = "Customer data retained for 180 days after contract termination."

    result = await monitor.detect_drift(old_text, new_text)

    assert result.get("drift_detected") == True, (
        f"Expected vendor drift detected, got: {result}"
    )


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

    # Each rule should have required fields
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

    # Should detect either via AST or regex
    all_detected = (
        result.get("sensitive_data_found", []) +
        result.get("third_party_services", [])
    )
    detected_str = " ".join(str(x).lower() for x in all_detected)

    assert "email" in detected_str or "analytics" in detected_str, (
        f"Expected email or analytics detected, got: {result}"
    )
