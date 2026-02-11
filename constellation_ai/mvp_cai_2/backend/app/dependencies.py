from typing import Annotated
from uuid import UUID
from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import async_session_factory
from app.config import settings
from app.auth.entra import verify_token, get_token_from_header
from app.models.user import User, UserRole


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user.
    Auto-provisions new users on first login.
    """
    # Get and verify token
    token = get_token_from_header(authorization)
    claims = await verify_token(token)

    # Extract user info from claims
    entra_object_id = claims.get("oid")
    email = claims.get("preferred_username") or claims.get("email")
    display_name = claims.get("name", email)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not extract email from token",
        )

    # Try to find existing user by entra_object_id or email
    query = select(User).where(
        (User.entra_object_id == entra_object_id) | (User.email == email)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # Auto-provision new user
    if not user:
        user = User(
            entra_object_id=entra_object_id,
            email=email,
            display_name=display_name,
            role=UserRole.VIEWER,  # Default role for new users
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif user.entra_object_id is None and entra_object_id:
        # Update entra_object_id if it was missing (e.g., user was created via seed)
        user.entra_object_id = entra_object_id
        await db.commit()

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


async def get_optional_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Dependency to optionally get the current user.
    Returns None if no valid auth is provided.
    """
    if not authorization:
        return None

    try:
        return await get_current_user(request, authorization, db)
    except HTTPException:
        return None


def get_client_ip(request: Request) -> str | None:
    """Extract client IP address from request."""
    # Check for forwarded headers (if behind a proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    # Check for real IP header
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    # Fall back to direct client
    if request.client:
        return request.client.host

    return None


# Type aliases for cleaner dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
