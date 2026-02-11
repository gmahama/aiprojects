from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.activity import Activity
from app.models.followup import FollowUp, FollowUpStatus
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action
from app.schemas.followup import (
    FollowUpCreate,
    FollowUpUpdate,
    FollowUpResponse,
    FollowUpListResponse,
)

router = APIRouter()


@router.get("", response_model=FollowUpListResponse)
async def list_followups(
    page: int = 1,
    page_size: int = 25,
    assigned_to: UUID | None = None,
    status_filter: FollowUpStatus | None = None,
    due_before: date | None = None,
    due_after: date | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List follow-ups with filtering."""
    offset = (page - 1) * page_size
    accessible_classifications = filter_by_classification(current_user)

    # Join with activity to check classification
    stmt = (
        select(FollowUp)
        .join(Activity)
        .where(
            Activity.is_deleted == False,
            Activity.classification.in_(accessible_classifications),
        )
        .options(selectinload(FollowUp.assigned_to_user))
    )

    if assigned_to:
        stmt = stmt.where(FollowUp.assigned_to == assigned_to)
    if status_filter:
        stmt = stmt.where(FollowUp.status == status_filter)
    if due_before:
        stmt = stmt.where(FollowUp.due_date <= due_before)
    if due_after:
        stmt = stmt.where(FollowUp.due_date >= due_after)

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get followups
    stmt = stmt.offset(offset).limit(page_size).order_by(FollowUp.due_date.asc().nullslast())
    result = await db.execute(stmt)
    followups = result.scalars().all()

    return {
        "items": [
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
            for f in followups
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/my", response_model=FollowUpListResponse)
async def list_my_followups(
    page: int = 1,
    page_size: int = 25,
    status_filter: FollowUpStatus | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List follow-ups assigned to the current user."""
    return await list_followups(
        page=page,
        page_size=page_size,
        assigned_to=current_user.id,
        status_filter=status_filter,
        current_user=current_user,
        db=db,
    )


@router.post(
    "/activities/{activity_id}/followups",
    response_model=FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_followup(
    activity_id: UUID,
    followup_data: FollowUpCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> FollowUp:
    """Create a follow-up for an activity."""
    accessible_classifications = filter_by_classification(current_user)

    # Verify activity exists and is accessible
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

    followup = FollowUp(
        activity_id=activity_id,
        description=followup_data.description,
        assigned_to=followup_data.assigned_to,
        due_date=followup_data.due_date,
        created_by=current_user.id,
    )
    db.add(followup)
    await db.flush()

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="followup",
        entity_id=followup.id,
        details={"activity_id": str(activity_id)},
        ip_address=get_client_ip(request),
    )

    await db.commit()
    await db.refresh(followup)

    return FollowUpResponse(
        id=followup.id,
        activity_id=followup.activity_id,
        description=followup.description,
        assigned_to=followup.assigned_to,
        assigned_to_name=None,
        due_date=followup.due_date,
        status=followup.status,
        completed_at=followup.completed_at,
        created_by=followup.created_by,
        created_at=followup.created_at,
        updated_at=followup.updated_at,
    )


@router.patch("/{followup_id}", response_model=FollowUpResponse)
async def update_followup(
    followup_id: UUID,
    followup_update: FollowUpUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> FollowUp:
    """Update a follow-up."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(FollowUp)
        .join(Activity)
        .where(
            FollowUp.id == followup_id,
            Activity.is_deleted == False,
            Activity.classification.in_(accessible_classifications),
        )
        .options(selectinload(FollowUp.assigned_to_user))
    )
    result = await db.execute(stmt)
    followup = result.scalar_one_or_none()

    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found",
        )

    # Track changes
    changes = {}
    update_data = followup_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        old_value = getattr(followup, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(followup, field, value)

    # Set completed_at if status changed to COMPLETED
    if followup_update.status == FollowUpStatus.COMPLETED and followup.completed_at is None:
        followup.completed_at = datetime.utcnow()
    elif followup_update.status and followup_update.status != FollowUpStatus.COMPLETED:
        followup.completed_at = None

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="followup",
            entity_id=followup.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    await db.refresh(followup)

    return FollowUpResponse(
        id=followup.id,
        activity_id=followup.activity_id,
        description=followup.description,
        assigned_to=followup.assigned_to,
        assigned_to_name=followup.assigned_to_user.display_name if followup.assigned_to_user else None,
        due_date=followup.due_date,
        status=followup.status,
        completed_at=followup.completed_at,
        created_by=followup.created_by,
        created_at=followup.created_at,
        updated_at=followup.updated_at,
    )
