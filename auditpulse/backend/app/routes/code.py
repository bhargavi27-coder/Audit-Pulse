"""
Code Analysis Routes
POST /api/code/analyze   — Analyze source code using Code Agent + AST
POST /api/code/upload    — Upload source file for analysis
GET  /api/code           — List all code analyses
GET  /api/code/{id}      — Get analysis by ID
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.models import CodeAnalysis
from app.schemas.schemas import (
    CodeAnalyzeRequest, CodeAnalyzeResponse, CodeBehavior, DataFlow, SupportedLanguage
)
from app.agents.code_agent import code_agent
from app.config import settings

router = APIRouter(prefix="/api/code", tags=["Code Analysis"])


async def _run_and_save(
    db: AsyncSession,
    content: str,
    language: str,
    file_path: str,
    repository: str | None = None,
) -> tuple[CodeAnalysis, dict]:
    """Run code agent and save results to DB."""
    behavior = await code_agent.analyze(content, language, file_path)

    analysis = CodeAnalysis(
        repository=repository,
        file_path=file_path,
        language=language,
        content=content,
        analysis_result=behavior,
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    return analysis, behavior


def _behavior_to_schema(behavior: dict) -> CodeBehavior:
    """Map raw behavior dict to Pydantic schema with affected components and data flows."""
    findings = behavior.get("findings", [])
    raw_flows = behavior.get("data_flows", [])

    data_flows = []
    for f in raw_flows:
        if isinstance(f, dict):
            data_flows.append(DataFlow(
                id=f.get("id", "DF-01"),
                source=f.get("source", "User Input"),
                transform=f.get("transform"),
                sink=f.get("sink", "External SDK"),
                data_sensitivity=f.get("data_sensitivity", "PII / High"),
                consent_guarded=bool(f.get("consent_guarded", False)),
                component=f.get("component", "Application Controller"),
                line=f.get("line"),
            ))

    return CodeBehavior(
        data_types=behavior.get("sensitive_data", []),
        actions=behavior.get("actions", []),
        destinations=behavior.get("destinations", []),
        third_party_sdks=behavior.get("third_party_sdks", []),
        api_calls=behavior.get("api_calls", []),
        sensitive_data=behavior.get("sensitive_data_found", behavior.get("sensitive_data", [])),
        network_requests=behavior.get("network_requests", []),
        logging_events=behavior.get("logging_events", []),
        storage_operations=behavior.get("storage_operations", []),
        affected_components=behavior.get("affected_components", []),
        data_flows=data_flows,
        findings_raw=findings,
    )


@router.post("/analyze", response_model=CodeAnalyzeResponse)
async def analyze_code(
    request: CodeAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Analyze source code for compliance-relevant behaviors, affected components, and data flows."""
    analysis, behavior = await _run_and_save(
        db=db,
        content=request.content,
        language=request.language.value,
        file_path=request.file_path,
        repository=request.repository,
    )

    return CodeAnalyzeResponse(
        id=analysis.id,
        file_path=analysis.file_path,
        language=analysis.language,
        behavior=_behavior_to_schema(behavior),
        ast_used=behavior.get("ast_used", False),
        created_at=analysis.created_at,
    )


@router.post("/upload", response_model=CodeAnalyzeResponse)
async def upload_code(
    language: str = Form("javascript"),
    repository: str = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a source file and analyze it."""
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in settings.allowed_code_ext_list:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Allowed: {settings.allowed_code_ext_list}"
        )

    content_bytes = await file.read()
    if len(content_bytes) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_size_mb}MB limit.")

    content = content_bytes.decode("utf-8", errors="replace")

    # Auto-detect language from extension if not specified
    ext_to_lang = {".js": "javascript", ".jsx": "javascript", ".ts": "typescript",
                   ".tsx": "typescript", ".py": "python", ".java": "java", ".go": "go"}
    detected_lang = ext_to_lang.get(file_ext, language)

    analysis, behavior = await _run_and_save(
        db=db,
        content=content,
        language=detected_lang,
        file_path=file.filename,
        repository=repository,
    )

    return CodeAnalyzeResponse(
        id=analysis.id,
        file_path=analysis.file_path,
        language=analysis.language,
        behavior=_behavior_to_schema(behavior),
        ast_used=behavior.get("ast_used", False),
        created_at=analysis.created_at,
    )


@router.get("", response_model=List[dict])
async def list_analyses(db: AsyncSession = Depends(get_db)):
    """List all code analyses."""
    result = await db.execute(
        select(CodeAnalysis).order_by(desc(CodeAnalysis.created_at)).limit(50)
    )
    analyses = result.scalars().all()
    return [
        {
            "id": a.id,
            "file_path": a.file_path,
            "language": a.language,
            "repository": a.repository,
            "created_at": a.created_at.isoformat(),
        }
        for a in analyses
    ]


@router.get("/{analysis_id}")
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific code analysis by ID."""
    result = await db.execute(select(CodeAnalysis).where(CodeAnalysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Code analysis not found")

    behavior = analysis.analysis_result or {}
    return CodeAnalyzeResponse(
        id=analysis.id,
        file_path=analysis.file_path,
        language=analysis.language,
        behavior=_behavior_to_schema(behavior),
        ast_used=behavior.get("ast_used", False),
        created_at=analysis.created_at,
    )
