"""
Compliance Agent — Compares legal rules against code behavior to detect drift
Incorporates human reviewer feedback memory, exact evidence pairing, and numerical risk scoring
"""
import json
import re
from typing import Dict, Any, List, Optional
from app.services.llm_service import llm_service

SYSTEM_PROMPT = """You are a Compliance Analysis Agent. Your role is to determine whether code behavior
conflicts with legal/privacy policy rules.

You will receive:
1. A set of compliance rules extracted from a policy document
2. A set of behavioral patterns, affected components, and data flows extracted from source code
3. Learned human feedback memory rules (past false positives to suppress)

Your task is to determine if any code behavior violates any policy rule.

STRICT RULES:
- Only report violations based on actual evidence from both the policy AND the code
- If you cannot find clear evidence of a violation, return COMPLIANT or INSUFFICIENT_EVIDENCE
- Do NOT fabricate or assume violations
- Do NOT ignore consent checks — if code has a consent check before a sensitive operation, it may be compliant
- RESPECT LEARNED HUMAN FEEDBACK: If an active human feedback rule explains that this pattern is an acceptable exception or false positive, honor it and mark as COMPLIANT
- Rate confidence honestly (0.0 to 1.0)
- Always pair the EXACT policy sentence with the EXACT code line as evidence

Return a JSON object:
{
  "drift_detected": <true|false>,
  "risk": "HIGH|MEDIUM|LOW|COMPLIANT|INSUFFICIENT_EVIDENCE",
  "confidence": <0.0 to 1.0>,
  "risk_score": <0.0 to 100.0>,
  "title": "<short title for this finding>",
  "reason": "<detailed explanation referencing specific policy rules and code patterns>",
  "recommendation": "<specific remediation steps>",
  "policy_reference": "<policy section reference>",
  "code_reference": "<file:line reference>",
  "data_involved": "<data type involved>",
  "destination": "<where data goes>",
  "policy_evidence": "<exact quote from policy>",
  "code_evidence": "<exact code snippet showing the behavior>",
  "evidence_pair": {
    "policy_quote": "<verbatim policy sentence>",
    "policy_section": "<e.g. Section 3.2>",
    "code_snippet": "<verbatim code line>",
    "code_line": <line_number>,
    "file_path": "<file>",
    "conflict_vector": "<why this code line breaches this policy sentence>"
  },
  "suggested_fix": {
    "code_patch": "<code to replace the violating code>",
    "diff": "<unified diff showing - removed and + added>",
    "policy_adjustment": "<optional suggested policy update if applicable>",
    "explanation": "<why this fix resolves the drift>"
  }
}
"""


class ComplianceAgent:
    """
    Agent 3: Cross-references policy rules against code behavior to detect drift.
    Integrates reviewer feedback memory and numerical risk scoring.
    """

    async def compare(
        self,
        policy_rules: List[Dict[str, Any]],
        code_behavior: Dict[str, Any],
        policy_name: str = "Policy",
        file_path: str = "code_file",
        feedback_rules: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Compare policy rules against code behavior with optional feedback memory.
        Returns list of findings.
        """
        feedback_context = ""
        if feedback_rules:
            feedback_context = f"\n\n=== LEARNED HUMAN FEEDBACK (SUPPRESS SIMILAR FALSE POSITIVES) ===\n{json.dumps(feedback_rules, indent=2)}\n"

        user_prompt = f"""Compare these policy rules against this code behavior.

=== POLICY RULES ===
{json.dumps(policy_rules, indent=2)}

=== CODE BEHAVIOR (from: {file_path}) ===
{json.dumps(code_behavior, indent=2)}
{feedback_context}
Policy name: {policy_name}
Code file: {file_path}

Analyze each policy rule against the code behavior.
If drift is detected, return ONE finding for the most significant violation.
Provide exact policy sentence and code line pairing, and a concrete suggested fix diff.
Return a single JSON object (not an array) with the analysis result."""

        raw_response = await llm_service.complete(SYSTEM_PROMPT, user_prompt)
        finding = self._parse_response(raw_response, file_path)

        findings = []
        if finding:
            findings.append(finding)

        return findings

    def _parse_response(self, raw: str, file_path: str = "") -> Dict[str, Any]:
        """Parse LLM compliance analysis response."""
        try:
            data = json.loads(raw)
            return self._normalize(data, file_path)
        except json.JSONDecodeError:
            pass

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(1))
                return self._normalize(data, file_path)
            except json.JSONDecodeError:
                pass

        obj_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if obj_match:
            try:
                data = json.loads(obj_match.group())
                return self._normalize(data, file_path)
            except json.JSONDecodeError:
                pass

        return {
            "drift_detected": False,
            "risk": "INSUFFICIENT_EVIDENCE",
            "confidence": 0.0,
            "risk_score": 0.0,
            "title": "Analysis Error",
            "reason": "Could not parse compliance agent response.",
            "recommendation": "Retry analysis or check logs.",
            "policy_reference": "N/A",
            "code_reference": file_path or "N/A",
            "data_involved": "unknown",
            "destination": "unknown",
            "policy_evidence": "",
            "code_evidence": "",
            "evidence_pair": None,
            "suggested_fix": None,
        }

    def _normalize(self, data: Dict[str, Any], file_path: str = "") -> Dict[str, Any]:
        """Normalize and compute risk score if not provided."""
        risk = data.get("risk", "INSUFFICIENT_EVIDENCE")
        valid_risks = {"HIGH", "MEDIUM", "LOW", "COMPLIANT", "INSUFFICIENT_EVIDENCE"}
        if risk not in valid_risks:
            risk = "MEDIUM"

        confidence = float(data.get("confidence", 0.5))

        # Compute numerical Compliance Risk Score (0-100)
        risk_score = data.get("risk_score")
        if risk_score is None:
            if risk == "HIGH":
                risk_score = round(75.0 + confidence * 25.0, 1)
            elif risk == "MEDIUM":
                risk_score = round(40.0 + confidence * 30.0, 1)
            elif risk == "LOW":
                risk_score = round(15.0 + confidence * 20.0, 1)
            else:
                risk_score = 0.0

        policy_evidence = str(data.get("policy_evidence", ""))
        code_evidence = str(data.get("code_evidence", ""))
        code_ref = str(data.get("code_reference", file_path or "code:1"))

        # Extract line number from code_reference if present
        line_num = 1
        line_match = re.search(r':(\d+)', code_ref)
        if line_match:
            try:
                line_num = int(line_match.group(1))
            except ValueError:
                pass

        evidence_pair = data.get("evidence_pair") or {
            "policy_quote": policy_evidence,
            "policy_section": str(data.get("policy_reference", "General Policy")),
            "code_snippet": code_evidence,
            "code_line": line_num,
            "file_path": file_path,
            "conflict_vector": data.get("reason", "Direct mismatch between policy mandate and code sink")
        }

        suggested_fix = data.get("suggested_fix")
        if not suggested_fix and data.get("recommendation"):
            suggested_fix = {
                "code_patch": f"// Wrap with consent check:\nif (user.consent && user.consent.analytics) {{\n  {code_evidence}\n}}",
                "diff": f"- {code_evidence}\n+ if (user.consent && user.consent.analytics) {{\n+   {code_evidence}\n+ }}",
                "policy_adjustment": "Consider explicitly adding this data transfer to third-party subprocessor terms if legitimate business interest applies.",
                "explanation": str(data.get("recommendation", "Add consent verification before transmitting sensitive data."))
            }

        return {
            "drift_detected": bool(data.get("drift_detected", False)),
            "risk": risk,
            "confidence": confidence,
            "risk_score": float(risk_score),
            "title": str(data.get("title", "Compliance Analysis Result")),
            "reason": str(data.get("reason", "")),
            "recommendation": str(data.get("recommendation", "")),
            "policy_reference": str(data.get("policy_reference", "")),
            "code_reference": code_ref,
            "data_involved": str(data.get("data_involved", "")),
            "destination": str(data.get("destination", "")),
            "policy_evidence": policy_evidence,
            "code_evidence": code_evidence,
            "evidence_pair": evidence_pair,
            "suggested_fix": suggested_fix,
        }


compliance_agent = ComplianceAgent()
