"""
Dashboard and GitHub Routes
GET  /api/dashboard/summary   — Summary statistics for dashboard
POST /api/github/analyze      — Analyze GitHub PR files
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.models import Policy, CodeAnalysis, Finding, Vendor, RiskLevel, FindingStatus
from app.schemas.schemas import (
    DashboardSummary, FindingOut, GitHubAnalyzeRequest, GitHubAnalyzeResponse, DriftFinding
)
from app.agents.legal_agent import legal_agent
from app.agents.code_agent import code_agent
from app.agents.compliance_agent import compliance_agent

dashboard_router = APIRouter(tags=["Dashboard"])
github_router = APIRouter(prefix="/api/github", tags=["GitHub Integration"])


@dashboard_router.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for the dashboard."""

    # Count policies
    policies_count = await db.scalar(select(func.count()).select_from(Policy))

    # Count code analyses
    code_count = await db.scalar(select(func.count()).select_from(CodeAnalysis))

    # Count vendors
    vendors_count = await db.scalar(select(func.count()).select_from(Vendor))

    # Count active risks (open HIGH or MEDIUM findings)
    active_risks = await db.scalar(
        select(func.count()).select_from(Finding).where(
            Finding.status == FindingStatus.OPEN,
            Finding.risk.in_([RiskLevel.HIGH, RiskLevel.MEDIUM])
        )
    )

    # Risk distribution
    risk_dist = {"HIGH": 0, "MEDIUM": 0, "LOW": 0, "COMPLIANT": 0}
    for risk in [RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.COMPLIANT]:
        count = await db.scalar(
            select(func.count()).select_from(Finding).where(Finding.risk == risk)
        )
        risk_dist[risk.value] = count or 0

    # Recent findings
    recent_result = await db.execute(
        select(Finding).order_by(desc(Finding.created_at)).limit(5)
    )
    recent_findings = recent_result.scalars().all()

    return DashboardSummary(
        policies_analyzed=policies_count or 0,
        code_files_scanned=code_count or 0,
        active_risks=active_risks or 0,
        vendors_monitored=vendors_count or 0,
        risk_distribution=risk_dist,
        recent_findings=[FindingOut.model_validate(f) for f in recent_findings],
    )


@github_router.post("/analyze", response_model=GitHubAnalyzeResponse)
async def analyze_github_pr(
    request: GitHubAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze files from a GitHub PR for compliance drift.
    Designed to be called from GitHub Actions.
    """
    if not request.files:
        raise HTTPException(status_code=400, detail="No files provided for analysis.")

    # Load policy if provided, otherwise use most recent policy
    policy_rules = []
    policy_name = "Default Policy"
    if request.policy_id:
        from app.models.models import PolicyRule
        rules_result = await db.execute(
            select(PolicyRule).where(PolicyRule.policy_id == request.policy_id)
        )
        rules = rules_result.scalars().all()
        policy_rules = [
            {
                "section": r.section, "data_type": r.data_type, "action": r.action,
                "destination": r.destination, "condition": r.condition,
                "severity": r.severity.value if r.severity else "MEDIUM",
                "raw_text": r.raw_text,
            }
            for r in rules
        ]
        from app.models.models import Policy as PolicyModel
        p = await db.scalar(select(PolicyModel).where(PolicyModel.id == request.policy_id))
        if p:
            policy_name = p.name
    else:
        # Use most recent policy
        from app.models.models import PolicyRule, Policy as PolicyModel
        p = await db.scalar(select(PolicyModel).order_by(desc(PolicyModel.created_at)))
        if p:
            policy_name = p.name
            rules_result = await db.execute(
                select(PolicyRule).where(PolicyRule.policy_id == p.id)
            )
            rules = rules_result.scalars().all()
            policy_rules = [
                {
                    "section": r.section, "data_type": r.data_type, "action": r.action,
                    "destination": r.destination, "condition": r.condition,
                    "severity": r.severity.value if r.severity else "MEDIUM",
                    "raw_text": r.raw_text,
                }
                for r in rules
            ]

    all_findings = []
    passed = True

    for file_info in request.files[:10]:  # Limit to 10 files per PR
        file_path = file_info.get("path", "unknown")
        file_content = file_info.get("content", "")

        if not file_content.strip():
            continue

        # Detect language
        ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else "js"
        lang_map = {"js": "javascript", "jsx": "javascript", "ts": "typescript", "tsx": "typescript",
                    "py": "python", "java": "java", "go": "go"}
        language = lang_map.get(ext, "javascript")

        # Analyze code
        behavior = await code_agent.analyze(file_content, language, file_path)

        # Compare with policy
        if policy_rules:
            findings = await compliance_agent.compare(
                policy_rules=policy_rules,
                code_behavior=behavior,
                policy_name=policy_name,
                file_path=file_path,
            )
        else:
            findings = []

        for finding in findings:
            if finding.get("drift_detected") and finding.get("risk") == "HIGH" and finding.get("confidence", 0) >= 0.8:
                passed = False

            all_findings.append(DriftFinding(
                drift_detected=finding.get("drift_detected", False),
                risk=finding.get("risk", "COMPLIANT"),
                confidence=finding.get("confidence", 0.5),
                reason=finding.get("reason", ""),
                recommendation=finding.get("recommendation", ""),
                policy_reference=finding.get("policy_reference"),
                code_reference=f"{file_path}",
                data_involved=finding.get("data_involved"),
                destination=finding.get("destination"),
                policy_evidence=finding.get("policy_evidence"),
                code_evidence=finding.get("code_evidence"),
                title=finding.get("title", "GitHub PR Analysis"),
            ))

    high_risks = [f for f in all_findings if f.drift_detected and f.risk == "HIGH"]
    summary = (
        f"❌ AuditPulse Compliance Check FAILED — {len(high_risks)} HIGH risk violation(s) detected in {len(request.files)} file(s)."
        if not passed else
        f"✅ AuditPulse Compliance Check PASSED — {len(request.files)} file(s) analyzed, no high-risk violations found."
    )

    return GitHubAnalyzeResponse(
        passed=passed,
        summary=summary,
        findings=all_findings,
        badge_status="failed" if not passed else "passed",
    )
