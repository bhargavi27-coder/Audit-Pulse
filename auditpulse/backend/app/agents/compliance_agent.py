"""
Compliance Agent — Compares legal rules against code behavior to detect drift
"""
import json
import re
from typing import Dict, Any, List
from app.services.llm_service import llm_service

SYSTEM_PROMPT = """You are a Compliance Analysis Agent. Your role is to determine whether code behavior
conflicts with legal/privacy policy rules.

You will receive:
1. A set of compliance rules extracted from a policy document
2. A set of behavioral patterns extracted from source code

Your task is to determine if any code behavior violates any policy rule.

STRICT RULES:
- Only report violations based on actual evidence from both the policy AND the code
- If you cannot find clear evidence of a violation, return COMPLIANT or INSUFFICIENT_EVIDENCE
- Do NOT fabricate or assume violations
- Do NOT ignore consent checks — if code has a consent check before a sensitive operation, it may be compliant
- Rate confidence honestly (0.0 to 1.0)

Return a JSON object:
{
  "drift_detected": <true|false>,
  "risk": "HIGH|MEDIUM|LOW|COMPLIANT|INSUFFICIENT_EVIDENCE",
  "confidence": <0.0 to 1.0>,
  "title": "<short title for this finding>",
  "reason": "<detailed explanation referencing specific policy rules and code patterns>",
  "recommendation": "<specific remediation steps>",
  "policy_reference": "<policy section reference>",
  "code_reference": "<file:line reference>",
  "data_involved": "<data type involved>",
  "destination": "<where data goes>",
  "policy_evidence": "<exact quote from policy>",
  "code_evidence": "<exact code snippet showing the behavior>"
}
"""


class ComplianceAgent:
    """
    Agent 3: Cross-references policy rules against code behavior to detect drift.
    """

    async def compare(
        self,
        policy_rules: List[Dict[str, Any]],
        code_behavior: Dict[str, Any],
        policy_name: str = "Policy",
        file_path: str = "code_file"
    ) -> List[Dict[str, Any]]:
        """
        Compare policy rules against code behavior.
        Returns list of findings (one per potential violation).
        """
        user_prompt = f"""Compare these policy rules against this code behavior.

=== POLICY RULES ===
{json.dumps(policy_rules, indent=2)}

=== CODE BEHAVIOR (from: {file_path}) ===
{json.dumps(code_behavior, indent=2)}

Policy name: {policy_name}
Code file: {file_path}

Analyze each policy rule against the code behavior.
If drift is detected, return ONE finding for the most significant violation.
Focus on: data sharing without consent, unauthorized third-party transfers, policy violations.
Return a single JSON object (not an array) with the analysis result."""

        raw_response = await llm_service.complete(SYSTEM_PROMPT, user_prompt)
        finding = self._parse_response(raw_response)

        # Build list of findings
        findings = []
        if finding:
            findings.append(finding)

        return findings

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Parse LLM compliance analysis response."""
        try:
            data = json.loads(raw)
            return self._normalize(data)
        except json.JSONDecodeError:
            pass

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize(data)
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                return self._normalize(data)
            except json.JSONDecodeError:
                pass

        return {
            "drift_detected": False,
            "risk": "INSUFFICIENT_EVIDENCE",
            "confidence": 0.0,
            "title": "Analysis Error",
            "reason": "Could not parse compliance agent response.",
            "recommendation": "Retry analysis or check logs.",
            "policy_reference": "N/A",
            "code_reference": "N/A",
            "data_involved": "unknown",
            "destination": "unknown",
            "policy_evidence": "",
            "code_evidence": "",
        }

    def _normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate the finding structure."""
        risk = data.get("risk", "INSUFFICIENT_EVIDENCE")
        valid_risks = {"HIGH", "MEDIUM", "LOW", "COMPLIANT", "INSUFFICIENT_EVIDENCE"}
        if risk not in valid_risks:
            risk = "MEDIUM"

        return {
            "drift_detected": bool(data.get("drift_detected", False)),
            "risk": risk,
            "confidence": float(data.get("confidence", 0.5)),
            "title": str(data.get("title", "Compliance Analysis Result")),
            "reason": str(data.get("reason", "")),
            "recommendation": str(data.get("recommendation", "")),
            "policy_reference": str(data.get("policy_reference", "")),
            "code_reference": str(data.get("code_reference", "")),
            "data_involved": str(data.get("data_involved", "")),
            "destination": str(data.get("destination", "")),
            "policy_evidence": str(data.get("policy_evidence", "")),
            "code_evidence": str(data.get("code_evidence", "")),
        }


compliance_agent = ComplianceAgent()
