"""
Vendor Monitoring Routes
POST /api/vendors              — Add a vendor to monitor (with affected components)
GET  /api/vendors              — List all vendors
GET  /api/vendors/{id}         — Get vendor details
POST /api/vendors/{id}/check   — Check vendor policy for changes & report affected components
DELETE /api/vendors/{id}       — Remove a vendor
POST /api/vendors/demo/load    — Load demo vendor data with affected component mapping
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.models import Vendor, Finding, FindingTimeline, VendorStatus, RiskLevel
from app.schemas.schemas import VendorCreateRequest, VendorOut, VendorCheckResponse
from app.services.vendor_service import vendor_monitor

router = APIRouter(prefix="/api/vendors", tags=["Vendor Monitoring"])


def _infer_default_affected_components(name: str) -> List[str]:
    """Default component mapping for common SaaS vendors."""
    name_lower = name.lower()
    if "stripe" in name_lower:
        return ["checkout.js (Payment Gateway)", "BillingService.ts (Subscription Webhooks)", "paymentAPI.py"]
    elif "segment" in name_lower or "mixpanel" in name_lower or "analytics" in name_lower:
        return ["analytics.js (Client Telemetry)", "UserProfileController.ts (User Metadata)", "eventDispatcher.ts"]
    elif "openai" in name_lower or "anthropic" in name_lower or "llm" in name_lower:
        return ["aiService.py (LLM Orchestration)", "copilotController.ts", "ragPipeline.py"]
    elif "sentry" in name_lower or "datadog" in name_lower:
        return ["logger.ts (Error Telemetry)", "telemetryMiddleware.py"]
    else:
        return [f"{name.split()[0].lower()}Client.js (External Integration)", "apiGateway.ts"]


@router.post("", response_model=VendorOut)
async def create_vendor(
    request: VendorCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a vendor URL to monitor with affected application components."""
    components = request.affected_components or _infer_default_affected_components(request.name)

    vendor = Vendor(
        name=request.name,
        url=request.url,
        status=VendorStatus.ACTIVE,
        affected_components=components,
    )
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return VendorOut.model_validate(vendor)


@router.get("", response_model=List[VendorOut])
async def list_vendors(db: AsyncSession = Depends(get_db)):
    """List all monitored vendors."""
    result = await db.execute(select(Vendor).order_by(desc(Vendor.created_at)))
    vendors = result.scalars().all()
    return [VendorOut.model_validate(v) for v in vendors]


@router.get("/{vendor_id}", response_model=VendorOut)
async def get_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)):
    """Get vendor details."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return VendorOut.model_validate(vendor)


@router.post("/{vendor_id}/check", response_model=VendorCheckResponse)
async def check_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Check vendor policy URL for changes.
    Fetches current content, compares with stored version, detects drift,
    and maps drift to affected application components.
    """
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    try:
        new_content = await vendor_monitor.fetch_page_content(vendor.url)
    except Exception as e:
        vendor.status = VendorStatus.ERROR
        await db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch vendor URL: {str(e)}"
        )

    new_hash = vendor_monitor.compute_hash(new_content)
    old_content = vendor.current_content or ""

    drift_result = {"drift_detected": False, "changes": [], "summary": "No changes."}

    if old_content:
        drift_result = await vendor_monitor.detect_drift(old_content, new_content)
    else:
        drift_result = {"drift_detected": False, "changes": [], "summary": "Initial content captured."}

    # Ensure affected components are populated
    affected_comps = vendor.affected_components or _infer_default_affected_components(vendor.name)
    if not vendor.affected_components:
        vendor.affected_components = affected_comps

    # Update vendor record
    vendor.previous_content = old_content or None
    vendor.current_content = new_content
    vendor.current_hash = new_hash
    vendor.last_checked = datetime.utcnow()
    vendor.drift_detected = drift_result.get("drift_detected", False)
    vendor.drift_summary = drift_result

    # Save a finding if drift detected
    if drift_result.get("drift_detected"):
        changes = drift_result.get("changes", [])
        severity = "HIGH" if any(c.get("severity") == "HIGH" for c in changes) else "MEDIUM"
        comps_str = ", ".join(affected_comps)

        finding = Finding(
            vendor_id=vendor_id,
            title=f"Vendor Policy Drift: {vendor.name}",
            risk=RiskLevel(severity),
            risk_score=85.0 if severity == "HIGH" else 55.0,
            confidence=0.90,
            reason=drift_result.get("summary", f"{vendor.name} terms modified. May affect components: {comps_str}"),
            recommendation=f"Review and update downstream data processing and user consent notices in affected components: {comps_str}.",
            finding_type="vendor_drift",
            destination=vendor.name,
            data_involved="Customer Data & PII",
            policy_evidence=old_content[:500] if old_content else "Original vendor agreement terms",
            code_evidence=new_content[:500],
            evidence_pair={
                "policy_quote": old_content[:300] if old_content else "Baseline vendor terms",
                "policy_section": "Vendor Terms of Service",
                "code_snippet": f"Affected Components: {comps_str}",
                "code_line": 1,
                "file_path": affected_comps[0] if affected_comps else "integration.js",
                "conflict_vector": f"Vendor {vendor.name} altered data retention / usage terms affecting {comps_str}"
            },
            suggested_fix={
                "code_patch": f"// Verify vendor consent wrapper in {affected_comps[0] if affected_comps else 'integration.js'}",
                "diff": f"+ // Audit {vendor.name} integration for GDPR Article 28 DPA compliance",
                "policy_adjustment": f"Update Privacy Policy Subprocessor List to reflect new terms from {vendor.name}.",
                "explanation": f"Review and renegotiate DPA with {vendor.name} or adjust data routing in affected components."
            }
        )
        db.add(finding)
        await db.flush()

        # Add timeline event
        timeline_event = FindingTimeline(
            finding_id=finding.id,
            stage="detected",
            actor="Playwright Surveillance Engine",
            action=f"Detected terms drift on {vendor.name}",
            notes=f"Impacts application components: {comps_str}",
        )
        db.add(timeline_event)

    await db.commit()
    await db.refresh(vendor)

    return VendorCheckResponse(
        vendor_id=vendor_id,
        drift_detected=drift_result.get("drift_detected", False),
        drift_summary=drift_result,
        affected_components=affected_comps,
        message=drift_result.get("summary", "Check complete."),
    )


@router.delete("/{vendor_id}")
async def delete_vendor(vendor_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a vendor from monitoring."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.delete(vendor)
    await db.commit()
    return {"message": f"Vendor {vendor_id} removed."}


@router.post("/demo/load")
async def load_demo_vendors(db: AsyncSession = Depends(get_db)):
    """
    Load a controlled demo vendor showing a policy drift and affected component mapping.
    Uses static content from demo files — no external web requests needed.
    """
    demo_old = """AnalyticsPro Data Processing Agreement
Section 4 - Data Retention
Customer data is retained for 30 days after contract termination.
Customer email addresses are used only for service delivery.
Data is not shared with advertising networks."""

    demo_new = """AnalyticsPro Data Processing Agreement (Updated)
Section 4 - Data Retention
Customer data is retained for 180 days after contract termination.
Customer email addresses may be used for service delivery and product improvement.
Aggregated data may be shared with third-party analytics partners."""

    new_hash = vendor_monitor.compute_hash(demo_new)
    drift_result = await vendor_monitor.detect_drift(demo_old, demo_new)

    affected_comps = [
        "analytics.js (AnalyticsPro Event Tracker)",
        "UserProfileController.ts (User Metadata Sync)",
        "dataPipeline.py (Nightly Batch Export)"
    ]

    # Check if demo vendor already exists
    existing = await db.execute(select(Vendor).where(Vendor.name == "AnalyticsPro (Demo)"))
    existing_vendor = existing.scalar_one_or_none()

    if existing_vendor:
        vendor = existing_vendor
    else:
        vendor = Vendor(
            name="AnalyticsPro (Demo)",
            url="https://example.com/analyticspro-tos",
            status=VendorStatus.ACTIVE,
            affected_components=affected_comps,
        )
        db.add(vendor)
        await db.flush()

    vendor.previous_content = demo_old
    vendor.current_content = demo_new
    vendor.current_hash = new_hash
    vendor.last_checked = datetime.utcnow()
    vendor.drift_detected = drift_result.get("drift_detected", True)
    vendor.drift_summary = drift_result
    vendor.affected_components = affected_comps

    if drift_result.get("drift_detected"):
        comps_str = ", ".join(affected_comps)
        finding = Finding(
            vendor_id=vendor.id,
            title="Vendor Policy Drift: AnalyticsPro (Demo)",
            risk=RiskLevel.HIGH,
            risk_score=91.0,
            confidence=0.95,
            reason="Retention period increased from 30 to 180 days. Email usage scope expanded. Data sharing with third-party partners introduced.",
            recommendation=f"Audit application components ({comps_str}) transmitting data to AnalyticsPro. Re-evaluate subprocessor terms against GDPR Art. 28 obligations.",
            finding_type="vendor_drift",
            destination="AnalyticsPro Cloud",
            data_involved="Customer Email & Usage Telemetry",
            policy_evidence=demo_old,
            code_evidence=demo_new,
            evidence_pair={
                "policy_quote": "Customer data is retained for 30 days after contract termination.",
                "policy_section": "AnalyticsPro DPA Section 4",
                "code_snippet": f"Affected Components: {comps_str}",
                "code_line": 1,
                "file_path": "analytics.js",
                "conflict_vector": "Vendor retention changed from 30 to 180 days and expanded email usage without customer notification."
            },
            suggested_fix={
                "code_patch": "// Restrict AnalyticsPro payload scope:\nanalytics.track('event', sanitizeNonPIIPayload(data));",
                "diff": "- analytics.track('user', { email: user.email });\n+ analytics.track('user', { anonymizedId: user.anonId });",
                "policy_adjustment": "Update public privacy policy Section 7 (Subprocessors) to reflect 180-day retention duration.",
                "explanation": "Anonymizes the data sent to AnalyticsPro so the prolonged retention does not hold identifiable customer PII."
            }
        )
        db.add(finding)
        await db.flush()

        timeline_event = FindingTimeline(
            finding_id=finding.id,
            stage="detected",
            actor="Playwright Surveillance Engine",
            action="Detected Terms & Retention Drift on AnalyticsPro (Demo)",
            notes=f"Identified affected application components: {comps_str}",
        )
        db.add(timeline_event)

    await db.commit()

    return {
        "message": "Demo vendor loaded with policy drift and affected component mapping.",
        "vendor_id": vendor.id,
        "drift_detected": drift_result.get("drift_detected", True),
        "affected_components": affected_comps,
        "summary": drift_result.get("summary", ""),
    }
