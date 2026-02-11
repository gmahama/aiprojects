from typing import Callable
from fastapi import HTTPException, status, Depends

from app.models.user import User, UserRole
from app.models.organization import Classification


# Role hierarchy (higher index = more privileges)
ROLE_HIERARCHY = {
    UserRole.VIEWER: 0,
    UserRole.ANALYST: 1,
    UserRole.MANAGER: 2,
    UserRole.ADMIN: 3,
}

# Classification access by role
# INTERNAL: all roles
# CONFIDENTIAL: ANALYST, MANAGER, ADMIN
# RESTRICTED: ADMIN only (for v1)
CLASSIFICATION_ACCESS = {
    Classification.INTERNAL: [UserRole.VIEWER, UserRole.ANALYST, UserRole.MANAGER, UserRole.ADMIN],
    Classification.CONFIDENTIAL: [UserRole.ANALYST, UserRole.MANAGER, UserRole.ADMIN],
    Classification.RESTRICTED: [UserRole.ADMIN],
}


def can_access_classification(user_role: UserRole, classification: Classification) -> bool:
    """Check if a user role can access a given classification level."""
    return user_role in CLASSIFICATION_ACCESS.get(classification, [])


def require_role(*roles: UserRole) -> Callable:
    """
    Dependency factory that checks if the current user has one of the required roles.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(current_user = Depends(require_role(UserRole.ADMIN))):
            ...
    """
    from app.dependencies import get_current_user  # Import here to avoid circular import

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in roles]}",
            )
        return current_user

    return role_checker


def require_classification(classification: Classification) -> Callable:
    """
    Dependency factory that checks if the current user can access a classification level.

    Usage:
        @router.get("/confidential")
        async def confidential_endpoint(current_user = Depends(require_classification(Classification.CONFIDENTIAL))):
            ...
    """
    from app.dependencies import get_current_user  # Import here to avoid circular import

    async def classification_checker(current_user: User = Depends(get_current_user)) -> User:
        if not can_access_classification(current_user.role, classification):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions to access {classification.value} records",
            )
        return current_user

    return classification_checker


def filter_by_classification(user: User) -> list[Classification]:
    """
    Return the list of classifications a user can access.
    Used to filter query results.
    """
    accessible = []
    for classification, roles in CLASSIFICATION_ACCESS.items():
        if user.role in roles:
            accessible.append(classification)
    return accessible
