"""
Vendor Monitoring Routes
POST /api/vendors              — Add a vendor to monitor
GET  /api/vendors              — List all vendors
GET  /api/vendors/{id}         — Get vendor details
POST /api/vendors/{id}/check   — Check vendor policy for changes
DELETE /api/vendors/{id}       — Remove a vendor
POST /api/vendors/demo         — Load demo vendor data
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.models import Vendor, Finding, VendorStatus, RiskLevel
from app.schemas.schemas import VendorCreateRequest, VendorOut, VendorCheckResponse
from app.services.vendor_service import vendor_monitor

router = APIRouter(prefix="/api/vendors", tags=["Vendor Monitoring"])


@router.post("", response_model=VendorOut)
async def create_vendor(
    request: VendorCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Add a vendor URL to monitor."""
    vendor = Vendor(
        name=request.name,
        url=request.url,
        status=VendorStatus.ACTIVE,
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
    Fetches current content, compares with stored version, detects drift.
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
    old_hash = vendor.current_hash or ""

    drift_result = {"drift_detected": False, "changes": [], "summary": "No changes."}

    if old_content:
        drift_result = await vendor_monitor.detect_drift(old_content, new_content)
    else:
        drift_result = {"drift_detected": False, "changes": [], "summary": "Initial content captured."}

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

        finding = Finding(
            vendor_id=vendor_id,
            title=f"Vendor Policy Drift: {vendor.name}",
            risk=RiskLevel(severity),
            confidence=0.85,
            reason=drift_result.get("summary", "Vendor policy content changed."),
            recommendation="Review the vendor policy changes for compliance impact.",
            finding_type="vendor_drift",
            policy_evidence=old_content[:500] if old_content else "",
            code_evidence=new_content[:500],
        )
        db.add(finding)

    await db.commit()
    await db.refresh(vendor)

    return VendorCheckResponse(
        vendor_id=vendor_id,
        drift_detected=drift_result.get("drift_detected", False),
        drift_summary=drift_result,
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
    Load a controlled demo vendor showing a policy drift.
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

    old_hash = vendor_monitor.compute_hash(demo_old)
    new_hash = vendor_monitor.compute_hash(demo_new)

    drift_result = await vendor_monitor.detect_drift(demo_old, demo_new)

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
        )
        db.add(vendor)
        await db.flush()

    vendor.previous_content = demo_old
    vendor.current_content = demo_new
    vendor.current_hash = new_hash
    vendor.last_checked = datetime.utcnow()
    vendor.drift_detected = drift_result.get("drift_detected", True)
    vendor.drift_summary = drift_result

    if drift_result.get("drift_detected"):
        finding = Finding(
            vendor_id=vendor.id,
            title="Vendor Policy Drift: AnalyticsPro (Demo)",
            risk=RiskLevel.HIGH,
            confidence=0.95,
            reason="Retention period changed from 30 to 180 days. Email usage scope expanded. Data sharing with third parties introduced.",
            recommendation="Review the updated AnalyticsPro terms against your internal data processing requirements and GDPR/CCPA obligations.",
            finding_type="vendor_drift",
            policy_evidence=demo_old[:500],
            code_evidence=demo_new[:500],
        )
        db.add(finding)

    await db.commit()

    return {
        "message": "Demo vendor loaded with policy drift.",
        "vendor_id": vendor.id,
        "drift_detected": drift_result.get("drift_detected", True),
        "summary": drift_result.get("summary", ""),
    }
