"""
Auth routes: /api/auth/signup, /api/auth/signin, /api/auth/logout, /api/auth/me
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.models import User
from app.schemas.auth_schemas import (
    SignupRequest, SigninRequest, SignupResponse, TokenResponse, UserProfile
)
from app.utils.auth import hash_password, verify_password, create_access_token
from app.utils.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new AuditPulse user account.
    - Validates all fields (via Pydantic)
    - Checks for duplicate email
    - Hashes password with bcrypt
    - Stores user in the database
    - Never returns password hash
    """
    # Duplicate email check
    result = await db.execute(select(User).where(User.email == body.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please sign in instead.",
        )

    # Create user
    new_user = User(
        full_name=body.full_name.strip(),
        email=body.email,
        hashed_password=hash_password(body.password),
        organization=body.organization.strip() if body.organization else None,
        is_active=True,
    )
    db.add(new_user)
    try:
        await db.commit()
        await db.refresh(new_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    return SignupResponse(
        message="Account created successfully. You can now sign in.",
        user=UserProfile.model_validate(new_user),
    )


@router.post("/signin", response_model=TokenResponse)
async def signin(body: SigninRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate an existing user.
    - Looks up user by normalized email
    - Verifies bcrypt password hash
    - Returns a signed JWT access token
    - Uses a generic error message to prevent email enumeration
    """
    # Generic error used for both wrong email AND wrong password (security best practice)
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email address or password. Please try again.",
    )

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None:
        raise auth_error

    if not verify_password(body.password, user.hashed_password):
        raise auth_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact support.",
        )

    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserProfile.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout the current user.
    Client-side: discard the access token from storage.
    Server-side: stateless JWT — token expires naturally.
    """
    return {"message": "Signed out successfully."}


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the authenticated user's safe profile.
    Never returns password hash.
    """
    return UserProfile.model_validate(current_user)
