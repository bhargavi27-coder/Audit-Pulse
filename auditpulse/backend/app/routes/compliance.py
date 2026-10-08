"""
Compliance Comparison Routes
POST /api/compliance/compare  — Compare policy vs code using all agents
GET  /api/findings             — List all findings
GET  /api/findings/{id}        — Get finding details
PATCH /api/findings/{id}       — Update finding status
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from app.database import get_db
from app.models.models import Policy, PolicyRule, CodeAnalysis, Finding, RiskLevel, FindingStatus
from app.schemas.schemas import (
    CompareRequest, CompareResponse, DriftFinding, FindingOut, FindingUpdateRequest
)
from app.agents.compliance_agent import compliance_agent
from app.agents.evidence_agent import evidence_agent

router = APIRouter(tags=["Compliance & Findings"])


@router.post("/api/compliance/compare", response_model=CompareResponse)
async def compare_policy_and_code(
    request: CompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run the full multi-agent compliance comparison:
    1. Load policy rules from DB
    2. Load code behavior from DB
    3. Run Compliance Agent
    4. Run Evidence Agent
    5. Save findings
    6. Return results
    """
    # Load policy
    policy_result = await db.execute(select(Policy).where(Policy.id == request.policy_id))
    policy = policy_result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail=f"Policy {request.policy_id} not found")

    rules_result = await db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == request.policy_id)
    )
    policy_rules = [
        {
            "section": r.section,
            "data_type": r.data_type,
            "action": r.action,
            "destination": r.destination,
            "condition": r.condition,
            "severity": r.severity.value if r.severity else "MEDIUM",
            "raw_text": r.raw_text,
        }
        for r in rules_result.scalars().all()
    ]

    # Load code analysis
    code_result = await db.execute(
        select(CodeAnalysis).where(CodeAnalysis.id == request.code_analysis_id)
    )
    code_analysis = code_result.scalar_one_or_none()
    if not code_analysis:
        raise HTTPException(status_code=404, detail=f"Code analysis {request.code_analysis_id} not found")

    code_behavior = code_analysis.analysis_result or {}

    # Run Compliance Agent
    raw_findings = await compliance_agent.compare(
        policy_rules=policy_rules,
        code_behavior=code_behavior,
        policy_name=policy.name,
        file_path=code_analysis.file_path,
    )

    # Run Evidence Agent and save findings
    saved_ids = []
    drift_findings = []
    highest_risk = RiskLevel.COMPLIANT

    RISK_ORDER = {
        "HIGH": 4, "MEDIUM": 3, "LOW": 2,
        "COMPLIANT": 1, "INSUFFICIENT_EVIDENCE": 0
    }

    for raw_finding in raw_findings:
        # Enhance with Evidence Agent
        evidence = await evidence_agent.document(
            finding=raw_finding,
            policy_rules=policy_rules,
            code_behavior=code_behavior,
        )

        # Merge evidence into finding
        final_finding = {**raw_finding}
        if evidence.get("policy_evidence_quote"):
            final_finding["policy_evidence"] = evidence["policy_evidence_quote"]
        if evidence.get("code_evidence_snippet"):
            final_finding["code_evidence"] = evidence["code_evidence_snippet"]
        if evidence.get("recommended_action"):
            final_finding["recommendation"] = evidence["recommended_action"]

        # Save to DB
        try:
            risk_val = RiskLevel(final_finding.get("risk", "MEDIUM"))
        except ValueError:
            risk_val = RiskLevel.MEDIUM

        finding_db = Finding(
            policy_id=request.policy_id,
            code_analysis_id=request.code_analysis_id,
            title=final_finding.get("title", "Compliance Finding"),
            risk=risk_val,
            confidence=float(final_finding.get("confidence", 0.5)),
            reason=final_finding.get("reason", ""),
            recommendation=final_finding.get("recommendation", ""),
            policy_reference=final_finding.get("policy_reference", ""),
            code_reference=final_finding.get("code_reference", ""),
            data_involved=final_finding.get("data_involved", ""),
            destination=final_finding.get("destination", ""),
            policy_evidence=final_finding.get("policy_evidence", ""),
            code_evidence=final_finding.get("code_evidence", ""),
            finding_type="policy_code",
        )
        db.add(finding_db)
        await db.flush()
        saved_ids.append(finding_db.id)

        # Track highest risk
        current_risk = final_finding.get("risk", "COMPLIANT")
        if RISK_ORDER.get(current_risk, 0) > RISK_ORDER.get(highest_risk.value, 0):
            highest_risk = risk_val

        drift_findings.append(DriftFinding(
            drift_detected=final_finding.get("drift_detected", False),
            risk=risk_val,
            confidence=float(final_finding.get("confidence", 0.5)),
            reason=final_finding.get("reason", ""),
            recommendation=final_finding.get("recommendation", ""),
            policy_reference=final_finding.get("policy_reference"),
            code_reference=final_finding.get("code_reference"),
            data_involved=final_finding.get("data_involved"),
            destination=final_finding.get("destination"),
            policy_evidence=final_finding.get("policy_evidence"),
            code_evidence=final_finding.get("code_evidence"),
            title=final_finding.get("title", "Compliance Finding"),
        ))

    await db.commit()

    return CompareResponse(
        policy_id=request.policy_id,
        code_analysis_id=request.code_analysis_id,
        findings=drift_findings,
        total_findings=len(drift_findings),
        highest_risk=highest_risk,
        saved_finding_ids=saved_ids,
    )


@router.get("/api/findings", response_model=List[FindingOut])
async def list_findings(
    risk: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    finding_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all findings with optional filtering."""
    query = select(Finding).order_by(desc(Finding.created_at))

    filters = []
    if risk:
        try:
            filters.append(Finding.risk == RiskLevel(risk.upper()))
        except ValueError:
            pass
    if status:
        try:
            filters.append(Finding.status == FindingStatus(status.lower()))
        except ValueError:
            pass
    if finding_type:
        filters.append(Finding.finding_type == finding_type)
    if search:
        from sqlalchemy import or_
        filters.append(or_(
            Finding.title.ilike(f"%{search}%"),
            Finding.reason.ilike(f"%{search}%"),
        ))

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.limit(100))
    findings = result.scalars().all()
    return [FindingOut.model_validate(f) for f in findings]


@router.get("/api/findings/{finding_id}", response_model=FindingOut)
async def get_finding(finding_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific finding by ID."""
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return FindingOut.model_validate(finding)


@router.patch("/api/findings/{finding_id}", response_model=FindingOut)
async def update_finding_status(
    finding_id: int,
    request: FindingUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update finding status (acknowledge, resolve, mark as false positive)."""
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = FindingStatus(request.status.value)
    await db.commit()
    await db.refresh(finding)
    return FindingOut.model_validate(finding)
