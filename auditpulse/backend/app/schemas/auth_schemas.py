"""
Auth Pydantic Schemas for AuditPulse
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    email: str = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    confirm_password: str = Field(..., description="Must match password")
    organization: Optional[str] = Field(None, max_length=255, description="Company or organization (optional)")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        import re
        v = v.strip().lower()
        pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError("Invalid email address format")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class SigninRequest(BaseModel):
    email: str = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserProfile(BaseModel):
    id: int
    full_name: str
    email: str
    organization: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class SignupResponse(BaseModel):
    message: str
    user: UserProfile
