"""
LLM Service Layer — swappable AI provider
Supports: OpenAI, Anthropic, Google, Mock (for testing)
"""
from typing import Optional
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

        # 1. Vendor monitoring agent
        if "vendor policy change analyst" in prompt_lower or ("vendor" in prompt_lower and ("old version" in prompt_lower or "new version" in prompt_lower)):
            return self._mock_vendor_response(user_prompt)

        # 2. Compliance comparison agent
        if "compliance analysis agent" in prompt_lower or "compare these policy rules" in prompt_lower:
            return self._mock_compliance_response(user_prompt)

        # 3. Code analysis agent
        if "code analysis agent" in prompt_lower or ("analyze this" in prompt_lower and "source code" in prompt_lower):
            return self._mock_code_response(user_prompt)

        # 4. Legal / policy agent
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

    def _mock_code_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()
        findings = []
        sensitive_data = []
        destinations = []
        third_party_sdks = []
        actions = []

        if "analytics.track" in prompt_lower or "analytics" in prompt_lower:
            third_party_sdks.append("analytics")
            destinations.append("analytics_service")
            actions.append("send_data")
            findings.append({
                "line": 1,
                "pattern": "analytics.track",
                "data": ["user.email"] if "email" in prompt_lower else ["page_data"],
                "action": "send",
                "destination": "analytics",
                "third_party": True,
                "risk_indicator": "HIGH" if "email" in prompt_lower else "LOW"
            })

        if "user.email" in prompt_lower or "email" in prompt_lower:
            sensitive_data.append("user.email")

        if "console.log" in prompt_lower or "logger" in prompt_lower:
            actions.append("log")
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
        
        # Remove single-line and multi-line comments so comments like "no consent check" aren't counted
        code_clean = re.sub(r'/\*.*?\*/', '', code_part, flags=re.DOTALL)
        code_clean = re.sub(r'//.*', '', code_clean)
        code_clean = re.sub(r'#.*', '', code_clean)
        code_clean_lower = code_clean.lower()

        if ("consent" in code_clean_lower or "hasconsented" in code_clean_lower) and ("if" in code_clean_lower or "check" in code_clean_lower or "?" in code_clean_lower):
            for f in findings:
                f["consent_check_detected"] = True

        return json.dumps({
            "sensitive_data": sensitive_data,
            "actions": actions,
            "destinations": destinations,
            "third_party_sdks": third_party_sdks,
            "api_calls": [],
            "network_requests": [d for d in destinations if "api" in d or "endpoint" in d],
            "logging_events": ["console.log"] if "console.log" in prompt_lower else [],
            "storage_operations": [],
            "findings": findings,
            "summary": f"Detected {len(findings)} behavioral pattern(s) in source code."
        })

    def _mock_compliance_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()

        # Isolate code behavior section from policy rules section
        code_behavior_part = prompt_lower
        policy_rules_part = prompt_lower
        if "=== code behavior" in prompt_lower:
            parts = prompt_lower.split("=== code behavior")
            policy_rules_part = parts[0]
            code_behavior_part = parts[1]

        # Check for violation scenario
        has_email_sending = ("analytics" in code_behavior_part or "track" in code_behavior_part) and "email" in code_behavior_part
        has_email_sharing_rule = "email" in policy_rules_part and ("shar" in policy_rules_part or "consent" in policy_rules_part or "third" in policy_rules_part or "part" in policy_rules_part)
        
        # Check for consent check inside the actual code behavior
        has_consent_check = (
            '"consent_check_detected": true' in code_behavior_part
            or "hasconsented" in code_behavior_part
            or "if (user.consent" in code_behavior_part
            or "if (user.hasconsent" in code_behavior_part
            or "if (consent" in code_behavior_part
        )

        if has_email_sending and has_email_sharing_rule and not has_consent_check:
            return json.dumps({
                "drift_detected": True,
                "risk": "HIGH",
                "confidence": 0.94,
                "title": "Unauthorized Third-Party Data Transfer",
                "reason": "Customer email (user.email) is sent to a third-party analytics service via analytics.track() without any detected consent check. The Privacy Policy (Section 3.2) explicitly prohibits sharing personal email addresses with third parties without user consent.",
                "recommendation": "Add an explicit consent check (e.g., if (user.hasConsented('analytics'))) before calling analytics.track() with personal data. Consider using anonymized or pseudonymized identifiers instead of raw email addresses.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js:42",
                "data_involved": "user.email",
                "destination": "Third-party analytics service",
                "policy_evidence": "\"Customer email addresses must not be shared with third parties without explicit user consent.\"",
                "code_evidence": "analytics.track(\"user\", { email: user.email });\n// No consent check detected before this call."
            })
        elif has_consent_check and has_email_sending:
            return json.dumps({
                "drift_detected": False,
                "risk": "COMPLIANT",
                "confidence": 0.88,
                "title": "Email sharing with consent check detected",
                "reason": "The code shares user.email via analytics.track(), but a consent check (user.consent) is present before the operation. This appears to satisfy the policy requirement for user consent before sharing personal data with third parties.",
                "recommendation": "Verify that the consent flag is properly set according to your consent management system.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js",
                "data_involved": "user.email",
                "destination": "Third-party analytics service",
                "policy_evidence": "\"Email may be shared with third parties when the user has provided consent.\"",
                "code_evidence": "if (user.consent) { analytics.track(\"user\", { email: user.email }); }"
            })
        elif "page_view" in prompt_lower or "page" in prompt_lower:
            return json.dumps({
                "drift_detected": False,
                "risk": "COMPLIANT",
                "confidence": 0.97,
                "title": "No Personal Data Sharing Detected",
                "reason": "The analytics tracking call transmits only non-personal page view data (page path). No personal identifiable information (PII) such as email addresses or user identifiers is shared with third parties.",
                "recommendation": "No action required. Continue to monitor for changes.",
                "policy_reference": "Privacy Policy Section 3.2",
                "code_reference": "analytics.js",
                "data_involved": "page_path (non-PII)",
                "destination": "Analytics service",
                "policy_evidence": "\"Customer email addresses must not be shared with third parties.\"",
                "code_evidence": "analytics.track(\"page_view\", { page: \"/home\" })"
            })
        else:
            return json.dumps({
                "drift_detected": False,
                "risk": "LOW",
                "confidence": 0.72,
                "title": "No significant compliance drift detected",
                "reason": "The analyzed code behavior does not appear to conflict with the extracted policy rules. However, confidence is moderate — a full manual review is recommended.",
                "recommendation": "Conduct a manual review of the code to ensure full compliance.",
                "policy_reference": "N/A",
                "code_reference": "N/A",
                "data_involved": "N/A",
                "destination": "N/A",
                "policy_evidence": "Policy rules analyzed.",
                "code_evidence": "Code behavior analyzed."
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
                }
            ],
            "summary": "Significant retention policy change detected: data retention increased from 30 to 180 days."
        })


# Singleton instance
llm_service = LLMService()
