"""
Evidence Agent — Provides precise supporting evidence and structured explanations
Pairs exact policy sentence <-> exact code line, and provides suggested code fix patches
"""
import json
import re
from typing import Dict, Any, List
from app.services.llm_service import llm_service

SYSTEM_PROMPT = """You are an Evidence Documentation Agent specializing in software compliance verification.
Your role is to provide clear, precise supporting evidence for compliance findings — strictly distinguishing:

1. OBSERVED EVIDENCE:
   - Verbatim sentence from policy
   - Verbatim code line with line number and file path
   - Explicit pairing between policy mandate and code violation
2. SUGGESTED FIX:
   - Concrete code patch diff showing how to fix the code
   - Policy adjustment suggestion if the policy needs to be amended
3. IMPACT ASSESSMENT & REMEDIATION

You must NEVER fabricate evidence. Only reference what is provided to you.

Return a JSON object:
{
  "policy_evidence_quote": "<exact verbatim text from policy>",
  "code_evidence_snippet": "<exact verbatim code snippet>",
  "interpretation": "<clear explanation of why this is a violation or not>",
  "impact_assessment": "<what could go wrong if not addressed (e.g. GDPR fine, regulatory audit failure)>",
  "recommended_action": "<specific steps to remediate>",
  "evidence_strength": "STRONG|MODERATE|WEAK",
  "evidence_pair": {
    "policy_quote": "<exact policy sentence>",
    "policy_section": "<policy section>",
    "code_snippet": "<exact code line>",
    "code_line": <line_number>,
    "file_path": "<file>",
    "conflict_vector": "<why this code line breaches this policy sentence>"
  },
  "suggested_fix": {
    "code_patch": "<replacement code snippet>",
    "diff": "<unified diff showing - removed and + added>",
    "policy_adjustment": "<optional policy amendment suggestion>",
    "explanation": "<why this fix resolves the problem>"
  },
  "disclaimer": "⚠️ This is AI-assisted compliance analysis. It does not replace professional legal advice."
}
"""


class EvidenceAgent:
    """
    Agent 4: Provides precise evidence pairing and concrete suggested fix diffs.
    """

    async def document(
        self,
        finding: Dict[str, Any],
        policy_rules: List[Dict[str, Any]],
        code_behavior: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate detailed evidence documentation and concrete fix suggestions.
        """
        user_prompt = f"""Document the evidence and fix suggestion for this compliance finding.

=== FINDING ===
{json.dumps(finding, indent=2)}

=== POLICY RULES (source of policy evidence) ===
{json.dumps(policy_rules, indent=2)}

=== CODE BEHAVIOR (source of code evidence) ===
{json.dumps(code_behavior, indent=2)}

Provide precise verbatim evidence pairing and a concrete suggested fix diff."""

        raw_response = await llm_service.complete(SYSTEM_PROMPT, user_prompt)
        return self._parse_response(raw_response, finding)

    def _parse_response(self, raw: str, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Parse evidence agent response."""
        try:
            data = json.loads(raw)
            return self._normalize(data, finding)
        except json.JSONDecodeError:
            pass

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize(data, finding)
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                return self._normalize(data, finding)
            except json.JSONDecodeError:
                pass

        # Fallback: construct safe evidence and fix from finding
        return self._normalize({}, finding)

    def _normalize(self, data: Dict[str, Any], finding: Dict[str, Any]) -> Dict[str, Any]:
        policy_quote = data.get("policy_evidence_quote") or finding.get("policy_evidence", "")
        code_snippet = data.get("code_evidence_snippet") or finding.get("code_evidence", "")

        evidence_pair = data.get("evidence_pair") or finding.get("evidence_pair")
        if not evidence_pair:
            evidence_pair = {
                "policy_quote": policy_quote,
                "policy_section": finding.get("policy_reference", "General Policy"),
                "code_snippet": code_snippet,
                "code_line": 1,
                "file_path": finding.get("code_reference", "source.js"),
                "conflict_vector": finding.get("reason", "Code behavior violates stated policy restriction")
            }

        suggested_fix = data.get("suggested_fix") or finding.get("suggested_fix")
        if not suggested_fix:
            clean_snippet = code_snippet.strip() or "analytics.track(user.email);"
            suggested_fix = {
                "code_patch": f"if (user.consent && user.consent.analytics) {{\n  {clean_snippet}\n}}",
                "diff": f"- {clean_snippet}\n+ if (user.consent && user.consent.analytics) {{\n+   {clean_snippet}\n+ }}",
                "policy_adjustment": "Ensure customer consent opt-in record is updated before data transfer.",
                "explanation": "Guards the sensitive data transfer with an explicit consent check, preventing unauthorized transmission."
            }

        return {
            "policy_evidence_quote": policy_quote,
            "code_evidence_snippet": code_snippet,
            "interpretation": data.get("interpretation", finding.get("reason", "")),
            "impact_assessment": data.get("impact_assessment", "Potential regulatory non-compliance under GDPR Art. 6/7 and CCPA."),
            "recommended_action": data.get("recommended_action", finding.get("recommendation", "")),
            "evidence_strength": data.get("evidence_strength", "STRONG" if policy_quote and code_snippet else "MODERATE"),
            "evidence_pair": evidence_pair,
            "suggested_fix": suggested_fix,
            "disclaimer": "⚠️ This is AI-assisted compliance analysis. It does not replace professional legal advice."
        }


evidence_agent = EvidenceAgent()
