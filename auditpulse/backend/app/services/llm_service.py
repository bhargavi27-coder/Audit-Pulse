"""
LLM Service Layer — swappable AI provider
Supports: OpenAI, Anthropic, Google, Mock (for testing)
"""
from typing import Optional, List, Dict, Any
import json
import re
from app.config import settings


class LLMService:
    """
    Clean abstraction over AI providers.
    Change AI_PROVIDER in .env to switch models.
    """

    def __init__(self):
        self.provider = settings.ai_provider

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Send a prompt and return the text response."""
        if self.provider == "openai":
            return await self._openai_complete(system_prompt, user_prompt)
        elif self.provider == "anthropic":
            return await self._anthropic_complete(system_prompt, user_prompt)
        elif self.provider == "google":
            return await self._google_complete(system_prompt, user_prompt)
        else:
            # Mock provider — returns deterministic rule-based responses
            return await self._mock_complete(system_prompt, user_prompt)

    async def _openai_complete(self, system_prompt: str, user_prompt: str) -> str:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            response_format={"type": "text"},
        )
        return response.choices[0].message.content or ""

    async def _anthropic_complete(self, system_prompt: str, user_prompt: str) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        message = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text if message.content else ""

    async def _google_complete(self, system_prompt: str, user_prompt: str) -> str:
        import google.generativeai as genai
        genai.configure(api_key=settings.google_api_key)
        model = genai.GenerativeModel(
            model_name=settings.google_model,
            system_instruction=system_prompt,
        )
        response = await model.generate_content_async(user_prompt)
        return response.text or ""

    async def _mock_complete(self, system_prompt: str, user_prompt: str) -> str:
        """
        Rule-based mock responder for local development without API keys.
        Returns realistic JSON responses based on prompt content analysis.
        """
        prompt_lower = (system_prompt + " " + user_prompt).lower()

        # 0. Policy version comparison
        if "compare version a against version b" in prompt_lower or "version diff" in prompt_lower or "policy version" in prompt_lower and "version a" in prompt_lower:
            return self._mock_version_diff_response(user_prompt)

        # 1. Vendor monitoring agent
        if "vendor policy change analyst" in prompt_lower or ("vendor" in prompt_lower and ("old version" in prompt_lower or "new version" in prompt_lower)):
            return self._mock_vendor_response(user_prompt)

        # 2. Evidence agent
        if "evidence documentation agent" in prompt_lower or "document the evidence" in prompt_lower:
            return self._mock_evidence_response(user_prompt)

        # 3. Compliance comparison agent
        if "compliance analysis agent" in prompt_lower or "compare these policy rules" in prompt_lower:
            return self._mock_compliance_response(user_prompt)

        # 4. Code analysis agent
        if "code analysis agent" in prompt_lower or ("analyze this" in prompt_lower and "source code" in prompt_lower):
            return self._mock_code_response(user_prompt)

        # 5. Legal / policy rule extraction agent
        if "legal agent" in prompt_lower or "extract compliance rules" in prompt_lower or "legal/compliance policy analyst" in prompt_lower:
            return self._mock_legal_response(user_prompt)

        # Fallbacks by keywords
        if "compliance" in prompt_lower and "drift" in prompt_lower:
            return self._mock_compliance_response(user_prompt)
        if "vendor" in prompt_lower:
            return self._mock_vendor_response(user_prompt)
        if "extract" in prompt_lower and "rule" in prompt_lower:
            return self._mock_legal_response(user_prompt)

        return json.dumps({"response": "Mock response — set AI_PROVIDER in .env to use a real model."})

    def _mock_legal_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        rules = []

        if "email" in prompt_lower and ("not share" in prompt_lower or "without consent" in prompt_lower or "third part" in prompt_lower):
            rules.append({
                "section": "3.2",
                "data_type": "personal_email",
                "action": "share",
                "destination": "third_party",
                "condition": "user_consent_required",
                "severity": "HIGH",
                "raw_text": "Customer email addresses must not be shared with third parties without explicit user consent."
            })

        if "retain" in prompt_lower or "retention" in prompt_lower:
            rules.append({
                "section": "4.1",
                "data_type": "personal_data",
                "action": "retain",
                "destination": "internal_storage",
                "condition": "limited_to_policy_period",
                "severity": "MEDIUM",
                "raw_text": "Personal data shall be retained only for the period specified in this policy."
            })

        if "collect" in prompt_lower or "personal data" in prompt_lower:
            rules.append({
                "section": "2.1",
                "data_type": "personal_information",
                "action": "collect",
                "destination": "company_systems",
                "condition": "user_informed",
                "severity": "LOW",
                "raw_text": "Personal information is collected only with user awareness."
            })

        if not rules:
            rules.append({
                "section": "1.0",
                "data_type": "user_data",
                "action": "process",
                "destination": "internal",
                "condition": "lawful_basis_required",
                "severity": "MEDIUM",
                "raw_text": "User data must be processed with a lawful basis."
            })

        return json.dumps({
            "rules": rules,
            "summary": f"Extracted {len(rules)} compliance rule(s) from policy."
        })

    def _mock_version_diff_response(self, prompt: str) -> str:
        """Mock response for comparing policy versions."""
        return json.dumps({
            "risk_impact": "INCREASED_RISK",
            "summary": "Policy v2.0 relaxes key user privacy safeguards: Customer email sharing restriction was modified, and data retention was extended from 30 to 90 days. External analytics transfers now occur without mandatory affirmative consent under modified Section 3.2.",
            "added_rules": [
                {
                    "section": "6.2",
                    "data_type": "telemetry_analytics",
                    "action": "transmit",
                    "destination": "cloud_partners",
                    "condition": "legitimate_interest",
                    "severity": "MEDIUM",
                    "raw_text": "Telemetry and aggregated usage data may be transferred to cloud partners for quality assurance."
                }
            ],
            "removed_rules": [
                {
                    "section": "3.1",
                    "data_type": "device_identifier",
                    "action": "prohibit_tracking",
                    "destination": "third_party",
                    "condition": "unconditional",
                    "severity": "HIGH",
                    "raw_text": "Third parties are strictly prohibited from tracking user hardware fingerprints."
                }
            ],
            "modified_rules": [
                {
                    "section": "3.2",
                    "data_type": "personal_email",
                    "change_description": "Affirmative consent requirement relaxed to implied consent via service usage.",
                    "old_text": "Customer email addresses must not be shared without explicit user opt-in.",
                    "new_text": "Customer email addresses may be processed by trusted partners to facilitate notifications.",
                    "severity": "HIGH"
                },
                {
                    "section": "4.1",
                    "data_type": "personal_data",
                    "change_description": "Data retention duration prolonged from 30 days to 90 days post-account closure.",
                    "old_text": "Personal data is retained for a maximum of 30 days after account closure.",
                    "new_text": "Personal data is retained for up to 90 days after account closure.",
                    "severity": "MEDIUM"
                }
            ],
            "detailed_diff": "--- Policy v1.0\n+++ Policy v2.0\n@@ -10,3 +10,3 @@\n- Section 3.2: Explicit user opt-in required before third-party email transmission.\n+ Section 3.2: Trusted partners may process customer email for notification delivery.\n@@ -18,2 +18,2 @@\n- Section 4.1: Retained for maximum 30 days.\n+ Section 4.1: Retained for up to 90 days."
        })

    def _mock_code_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        findings = []
        sensitive_data = []
        destinations = []
        third_party_sdks = []
        actions = []
        components = []
        data_flows = []

        if "analytics.track" in prompt_lower or "analytics" in prompt_lower:
            third_party_sdks.append("analytics-sdk")
            destinations.append("analytics_service")
            actions.append("send_data")
            components.append("Analytics Client Adapter")
            findings.append({
                "line": 18,
                "pattern": "analytics.track",
                "data": ["user.email"] if "email" in prompt_lower else ["page_data"],
                "action": "send",
                "destination": "analytics",
                "third_party": True,
                "risk_indicator": "HIGH" if "email" in prompt_lower else "LOW"
            })

        if "user.email" in prompt_lower or "email" in prompt_lower:
            sensitive_data.append("user.email")

        if "identifyuser" in prompt_lower or "trackuser" in prompt_lower:
            components.append("User Event Pipeline (trackUser)")
            components.append("Identity Gateway (identifyUser)")

        if "console.log" in prompt_lower or "logger" in prompt_lower:
            actions.append("log")
            components.append("Logging Utility")
            findings.append({
                "line": 1,
                "pattern": "console.log",
                "data": ["user.email"] if "email" in prompt_lower else ["general_data"],
                "action": "log",
                "destination": "console",
                "third_party": False,
                "risk_indicator": "LOW"
            })

        if "fetch(" in prompt_lower or "axios" in prompt_lower or "http" in prompt_lower:
            actions.append("network_request")
            destinations.append("external_api")
            components.append("HTTP Transport Layer")
            findings.append({
                "line": 1,
                "pattern": "fetch/axios",
                "data": ["request_payload"],
                "action": "send",
                "destination": "external_endpoint",
                "third_party": True,
                "risk_indicator": "MEDIUM"
            })

        # Check if consent logic is present in the actual code (ignoring comments)
        code_part = prompt
        if "=== SOURCE CODE ===" in prompt:
            code_part = prompt.split("=== SOURCE CODE ===")[1].split("==================")[0]

        code_clean = re.sub(r'/\*.*?\*/', '', code_part, flags=re.DOTALL)
        code_clean = re.sub(r'//.*', '', code_clean)
        code_clean = re.sub(r'#.*', '', code_clean)
        code_clean_lower = code_clean.lower()

        has_consent = ("consent" in code_clean_lower or "hasconsented" in code_clean_lower) and ("if" in code_clean_lower or "check" in code_clean_lower or "?" in code_clean_lower)

        if has_consent:
            for f in findings:
                f["consent_check_detected"] = True

        if not components:
            components = ["Application Core", "Data Dispatcher"]

        # Synthesize data flows
        if "email" in prompt_lower:
            is_analytics = "analytics" in prompt_lower or "track" in prompt_lower
            if is_analytics:
                data_flows.append({
                    "id": "DF-01",
                    "source": "user.email (Customer Object)",
                    "transform": "Payload Object Assembly",
                    "sink": "analytics.track (Third-party SDK)",
                    "data_sensitivity": "PII / High",
                    "consent_guarded": has_consent,
                    "component": "trackUser Function",
                    "line": 18
                })
                if "identify" in prompt_lower:
                    data_flows.append({
                        "id": "DF-02",
                        "source": "user.email + user.id",
                        "transform": "Profile Identity Mapping",
                        "sink": "analytics.identify (Third-party SDK)",
                        "data_sensitivity": "PII / High",
                        "consent_guarded": has_consent,
                        "component": "identifyUser Function",
                        "line": 26
                    })
            elif "console.log" in prompt_lower or "logger" in prompt_lower:
                data_flows.append({
                    "id": "DF-01",
                    "source": "user.email (Customer Object)",
                    "transform": "Local Stream Output",
                    "sink": "console.log (Local Terminal)",
                    "data_sensitivity": "PII / High",
                    "consent_guarded": False,
                    "component": "Logging Utility",
                    "line": 1
                })

        return json.dumps({
            "sensitive_data": sensitive_data,
            "actions": actions,
            "destinations": destinations,
            "third_party_sdks": third_party_sdks,
            "api_calls": [],
            "network_requests": [d for d in destinations if "api" in d or "endpoint" in d],
            "logging_events": ["console.log"] if "console.log" in prompt_lower else [],
            "storage_operations": [],
            "affected_components": components,
            "data_flows": data_flows,
            "findings": findings,
            "summary": f"Detected {len(findings)} behavioral pattern(s), {len(components)} affected component(s), and {len(data_flows)} data flow(s)."
        })

    def _mock_compliance_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()

        # Check for active learned human feedback suppression
        if "=== learned human feedback" in prompt_lower:
            # If prompt mentions active feedback rules suppressing analytics email or false-positive
            if "suppress" in prompt_lower or "false_positive" in prompt_lower or "exception" in prompt_lower:
                return json.dumps({
                    "drift_detected": False,
                    "risk": "COMPLIANT",
                    "confidence": 0.95,
                    "risk_score": 0.0,
                    "title": "Suppressed by Learned AI Feedback Rule",
                    "reason": "This behavioral pattern matches an active human feedback rule created by legal/security review. The transfer is recognized as an approved exception or internal test pipeline.",
                    "recommendation": "Maintained in compliance according to human reviewer rule.",
                    "policy_reference": "Feedback Memory Rule",
                    "code_reference": "analytics.js:18",
                    "data_involved": "user.email",
                    "destination": "Third-party analytics service",
                    "policy_evidence": "\"Approved exception according to human governance review.\"",
                    "code_evidence": "analytics.track(\"user\", { email: user.email });",
                    "evidence_pair": {
                        "policy_quote": "Approved exception according to human governance review.",
                        "policy_section": "Governance Feedback",
                        "code_snippet": "analytics.track(\"user\", { email: user.email });",
                        "code_line": 18,
                        "file_path": "analytics.js",
                        "conflict_vector": "Suppressed by active reviewer feedback rule"
                    },
                    "suggested_fix": None
                })

        # Isolate code behavior section from policy rules section
        code_behavior_part = prompt_lower
        policy_rules_part = prompt_lower
        if "=== code behavior" in prompt_lower:
            parts = prompt_lower.split("=== code behavior")
            policy_rules_part = parts[0]
            code_behavior_part = parts[1]

        # Check for violation scenario (only when third-party analytics/SDK is invoked, not console.log)
        is_only_console = ("console.log" in code_behavior_part or "console" in code_behavior_part) and "analytics" not in code_behavior_part and "third_party_sdks\": [\"analytics" not in code_behavior_part
        has_email_sending = ("analytics" in code_behavior_part or "track" in code_behavior_part) and "email" in code_behavior_part and not is_only_console
        has_email_sharing_rule = "email" in policy_rules_part and ("shar" in policy_rules_part or "consent" in policy_rules_part or "third" in policy_rules_part or "part" in policy_rules_part)

        has_consent_check = (
            '"consent_check_detected": true' in code_behavior_part
            or '"consent_guarded": true' in code_behavior_part
            or "hasconsented" in code_behavior_part
            or "if (user.consent" in code_behavior_part
            or "if (user.hasconsent" in code_behavior_part
            or "if (consent" in code_behavior_part
        )

        if is_only_console and "email" in code_behavior_part:
            return json.dumps({
                "drift_detected": False,
                "risk": "COMPLIANT",
                "confidence": 0.95,
                "risk_score": 0.0,
                "title": "Local Console Logging (No External Transfer)",
                "reason": "The code uses console.log(user.email) for local execution logging only. No external transmission or third-party sharing was detected.",
                "recommendation": "Ensure production build strips sensitive console.log output or routes to an encrypted audit log.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "test.js:1",
                "data_involved": "user.email (Local)",
                "destination": "Local Console",
                "policy_evidence": "\"We do not share customer email addresses with third parties.\"",
                "code_evidence": "console.log(user.email);",
                "evidence_pair": {
                    "policy_quote": "We do not share customer email addresses with third parties.",
                    "policy_section": "Section 3.2",
                    "code_snippet": "console.log(user.email);",
                    "code_line": 1,
                    "file_path": "test.js",
                    "conflict_vector": "Compliant: local console output does not constitute third-party data sharing."
                },
                "suggested_fix": None
            })

        if has_email_sending and has_email_sharing_rule and not has_consent_check:
            policy_quote = "Customer email addresses and personally identifiable information (PII) MUST NOT be shared with third-party analytics services without explicit, informed user consent."
            code_line = "analytics.track(\"user\", { email: user.email, name: user.name });"
            return json.dumps({
                "drift_detected": True,
                "risk": "HIGH",
                "confidence": 0.94,
                "risk_score": 93.5,
                "title": "Unauthorized Third-Party Data Transfer (Missing Consent Gate)",
                "reason": "Customer email (user.email) is transmitted directly to a third-party analytics service via analytics.track() without any preceding consent verification. This directly breaches Section 3.2 of the Privacy Policy which mandates explicit user opt-in prior to third-party data disclosure.",
                "recommendation": "Gate the analytics.track() invocation with user consent verification: if (user.consent && user.consent.analytics === true). Alternatively, use anonymized user identifiers instead of raw email addresses.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js:18",
                "data_involved": "user.email (Personally Identifiable Information)",
                "destination": "Third-party analytics service (analytics-sdk)",
                "policy_evidence": f"\"{policy_quote}\"",
                "code_evidence": code_line,
                "evidence_pair": {
                    "policy_quote": policy_quote,
                    "policy_section": "Section 3.2 — Data Sharing Restrictions",
                    "code_snippet": code_line,
                    "code_line": 18,
                    "file_path": "analytics.js",
                    "conflict_vector": "Code sends unencrypted user.email directly to third-party SDK without checking user.consent flag."
                },
                "suggested_fix": {
                    "code_patch": "if (user.consent && user.consent.analytics === true) {\n  analytics.track(\"user\", {\n    email: user.email,\n    name: user.name\n  });\n} else {\n  analytics.track(\"user_anonymous\", { userId: user.anonymizedId });\n}",
                    "diff": "@@ -18,4 +18,8 @@\n-  analytics.track(\"user\", {\n-    email: user.email,\n-    name: user.name\n-  });\n+  if (user.consent && user.consent.analytics === true) {\n+    analytics.track(\"user\", { email: user.email, name: user.name });\n+  } else {\n+    analytics.track(\"user_anonymous\", { userId: user.anonymizedId });\n+  }",
                    "policy_adjustment": "If analytics tracking is strictly necessary under Legitimate Interests (GDPR Art. 6(1)(f)), ensure explicit disclosure in Section 3.2 and maintain an opt-out mechanism.",
                    "explanation": "Wraps the analytics dispatch inside an affirmative consent check gate, eliminating the compliance drift while maintaining analytics tracking for opted-in users."
                }
            })
        elif has_consent_check and has_email_sending:
            return json.dumps({
                "drift_detected": False,
                "risk": "COMPLIANT",
                "confidence": 0.88,
                "risk_score": 0.0,
                "title": "Email sharing with verified consent gate detected",
                "reason": "The code transfers user.email via analytics.track(), but an explicit consent verification (user.consent) precedes the operation. This satisfies the Section 3.2 requirement for user consent before external data transmission.",
                "recommendation": "Maintain consent state persistence and verify that user opt-out revocation is honored in real-time.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js:42",
                "data_involved": "user.email",
                "destination": "Third-party analytics service",
                "policy_evidence": "\"Email may be shared with third parties when the user has provided consent.\"",
                "code_evidence": "if (user.consent && user.consent.analytics) { analytics.track(\"user\", { email: user.email }); }",
                "evidence_pair": {
                    "policy_quote": "Email may be shared with third parties when the user has provided consent.",
                    "policy_section": "Section 3.2",
                    "code_snippet": "if (user.consent && user.consent.analytics) { analytics.track(\"user\", { email: user.email }); }",
                    "code_line": 42,
                    "file_path": "analytics.js",
                    "conflict_vector": "Compliant: consent check gate is present and verified."
                },
                "suggested_fix": None
            })
        elif "page_view" in prompt_lower or "page" in prompt_lower:
            return json.dumps({
                "drift_detected": False,
                "risk": "COMPLIANT",
                "confidence": 0.97,
                "risk_score": 0.0,
                "title": "No Personal Data Sharing Detected",
                "reason": "The analytics tracking invocation transmits non-personal telemetry data (page path). No PII or customer identifiers are exposed to external services.",
                "recommendation": "No action required. Continuous surveillance active.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js:12",
                "data_involved": "page_path (non-PII)",
                "destination": "Analytics service",
                "policy_evidence": "\"Customer email addresses must not be shared with third parties.\"",
                "code_evidence": "analytics.track(\"page_view\", { page: \"/home\" });",
                "evidence_pair": {
                    "policy_quote": "Customer email addresses must not be shared with third parties.",
                    "policy_section": "Section 3.2",
                    "code_snippet": "analytics.track(\"page_view\", { page: \"/home\" });",
                    "code_line": 12,
                    "file_path": "analytics.js",
                    "conflict_vector": "Compliant: only non-PII telemetry data sent."
                },
                "suggested_fix": None
            })
        else:
            return json.dumps({
                "drift_detected": False,
                "risk": "LOW",
                "confidence": 0.72,
                "risk_score": 25.0,
                "title": "No significant compliance drift detected",
                "reason": "Analyzed code behavior aligns with extracted policy constraints. Confidence is moderate.",
                "recommendation": "Schedule routine automated PR scans to preserve compliance baseline.",
                "policy_reference": "General Policy",
                "code_reference": "source.js:1",
                "data_involved": "telemetry",
                "destination": "internal",
                "policy_evidence": "Policy rules analyzed.",
                "code_evidence": "Code behavior analyzed.",
                "evidence_pair": {
                    "policy_quote": "Policy rules analyzed.",
                    "policy_section": "General",
                    "code_snippet": "Code behavior analyzed.",
                    "code_line": 1,
                    "file_path": "source.js",
                    "conflict_vector": "Baseline verified"
                },
                "suggested_fix": None
            })

    def _mock_evidence_response(self, prompt: str) -> str:
        policy_quote = "Customer email addresses and personally identifiable information (PII) MUST NOT be shared with third-party analytics services without explicit, informed user consent."
        code_line = "analytics.track(\"user\", { email: user.email, name: user.name });"
        return json.dumps({
            "policy_evidence_quote": policy_quote,
            "code_evidence_snippet": code_line,
            "interpretation": "Direct violation of privacy covenant: PII transmitted to external analytics SDK without affirmative consent gate.",
            "impact_assessment": "GDPR Article 83 administrative fines up to 4% of annual global turnover, plus potential CCPA statutory damages.",
            "recommended_action": "Wrap analytics.track call in consent gate: if (user.consent && user.consent.analytics).",
            "evidence_strength": "STRONG",
            "evidence_pair": {
                "policy_quote": policy_quote,
                "policy_section": "Section 3.2 — Data Sharing Restrictions",
                "code_snippet": code_line,
                "code_line": 18,
                "file_path": "analytics.js",
                "conflict_vector": "Unchecked PII transfer breaches affirmative opt-in requirement"
            },
            "suggested_fix": {
                "code_patch": "if (user.consent && user.consent.analytics === true) {\n  analytics.track(\"user\", { email: user.email });\n}",
                "diff": "- analytics.track(\"user\", { email: user.email });\n+ if (user.consent && user.consent.analytics === true) {\n+   analytics.track(\"user\", { email: user.email });\n+ }",
                "policy_adjustment": "Update privacy disclosure if legitimate interest is claimed.",
                "explanation": "Guards the network sink behind a verified consent flag."
            },
            "disclaimer": "⚠️ This is AI-assisted compliance analysis. It does not replace professional legal advice."
        })

    def _mock_vendor_response(self, prompt: str) -> str:
        return json.dumps({
            "drift_detected": True,
            "changes": [
                {
                    "type": "retention_period_change",
                    "old_value": "30 days",
                    "new_value": "180 days",
                    "section": "Data Retention",
                    "severity": "HIGH",
                    "impact": "Vendor now retains customer data 6x longer than previously stated. Review whether this conflicts with your data minimization requirements."
                },
                {
                    "type": "subprocessor_expansion",
                    "old_value": "No third-party ad sharing",
                    "new_value": "Aggregated analytics sharing with third parties",
                    "section": "Third-Party Sharing",
                    "severity": "HIGH",
                    "impact": "Vendor policy permits sharing with external analytics brokers, affecting user data flows."
                }
            ],
            "affected_components": [
                "analytics.js (AnalyticsPro Event Tracker)",
                "UserProfileController.ts (User Metadata Sync)",
                "dataPipeline.py (Nightly Batch Export)"
            ],
            "summary": "Significant vendor drift detected: data retention increased from 30 to 180 days and third-party analytics sharing introduced. Impacted components: analytics.js, UserProfileController.ts."
        })


# Singleton instance
llm_service = LLMService()
