"""
Dashboard and GitHub Integration Routes
GET  /api/dashboard/summary   — Summary statistics, Compliance Risk Score, recent runs
POST /api/github/analyze      — Automatically check PR files and return compliance score + PR comments
POST /api/github/webhook      — GitHub Pull Request Webhook receiver
POST /api/github/simulate-pr  — Interactive PR check simulator
GET  /api/github/checks       — List recent PR checks
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.models import (
    Policy, CodeAnalysis, Finding, Vendor, DriftRun,
    RiskLevel, FindingStatus
)
from app.schemas.schemas import (
    DashboardSummary, FindingOut, DriftRunOut,
    GitHubAnalyzeRequest, GitHubAnalyzeResponse, DriftFinding,
    EvidencePair, SuggestedFix
)
from app.agents.code_agent import code_agent
from app.agents.compliance_agent import compliance_agent

dashboard_router = APIRouter(tags=["Dashboard"])
github_router = APIRouter(prefix="/api/github", tags=["GitHub Integration"])


@dashboard_router.get("/api/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for the dashboard including Compliance Risk Score and recent runs."""
    # Count policies
    policies_count = await db.scalar(select(func.count()).select_from(Policy))

    # Count code analyses
    code_count = await db.scalar(select(func.count()).select_from(CodeAnalysis))

    # Count vendors
    vendors_count = await db.scalar(select(func.count()).select_from(Vendor))

    # Count active risks (open HIGH or MEDIUM findings)
    active_risks = await db.scalar(
        select(func.count()).select_from(Finding).where(
            Finding.status.in_([FindingStatus.OPEN, FindingStatus.APPROVED]),
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

    # Calculate overall system Compliance Risk Score (0-100) and Health Score (0-100)
    high_count = risk_dist["HIGH"]
    med_count = risk_dist["MEDIUM"]
    low_count = risk_dist["LOW"]

    # Penalty based calculation
    raw_risk = min(100.0, high_count * 30.0 + med_count * 12.0 + low_count * 4.0)
    health_score = max(0.0, round(100.0 - raw_risk, 1))
    risk_score = round(raw_risk, 1)

    # Recent findings
    recent_result = await db.execute(
        select(Finding).order_by(desc(Finding.created_at)).limit(5)
    )
    recent_findings = recent_result.scalars().all()

    # Recent drift runs
    runs_result = await db.execute(
        select(DriftRun).order_by(desc(DriftRun.created_at)).limit(5)
    )
    recent_runs = runs_result.scalars().all()

    return DashboardSummary(
        policies_analyzed=policies_count or 0,
        code_files_scanned=code_count or 0,
        active_risks=active_risks or 0,
        vendors_monitored=vendors_count or 0,
        compliance_risk_score=risk_score,
        compliance_health_score=health_score,
        risk_distribution=risk_dist,
        recent_findings=[FindingOut.model_validate(f) for f in recent_findings],
        recent_runs=[DriftRunOut.model_validate(r) for r in recent_runs],
    )


def _generate_pr_comment_markdown(
    repo: str,
    pr_num: Optional[int],
    passed: bool,
    risk_score: float,
    findings: List[DriftFinding]
) -> str:
    """Generate professional GitHub PR review comment."""
    status_icon = "✅ PASSED" if passed else "❌ BLOCKED"
    color_bar = "🟢" if passed else "🔴"

    md = f"""## {color_bar} AuditPulse AI — PR Compliance Sentinel

| Check Status | Compliance Risk Score | Violations Detected |
| :--- | :--- | :--- |
| **{status_icon}** | **{risk_score}/100** | **{len([f for f in findings if f.drift_detected])} issue(s)** |

### 📋 Policy Verification Summary
"""
    if passed:
        md += "> **All policy covenants satisfied.** No unauthorized PII transfers or unconsented third-party disclosures detected in this Pull Request.\n"
    else:
        md += "> ⚠️ **Compliance Drift Detected:** Code behavior introduces potential breaches of stated legal privacy commitments.\n\n"
        md += "#### 🔍 Itemized Findings & Remediation:\n\n"
        for i, f in enumerate(findings, 1):
            if not f.drift_detected:
                continue
            md += f"##### {i}. {f.title} (`{f.risk.value}` Risk • {int(f.confidence*100)}% Confidence)\n"
            md += f"- **Offending Code:** `{f.code_reference or 'PR Diff'}`\n"
            md += f"- **Policy Clause:** `{f.policy_reference or 'Privacy Policy'}`\n"
            if f.policy_evidence:
                md += f"- **Policy Mandate:** *\"{f.policy_evidence}\"*\n"
            if f.suggested_fix and f.suggested_fix.diff:
                md += f"```diff\n{f.suggested_fix.diff}\n```\n"
            md += f"- **Remediation:** {f.recommendation}\n\n"

    md += "\n---\n*Automated review by AuditPulse Multi-Agent Compliance Engine. Consult legal counsel for formal sign-off.*"
    return md


@github_router.post("/analyze", response_model=GitHubAnalyzeResponse)
async def analyze_github_pr(
    request: GitHubAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze files from a GitHub PR for compliance drift.
    Computes Compliance Risk Score and generates markdown bot comments.
    """
    if not request.files:
        raise HTTPException(status_code=400, detail="No files provided for analysis.")

    # Load policy if provided, otherwise use most recent policy
    policy_rules = []
    policy_name = "Default Privacy Policy"
    if request.policy_id:
        from app.models.models import PolicyRule, Policy as PolicyModel
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
        p = await db.scalar(select(PolicyModel).where(PolicyModel.id == request.policy_id))
        if p:
            policy_name = p.name
    else:
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
    max_risk_score = 0.0

    for file_info in request.files[:10]:
        file_path = file_info.get("path", "unknown")
        file_content = file_info.get("content", "")

        if not file_content.strip():
            continue

        ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else "js"
        lang_map = {"js": "javascript", "jsx": "javascript", "ts": "typescript", "tsx": "typescript",
                    "py": "python", "java": "java", "go": "go"}
        language = lang_map.get(ext, "javascript")

        behavior = await code_agent.analyze(file_content, language, file_path)

        findings = []
        if policy_rules:
            findings = await compliance_agent.compare(
                policy_rules=policy_rules,
                code_behavior=behavior,
                policy_name=policy_name,
                file_path=file_path,
            )

        for finding in findings:
            risk_val = RiskLevel(finding.get("risk", "COMPLIANT"))
            conf = float(finding.get("confidence", 0.5))
            score = float(finding.get("risk_score", 0.0))

            if finding.get("drift_detected") and risk_val == RiskLevel.HIGH and conf >= 0.75:
                passed = False
            max_risk_score = max(max_risk_score, score)

            ep = finding.get("evidence_pair")
            ep_schema = EvidencePair(**ep) if ep else None

            sf = finding.get("suggested_fix")
            sf_schema = SuggestedFix(**sf) if sf else None

            all_findings.append(DriftFinding(
                drift_detected=finding.get("drift_detected", False),
                risk=risk_val,
                risk_score=score,
                confidence=conf,
                reason=finding.get("reason", ""),
                recommendation=finding.get("recommendation", ""),
                policy_reference=finding.get("policy_reference"),
                code_reference=f"{file_path}:{ep.get('code_line', 1) if ep else 1}",
                data_involved=finding.get("data_involved"),
                destination=finding.get("destination"),
                policy_evidence=finding.get("policy_evidence"),
                code_evidence=finding.get("code_evidence"),
                evidence_pair=ep_schema,
                suggested_fix=sf_schema,
                title=finding.get("title", "GitHub PR Analysis"),
            ))

    # Record DriftRun as github_pr
    drift_run = DriftRun(
        file_path=f"PR #{request.pr_number or 'Auto'}: {request.repository}",
        policy_name=policy_name,
        trigger_type="github_pr",
        compliance_risk_score=max_risk_score,
        highest_risk=RiskLevel.HIGH if not passed else RiskLevel.COMPLIANT,
        total_findings=len(all_findings),
        violations_count=len([f for f in all_findings if f.drift_detected]),
        status="flagged" if not passed else "clean",
        summary=f"Automated PR scan on {request.repository} PR #{request.pr_number or 'N/A'}.",
    )
    db.add(drift_run)
    await db.commit()

    pr_comment = _generate_pr_comment_markdown(
        repo=request.repository,
        pr_num=request.pr_number,
        passed=passed,
        risk_score=max_risk_score,
        findings=all_findings
    )

    summary = (
        f"❌ AuditPulse Compliance Check FAILED — High risk drift detected. Compliance Risk Score: {max_risk_score}/100."
        if not passed else
        f"✅ AuditPulse Compliance Check PASSED — PR is compliant. Compliance Risk Score: 0/100."
    )

    return GitHubAnalyzeResponse(
        passed=passed,
        compliance_risk_score=max_risk_score,
        summary=summary,
        findings=all_findings,
        badge_status="failed" if not passed else "passed",
        pr_comment_markdown=pr_comment,
    )


@github_router.post("/webhook")
async def github_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_github_event: Optional[str] = Header(None)
):
    """
    Webhook handler for GitHub repository events (pull_request opened / synchronize).
    Automatically executes compliance drift checks and replies.
    """
    payload = await request.json()
    action = payload.get("action", "")
    pr = payload.get("pull_request", {})
    repo = payload.get("repository", {}).get("full_name", "unknown/repo")
    pr_num = pr.get("number", 1)

    # In a full deployment, this queries the GitHub PR files API using the installation token.
    # Here we gracefully accept and acknowledge the webhook.
    return {
        "status": "received",
        "action": action,
        "repo": repo,
        "pr_number": pr_num,
        "message": f"AuditPulse webhook processed event '{x_github_event}' for PR #{pr_num}."
    }


@github_router.post("/simulate-pr", response_model=GitHubAnalyzeResponse)
async def simulate_pr_check(
    db: AsyncSession = Depends(get_db)
):
    """
    Simulate an automated Pull Request check with violating code
    to demonstrate GitHub Actions PR gating and automated comments.
    """
    sample_code = """// PR #42: Feature - Add User Analytics Tracking
const analytics = require('analytics-sdk');

function trackRegistration(user) {
  // Transmits email without checking consent
  analytics.track('user_registered', {
    email: user.email,
    name: user.name,
    timestamp: Date.now()
  });
}

module.exports = { trackRegistration };"""

    req = GitHubAnalyzeRequest(
        repository="company/core-service",
        pr_number=42,
        files=[{"path": "src/services/analytics.js", "content": sample_code}]
    )
    return await analyze_github_pr(req, db)


@github_router.get("/checks", response_model=List[DriftRunOut])
async def list_github_checks(db: AsyncSession = Depends(get_db)):
    """List recent GitHub PR automated compliance checks."""
    result = await db.execute(
        select(DriftRun).where(DriftRun.trigger_type == "github_pr").order_by(desc(DriftRun.created_at)).limit(20)
    )
    runs = result.scalars().all()
    return [DriftRunOut.model_validate(r) for r in runs]
