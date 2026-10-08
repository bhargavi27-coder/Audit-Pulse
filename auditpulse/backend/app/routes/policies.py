"""
Policy Analysis Routes
POST /api/policies/analyze  — Analyze policy text using Legal Agent
GET  /api/policies           — List all policies
GET  /api/policies/{id}      — Get policy by ID
POST /api/policies/upload    — Upload a policy file (PDF, TXT, MD)
"""
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.models import Policy, PolicyRule
from app.schemas.schemas import (
    PolicyAnalyzeRequest, PolicyAnalyzeResponse, PolicyOut, PolicyRuleOut
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
) -> Policy:
    """Save policy and extracted rules to the database."""
    policy = Policy(
        name=name,
        content=content,
        version=version,
        file_type=file_type,
    )
    db.add(policy)
    await db.flush()

    for rule_data in rules_data.get("rules", []):
        severity_str = rule_data.get("severity", "MEDIUM").upper()
        from app.models.models import RiskLevel
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
    )

    # Reload with rules
    result = await db.execute(
        select(Policy).where(Policy.id == policy.id)
    )
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
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a policy file (PDF, TXT, or MD) and analyze it."""
    # Validate file type
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.allowed_policy_ext_list:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: {settings.allowed_policy_ext_list}"
        )

    # Validate file size
    content_bytes = await file.read()
    if len(content_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit.")

    # Extract text
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
            created_at=policy.created_at,
            rules=[PolicyRuleOut.model_validate(r) for r in policy_rules],
        ),
        rules_extracted=len(policy_rules),
        analysis_summary=rules_data.get("summary", ""),
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
            file_type=p.file_type, created_at=p.created_at,
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
        file_type=policy.file_type, created_at=policy.created_at,
        rules=[PolicyRuleOut.model_validate(r) for r in rules]
    )
