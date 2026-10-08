"""
AuditPulse FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.database import create_tables
from app.routes.policies import router as policies_router
from app.routes.code import router as code_router
from app.routes.compliance import router as compliance_router
from app.routes.vendors import router as vendors_router
from app.routes.dashboard import dashboard_router, github_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — create tables on startup."""
    await create_tables()
    yield


app = FastAPI(
    title="AuditPulse API",
    description="""
    ## AuditPulse — AI-Powered Legal & Code Compliance Drift Detection

    Detects mismatches between company policies and actual source code behavior.

    ### Core Flow
    1. **Policy Analysis** → Extract compliance rules from policy documents
    2. **Code Analysis** → Analyze source code for compliance-relevant behaviors  
    3. **Compliance Comparison** → Detect policy-code drift using multi-agent AI
    4. **Evidence Documentation** → Precise, evidence-based findings

    ⚠️ *AuditPulse provides AI-assisted compliance analysis and does not replace professional legal advice.*
    """,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ===== Middleware =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Routes =====
app.include_router(policies_router)
app.include_router(code_router)
app.include_router(compliance_router)
app.include_router(vendors_router)
app.include_router(dashboard_router)
app.include_router(github_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": "AuditPulse",
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "provider": settings.ai_provider,
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "ai_provider": settings.ai_provider}
