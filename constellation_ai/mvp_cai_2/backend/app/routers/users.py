from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db, CurrentUser
from app.models.user import User, UserRole
from app.auth.rbac import require_role
from app.schemas.user import UserResponse, UserUpdate, UserListResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser) -> User:
    """Get the current user's profile."""
    return current_user


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = 1,
    page_size: int = 25,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all users (Admin only)."""
    offset = (page - 1) * page_size

    # Get total count
    count_stmt = select(func.count()).select_from(User)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get users
    stmt = select(User).offset(offset).limit(page_size).order_by(User.display_name)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Update a user's role or status (Admin only)."""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent admin from demoting themselves
    if user.id == current_user.id and user_update.role and user_update.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote yourself from admin",
        )

    # Update fields
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user
