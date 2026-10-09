"""
Pydantic Schemas for AuditPulse API
Supports all 12 Improved AuditPulse capabilities:
- Policy version extraction & comparison
- Code behavior with affected components & data flows
- Continuous drift detection & history tracking
- Numerical Compliance Risk Score + Severity + Confidence
- Verbatim Policy sentence <-> Code line evidence pairing
- Remediation code patches & fix diffs
- GitHub PR webhook & check simulation
- Vendor surveillance with impacted application components
- Compliance lifecycle timeline (detected -> reviewed -> fixed)
- Human review workflow (approve, reject, dismiss)
- False-positive AI feedback loop
- Professional audit report & executive governance exports
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, HttpUrl, Field, field_validator
from enum import Enum


# ========== Enums ==========

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    COMPLIANT = "COMPLIANT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class FindingStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    APPROVED = "approved"          # Confirmed violation by legal/security
    REJECTED = "rejected"          # Marked as false positive by human reviewer
    DISMISSED = "dismissed"        # Waived / risk accepted with justification
    RESOLVED = "resolved"          # Remediated
    FALSE_POSITIVE = "false_positive"


class SupportedLanguage(str, Enum):
    javascript = "javascript"
    typescript = "typescript"
    python = "python"
    java = "java"
    go = "go"


# ========== Policy Schemas ==========

class PolicyAnalyzeRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Policy name")
    content: str = Field(..., min_length=10, description="Policy text content")
    version: Optional[str] = "1.0"
    parent_policy_id: Optional[int] = None
    version_notes: Optional[str] = None


class PolicyRuleOut(BaseModel):
    id: Optional[int] = None
    section: Optional[str] = None
    data_type: str
    action: str
    destination: str
    condition: Optional[str] = None
    severity: RiskLevel
    raw_text: Optional[str] = None

    class Config:
        from_attributes = True


class PolicyOut(BaseModel):
    id: int
    name: str
    version: str
    content: str
    file_type: str
    parent_policy_id: Optional[int] = None
    version_notes: Optional[str] = None
    created_at: datetime
    rules: List[PolicyRuleOut] = []

    class Config:
        from_attributes = True


class PolicyAnalyzeResponse(BaseModel):
    policy: PolicyOut
    rules_extracted: int
    analysis_summary: str


class PolicyCompareRequest(BaseModel):
    policy_id_a: int
    policy_id_b: Optional[int] = None
    new_content: Optional[str] = None
    new_version: Optional[str] = "2.0"


class PolicyVersionDiffItem(BaseModel):
    rule_id: Optional[int] = None
    section: Optional[str] = None
    data_type: str
    action: str
    change_type: str  # "added" | "removed" | "modified"
    description: str
    severity: RiskLevel = RiskLevel.MEDIUM
    old_text: Optional[str] = None
    new_text: Optional[str] = None


class PolicyVersionCompareResponse(BaseModel):
    policy_a_name: str
    policy_a_version: str
    policy_b_name: str
    policy_b_version: str
    risk_impact: str  # "INCREASED_RISK" | "REDUCED_RISK" | "NEUTRAL"
    summary: str
    added_rules: List[PolicyRuleOut] = []
    removed_rules: List[PolicyRuleOut] = []
    modified_rules: List[Dict[str, Any]] = []
    detailed_diff: str = ""


# ========== Code Analysis Schemas ==========

class CodeAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Source code content")
    language: SupportedLanguage = SupportedLanguage.javascript
    file_path: str = Field(default="uploaded_file", description="File name or path")
    repository: Optional[str] = None


class DataFlow(BaseModel):
    id: str
    source: str
    transform: Optional[str] = None
    sink: str
    data_sensitivity: str  # "PII / High" | "Medium" | "Low"
    consent_guarded: bool = False
    component: str
    line: Optional[int] = None


class CodeBehavior(BaseModel):
    data_types: List[str] = []
    actions: List[str] = []
    destinations: List[str] = []
    third_party_sdks: List[str] = []
    api_calls: List[str] = []
    sensitive_data: List[str] = []
    network_requests: List[str] = []
    logging_events: List[str] = []
    storage_operations: List[str] = []
    affected_components: List[str] = []       # Identified application components
    data_flows: List[DataFlow] = []           # Traced data flow pipelines
    findings_raw: List[Dict[str, Any]] = []


class CodeAnalyzeResponse(BaseModel):
    id: int
    file_path: str
    language: str
    behavior: CodeBehavior
    ast_used: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ========== Compliance & Evidence Schemas ==========

class EvidencePair(BaseModel):
    policy_quote: str
    policy_section: Optional[str] = None
    code_snippet: str
    code_line: Optional[int] = None
    file_path: Optional[str] = None
    conflict_vector: Optional[str] = None


class SuggestedFix(BaseModel):
    code_patch: Optional[str] = None
    diff: Optional[str] = None
    policy_adjustment: Optional[str] = None
    explanation: Optional[str] = None


class FindingTimelineOut(BaseModel):
    id: int
    stage: str
    actor: str
    action: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DriftFinding(BaseModel):
    drift_detected: bool
    risk: RiskLevel
    risk_score: float = Field(default=0.0, ge=0.0, le=100.0)  # Compliance Risk Score 0-100
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    recommendation: str
    policy_reference: Optional[str] = None
    code_reference: Optional[str] = None
    data_involved: Optional[str] = None
    destination: Optional[str] = None
    policy_evidence: Optional[str] = None  # Exact policy sentence
    code_evidence: Optional[str] = None    # Exact code line
    evidence_pair: Optional[EvidencePair] = None
    suggested_fix: Optional[SuggestedFix] = None
    title: str


class CompareRequest(BaseModel):
    policy_id: int
    code_analysis_id: int


class CompareResponse(BaseModel):
    policy_id: int
    code_analysis_id: int
    findings: List[DriftFinding]
    total_findings: int
    highest_risk: RiskLevel
    compliance_risk_score: float = 0.0  # Aggregate risk score 0-100
    saved_finding_ids: List[int] = []
    drift_run_id: Optional[int] = None


# ========== Finding Schemas ==========

class FindingOut(BaseModel):
    id: int
    title: str
    risk: RiskLevel
    risk_score: float = 0.0
    confidence: float
    reason: Optional[str] = None
    recommendation: Optional[str] = None
    policy_reference: Optional[str] = None
    code_reference: Optional[str] = None
    data_involved: Optional[str] = None
    destination: Optional[str] = None
    policy_evidence: Optional[str] = None
    code_evidence: Optional[str] = None
    evidence_pair: Optional[EvidencePair] = None
    suggested_fix: Optional[SuggestedFix] = None
    status: FindingStatus
    finding_type: str
    reviewed_by: Optional[str] = None
    reviewer_role: Optional[str] = None
    review_decision: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    timeline: List[FindingTimelineOut] = []
    created_at: datetime
    policy_id: Optional[int] = None
    code_analysis_id: Optional[int] = None
    vendor_id: Optional[int] = None

    class Config:
        from_attributes = True


class FindingUpdateRequest(BaseModel):
    status: FindingStatus


class FindingReviewRequest(BaseModel):
    decision: str  # "approve" | "reject" | "dismiss" | "resolve"
    reviewer_role: str = "Legal Counsel"  # "Legal Counsel" | "Security Engineer" | "Compliance Officer"
    reviewer_name: Optional[str] = "Reviewer"
    notes: str = ""
    feedback_category: Optional[str] = None


# ========== Continuous Drift Run Schemas ==========

class DriftRunOut(BaseModel):
    id: int
    policy_id: Optional[int] = None
    code_analysis_id: Optional[int] = None
    policy_name: Optional[str] = None
    file_path: Optional[str] = None
    trigger_type: str
    compliance_risk_score: float
    highest_risk: RiskLevel
    total_findings: int
    violations_count: int
    status: str
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ContinuousCheckResponse(BaseModel):
    drift_run_id: int
    policies_scanned: int
    code_files_scanned: int
    compliance_risk_score: float
    highest_risk: RiskLevel
    violations_found: int
    message: str


# ========== AI Feedback Schemas ==========

class AIFeedbackCreateRequest(BaseModel):
    finding_id: Optional[int] = None
    pattern_signature: str
    data_involved: Optional[str] = None
    file_reference: Optional[str] = None
    category: str = "false_positive"  # internal_mock | anonymized | global_consent | other
    reason: str
    reviewer_role: Optional[str] = "Security Engineer"


class AIFeedbackOut(BaseModel):
    id: int
    finding_id: Optional[int] = None
    pattern_signature: str
    data_involved: Optional[str] = None
    file_reference: Optional[str] = None
    category: str
    reason: str
    reviewer_role: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ========== Vendor Schemas ==========

class VendorCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., description="URL of vendor policy page")
    affected_components: Optional[List[str]] = Field(default_factory=list, description="Application components using this vendor")

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


class VendorOut(BaseModel):
    id: int
    name: str
    url: str
    status: str
    last_checked: Optional[datetime] = None
    drift_detected: bool
    drift_summary: Optional[Dict[str, Any]] = None
    affected_components: Optional[List[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True


class VendorCheckResponse(BaseModel):
    vendor_id: int
    drift_detected: bool
    drift_summary: Optional[Dict[str, Any]] = None
    affected_components: Optional[List[str]] = []
    message: str


# ========== Dashboard Schemas ==========

class DashboardSummary(BaseModel):
    policies_analyzed: int
    code_files_scanned: int
    active_risks: int
    vendors_monitored: int
    compliance_risk_score: float = 0.0  # Overall system Compliance Risk Score (0-100)
    compliance_health_score: float = 100.0  # Overall Compliance Health Score (0-100)
    risk_distribution: Dict[str, int]
    recent_findings: List[FindingOut]
    recent_runs: List[DriftRunOut] = []


# ========== GitHub Schemas ==========

class GitHubAnalyzeRequest(BaseModel):
    repository: str
    pr_number: Optional[int] = None
    files: List[Dict[str, str]] = []  # [{"path": "...", "content": "..."}]
    policy_id: Optional[int] = None


class GitHubAnalyzeResponse(BaseModel):
    passed: bool
    compliance_risk_score: float
    summary: str
    findings: List[DriftFinding]
    badge_status: str  # "passed" | "failed"
    pr_comment_markdown: Optional[str] = None


# ========== Audit Report Schemas ==========

class AuditReportResponse(BaseModel):
    report_id: str
    generated_at: datetime
    company_name: str
    compliance_health_score: float
    compliance_risk_score: float
    overall_status: str
    executive_summary: str
    framework_alignment: Dict[str, Dict[str, Any]]
    total_findings: int
    risk_breakdown: Dict[str, int]
    affected_components: List[str]
    remediation_roadmap: List[Dict[str, Any]]
    governance_signoffs: List[Dict[str, Any]]
    findings: List[FindingOut]
