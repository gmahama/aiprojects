from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.contact import Contact
from app.models.tag import Tag, ContactTag
from app.models.activity import ActivityAttendee, Activity
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action, log_read
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
    ContactDetail,
)
from app.schemas.tag import TagResponse

router = APIRouter()


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    page: int = 1,
    page_size: int = 25,
    organization_id: UUID | None = None,
    owner_id: UUID | None = None,
    tag_ids: str | None = None,  # comma-separated UUIDs
    search: str | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List contacts with pagination and filtering."""
    offset = (page - 1) * page_size
    accessible_classifications = filter_by_classification(current_user)

    # Base query
    stmt = (
        select(Contact)
        .where(
            Contact.is_deleted == False,
            Contact.classification.in_(accessible_classifications),
        )
        .options(selectinload(Contact.organization))
    )

    # Apply filters
    if organization_id:
        stmt = stmt.where(Contact.organization_id == organization_id)
    if owner_id:
        stmt = stmt.where(Contact.owner_id == owner_id)
    if search:
        search_term = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Contact.first_name).like(search_term)
            | func.lower(Contact.last_name).like(search_term)
            | func.lower(Contact.email).like(search_term)
        )
    if tag_ids:
        tag_id_list = [UUID(tid.strip()) for tid in tag_ids.split(",")]
        stmt = stmt.join(ContactTag).where(ContactTag.tag_id.in_(tag_id_list))

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get contacts
    stmt = stmt.offset(offset).limit(page_size).order_by(Contact.last_name, Contact.first_name)
    result = await db.execute(stmt)
    contacts = result.scalars().all()

    return {
        "items": contacts,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    contact_data: ContactCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Contact:
    """Create a new contact."""
    contact = Contact(
        first_name=contact_data.first_name,
        last_name=contact_data.last_name,
        email=contact_data.email,
        phone=contact_data.phone,
        title=contact_data.title,
        organization_id=contact_data.organization_id,
        classification=contact_data.classification,
        owner_id=contact_data.owner_id or current_user.id,
        notes=contact_data.notes,
        created_by=current_user.id,
    )
    db.add(contact)
    await db.flush()

    # Add tags if provided
    if contact_data.tag_ids:
        for tag_id in contact_data.tag_ids:
            contact_tag = ContactTag(
                contact_id=contact.id,
                tag_id=tag_id,
                tagged_by=current_user.id,
            )
            db.add(contact_tag)

    # Log creation
    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="contact",
        entity_id=contact.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()

    # Re-query with eager loading to avoid async lazy-load issues
    stmt = (
        select(Contact)
        .where(Contact.id == contact.id)
        .options(
            selectinload(Contact.organization),
            selectinload(Contact.owner),
            selectinload(Contact.tags).selectinload(ContactTag.tag),
        )
    )
    result = await db.execute(stmt)
    contact = result.scalar_one()

    return contact


@router.get("/{contact_id}", response_model=ContactDetail)
async def get_contact(
    contact_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get contact details with activities and tags."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Contact)
        .where(
            Contact.id == contact_id,
            Contact.is_deleted == False,
            Contact.classification.in_(accessible_classifications),
        )
        .options(
            selectinload(Contact.organization),
            selectinload(Contact.owner),
            selectinload(Contact.tags).selectinload(ContactTag.tag),
        )
    )
    result = await db.execute(stmt)
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Get recent activities
    activities_stmt = (
        select(Activity)
        .join(ActivityAttendee)
        .where(
            ActivityAttendee.contact_id == contact_id,
            Activity.is_deleted == False,
            Activity.classification.in_(accessible_classifications),
        )
        .order_by(Activity.occurred_at.desc())
        .limit(10)
    )
    activities_result = await db.execute(activities_stmt)
    recent_activities = activities_result.scalars().all()

    # Log read for CONFIDENTIAL/RESTRICTED
    await log_read(
        db=db,
        user_id=current_user.id,
        entity_type="contact",
        entity_id=contact.id,
        classification=contact.classification,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    return {
        **contact.__dict__,
        "organization": contact.organization,
        "owner": contact.owner,
        "tags": [
            TagResponse(
                id=ct.tag.id,
                tag_set_id=ct.tag.tag_set_id,
                value=ct.tag.value,
                is_active=ct.tag.is_active,
                created_at=ct.tag.created_at,
            )
            for ct in contact.tags
        ],
        "recent_activities": [
            {
                "id": a.id,
                "title": a.title,
                "activity_type": a.activity_type.value,
                "occurred_at": a.occurred_at,
            }
            for a in recent_activities
        ],
    }


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    contact_update: ContactUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Contact:
    """Update a contact."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Contact)
        .where(
            Contact.id == contact_id,
            Contact.is_deleted == False,
            Contact.classification.in_(accessible_classifications),
        )
        .options(selectinload(Contact.organization))
    )
    result = await db.execute(stmt)
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Track changes for audit
    changes = {}
    update_data = contact_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(contact, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(contact, field, value)

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="contact",
            entity_id=contact.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    await db.refresh(contact)

    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete a contact."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Contact).where(
        Contact.id == contact_id,
        Contact.is_deleted == False,
        Contact.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    contact.is_deleted = True
    contact.deleted_at = datetime.utcnow()

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="contact",
        entity_id=contact.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()


@router.post("/{contact_id}/tags", response_model=ContactResponse)
async def add_contact_tags(
    contact_id: UUID,
    tag_ids: list[UUID],
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Contact:
    """Add tags to a contact."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Contact).where(
        Contact.id == contact_id,
        Contact.is_deleted == False,
        Contact.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    for tag_id in tag_ids:
        # Check if tag already exists
        existing = await db.execute(
            select(ContactTag).where(
                ContactTag.contact_id == contact_id,
                ContactTag.tag_id == tag_id,
            )
        )
        if not existing.scalar_one_or_none():
            contact_tag = ContactTag(
                contact_id=contact_id,
                tag_id=tag_id,
                tagged_by=current_user.id,
            )
            db.add(contact_tag)

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="contact",
        entity_id=contact.id,
        details={"added_tags": [str(tid) for tid in tag_ids]},
        ip_address=get_client_ip(request),
    )

    await db.commit()
    await db.refresh(contact)

    return contact


@router.delete("/{contact_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_contact_tag(
    contact_id: UUID,
    tag_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a tag from a contact."""
    stmt = select(ContactTag).where(
        ContactTag.contact_id == contact_id,
        ContactTag.tag_id == tag_id,
    )
    result = await db.execute(stmt)
    contact_tag = result.scalar_one_or_none()

    if not contact_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found on contact",
        )

    await db.delete(contact_tag)

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="contact",
        entity_id=contact_id,
        details={"removed_tag": str(tag_id)},
        ip_address=get_client_ip(request),
    )

    await db.commit()
