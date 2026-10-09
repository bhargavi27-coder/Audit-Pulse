"""
Code Agent — Extracts structured behavior from source code
Uses AST analysis + LLM interpretation to identify affected components and data flows
"""
import json
import re
from typing import Dict, Any, List, Optional
from app.services.llm_service import llm_service
from app.analyzers.ast_analyzer import ast_analyzer

SYSTEM_PROMPT = """You are a Code Analysis Agent specializing in security, data flow mapping, and privacy compliance.

Your task is to analyze source code and extract structured behavioral information, identifying affected components and end-to-end data flows.

For each behavioral pattern found, identify:
- What sensitive data is accessed (user.email, user.name, user_id, phone, etc.)
- What external services or third-party SDKs are called
- What network requests are made
- What data is logged or stored
- Whether any consent or privacy checks exist before sensitive operations
- Which application components/modules/functions are affected
- The end-to-end data flow (Source -> Transform -> Sink)

Return a JSON object with:
{
  "sensitive_data": ["list of sensitive data accessed"],
  "actions": ["list of actions performed"],
  "destinations": ["list of external destinations"],
  "third_party_sdks": ["list of third-party SDKs used"],
  "api_calls": ["list of API endpoints called"],
  "network_requests": ["list of network operations"],
  "logging_events": ["list of logging operations"],
  "storage_operations": ["list of storage operations"],
  "affected_components": ["list of affected components/functions e.g. trackUser, analyticsModule"],
  "data_flows": [
    {
      "id": "DF-01",
      "source": "user.email",
      "transform": "direct mapping",
      "sink": "analytics.track",
      "data_sensitivity": "PII / High",
      "consent_guarded": false,
      "component": "trackUser",
      "line": 18
    }
  ],
  "findings": [
    {
      "line": <line_number>,
      "pattern": "<pattern found>",
      "data": ["data involved"],
      "action": "<action>",
      "destination": "<destination>",
      "third_party": <true|false>,
      "consent_check_detected": <true|false>,
      "risk_indicator": "HIGH|MEDIUM|LOW"
    }
  ],
  "summary": "..."
}

Be precise. Only report what you actually observe in the code. Do not invent behaviors.
"""


class CodeAgent:
    """
    Agent 2: Analyzes source code and returns structured behavior description.
    Uses AST when available, falls back to LLM text analysis.
    Identifies affected components and data flows.
    """

    async def analyze(self, code: str, language: str, file_path: str = "") -> Dict[str, Any]:
        """
        Analyze source code for compliance-relevant behaviors, affected components, and data flows.
        """
        # Step 1: AST analysis (when available)
        ast_data = {}
        ast_used = False
        try:
            if language in ("javascript", "typescript"):
                ast_data = ast_analyzer.analyze(code, language)
                ast_used = True
        except Exception as e:
            ast_data = {"ast_error": str(e)}

        # Step 2: LLM analysis with AST context
        ast_context = ""
        if ast_data and not ast_data.get("ast_error"):
            ast_context = f"\n\n=== AST ANALYSIS RESULTS ===\n{json.dumps(ast_data, indent=2)}\n"

        user_prompt = f"""Analyze this {language} source code for compliance-relevant behaviors.
File: {file_path}
{ast_context}
=== SOURCE CODE ===
{code[:6000]}
==================

Extract all sensitive data usage, external service calls, consent checks, affected components, and data flows."""

        raw_response = await llm_service.complete(SYSTEM_PROMPT, user_prompt)
        result = self._parse_response(raw_response)
        result["ast_used"] = ast_used
        result["ast_data"] = ast_data

        # Merge AST affected components and data flows if LLM missed them
        if not result.get("affected_components") and ast_data.get("affected_components"):
            result["affected_components"] = ast_data["affected_components"]
        if not result.get("data_flows") and ast_data.get("data_flows"):
            result["data_flows"] = ast_data["data_flows"]

        if not result.get("affected_components"):
            result["affected_components"] = [f"File: {file_path}"]

        return result

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        """Extract JSON from LLM response."""
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group())
            except json.JSONDecodeError:
                pass

        return {
            "sensitive_data": [],
            "actions": [],
            "destinations": [],
            "third_party_sdks": [],
            "api_calls": [],
            "network_requests": [],
            "logging_events": [],
            "storage_operations": [],
            "affected_components": [],
            "data_flows": [],
            "findings": [],
            "summary": f"Parse error. Raw: {raw[:200]}"
        }


code_agent = CodeAgent()
