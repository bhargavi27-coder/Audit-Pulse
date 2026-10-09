"""
AST Analyzer using Tree-sitter
Supports JavaScript and TypeScript
Designed to be extensible to other languages
Extracts behavioral sinks, affected components, and data flow pipelines
"""
import re
from typing import Dict, Any, List, Optional


# Tree-sitter setup with graceful fallback
TREE_SITTER_AVAILABLE = False
try:
    import tree_sitter_javascript as tsjs
    import tree_sitter_typescript as tsts
    from tree_sitter import Language, Parser
    JS_LANGUAGE = Language(tsjs.language())
    TS_LANGUAGE = Language(tsts.language_typescript())
    TREE_SITTER_AVAILABLE = True
except Exception:
    pass  # Fall back to regex-based analysis


# ========== Sensitive Data Patterns ==========

SENSITIVE_DATA_PATTERNS = [
    r'\buser\.email\b',
    r'\buser\.phone\b',
    r'\buser\.name\b',
    r'\buser\.address\b',
    r'\bcustomer\.email\b',
    r'\bemail\b',
    r'\bphone\b',
    r'\bssn\b',
    r'\bcredit_card\b',
    r'\bpassword\b',
    r'\bprivate_key\b',
    r'\bapiKey\b',
    r'\bapi_key\b',
    r'\btoken\b',
    r'\bpersonalData\b',
    r'\bpii\b',
]

THIRD_PARTY_PATTERNS = [
    r'\banalytics\b',
    r'\bsegment\b',
    r'\bmixpanel\b',
    r'\bamplitude\b',
    r'\bgtagmanager\b',
    r'\bgtag\b',
    r'\bfacebook\b',
    r'\bgoogleanalytics\b',
    r'\bsentry\b',
    r'\brollbar\b',
    r'\bhotjar\b',
    r'\bintercom\b',
    r'\bzendesk\b',
    r'\bsalesforce\b',
    r'\bhubspot\b',
    r'\bstripe\b',
    r'\btwilio\b',
    r'\bsendgrid\b',
    r'\bmailchimp\b',
]

NETWORK_PATTERNS = [
    r'\bfetch\s*\(',
    r'\baxios\s*\.',
    r'\bxmlhttprequest\b',
    r'\bhttp\.get\b',
    r'\bhttp\.post\b',
    r'\$.ajax\(',
    r'\$.get\(',
    r'\$.post\(',
    r'\bwebsocket\b',
    r'\bsocket\.io\b',
]

CONSENT_PATTERNS = [
    r'\bconsent\b',
    r'\bhasConsented\b',
    r'\buser\.consent\b',
    r'\bprivacy\b',
    r'\boptIn\b',
    r'\bopt_in\b',
    r'\bagreed\b',
    r'\bpermission\b',
    r'\bauthorized\b',
]


class ASTAnalyzer:
    """
    Analyzes source code using Tree-sitter AST when available.
    Falls back to regex-based analysis for environments without Tree-sitter.
    Extracts affected components and data flow pipelines.
    """

    def analyze(self, code: str, language: str = "javascript") -> Dict[str, Any]:
        """
        Main analysis entry point.
        Returns structured behavioral data extracted from the code.
        """
        result = {
            "ast_available": TREE_SITTER_AVAILABLE,
            "language": language,
            "sensitive_data_found": [],
            "third_party_services": [],
            "network_calls": [],
            "consent_checks": [],
            "function_calls": [],
            "line_findings": [],
            "affected_components": [],
            "data_flows": [],
        }

        if TREE_SITTER_AVAILABLE:
            ast_result = self._analyze_with_ast(code, language)
            result.update(ast_result)
        else:
            regex_result = self._analyze_with_regex(code)
            result.update(regex_result)

        # Build data flows and affected components if not populated
        if not result.get("data_flows") or not result.get("affected_components"):
            flow_info = self._extract_data_flows_and_components(code, result)
            result["affected_components"] = flow_info.get("affected_components", [])
            result["data_flows"] = flow_info.get("data_flows", [])

        return result

    def _analyze_with_ast(self, code: str, language: str) -> Dict[str, Any]:
        """Tree-sitter AST-based analysis."""
        try:
            parser = Parser()
            if language in ("typescript", "tsx"):
                parser.language = TS_LANGUAGE
            else:
                parser.language = JS_LANGUAGE

            tree = parser.parse(bytes(code, "utf-8"))
            root = tree.root_node

            findings = []
            sensitive_data = []
            third_party = []
            network_calls = []
            consent_checks = []
            function_calls = []
            components = []

            self._traverse(root, code, findings, sensitive_data, third_party,
                           network_calls, consent_checks, function_calls, components)

            res = {
                "sensitive_data_found": list(set(sensitive_data)),
                "third_party_services": list(set(third_party)),
                "network_calls": list(set(network_calls)),
                "consent_checks": list(set(consent_checks)),
                "function_calls": function_calls[:20],
                "line_findings": findings,
                "affected_components": list(set(components)),
            }
            return res
        except Exception as e:
            # Fall back to regex on AST error
            result = self._analyze_with_regex(code)
            result["ast_error"] = str(e)
            return result

    def _traverse(self, node, code: str, findings, sensitive_data, third_party,
                  network_calls, consent_checks, function_calls, components):
        """Recursively traverse AST nodes to extract behavioral patterns."""
        code_bytes = code.encode("utf-8")

        if node.type in ("function_declaration", "method_definition", "arrow_function"):
            # Extract component/function name
            name_node = node.child_by_field_name("name")
            if name_node:
                comp_name = code_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="replace")
                if comp_name:
                    components.append(f"Function: {comp_name}")

        if node.type in ("call_expression", "new_expression"):
            call_text = code_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")
            line_no = node.start_point[0] + 1

            # Check for third-party service calls
            for pattern in THIRD_PARTY_PATTERNS:
                if re.search(pattern, call_text, re.IGNORECASE):
                    service = re.search(pattern, call_text, re.IGNORECASE).group()
                    third_party.append(service)
                    findings.append({
                        "line": line_no,
                        "type": "third_party_call",
                        "service": service,
                        "snippet": call_text[:100]
                    })

            # Check for network calls
            for pattern in NETWORK_PATTERNS:
                if re.search(pattern, call_text, re.IGNORECASE):
                    network_calls.append(call_text[:80])
                    findings.append({
                        "line": line_no,
                        "type": "network_call",
                        "snippet": call_text[:100]
                    })

            function_calls.append({"line": line_no, "snippet": call_text[:60]})

        if node.type in ("member_expression", "identifier"):
            text = code_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")
            line_no = node.start_point[0] + 1

            for pattern in SENSITIVE_DATA_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    sensitive_data.append(text)

            for pattern in CONSENT_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    consent_checks.append(text)

        for child in node.children:
            self._traverse(child, code, findings, sensitive_data, third_party,
                           network_calls, consent_checks, function_calls, components)

    def _analyze_with_regex(self, code: str) -> Dict[str, Any]:
        """Regex-based analysis fallback."""
        lines = code.split("\n")
        sensitive_data = []
        third_party = []
        network_calls = []
        consent_checks = []
        line_findings = []
        components = []

        for i, line in enumerate(lines, 1):
            line_lower = line.lower()

            # Detect function declarations / components
            func_match = re.search(r'\b(?:function|def|class)\s+([a-zA-Z0-9_]+)', line)
            if func_match:
                components.append(f"Component: {func_match.group(1)}")

            # Check sensitive data
            for pattern in SENSITIVE_DATA_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    match = re.search(pattern, line, re.IGNORECASE).group()
                    sensitive_data.append(match)
                    line_findings.append({
                        "line": i,
                        "type": "sensitive_data",
                        "data": match,
                        "snippet": line.strip()[:100]
                    })

            # Check third-party
            for pattern in THIRD_PARTY_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    match = re.search(pattern, line, re.IGNORECASE).group()
                    third_party.append(match)
                    line_findings.append({
                        "line": i,
                        "type": "third_party",
                        "service": match,
                        "snippet": line.strip()[:100]
                    })

            # Check network
            for pattern in NETWORK_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    network_calls.append(line.strip()[:80])

            # Check consent
            for pattern in CONSENT_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    consent_checks.append(line.strip()[:80])

        return {
            "sensitive_data_found": list(set(sensitive_data)),
            "third_party_services": list(set(third_party)),
            "network_calls": list(set(network_calls)),
            "consent_checks": list(set(consent_checks)),
            "function_calls": [],
            "line_findings": line_findings[:50],
            "affected_components": list(set(components)),
        }

    def _extract_data_flows_and_components(self, code: str, intermediate_results: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize concrete data flows and affected components."""
        data_flows = []
        components = intermediate_results.get("affected_components", [])
        if not components:
            # Fallback default components based on functions found
            funcs = re.findall(r'(?:function|async function|const|let|var)\s+([a-zA-Z0-9_]+)\s*=', code)
            funcs += re.findall(r'function\s+([a-zA-Z0-9_]+)\s*\(', code)
            for f in funcs:
                components.append(f"Module: {f}")

        sensitive_list = intermediate_results.get("sensitive_data_found", [])
        has_consent = len(intermediate_results.get("consent_checks", [])) > 0
        third_parties = intermediate_results.get("third_party_services", [])

        # Build structured data flows
        idx = 1
        is_console = "console.log" in code or "logger" in code or "print(" in code
        for s in sensitive_list:
            if third_parties:
                sink_name = f"{third_parties[0]} SDK / API"
            elif is_console:
                sink_name = "Local Console / Logger"
            else:
                sink_name = "Internal Memory / Variable"

            data_flows.append({
                "id": f"DF-{idx:02d}",
                "source": f"User Payload ({s})",
                "transform": "Local string output" if is_console else "Payload serialization",
                "sink": sink_name,
                "data_sensitivity": "PII / High" if "email" in s or "phone" in s or "ssn" in s else "Medium",
                "consent_guarded": has_consent,
                "component": components[0] if components else ("Console Logger" if is_console else "Internal Module"),
                "line": intermediate_results.get("line_findings", [{}])[0].get("line", 1) if intermediate_results.get("line_findings") else 1
            })
            idx += 1

        if not components:
            components = ["Console Logging Output"] if is_console else ["Internal Module"]

        return {
            "affected_components": components,
            "data_flows": data_flows
        }


ast_analyzer = ASTAnalyzer()
