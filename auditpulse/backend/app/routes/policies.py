"""
Policy Analysis Routes
POST /api/policies/analyze          — Analyze policy text using Legal Agent
GET  /api/policies                  — List all policies
GET  /api/policies/{id}             — Get policy by ID
POST /api/policies/upload           — Upload a policy file (PDF, TXT, MD)
POST /api/policies/compare-versions — Compare two policy versions (added, removed, modified rules)
"""
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.models import Policy, PolicyRule, RiskLevel
from app.schemas.schemas import (
    PolicyAnalyzeRequest, PolicyAnalyzeResponse, PolicyOut, PolicyRuleOut,
    PolicyCompareRequest, PolicyVersionCompareResponse
)
from app.agents.legal_agent import legal_agent
from app.config import settings

router = APIRouter(prefix="/api/policies", tags=["Policy Analysis"])


async def _save_policy_and_rules(
    db: AsyncSession,
    name: str,
    content: str,
    version: str,
    file_type: str,
    rules_data: dict,
    parent_policy_id: Optional[int] = None,
    version_notes: Optional[str] = None,
) -> Policy:
    """Save policy and extracted rules to the database."""
    policy = Policy(
        name=name,
        content=content,
        version=version,
        file_type=file_type,
        parent_policy_id=parent_policy_id,
        version_notes=version_notes,
    )
    db.add(policy)
    await db.flush()

    for rule_data in rules_data.get("rules", []):
        severity_str = rule_data.get("severity", "MEDIUM").upper()
        try:
            severity = RiskLevel(severity_str)
        except ValueError:
            severity = RiskLevel.MEDIUM

        rule = PolicyRule(
            policy_id=policy.id,
            section=rule_data.get("section"),
            data_type=rule_data.get("data_type", "unknown"),
            action=rule_data.get("action", "unknown"),
            destination=rule_data.get("destination", "unknown"),
            condition=rule_data.get("condition"),
            severity=severity,
            raw_text=rule_data.get("raw_text"),
        )
        db.add(rule)

    await db.commit()
    await db.refresh(policy)
    return policy


@router.post("/analyze", response_model=PolicyAnalyzeResponse)
async def analyze_policy(
    request: PolicyAnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Analyze a policy text and extract structured compliance rules."""
    rules_data = await legal_agent.analyze(request.content)

    policy = await _save_policy_and_rules(
        db=db,
        name=request.name,
        content=request.content,
        version=request.version or "1.0",
        file_type="txt",
        rules_data=rules_data,
        parent_policy_id=request.parent_policy_id,
        version_notes=request.version_notes,
    )

    # Reload with rules
    result = await db.execute(select(Policy).where(Policy.id == policy.id))
    policy_with_rules = result.scalar_one()

    rules_result = await db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == policy.id)
    )
    policy_rules = rules_result.scalars().all()

    return PolicyAnalyzeResponse(
        policy=PolicyOut(
            id=policy_with_rules.id,
            name=policy_with_rules.name,
            version=policy_with_rules.version,
            content=policy_with_rules.content,
            file_type=policy_with_rules.file_type,
            parent_policy_id=policy_with_rules.parent_policy_id,
            version_notes=policy_with_rules.version_notes,
            created_at=policy_with_rules.created_at,
            rules=[PolicyRuleOut.model_validate(r) for r in policy_rules],
        ),
        rules_extracted=len(policy_rules),
        analysis_summary=rules_data.get("summary", ""),
    )


@router.post("/upload", response_model=PolicyAnalyzeResponse)
async def upload_policy(
    name: str = Form(...),
    version: str = Form("1.0"),
    parent_policy_id: Optional[int] = Form(None),
    version_notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a policy file (PDF, TXT, or MD) and analyze it."""
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.allowed_policy_ext_list:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: {settings.allowed_policy_ext_list}"
        )

    content_bytes = await file.read()
    if len(content_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit.")

    if file_ext == ".pdf":
        text = _extract_pdf_text(content_bytes)
    else:
        text = content_bytes.decode("utf-8", errors="replace")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from uploaded file.")

    rules_data = await legal_agent.analyze(text)

    policy = await _save_policy_and_rules(
        db=db,
        name=name,
        content=text,
        version=version,
        file_type=file_ext.lstrip("."),
        rules_data=rules_data,
        parent_policy_id=parent_policy_id,
        version_notes=version_notes,
    )

    rules_result = await db.execute(
        select(PolicyRule).where(PolicyRule.policy_id == policy.id)
    )
    policy_rules = rules_result.scalars().all()

    return PolicyAnalyzeResponse(
        policy=PolicyOut(
            id=policy.id,
            name=policy.name,
            version=policy.version,
            content=policy.content,
            file_type=policy.file_type,
            parent_policy_id=policy.parent_policy_id,
            version_notes=policy.version_notes,
            created_at=policy.created_at,
            rules=[PolicyRuleOut.model_validate(r) for r in policy_rules],
        ),
        rules_extracted=len(policy_rules),
        analysis_summary=rules_data.get("summary", ""),
    )


@router.post("/compare-versions", response_model=PolicyVersionCompareResponse)
async def compare_policy_versions(
    request: PolicyCompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Compare two versions of a policy:
    Identifies added, removed, and modified rules, and assesses compliance risk drift between versions.
    """
    # Load Policy A
    res_a = await db.execute(select(Policy).where(Policy.id == request.policy_id_a))
    policy_a = res_a.scalar_one_or_none()
    if not policy_a:
        raise HTTPException(status_code=404, detail=f"Policy {request.policy_id_a} not found")

    rules_a_res = await db.execute(select(PolicyRule).where(PolicyRule.policy_id == policy_a.id))
    rules_a = rules_a_res.scalars().all()
    rules_a_data = [PolicyRuleOut.model_validate(r).model_dump() for r in rules_a]

    # Load or parse Policy B
    if request.policy_id_b:
        res_b = await db.execute(select(Policy).where(Policy.id == request.policy_id_b))
        policy_b = res_b.scalar_one_or_none()
        if not policy_b:
            raise HTTPException(status_code=404, detail=f"Policy {request.policy_id_b} not found")
        b_name = policy_b.name
        b_version = policy_b.version
        b_content = policy_b.content
        rules_b_res = await db.execute(select(PolicyRule).where(PolicyRule.policy_id == policy_b.id))
        rules_b = rules_b_res.scalars().all()
        rules_b_data = [PolicyRuleOut.model_validate(r).model_dump() for r in rules_b]
    elif request.new_content:
        b_name = f"{policy_a.name} (Updated)"
        b_version = request.new_version or "2.0"
        b_content = request.new_content
        b_rules_res = await legal_agent.analyze(b_content)
        rules_b_data = b_rules_res.get("rules", [])
    else:
        raise HTTPException(status_code=400, detail="Must provide policy_id_b or new_content for version comparison.")

    diff_result = await legal_agent.compare_versions(
        policy_a_name=policy_a.name,
        policy_a_version=policy_a.version,
        policy_a_text=policy_a.content,
        policy_b_name=b_name,
        policy_b_version=b_version,
        policy_b_text=b_content,
        rules_a=rules_a_data,
        rules_b=rules_b_data,
    )

    # Format added and removed rules into PolicyRuleOut
    added_rules = []
    for r in diff_result.get("added_rules", []):
        try:
            sev = RiskLevel(r.get("severity", "MEDIUM").upper())
        except ValueError:
            sev = RiskLevel.MEDIUM
        added_rules.append(PolicyRuleOut(
            section=r.get("section", "N/A"),
            data_type=r.get("data_type", "data"),
            action=r.get("action", "action"),
            destination=r.get("destination", "destination"),
            condition=r.get("condition"),
            severity=sev,
            raw_text=r.get("raw_text")
        ))

    removed_rules = []
    for r in diff_result.get("removed_rules", []):
        try:
            sev = RiskLevel(r.get("severity", "MEDIUM").upper())
        except ValueError:
            sev = RiskLevel.MEDIUM
        removed_rules.append(PolicyRuleOut(
            section=r.get("section", "N/A"),
            data_type=r.get("data_type", "data"),
            action=r.get("action", "action"),
            destination=r.get("destination", "destination"),
            condition=r.get("condition"),
            severity=sev,
            raw_text=r.get("raw_text")
        ))

    return PolicyVersionCompareResponse(
        policy_a_name=policy_a.name,
        policy_a_version=policy_a.version,
        policy_b_name=b_name,
        policy_b_version=b_version,
        risk_impact=diff_result.get("risk_impact", "NEUTRAL"),
        summary=diff_result.get("summary", ""),
        added_rules=added_rules,
        removed_rules=removed_rules,
        modified_rules=diff_result.get("modified_rules", []),
        detailed_diff=diff_result.get("detailed_diff", "")
    )


def _extract_pdf_text(content_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse PDF: {str(e)}")


@router.get("", response_model=List[PolicyOut])
async def list_policies(db: AsyncSession = Depends(get_db)):
    """List all analyzed policies."""
    result = await db.execute(select(Policy).order_by(desc(Policy.created_at)))
    policies = result.scalars().all()
    policy_list = []
    for p in policies:
        rules_result = await db.execute(select(PolicyRule).where(PolicyRule.policy_id == p.id))
        rules = rules_result.scalars().all()
        policy_list.append(PolicyOut(
            id=p.id, name=p.name, version=p.version, content=p.content,
            file_type=p.file_type, parent_policy_id=p.parent_policy_id,
            version_notes=p.version_notes, created_at=p.created_at,
            rules=[PolicyRuleOut.model_validate(r) for r in rules]
        ))
    return policy_list


@router.get("/{policy_id}", response_model=PolicyOut)
async def get_policy(policy_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific policy by ID."""
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    rules_result = await db.execute(select(PolicyRule).where(PolicyRule.policy_id == policy_id))
    rules = rules_result.scalars().all()

    return PolicyOut(
        id=policy.id, name=policy.name, version=policy.version, content=policy.content,
        file_type=policy.file_type, parent_policy_id=policy.parent_policy_id,
        version_notes=policy.version_notes, created_at=policy.created_at,
        rules=[PolicyRuleOut.model_validate(r) for r in rules]
    )
