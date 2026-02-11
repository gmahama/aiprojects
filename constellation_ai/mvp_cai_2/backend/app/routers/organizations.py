from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.organization import Organization
from app.models.tag import OrganizationTag
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action, log_read
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationListResponse,
    OrganizationDetail,
)
from app.schemas.tag import TagResponse

router = APIRouter()


@router.get("", response_model=OrganizationListResponse)
async def list_organizations(
    page: int = 1,
    page_size: int = 25,
    org_type: str | None = None,
    owner_id: UUID | None = None,
    search: str | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List organizations with pagination and filtering."""
    offset = (page - 1) * page_size
    accessible_classifications = filter_by_classification(current_user)

    # Base query
    stmt = select(Organization).where(
        Organization.is_deleted == False,
        Organization.classification.in_(accessible_classifications),
    )

    # Apply filters
    if org_type:
        stmt = stmt.where(Organization.org_type == org_type)
    if owner_id:
        stmt = stmt.where(Organization.owner_id == owner_id)
    if search:
        search_term = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Organization.name).like(search_term)
            | func.lower(Organization.short_name).like(search_term)
        )

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get organizations
    stmt = stmt.offset(offset).limit(page_size).order_by(Organization.name)
    result = await db.execute(stmt)
    organizations = result.scalars().all()

    return {
        "items": organizations,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Organization:
    """Create a new organization."""
    org = Organization(
        name=org_data.name,
        short_name=org_data.short_name,
        org_type=org_data.org_type,
        website=org_data.website,
        notes=org_data.notes,
        classification=org_data.classification,
        owner_id=org_data.owner_id or current_user.id,
        created_by=current_user.id,
    )
    db.add(org)
    await db.flush()

    # Add tags if provided
    if org_data.tag_ids:
        for tag_id in org_data.tag_ids:
            org_tag = OrganizationTag(
                organization_id=org.id,
                tag_id=tag_id,
                tagged_by=current_user.id,
            )
            db.add(org_tag)

    # Log creation
    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="organization",
        entity_id=org.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()
    await db.refresh(org)

    return org


@router.get("/{org_id}", response_model=OrganizationDetail)
async def get_organization(
    org_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get organization details with contacts and tags."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Organization)
        .where(
            Organization.id == org_id,
            Organization.is_deleted == False,
            Organization.classification.in_(accessible_classifications),
        )
        .options(
            selectinload(Organization.owner),
            selectinload(Organization.contacts),
            selectinload(Organization.tags).selectinload(OrganizationTag.tag),
        )
    )
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Log read for CONFIDENTIAL/RESTRICTED
    await log_read(
        db=db,
        user_id=current_user.id,
        entity_type="organization",
        entity_id=org.id,
        classification=org.classification,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    # Build response
    return {
        **org.__dict__,
        "owner": org.owner,
        "contacts": [c for c in org.contacts if not c.is_deleted],
        "tags": [
            TagResponse(
                id=ot.tag.id,
                tag_set_id=ot.tag.tag_set_id,
                value=ot.tag.value,
                is_active=ot.tag.is_active,
                created_at=ot.tag.created_at,
            )
            for ot in org.tags
        ],
    }


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_update: OrganizationUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Organization:
    """Update an organization."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Organization).where(
        Organization.id == org_id,
        Organization.is_deleted == False,
        Organization.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    # Track changes for audit
    changes = {}
    update_data = org_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(org, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(org, field, value)

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="organization",
            entity_id=org.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    await db.refresh(org)

    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete an organization."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Organization).where(
        Organization.id == org_id,
        Organization.is_deleted == False,
        Organization.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    org = result.scalar_one_or_none()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    org.is_deleted = True
    org.deleted_at = datetime.utcnow()

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="organization",
        entity_id=org.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()
