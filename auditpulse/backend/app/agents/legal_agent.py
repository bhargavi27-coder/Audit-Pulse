"""
Legal Agent — Extracts structured compliance rules and compares policy versions
"""
import json
import re
from typing import List, Dict, Any, Optional
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

VERSION_DIFF_SYSTEM_PROMPT = """You are a Senior Legal & Regulatory Policy Analyst.
Your task is to compare two versions of a company privacy/legal policy (Version A vs Version B).

Carefully identify:
1. ADDED RULES: New obligations, prohibitions, or permissions in Version B not in Version A.
2. REMOVED RULES: Protections, restrictions, or commitments present in Version A that were deleted in Version B.
3. MODIFIED RULES: Scope expansions, retention extensions, loosened consent terms, or altered definitions between Version A and Version B.
4. RISK IMPACT: Rate the overall compliance risk shift as "INCREASED_RISK" (e.g., customer protections removed or retention prolonged), "REDUCED_RISK", or "NEUTRAL".
5. SUMMARY: Executive summary explaining the legal and compliance implications of these policy changes.

Return a JSON object with:
{
  "risk_impact": "INCREASED_RISK" | "REDUCED_RISK" | "NEUTRAL",
  "summary": "...",
  "added_rules": [
    {
      "section": "...",
      "data_type": "...",
      "action": "...",
      "destination": "...",
      "condition": "...",
      "severity": "HIGH|MEDIUM|LOW",
      "raw_text": "..."
    }
  ],
  "removed_rules": [
    {
      "section": "...",
      "data_type": "...",
      "action": "...",
      "destination": "...",
      "condition": "...",
      "severity": "HIGH|MEDIUM|LOW",
      "raw_text": "..."
    }
  ],
  "modified_rules": [
    {
      "section": "...",
      "data_type": "...",
      "change_description": "...",
      "old_text": "...",
      "new_text": "...",
      "severity": "HIGH|MEDIUM|LOW"
    }
  ],
  "detailed_diff": "..."
}
"""


class LegalAgent:
    """
    Agent 1: Analyzes policy text and extracts rules, and compares policy versions.
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

    async def compare_versions(
        self,
        policy_a_name: str,
        policy_a_version: str,
        policy_a_text: str,
        policy_b_name: str,
        policy_b_version: str,
        policy_b_text: str,
        rules_a: Optional[List[Dict[str, Any]]] = None,
        rules_b: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Compare two versions of a policy and return added, removed, and modified rules with risk impact.
        """
        user_prompt = f"""Compare Version A against Version B:

=== VERSION A ({policy_a_name} - {policy_a_version}) ===
{policy_a_text[:4000]}

=== VERSION B ({policy_b_name} - {policy_b_version}) ===
{policy_b_text[:4000]}

Identify all added, removed, and modified rules, and assess overall compliance risk impact."""

        raw_response = await llm_service.complete(VERSION_DIFF_SYSTEM_PROMPT, user_prompt)
        return self._parse_version_diff(raw_response, policy_a_version, policy_b_version)

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Extract JSON from LLM response."""
        try:
            data = json.loads(raw)
            return self._validate_response(data)
        except json.JSONDecodeError:
            pass

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._validate_response(data)
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                return self._validate_response(data)
            except json.JSONDecodeError:
                pass

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

    def _parse_version_diff(self, raw: str, ver_a: str, ver_b: str) -> Dict[str, Any]:
        """Parse version comparison JSON response."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                except Exception:
                    data = {}
            else:
                data = {}

        return {
            "risk_impact": data.get("risk_impact", "NEUTRAL"),
            "summary": data.get("summary", f"Policy comparison between {ver_a} and {ver_b} completed."),
            "added_rules": data.get("added_rules", []),
            "removed_rules": data.get("removed_rules", []),
            "modified_rules": data.get("modified_rules", []),
            "detailed_diff": data.get("detailed_diff", ""),
        }


legal_agent = LegalAgent()
