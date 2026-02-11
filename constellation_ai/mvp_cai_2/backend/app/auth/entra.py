import httpx
from datetime import datetime, timedelta
from typing import Any
from jose import jwt, jwk, JWTError
from fastapi import HTTPException, status

from app.config import settings


# Cache for JWKS
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_time: datetime | None = None
JWKS_CACHE_TTL = timedelta(hours=1)


async def get_jwks() -> dict[str, Any]:
    """Fetch and cache JWKS from Azure AD."""
    global _jwks_cache, _jwks_cache_time

    if _jwks_cache is not None and _jwks_cache_time is not None:
        if datetime.utcnow() - _jwks_cache_time < JWKS_CACHE_TTL:
            return _jwks_cache

    jwks_url = f"https://login.microsoftonline.com/{settings.azure_tenant_id}/discovery/v2.0/keys"

    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = datetime.utcnow()

    return _jwks_cache


def get_token_from_header(authorization: str | None) -> str:
    """Extract token from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return parts[1]


async def verify_token(token: str) -> dict[str, Any]:
    """Verify JWT token from Azure AD."""
    # In dev mode, return mock claims
    if settings.dev_mode:
        return {
            "oid": "dev-user-id",
            "preferred_username": settings.dev_user_email,
            "name": settings.dev_user_name,
            "email": settings.dev_user_email,
        }

    try:
        # Get unverified header to find the key id
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing key id",
            )

        # Get JWKS and find the matching key
        jwks = await get_jwks()
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = k
                break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found",
            )

        # Construct the public key
        public_key = jwk.construct(key)

        # Verify and decode the token
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=settings.azure_client_id,
            issuer=f"https://login.microsoftonline.com/{settings.azure_tenant_id}/v2.0",
        )

        return claims

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
        )
