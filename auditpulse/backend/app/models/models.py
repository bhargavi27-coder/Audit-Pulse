"""
SQLAlchemy ORM Models for AuditPulse
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    ForeignKey, DateTime, JSON, Enum as SAEnum, func
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class RiskLevel(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    COMPLIANT = "COMPLIANT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class FindingStatus(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class VendorStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0")
    content = Column(Text, nullable=False)
    file_type = Column(String(10), default="txt")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    rules = relationship("PolicyRule", back_populates="policy", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="policy")


class PolicyRule(Base):
    __tablename__ = "policy_rules"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=False)
    section = Column(String(50), nullable=True)
    data_type = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    condition = Column(String(255), nullable=True)
    severity = Column(SAEnum(RiskLevel), default=RiskLevel.MEDIUM)
    raw_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    policy = relationship("Policy", back_populates="rules")


class CodeAnalysis(Base):
    __tablename__ = "code_analyses"

    id = Column(Integer, primary_key=True, index=True)
    repository = Column(String(500), nullable=True)
    file_path = Column(String(500), nullable=False)
    language = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    analysis_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    findings = relationship("Finding", back_populates="code_analysis")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    status = Column(SAEnum(VendorStatus), default=VendorStatus.ACTIVE)
    last_checked = Column(DateTime, nullable=True)
    current_hash = Column(String(64), nullable=True)
    current_content = Column(Text, nullable=True)
    previous_content = Column(Text, nullable=True)
    drift_detected = Column(Boolean, default=False)
    drift_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())


class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id"), nullable=True)
    code_analysis_id = Column(Integer, ForeignKey("code_analyses.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    title = Column(String(500), nullable=False)
    risk = Column(SAEnum(RiskLevel), default=RiskLevel.MEDIUM)
    confidence = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)

    policy_reference = Column(String(255), nullable=True)
    code_reference = Column(String(255), nullable=True)

    data_involved = Column(String(255), nullable=True)
    destination = Column(String(255), nullable=True)

    policy_evidence = Column(Text, nullable=True)
    code_evidence = Column(Text, nullable=True)

    status = Column(SAEnum(FindingStatus), default=FindingStatus.OPEN)
    finding_type = Column(String(50), default="policy_code")  # policy_code | vendor_drift | github_pr

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    policy = relationship("Policy", back_populates="findings")
    code_analysis = relationship("CodeAnalysis", back_populates="findings")
