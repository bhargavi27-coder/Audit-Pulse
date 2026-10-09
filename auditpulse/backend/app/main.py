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
from app.routes.reports import router as reports_router


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

    ### 12 Enhanced Capabilities
    1. **Policy Analysis**: AI extracts rules and compares policy versions
    2. **Code Analysis**: Identifies affected components and data flows
    3. **Drift Detection**: Detects mismatch continuously & tracks history
    4. **Result**: Compliance Risk Score (0-100) + severity + confidence
    5. **Explanation**: Exact policy sentence <-> exact code line pairing
    6. **Fix**: Concrete suggested fix diffs & patches
    7. **GitHub**: Automated Pull Request gating & comments
    8. **Vendor Monitoring**: Highlights affected application components
    9. **History**: Compliance timeline (detected -> reviewed -> fixed)
    10. **Human Review**: Legal/security approval, rejection, and waiver workflow
    11. **AI Feedback**: False-positive feedback loop to improve future analysis
    12. **Reporting**: Professional executive audit reports & print exports

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
app.include_router(reports_router)


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
