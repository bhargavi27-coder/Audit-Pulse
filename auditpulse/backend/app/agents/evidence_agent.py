"""
Evidence Agent — Provides precise supporting evidence and structured explanations
"""
import json
import re
from typing import Dict, Any, List
from app.services.llm_service import llm_service

SYSTEM_PROMPT = """You are an Evidence Documentation Agent. Your role is to provide clear, precise
supporting evidence for compliance findings — strictly distinguishing:

1. OBSERVED EVIDENCE: Direct quotes from policy and code
2. AI INTERPRETATION: What the evidence means in context
3. RECOMMENDED ACTION: Specific, actionable remediation

You must NEVER fabricate evidence. Only reference what is provided to you.
If evidence is ambiguous, say so explicitly.

Return a JSON object:
{
  "policy_evidence_quote": "<exact text from policy>",
  "code_evidence_snippet": "<exact code snippet>",
  "interpretation": "<clear explanation of why this is a violation or not>",
  "impact_assessment": "<what could go wrong if not addressed>",
  "recommended_action": "<specific steps to remediate>",
  "evidence_strength": "STRONG|MODERATE|WEAK",
  "disclaimer": "This is AI-assisted analysis. Consult legal counsel for definitive compliance advice."
}
"""


class EvidenceAgent:
    """
    Agent 4: Provides precise evidence and structured explanations for compliance findings.
    Strictly separates observed evidence from AI interpretation.
    """

    async def document(
        self,
        finding: Dict[str, Any],
        policy_rules: List[Dict[str, Any]],
        code_behavior: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate a detailed evidence report for a compliance finding.
        """
        user_prompt = f"""Document the evidence for this compliance finding.

=== FINDING ===
{json.dumps(finding, indent=2)}

=== POLICY RULES (source of policy evidence) ===
{json.dumps(policy_rules, indent=2)}

=== CODE BEHAVIOR (source of code evidence) ===
{json.dumps(code_behavior, indent=2)}

Provide precise evidence documentation. Distinguish observed facts from interpretation.
Do not add evidence not present in the inputs above."""

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

        # Fallback: use existing evidence from finding
        return {
            "policy_evidence_quote": finding.get("policy_evidence", ""),
            "code_evidence_snippet": finding.get("code_evidence", ""),
            "interpretation": finding.get("reason", ""),
            "impact_assessment": "Unable to assess impact — manual review recommended.",
            "recommended_action": finding.get("recommendation", ""),
            "evidence_strength": "WEAK",
            "disclaimer": "This is AI-assisted analysis. Consult legal counsel for definitive compliance advice."
        }

    def _normalize(self, data: Dict[str, Any], finding: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "policy_evidence_quote": data.get("policy_evidence_quote", finding.get("policy_evidence", "")),
            "code_evidence_snippet": data.get("code_evidence_snippet", finding.get("code_evidence", "")),
            "interpretation": data.get("interpretation", finding.get("reason", "")),
            "impact_assessment": data.get("impact_assessment", ""),
            "recommended_action": data.get("recommended_action", finding.get("recommendation", "")),
            "evidence_strength": data.get("evidence_strength", "MODERATE"),
            "disclaimer": "⚠️ This is AI-assisted compliance analysis. It does not replace professional legal advice."
        }


evidence_agent = EvidenceAgent()
