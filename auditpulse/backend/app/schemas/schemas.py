"""
Pydantic Schemas for AuditPulse API
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
    RESOLVED = "resolved"
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
    created_at: datetime
    rules: List[PolicyRuleOut] = []

    class Config:
        from_attributes = True


class PolicyAnalyzeResponse(BaseModel):
    policy: PolicyOut
    rules_extracted: int
    analysis_summary: str


# ========== Code Analysis Schemas ==========

class CodeAnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Source code content")
    language: SupportedLanguage = SupportedLanguage.javascript
    file_path: str = Field(default="uploaded_file", description="File name or path")
    repository: Optional[str] = None


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


# ========== Compliance Schemas ==========

class CompareRequest(BaseModel):
    policy_id: int
    code_analysis_id: int


class DriftFinding(BaseModel):
    drift_detected: bool
    risk: RiskLevel
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    recommendation: str
    policy_reference: Optional[str] = None
    code_reference: Optional[str] = None
    data_involved: Optional[str] = None
    destination: Optional[str] = None
    policy_evidence: Optional[str] = None
    code_evidence: Optional[str] = None
    title: str


class CompareResponse(BaseModel):
    policy_id: int
    code_analysis_id: int
    findings: List[DriftFinding]
    total_findings: int
    highest_risk: RiskLevel
    saved_finding_ids: List[int] = []


# ========== Finding Schemas ==========

class FindingOut(BaseModel):
    id: int
    title: str
    risk: RiskLevel
    confidence: float
    reason: Optional[str] = None
    recommendation: Optional[str] = None
    policy_reference: Optional[str] = None
    code_reference: Optional[str] = None
    data_involved: Optional[str] = None
    destination: Optional[str] = None
    policy_evidence: Optional[str] = None
    code_evidence: Optional[str] = None
    status: FindingStatus
    finding_type: str
    created_at: datetime
    policy_id: Optional[int] = None
    code_analysis_id: Optional[int] = None

    class Config:
        from_attributes = True


class FindingUpdateRequest(BaseModel):
    status: FindingStatus


# ========== Vendor Schemas ==========

class VendorCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., description="URL of vendor policy page")

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
    created_at: datetime

    class Config:
        from_attributes = True


class VendorCheckResponse(BaseModel):
    vendor_id: int
    drift_detected: bool
    drift_summary: Optional[Dict[str, Any]] = None
    message: str


# ========== Dashboard Schemas ==========

class DashboardSummary(BaseModel):
    policies_analyzed: int
    code_files_scanned: int
    active_risks: int
    vendors_monitored: int
    risk_distribution: Dict[str, int]
    recent_findings: List[FindingOut]


# ========== GitHub Schemas ==========

class GitHubAnalyzeRequest(BaseModel):
    repository: str
    pr_number: Optional[int] = None
    files: List[Dict[str, str]] = []  # [{"path": "...", "content": "..."}]
    policy_id: Optional[int] = None


class GitHubAnalyzeResponse(BaseModel):
    passed: bool
    summary: str
    findings: List[DriftFinding]
    badge_status: str  # "passed" | "failed"
