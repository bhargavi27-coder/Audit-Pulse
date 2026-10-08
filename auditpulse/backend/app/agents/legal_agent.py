"""
Legal Agent — Extracts structured compliance rules from policy text
"""
import json
import re
from typing import List, Dict, Any
from app.services.llm_service import llm_service

SYSTEM_PROMPT = """You are a Legal Compliance Agent specializing in privacy law, data protection, and software compliance.

Your task is to analyze policy documents and extract structured compliance rules.

For each rule you find, return a JSON object with these fields:
- section: policy section reference (e.g., "3.2")
- data_type: type of data referenced (e.g., "personal_email", "personal_information", "financial_data")
- action: what action the rule governs (e.g., "share", "collect", "retain", "process", "delete")
- destination: where data goes or is stored (e.g., "third_party", "internal", "cloud_provider")
- condition: any conditions that modify the rule (e.g., "user_consent_required", "none", "lawful_basis_required")
- severity: "HIGH" | "MEDIUM" | "LOW" based on data sensitivity and potential harm
- raw_text: the exact quote from the policy that supports this rule

Return a JSON object: {"rules": [...], "summary": "..."}

Be precise. Do not invent rules not present in the policy. If insufficient information exists, say so.
Identify obligations (must), prohibitions (must not), and permissions (may).
"""


class LegalAgent:
    """
    Agent 1: Analyzes policy text and returns structured compliance rules.
    """

    async def analyze(self, policy_text: str) -> Dict[str, Any]:
        """
        Parse policy text and return structured rules.
        Returns: {"rules": [...], "summary": "..."}
        """
        user_prompt = f"""Extract compliance rules from this policy document.

=== POLICY TEXT ===
{policy_text[:8000]}
===================

Return structured JSON with all compliance rules found."""

        raw_response = await llm_service.complete(SYSTEM_PROMPT, user_prompt)
        return self._parse_response(raw_response)

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Extract JSON from LLM response."""
        # Try direct JSON parse
        try:
            data = json.loads(raw)
            return self._validate_response(data)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON block from markdown
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_response(data)
            except json.JSONDecodeError:
                pass

        # Try to find any JSON object in the response
        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                return self._validate_response(data)
            except json.JSONDecodeError:
                pass

        # Fallback: return error state
        return {
            "rules": [],
            "summary": f"Failed to parse legal agent response. Raw: {raw[:200]}"
        }

    def _validate_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize the response structure."""
        rules = data.get("rules", [])
        validated_rules = []

        for rule in rules:
            validated_rules.append({
                "section": rule.get("section", "N/A"),
                "data_type": rule.get("data_type", "unknown"),
                "action": rule.get("action", "unknown"),
                "destination": rule.get("destination", "unknown"),
                "condition": rule.get("condition", "none"),
                "severity": rule.get("severity", "MEDIUM"),
                "raw_text": rule.get("raw_text", ""),
            })

        return {
            "rules": validated_rules,
            "summary": data.get("summary", f"{len(validated_rules)} rule(s) extracted.")
        }


legal_agent = LegalAgent()
