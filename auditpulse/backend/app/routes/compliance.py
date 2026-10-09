"""
Compliance Comparison, Review Workflow, and History Routes
POST /api/compliance/compare          — Compare policy vs code using all agents
POST /api/compliance/continuous-check — Run continuous compliance sweep across latest policies & code
GET  /api/compliance/history          — Get historical drift runs and trend history
GET  /api/findings                   — List all findings (filterable)
GET  /api/findings/{id}              — Get finding details with evidence pair, fix, and timeline
PATCH /api/findings/{id}             — Update finding status
POST /api/findings/{id}/review       — Human review (approve, reject false positive, dismiss waiver)
GET  /api/findings/{id}/timeline     — Get compliance lifecycle timeline events
GET  /api/feedback                   — List active AI feedback rules
POST /api/feedback                   — Submit new AI feedback rule
DELETE /api/feedback/{id}            — Remove/deactivate AI feedback rule
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from app.database import get_db
from app.models.models import (
    Policy, PolicyRule, CodeAnalysis, Finding, FindingTimeline,
    DriftRun, AIFeedback, RiskLevel, FindingStatus
)
from app.schemas.schemas import (
    CompareRequest, CompareResponse, DriftFinding, FindingOut, FindingUpdateRequest,
    FindingReviewRequest, FindingTimelineOut, DriftRunOut, ContinuousCheckResponse,
    AIFeedbackCreateRequest, AIFeedbackOut, EvidencePair, SuggestedFix
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
    1. Load policy rules
    2. Load code behavior
    3. Load active AI feedback rules (to suppress learned false positives)
    4. Run Compliance Agent & Evidence Agent
    5. Save findings with exact evidence pairing & suggested fix patches
    6. Record historical DriftRun
    7. Return results with Compliance Risk Score
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

    # Load active AI feedback memory to suppress learned false positives
    feedback_result = await db.execute(
        select(AIFeedback).where(AIFeedback.is_active == True)
    )
    feedback_rules = [
        {
            "id": fb.id,
            "pattern_signature": fb.pattern_signature,
            "data_involved": fb.data_involved,
            "category": fb.category,
            "reason": fb.reason,
        }
        for fb in feedback_result.scalars().all()
    ]

    # Run Compliance Agent with feedback memory
    raw_findings = await compliance_agent.compare(
        policy_rules=policy_rules,
        code_behavior=code_behavior,
        policy_name=policy.name,
        file_path=code_analysis.file_path,
        feedback_rules=feedback_rules,
    )

    saved_ids = []
    drift_findings = []
    highest_risk = RiskLevel.COMPLIANT
    total_risk_score = 0.0

    RISK_ORDER = {
        "HIGH": 4, "MEDIUM": 3, "LOW": 2,
        "COMPLIANT": 1, "INSUFFICIENT_EVIDENCE": 0
    }

    for raw_finding in raw_findings:
        # Enhance with Evidence Agent for exact quotes and concrete patch diffs
        evidence = await evidence_agent.document(
            finding=raw_finding,
            policy_rules=policy_rules,
            code_behavior=code_behavior,
        )

        final_finding = {**raw_finding}
        if evidence.get("policy_evidence_quote"):
            final_finding["policy_evidence"] = evidence["policy_evidence_quote"]
        if evidence.get("code_evidence_snippet"):
            final_finding["code_evidence"] = evidence["code_evidence_snippet"]
        if evidence.get("recommended_action"):
            final_finding["recommendation"] = evidence["recommended_action"]
        if evidence.get("evidence_pair"):
            final_finding["evidence_pair"] = evidence["evidence_pair"]
        if evidence.get("suggested_fix"):
            final_finding["suggested_fix"] = evidence["suggested_fix"]

        try:
            risk_val = RiskLevel(final_finding.get("risk", "MEDIUM"))
        except ValueError:
            risk_val = RiskLevel.MEDIUM

        finding_risk_score = float(final_finding.get("risk_score", 0.0))
        if finding_risk_score == 0.0 and risk_val != RiskLevel.COMPLIANT:
            # Calculate default risk score from severity and confidence
            conf = float(final_finding.get("confidence", 0.8))
            if risk_val == RiskLevel.HIGH:
                finding_risk_score = round(75.0 + conf * 25.0, 1)
            elif risk_val == RiskLevel.MEDIUM:
                finding_risk_score = round(40.0 + conf * 30.0, 1)
            elif risk_val == RiskLevel.LOW:
                finding_risk_score = round(15.0 + conf * 20.0, 1)

        total_risk_score = max(total_risk_score, finding_risk_score)

        # Save finding to DB
        finding_db = Finding(
            policy_id=request.policy_id,
            code_analysis_id=request.code_analysis_id,
            title=final_finding.get("title", "Compliance Finding"),
            risk=risk_val,
            confidence=float(final_finding.get("confidence", 0.5)),
            risk_score=finding_risk_score,
            reason=final_finding.get("reason", ""),
            recommendation=final_finding.get("recommendation", ""),
            policy_reference=final_finding.get("policy_reference", ""),
            code_reference=final_finding.get("code_reference", ""),
            data_involved=final_finding.get("data_involved", ""),
            destination=final_finding.get("destination", ""),
            policy_evidence=final_finding.get("policy_evidence", ""),
            code_evidence=final_finding.get("code_evidence", ""),
            evidence_pair=final_finding.get("evidence_pair"),
            suggested_fix=final_finding.get("suggested_fix"),
            finding_type="policy_code",
            status=FindingStatus.OPEN,
        )
        db.add(finding_db)
        await db.flush()
        saved_ids.append(finding_db.id)

        # Create initial Compliance Lifecycle Timeline event: DETECTED
        timeline_event = FindingTimeline(
            finding_id=finding_db.id,
            stage="detected",
            actor="Multi-Agent Pipeline",
            action=f"Compliance check against {policy.name} (Risk: {risk_val.value})",
            notes=f"Detected potential mismatch. Risk score calculated: {finding_risk_score}/100.",
        )
        db.add(timeline_event)

        # Track highest risk
        current_risk = final_finding.get("risk", "COMPLIANT")
        if RISK_ORDER.get(current_risk, 0) > RISK_ORDER.get(highest_risk.value, 0):
            highest_risk = risk_val

        # Prepare response schema
        evidence_pair_schema = None
        if final_finding.get("evidence_pair"):
            ep = final_finding["evidence_pair"]
            evidence_pair_schema = EvidencePair(
                policy_quote=ep.get("policy_quote", ""),
                policy_section=ep.get("policy_section"),
                code_snippet=ep.get("code_snippet", ""),
                code_line=ep.get("code_line"),
                file_path=ep.get("file_path"),
                conflict_vector=ep.get("conflict_vector"),
            )

        suggested_fix_schema = None
        if final_finding.get("suggested_fix"):
            sf = final_finding["suggested_fix"]
            suggested_fix_schema = SuggestedFix(
                code_patch=sf.get("code_patch"),
                diff=sf.get("diff"),
                policy_adjustment=sf.get("policy_adjustment"),
                explanation=sf.get("explanation"),
            )

        drift_findings.append(DriftFinding(
            drift_detected=final_finding.get("drift_detected", False),
            risk=risk_val,
            risk_score=finding_risk_score,
            confidence=float(final_finding.get("confidence", 0.5)),
            reason=final_finding.get("reason", ""),
            recommendation=final_finding.get("recommendation", ""),
            policy_reference=final_finding.get("policy_reference"),
            code_reference=final_finding.get("code_reference"),
            data_involved=final_finding.get("data_involved"),
            destination=final_finding.get("destination"),
            policy_evidence=final_finding.get("policy_evidence"),
            code_evidence=final_finding.get("code_evidence"),
            evidence_pair=evidence_pair_schema,
            suggested_fix=suggested_fix_schema,
            title=final_finding.get("title", "Compliance Finding"),
        ))

    # Record historical DriftRun
    violations_count = sum(1 for f in drift_findings if f.drift_detected and f.risk in [RiskLevel.HIGH, RiskLevel.MEDIUM])
    run_status = "flagged" if violations_count > 0 else "clean"
    drift_run = DriftRun(
        policy_id=request.policy_id,
        code_analysis_id=request.code_analysis_id,
        policy_name=policy.name,
        file_path=code_analysis.file_path,
        trigger_type="manual",
        compliance_risk_score=total_risk_score,
        highest_risk=highest_risk,
        total_findings=len(drift_findings),
        violations_count=violations_count,
        status=run_status,
        summary=f"Compared {policy.name} against {code_analysis.file_path}. Identified {len(drift_findings)} finding(s).",
    )
    db.add(drift_run)
    await db.commit()
    await db.refresh(drift_run)

    return CompareResponse(
        policy_id=request.policy_id,
        code_analysis_id=request.code_analysis_id,
        findings=drift_findings,
        total_findings=len(drift_findings),
        highest_risk=highest_risk,
        compliance_risk_score=total_risk_score,
        saved_finding_ids=saved_ids,
        drift_run_id=drift_run.id,
    )


@router.post("/api/compliance/continuous-check", response_model=ContinuousCheckResponse)
async def run_continuous_check(db: AsyncSession = Depends(get_db)):
    """
    Run an automated continuous compliance sweep across latest policies and codebases.
    Records historical drift run and trends.
    """
    policies_res = await db.execute(select(Policy).order_by(desc(Policy.created_at)).limit(5))
    policies = policies_res.scalars().all()

    codes_res = await db.execute(select(CodeAnalysis).order_by(desc(CodeAnalysis.created_at)).limit(5))
    codes = codes_res.scalars().all()

    if not policies or not codes:
        # Create empty run record
        drift_run = DriftRun(
            trigger_type="continuous",
            compliance_risk_score=0.0,
            highest_risk=RiskLevel.COMPLIANT,
            total_findings=0,
            violations_count=0,
            status="clean",
            summary="Continuous sweep completed: No active policies or codebases registered.",
        )
        db.add(drift_run)
        await db.commit()
        await db.refresh(drift_run)
        return ContinuousCheckResponse(
            drift_run_id=drift_run.id,
            policies_scanned=len(policies),
            code_files_scanned=len(codes),
            compliance_risk_score=0.0,
            highest_risk=RiskLevel.COMPLIANT,
            violations_found=0,
            message="Continuous sweep completed: Nothing to analyze.",
        )

    # Analyze primary latest policy & code
    p = policies[0]
    c = codes[0]

    rules_result = await db.execute(select(PolicyRule).where(PolicyRule.policy_id == p.id))
    policy_rules = [
        {
            "section": r.section, "data_type": r.data_type, "action": r.action,
            "destination": r.destination, "condition": r.condition,
            "severity": r.severity.value if r.severity else "MEDIUM",
            "raw_text": r.raw_text,
        }
        for r in rules_result.scalars().all()
    ]

    feedback_result = await db.execute(select(AIFeedback).where(AIFeedback.is_active == True))
    feedback_rules = [
        {"id": fb.id, "pattern_signature": fb.pattern_signature, "reason": fb.reason}
        for fb in feedback_result.scalars().all()
    ]

    findings = await compliance_agent.compare(
        policy_rules=policy_rules,
        code_behavior=c.analysis_result or {},
        policy_name=p.name,
        file_path=c.file_path,
        feedback_rules=feedback_rules,
    )

    violations = [f for f in findings if f.get("drift_detected")]
    max_risk = RiskLevel.HIGH if any(f.get("risk") == "HIGH" for f in violations) else (
        RiskLevel.MEDIUM if any(f.get("risk") == "MEDIUM" for f in violations) else RiskLevel.COMPLIANT
    )
    risk_score = 92.0 if max_risk == RiskLevel.HIGH else (45.0 if max_risk == RiskLevel.MEDIUM else 0.0)

    drift_run = DriftRun(
        policy_id=p.id,
        code_analysis_id=c.id,
        policy_name=p.name,
        file_path=c.file_path,
        trigger_type="continuous",
        compliance_risk_score=risk_score,
        highest_risk=max_risk,
        total_findings=len(findings),
        violations_count=len(violations),
        status="flagged" if len(violations) > 0 else "clean",
        summary=f"Continuous sweep analyzed {len(policies)} policy(ies) and {len(codes)} code file(s). Found {len(violations)} violation(s).",
    )
    db.add(drift_run)
    await db.commit()
    await db.refresh(drift_run)

    return ContinuousCheckResponse(
        drift_run_id=drift_run.id,
        policies_scanned=len(policies),
        code_files_scanned=len(codes),
        compliance_risk_score=risk_score,
        highest_risk=max_risk,
        violations_found=len(violations),
        message=f"Continuous monitoring sweep complete: {len(violations)} violation(s) detected.",
    )


@router.get("/api/compliance/history", response_model=List[DriftRunOut])
async def get_drift_history(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get chronological history of drift detection runs for trend analysis."""
    result = await db.execute(
        select(DriftRun).order_by(desc(DriftRun.created_at)).limit(limit)
    )
    runs = result.scalars().all()
    return [DriftRunOut.model_validate(r) for r in runs]


@router.get("/api/findings", response_model=List[FindingOut])
async def list_findings(
    risk: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    finding_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all findings with optional filtering and timeline support."""
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
            Finding.code_reference.ilike(f"%{search}%"),
        ))

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query.limit(100))
    findings = result.scalars().all()

    out_list = []
    for f in findings:
        timeline_res = await db.execute(
            select(FindingTimeline).where(FindingTimeline.finding_id == f.id).order_by(FindingTimeline.created_at)
        )
        timelines = timeline_res.scalars().all()

        ep_schema = None
        if f.evidence_pair and isinstance(f.evidence_pair, dict):
            ep_schema = EvidencePair(
                policy_quote=f.evidence_pair.get("policy_quote", ""),
                policy_section=f.evidence_pair.get("policy_section"),
                code_snippet=f.evidence_pair.get("code_snippet", ""),
                code_line=f.evidence_pair.get("code_line"),
                file_path=f.evidence_pair.get("file_path"),
                conflict_vector=f.evidence_pair.get("conflict_vector"),
            )

        sf_schema = None
        if f.suggested_fix and isinstance(f.suggested_fix, dict):
            sf_schema = SuggestedFix(
                code_patch=f.suggested_fix.get("code_patch"),
                diff=f.suggested_fix.get("diff"),
                policy_adjustment=f.suggested_fix.get("policy_adjustment"),
                explanation=f.suggested_fix.get("explanation"),
            )

        out_list.append(FindingOut(
            id=f.id,
            title=f.title,
            risk=f.risk,
            risk_score=f.risk_score or 0.0,
            confidence=f.confidence,
            reason=f.reason,
            recommendation=f.recommendation,
            policy_reference=f.policy_reference,
            code_reference=f.code_reference,
            data_involved=f.data_involved,
            destination=f.destination,
            policy_evidence=f.policy_evidence,
            code_evidence=f.code_evidence,
            evidence_pair=ep_schema,
            suggested_fix=sf_schema,
            status=f.status,
            finding_type=f.finding_type,
            reviewed_by=f.reviewed_by,
            reviewer_role=f.reviewer_role,
            review_decision=f.review_decision,
            review_notes=f.review_notes,
            reviewed_at=f.reviewed_at,
            timeline=[FindingTimelineOut.model_validate(t) for t in timelines],
            created_at=f.created_at,
            policy_id=f.policy_id,
            code_analysis_id=f.code_analysis_id,
            vendor_id=f.vendor_id,
        ))

    return out_list


@router.get("/api/findings/{finding_id}", response_model=FindingOut)
async def get_finding(finding_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific finding by ID with full timeline and evidence pair."""
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    timeline_res = await db.execute(
        select(FindingTimeline).where(FindingTimeline.finding_id == finding.id).order_by(FindingTimeline.created_at)
    )
    timelines = timeline_res.scalars().all()

    ep_schema = None
    if finding.evidence_pair and isinstance(finding.evidence_pair, dict):
        ep_schema = EvidencePair(
            policy_quote=finding.evidence_pair.get("policy_quote", ""),
            policy_section=finding.evidence_pair.get("policy_section"),
            code_snippet=finding.evidence_pair.get("code_snippet", ""),
            code_line=finding.evidence_pair.get("code_line"),
            file_path=finding.evidence_pair.get("file_path"),
            conflict_vector=finding.evidence_pair.get("conflict_vector"),
        )

    sf_schema = None
    if finding.suggested_fix and isinstance(finding.suggested_fix, dict):
        sf_schema = SuggestedFix(
            code_patch=finding.suggested_fix.get("code_patch"),
            diff=finding.suggested_fix.get("diff"),
            policy_adjustment=finding.suggested_fix.get("policy_adjustment"),
            explanation=finding.suggested_fix.get("explanation"),
        )

    return FindingOut(
        id=finding.id,
        title=finding.title,
        risk=finding.risk,
        risk_score=finding.risk_score or 0.0,
        confidence=finding.confidence,
        reason=finding.reason,
        recommendation=finding.recommendation,
        policy_reference=finding.policy_reference,
        code_reference=finding.code_reference,
        data_involved=finding.data_involved,
        destination=finding.destination,
        policy_evidence=finding.policy_evidence,
        code_evidence=finding.code_evidence,
        evidence_pair=ep_schema,
        suggested_fix=sf_schema,
        status=finding.status,
        finding_type=finding.finding_type,
        reviewed_by=finding.reviewed_by,
        reviewer_role=finding.reviewer_role,
        review_decision=finding.review_decision,
        review_notes=finding.review_notes,
        reviewed_at=finding.reviewed_at,
        timeline=[FindingTimelineOut.model_validate(t) for t in timelines],
        created_at=finding.created_at,
        policy_id=finding.policy_id,
        code_analysis_id=finding.code_analysis_id,
        vendor_id=finding.vendor_id,
    )


@router.patch("/api/findings/{finding_id}", response_model=FindingOut)
async def update_finding_status(
    finding_id: int,
    request: FindingUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Simple status update."""
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = FindingStatus(request.status.value)
    await db.commit()
    await db.refresh(finding)
    return await get_finding(finding_id, db)


@router.post("/api/findings/{finding_id}/review", response_model=FindingOut)
async def review_finding(
    finding_id: int,
    request: FindingReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Human Review Action by Legal or Security Team:
    - approve: confirms violation
    - reject: marks false-positive and ingests into AI Feedback loop
    - dismiss: waives finding as accepted risk
    - resolve: marks finding as remediated / fixed
    """
    result = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    decision = request.decision.lower()
    now = datetime.utcnow()

    # Map decision to status
    if decision == "approve":
        finding.status = FindingStatus.APPROVED
        stage = "reviewed"
        action = f"Approved violation by {request.reviewer_role}"
    elif decision == "reject":
        finding.status = FindingStatus.REJECTED
        stage = "reviewed"
        action = f"Rejected (False Positive) by {request.reviewer_role}"
        # Ingest into AI Feedback loop to improve future scans!
        feedback_entry = AIFeedback(
            finding_id=finding.id,
            pattern_signature=finding.code_reference or finding.title,
            data_involved=finding.data_involved,
            file_reference=finding.code_reference,
            category=request.feedback_category or "false_positive",
            reason=request.notes or "Marked as false positive by human reviewer",
            reviewer_role=request.reviewer_role,
            is_active=True,
        )
        db.add(feedback_entry)
    elif decision == "dismiss":
        finding.status = FindingStatus.DISMISSED
        stage = "reviewed"
        action = f"Dismissed (Risk Waived) by {request.reviewer_role}"
    elif decision == "resolve":
        finding.status = FindingStatus.RESOLVED
        stage = "fixed"
        action = f"Resolved and verified by {request.reviewer_role}"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid decision: {decision}. Allowed: approve, reject, dismiss, resolve")

    finding.reviewed_by = request.reviewer_name or "Reviewer"
    finding.reviewer_role = request.reviewer_role
    finding.review_decision = decision
    finding.review_notes = request.notes
    finding.reviewed_at = now

    # Add timeline event
    timeline_event = FindingTimeline(
        finding_id=finding.id,
        stage=stage,
        actor=f"{request.reviewer_role} ({finding.reviewed_by})",
        action=action,
        notes=request.notes or f"Decision: {decision.upper()}",
    )
    db.add(timeline_event)

    await db.commit()
    await db.refresh(finding)

    return await get_finding(finding_id, db)


@router.get("/api/findings/{finding_id}/timeline", response_model=List[FindingTimelineOut])
async def get_finding_timeline(finding_id: int, db: AsyncSession = Depends(get_db)):
    """Get the compliance lifecycle timeline for a specific finding."""
    result = await db.execute(
        select(FindingTimeline).where(FindingTimeline.finding_id == finding_id).order_by(FindingTimeline.created_at)
    )
    events = result.scalars().all()
    return [FindingTimelineOut.model_validate(e) for e in events]


# ========== AI Feedback Endpoints ==========

@router.get("/api/feedback", response_model=List[AIFeedbackOut])
async def list_ai_feedback(db: AsyncSession = Depends(get_db)):
    """List all active and inactive learned AI feedback rules."""
    result = await db.execute(select(AIFeedback).order_by(desc(AIFeedback.created_at)))
    feedbacks = result.scalars().all()
    return [AIFeedbackOut.model_validate(f) for f in feedbacks]


@router.post("/api/feedback", response_model=AIFeedbackOut)
async def create_ai_feedback(
    request: AIFeedbackCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Manually add an AI feedback suppression rule."""
    fb = AIFeedback(
        finding_id=request.finding_id,
        pattern_signature=request.pattern_signature,
        data_involved=request.data_involved,
        file_reference=request.file_reference,
        category=request.category,
        reason=request.reason,
        reviewer_role=request.reviewer_role,
        is_active=True,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return AIFeedbackOut.model_validate(fb)


@router.delete("/api/feedback/{feedback_id}")
async def delete_ai_feedback(feedback_id: int, db: AsyncSession = Depends(get_db)):
    """Deactivate or remove an AI feedback rule."""
    result = await db.execute(select(AIFeedback).where(AIFeedback.id == feedback_id))
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback rule not found")
    await db.delete(fb)
    await db.commit()
    return {"message": f"AI feedback rule #{feedback_id} removed."}
