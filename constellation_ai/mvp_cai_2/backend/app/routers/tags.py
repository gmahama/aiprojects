from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser
from app.models.user import User, UserRole
from app.models.tag import TagSet, Tag, ContactTag, OrganizationTag, ActivityTag
from app.auth.rbac import require_role
from app.schemas.tag import (
    TagSetCreate,
    TagSetResponse,
    TagCreate,
    TagUpdate,
    TagResponse,
    TagSetWithTags,
)

router = APIRouter()


@router.get("/tag-sets", response_model=list[TagSetWithTags])
async def list_tag_sets(
    include_inactive: bool = False,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> list:
    """List all tag sets with their tags."""
    stmt = select(TagSet).options(selectinload(TagSet.tags))

    if not include_inactive:
        stmt = stmt.where(TagSet.is_active == True)

    stmt = stmt.order_by(TagSet.name)
    result = await db.execute(stmt)
    tag_sets = result.scalars().all()

    return [
        TagSetWithTags(
            id=ts.id,
            name=ts.name,
            description=ts.description,
            is_active=ts.is_active,
            created_at=ts.created_at,
            tags=[
                TagResponse(
                    id=t.id,
                    tag_set_id=t.tag_set_id,
                    value=t.value,
                    is_active=t.is_active,
                    created_at=t.created_at,
                )
                for t in ts.tags
                if include_inactive or t.is_active
            ],
        )
        for ts in tag_sets
    ]


@router.post("/tag-sets", response_model=TagSetResponse, status_code=status.HTTP_201_CREATED)
async def create_tag_set(
    tag_set_data: TagSetCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> TagSet:
    """Create a new tag set (Admin only)."""
    # Check if name already exists
    stmt = select(TagSet).where(func.lower(TagSet.name) == tag_set_data.name.lower())
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag set with this name already exists",
        )

    tag_set = TagSet(
        name=tag_set_data.name,
        description=tag_set_data.description,
    )
    db.add(tag_set)
    await db.commit()
    await db.refresh(tag_set)

    return tag_set


@router.post("/tag-sets/{tag_set_id}/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_set_id: UUID,
    tag_data: TagCreate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Tag:
    """Add a tag to a tag set (Admin only)."""
    # Verify tag set exists
    stmt = select(TagSet).where(TagSet.id == tag_set_id)
    result = await db.execute(stmt)
    tag_set = result.scalar_one_or_none()

    if not tag_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag set not found",
        )

    # Check if tag value already exists in this set
    stmt = select(Tag).where(
        Tag.tag_set_id == tag_set_id,
        func.lower(Tag.value) == tag_data.value.lower(),
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this value already exists in this tag set",
        )

    tag = Tag(
        tag_set_id=tag_set_id,
        value=tag_data.value,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)

    return tag


@router.patch("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: UUID,
    tag_update: TagUpdate,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Tag:
    """Update or deactivate a tag (Admin only)."""
    stmt = select(Tag).where(Tag.id == tag_id)
    result = await db.execute(stmt)
    tag = result.scalar_one_or_none()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    update_data = tag_update.model_dump(exclude_unset=True)

    # If updating value, check for duplicates
    if "value" in update_data:
        stmt = select(Tag).where(
            Tag.tag_set_id == tag.tag_set_id,
            Tag.id != tag_id,
            func.lower(Tag.value) == update_data["value"].lower(),
        )
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tag with this value already exists in this tag set",
            )

    for field, value in update_data.items():
        setattr(tag, field, value)

    await db.commit()
    await db.refresh(tag)

    return tag


@router.get("/tags/{tag_id}/usage", response_model=dict)
async def get_tag_usage(
    tag_id: UUID,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get usage count for a tag (Admin only)."""
    # Count contacts using this tag
    contact_count = await db.execute(
        select(func.count()).select_from(ContactTag).where(ContactTag.tag_id == tag_id)
    )

    # Count organizations using this tag
    org_count = await db.execute(
        select(func.count()).select_from(OrganizationTag).where(OrganizationTag.tag_id == tag_id)
    )

    # Count activities using this tag
    activity_count = await db.execute(
        select(func.count()).select_from(ActivityTag).where(ActivityTag.tag_id == tag_id)
    )

    return {
        "tag_id": tag_id,
        "contacts": contact_count.scalar(),
        "organizations": org_count.scalar(),
        "activities": activity_count.scalar(),
        "total": contact_count.scalar() + org_count.scalar() + activity_count.scalar(),
    }
