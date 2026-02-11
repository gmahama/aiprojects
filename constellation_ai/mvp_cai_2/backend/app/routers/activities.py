import json
from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.contact import Contact
from app.models.activity import Activity, ActivityType, ActivityAttendee, ActivityVersion
from app.models.tag import Tag, ActivityTag
from app.models.followup import FollowUp
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action, log_read
from app.schemas.activity import (
    ActivityCreate,
    ActivityUpdate,
    ActivityResponse,
    ActivityListResponse,
    ActivityDetail,
    ActivityVersionResponse,
    AttendeeResponse,
)
from app.schemas.tag import TagResponse
from app.schemas.followup import FollowUpResponse

router = APIRouter()


@router.get("", response_model=ActivityListResponse)
async def list_activities(
    page: int = 1,
    page_size: int = 25,
    activity_type: ActivityType | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    owner_id: UUID | None = None,
    tag_ids: str | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List activities with pagination and filtering."""
    offset = (page - 1) * page_size
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Activity).where(
        Activity.is_deleted == False,
        Activity.classification.in_(accessible_classifications),
    )

    if activity_type:
        stmt = stmt.where(Activity.activity_type == activity_type)
    if from_date:
        stmt = stmt.where(func.date(Activity.occurred_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(Activity.occurred_at) <= to_date)
    if owner_id:
        stmt = stmt.where(Activity.owner_id == owner_id)
    if tag_ids:
        tag_id_list = [UUID(tid.strip()) for tid in tag_ids.split(",")]
        stmt = stmt.join(ActivityTag).where(ActivityTag.tag_id.in_(tag_id_list))

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get activities
    stmt = stmt.offset(offset).limit(page_size).order_by(Activity.occurred_at.desc())
    result = await db.execute(stmt)
    activities = result.scalars().all()

    return {
        "items": activities,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Activity:
    """Create a new activity with attendees, tags, and followups."""
    activity = Activity(
        title=activity_data.title,
        activity_type=activity_data.activity_type,
        occurred_at=activity_data.occurred_at,
        description=activity_data.description,
        location=activity_data.location,
        summary=activity_data.summary,
        key_points=activity_data.key_points,
        classification=activity_data.classification,
        owner_id=current_user.id,
        created_by=current_user.id,
    )
    db.add(activity)
    await db.flush()

    # Update search vector
    await _update_search_vector(db, activity)

    # Add attendees
    if activity_data.attendees:
        for attendee in activity_data.attendees:
            activity_attendee = ActivityAttendee(
                activity_id=activity.id,
                contact_id=attendee.contact_id,
                role=attendee.role,
            )
            db.add(activity_attendee)

    # Add tags
    if activity_data.tag_ids:
        for tag_id in activity_data.tag_ids:
            activity_tag = ActivityTag(
                activity_id=activity.id,
                tag_id=tag_id,
                tagged_by=current_user.id,
            )
            db.add(activity_tag)

    # Add followups
    if activity_data.followups:
        for followup_data in activity_data.followups:
            followup = FollowUp(
                activity_id=activity.id,
                description=followup_data.description,
                assigned_to=followup_data.assigned_to,
                due_date=followup_data.due_date,
                created_by=current_user.id,
            )
            db.add(followup)

    # Log creation
    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="activity",
        entity_id=activity.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()
    await db.refresh(activity)

    return activity


@router.get("/{activity_id}", response_model=ActivityDetail)
async def get_activity(
    activity_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get activity details with attendees, attachments, followups, and versions."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Activity)
        .where(
            Activity.id == activity_id,
            Activity.is_deleted == False,
            Activity.classification.in_(accessible_classifications),
        )
        .options(
            selectinload(Activity.owner),
            selectinload(Activity.attendees).selectinload(ActivityAttendee.contact).selectinload(Contact.organization),
            selectinload(Activity.tags).selectinload(ActivityTag.tag),
            selectinload(Activity.attachments),
            selectinload(Activity.followups).selectinload(FollowUp.assigned_to_user),
            selectinload(Activity.versions),
        )
    )
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    # Log read for CONFIDENTIAL/RESTRICTED
    await log_read(
        db=db,
        user_id=current_user.id,
        entity_type="activity",
        entity_id=activity.id,
        classification=activity.classification,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    return {
        **activity.__dict__,
        "owner": activity.owner,
        "attendees": [
            AttendeeResponse(
                contact_id=a.contact_id,
                first_name=a.contact.first_name,
                last_name=a.contact.last_name,
                email=a.contact.email,
                organization_name=a.contact.organization.name if a.contact.organization else None,
                role=a.role,
            )
            for a in activity.attendees
        ],
        "tags": [
            TagResponse(
                id=at.tag.id,
                tag_set_id=at.tag.tag_set_id,
                value=at.tag.value,
                is_active=at.tag.is_active,
                created_at=at.tag.created_at,
            )
            for at in activity.tags
        ],
        "attachments": [a for a in activity.attachments if not a.is_deleted],
        "followups": [
            FollowUpResponse(
                id=f.id,
                activity_id=f.activity_id,
                description=f.description,
                assigned_to=f.assigned_to,
                assigned_to_name=f.assigned_to_user.display_name if f.assigned_to_user else None,
                due_date=f.due_date,
                status=f.status,
                completed_at=f.completed_at,
                created_by=f.created_by,
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
            for f in activity.followups
        ],
        "versions": [
            ActivityVersionResponse(
                id=v.id,
                version_number=v.version_number,
                snapshot=v.snapshot,
                changed_by=v.changed_by,
                changed_at=v.changed_at,
            )
            for v in activity.versions
        ],
    }


@router.patch("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: UUID,
    activity_update: ActivityUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Activity:
    """Update an activity (creates a version snapshot)."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Activity)
        .where(
            Activity.id == activity_id,
            Activity.is_deleted == False,
            Activity.classification.in_(accessible_classifications),
        )
        .options(selectinload(Activity.versions))
    )
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    # Create version snapshot before updating
    version_number = len(activity.versions) + 1
    snapshot = {
        "title": activity.title,
        "activity_type": activity.activity_type.value,
        "occurred_at": activity.occurred_at.isoformat(),
        "description": activity.description,
        "location": activity.location,
        "summary": activity.summary,
        "key_points": activity.key_points,
        "classification": activity.classification.value,
    }
    version = ActivityVersion(
        activity_id=activity.id,
        version_number=version_number,
        snapshot=snapshot,
        changed_by=current_user.id,
    )
    db.add(version)

    # Track changes for audit
    changes = {}
    update_data = activity_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(activity, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(activity, field, value)

    # Update search vector if relevant fields changed
    if any(f in changes for f in ["title", "summary", "key_points", "description"]):
        await _update_search_vector(db, activity)

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="activity",
            entity_id=activity.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    await db.refresh(activity)

    return activity


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete an activity."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Activity).where(
        Activity.id == activity_id,
        Activity.is_deleted == False,
        Activity.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    activity.is_deleted = True
    activity.deleted_at = datetime.utcnow()

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="activity",
        entity_id=activity.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()


@router.get("/{activity_id}/versions", response_model=list[ActivityVersionResponse])
async def get_activity_versions(
    activity_id: UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> list:
    """Get version history for an activity."""
    accessible_classifications = filter_by_classification(current_user)

    # First verify access to the activity
    activity_stmt = select(Activity).where(
        Activity.id == activity_id,
        Activity.is_deleted == False,
        Activity.classification.in_(accessible_classifications),
    )
    activity_result = await db.execute(activity_stmt)
    if not activity_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    # Get versions
    stmt = (
        select(ActivityVersion)
        .where(ActivityVersion.activity_id == activity_id)
        .order_by(ActivityVersion.version_number.desc())
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()

    return versions


async def _update_search_vector(db: AsyncSession, activity: Activity) -> None:
    """Update the search vector for full-text search."""
    # Combine searchable text
    text_parts = [
        activity.title or "",
        activity.summary or "",
        activity.key_points or "",
        activity.description or "",
    ]
    combined_text = " ".join(text_parts)

    # Update using raw SQL for tsvector
    await db.execute(
        text(
            "UPDATE activities SET search_vector = to_tsvector('english', :text) WHERE id = :id"
        ),
        {"text": combined_text, "id": activity.id},
    )
