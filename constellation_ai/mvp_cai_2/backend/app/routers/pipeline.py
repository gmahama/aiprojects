from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.contact import Contact
from app.models.pipeline import (
    PipelineItem,
    PipelineStageHistory,
    PipelineStatus,
    PipelineStage,
    STAGE_LABELS,
)
from app.models.audit import AuditAction
from app.services.audit_service import log_action
from app.schemas.pipeline import (
    PipelineItemCreate,
    PipelineItemUpdate,
    PipelineItemResponse,
    PipelineItemDetail,
    PipelineItemListResponse,
    PipelineStageHistoryResponse,
    PipelineAdvanceRequest,
    PipelineRevertRequest,
    PipelineReactivateRequest,
    PipelineBoardResponse,
    PipelineBoardStage,
    PipelineBackBurnerItem,
    PipelineBoardSummary,
)

router = APIRouter()


# --- Helpers ---

def _check_can_modify(current_user: User, item: PipelineItem) -> None:
    """Check if the current user can modify this pipeline item."""
    if current_user.id == item.owner_id:
        return
    if current_user.role in (UserRole.ADMIN, UserRole.MANAGER):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the owner, a MANAGER, or an ADMIN can modify this pipeline item",
    )


async def _record_stage_history(
    db: AsyncSession,
    item_id: UUID,
    from_stage: int | None,
    to_stage: int,
    from_status: str | None,
    to_status: str,
    changed_by_id: UUID,
    note: str | None = None,
) -> PipelineStageHistory:
    history = PipelineStageHistory(
        pipeline_item_id=item_id,
        from_stage=from_stage,
        to_stage=to_stage,
        from_status=from_status,
        to_status=to_status,
        changed_by_id=changed_by_id,
        note=note,
    )
    db.add(history)
    return history


def _compute_days(dt: datetime) -> int:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (now - dt).days


def _build_item_response(item: PipelineItem) -> dict:
    """Build a PipelineItemResponse-compatible dict from a loaded PipelineItem."""
    org_name = item.organization.name if item.organization else None
    contact_name = None
    if item.primary_contact:
        contact_name = f"{item.primary_contact.first_name} {item.primary_contact.last_name}"
    owner_name = item.owner.display_name if item.owner else None

    return {
        "id": item.id,
        "organization_id": item.organization_id,
        "organization_name": org_name,
        "primary_contact_id": item.primary_contact_id,
        "primary_contact_name": contact_name,
        "stage": item.stage,
        "stage_label": STAGE_LABELS.get(item.stage),
        "status": item.status,
        "owner_id": item.owner_id,
        "owner_name": owner_name,
        "created_by": item.created_by,
        "back_burner_reason": item.back_burner_reason,
        "passed_reason": item.passed_reason,
        "notes": item.notes,
        "entered_pipeline_at": item.entered_pipeline_at,
        "last_stage_change_at": item.last_stage_change_at,
        "days_in_stage": _compute_days(item.last_stage_change_at),
        "days_in_pipeline": _compute_days(item.entered_pipeline_at),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


async def _get_item(
    db: AsyncSession,
    item_id: UUID,
    *,
    load_history: bool = False,
) -> PipelineItem:
    """Fetch a non-deleted pipeline item or raise 404."""
    options = [
        selectinload(PipelineItem.organization),
        selectinload(PipelineItem.primary_contact),
        selectinload(PipelineItem.owner),
    ]
    if load_history:
        options.append(
            selectinload(PipelineItem.stage_history)
            .selectinload(PipelineStageHistory.changed_by)
        )

    stmt = (
        select(PipelineItem)
        .where(PipelineItem.id == item_id, PipelineItem.is_deleted == False)
        .options(*options)
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline item not found",
        )
    return item


# --- Endpoints ---

@router.post("", response_model=PipelineItemResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline_item(
    data: PipelineItemCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new pipeline item with initial history entry."""
    # Verify organization exists
    org_stmt = select(Organization).where(
        Organization.id == data.organization_id, Organization.is_deleted == False
    )
    org_result = await db.execute(org_stmt)
    if not org_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Organization not found")

    # Verify primary contact exists if provided
    if data.primary_contact_id:
        contact_stmt = select(Contact).where(
            Contact.id == data.primary_contact_id, Contact.is_deleted == False
        )
        contact_result = await db.execute(contact_stmt)
        if not contact_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Primary contact not found")

    item = PipelineItem(
        organization_id=data.organization_id,
        primary_contact_id=data.primary_contact_id,
        stage=data.stage,
        status=PipelineStatus.ACTIVE,
        owner_id=data.owner_id,
        created_by=current_user.id,
        notes=data.notes,
    )
    db.add(item)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active or back-burner pipeline item already exists for this organization",
        )

    # Record initial history
    await _record_stage_history(
        db=db,
        item_id=item.id,
        from_stage=None,
        to_stage=item.stage,
        from_status=None,
        to_status=PipelineStatus.ACTIVE.value,
        changed_by_id=current_user.id,
        note="Pipeline item created",
    )

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="pipeline_item",
        entity_id=item.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()

    # Re-fetch with relationships for the response
    item = await _get_item(db, item.id)
    return _build_item_response(item)


@router.get("", response_model=PipelineItemListResponse)
async def list_pipeline_items(
    page: int = 1,
    page_size: int = 25,
    status_filter: PipelineStatus | None = PipelineStatus.ACTIVE,
    stage: int | None = None,
    owner_id: UUID | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List pipeline items with pagination and filtering."""
    offset = (page - 1) * page_size

    stmt = (
        select(PipelineItem)
        .where(PipelineItem.is_deleted == False)
        .options(
            selectinload(PipelineItem.organization),
            selectinload(PipelineItem.primary_contact),
            selectinload(PipelineItem.owner),
        )
    )

    if status_filter:
        stmt = stmt.where(PipelineItem.status == status_filter)
    if stage is not None:
        stmt = stmt.where(PipelineItem.stage == stage)
    if owner_id:
        stmt = stmt.where(PipelineItem.owner_id == owner_id)

    # Count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Fetch
    stmt = stmt.offset(offset).limit(page_size).order_by(PipelineItem.last_stage_change_at.desc())
    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "items": [_build_item_response(i) for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/board", response_model=PipelineBoardResponse)
async def get_pipeline_board(
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get Kanban board view: ACTIVE items grouped by stage, plus BACK_BURNER items."""
    # Fetch all non-deleted ACTIVE items
    active_stmt = (
        select(PipelineItem)
        .where(
            PipelineItem.is_deleted == False,
            PipelineItem.status == PipelineStatus.ACTIVE,
        )
        .options(
            selectinload(PipelineItem.organization),
            selectinload(PipelineItem.primary_contact),
            selectinload(PipelineItem.owner),
        )
        .order_by(PipelineItem.last_stage_change_at.asc())
    )
    active_result = await db.execute(active_stmt)
    active_items = active_result.scalars().all()

    # Group by stage
    stage_groups: dict[int, list[dict]] = {s: [] for s in range(1, 7)}
    for item in active_items:
        stage_groups[item.stage].append(_build_item_response(item))

    stages = [
        PipelineBoardStage(stage=s, label=STAGE_LABELS[s], items=stage_groups[s])
        for s in range(1, 7)
    ]

    # Fetch BACK_BURNER items with history to derive stage_when_shelved
    bb_stmt = (
        select(PipelineItem)
        .where(
            PipelineItem.is_deleted == False,
            PipelineItem.status == PipelineStatus.BACK_BURNER,
        )
        .options(
            selectinload(PipelineItem.organization),
            selectinload(PipelineItem.primary_contact),
            selectinload(PipelineItem.owner),
            selectinload(PipelineItem.stage_history),
        )
        .order_by(PipelineItem.last_stage_change_at.desc())
    )
    bb_result = await db.execute(bb_stmt)
    bb_items = bb_result.scalars().all()

    back_burner_list: list[dict] = []
    for item in bb_items:
        resp = _build_item_response(item)
        # Derive stage_when_shelved from last history entry where to_status == BACK_BURNER
        shelved_stage: int | None = None
        for h in reversed(item.stage_history):
            if h.to_status == PipelineStatus.BACK_BURNER.value:
                shelved_stage = h.from_stage
                break
        resp["stage_when_shelved"] = shelved_stage
        resp["stage_when_shelved_label"] = STAGE_LABELS.get(shelved_stage) if shelved_stage else None
        back_burner_list.append(resp)

    # Summary counts
    count_stmt = select(
        func.count().filter(PipelineItem.status == PipelineStatus.ACTIVE).label("active"),
        func.count().filter(PipelineItem.status == PipelineStatus.BACK_BURNER).label("back_burner"),
        func.count().filter(PipelineItem.status == PipelineStatus.PASSED).label("passed"),
        func.count().filter(PipelineItem.status == PipelineStatus.CONVERTED).label("converted"),
    ).where(PipelineItem.is_deleted == False)
    count_result = await db.execute(count_stmt)
    counts = count_result.one()

    return {
        "stages": stages,
        "back_burner": back_burner_list,
        "summary": PipelineBoardSummary(
            total_active=counts.active,
            total_back_burner=counts.back_burner,
            total_passed=counts.passed,
            total_converted=counts.converted,
        ),
    }


@router.get("/{item_id}", response_model=PipelineItemDetail)
async def get_pipeline_item(
    item_id: UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get pipeline item detail with full stage history."""
    item = await _get_item(db, item_id, load_history=True)
    resp = _build_item_response(item)

    resp["stage_history"] = [
        PipelineStageHistoryResponse(
            id=h.id,
            pipeline_item_id=h.pipeline_item_id,
            from_stage=h.from_stage,
            to_stage=h.to_stage,
            from_status=h.from_status,
            to_status=h.to_status,
            changed_by_id=h.changed_by_id,
            changed_by_name=h.changed_by.display_name if h.changed_by else None,
            from_stage_label=STAGE_LABELS.get(h.from_stage) if h.from_stage else None,
            to_stage_label=STAGE_LABELS.get(h.to_stage),
            note=h.note,
            changed_at=h.changed_at,
        )
        for h in item.stage_history
    ]

    return resp


@router.patch("/{item_id}", response_model=PipelineItemResponse)
async def update_pipeline_item(
    item_id: UUID,
    data: PipelineItemUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update a pipeline item. Tracks stage/status changes in history."""
    item = await _get_item(db, item_id)
    _check_can_modify(current_user, item)

    if item.status == PipelineStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a CONVERTED pipeline item",
        )

    update_data = data.model_dump(exclude_unset=True)
    changes: dict[str, dict[str, str]] = {}
    stage_changed = False
    status_changed = False

    old_stage = item.stage
    old_status = item.status

    for field, value in update_data.items():
        old_value = getattr(item, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(item, field, value)

    if "stage" in changes:
        stage_changed = True
        item.last_stage_change_at = datetime.now(timezone.utc)

    if "status" in changes:
        status_changed = True

    if stage_changed or status_changed:
        await _record_stage_history(
            db=db,
            item_id=item.id,
            from_stage=old_stage,
            to_stage=item.stage,
            from_status=old_status.value if isinstance(old_status, PipelineStatus) else str(old_status),
            to_status=item.status.value if isinstance(item.status, PipelineStatus) else str(item.status),
            changed_by_id=current_user.id,
        )

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="pipeline_item",
            entity_id=item.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    item = await _get_item(db, item.id)
    return _build_item_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline_item(
    item_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete a pipeline item."""
    item = await _get_item(db, item_id)
    _check_can_modify(current_user, item)

    now = datetime.now(timezone.utc)
    item.status = PipelineStatus.PASSED
    item.passed_reason = item.passed_reason or "Removed"
    item.is_deleted = True
    item.deleted_at = now

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="pipeline_item",
        entity_id=item.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()


@router.post("/{item_id}/advance", response_model=PipelineItemResponse)
async def advance_pipeline_item(
    item_id: UUID,
    data: PipelineAdvanceRequest,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Advance the pipeline item to the next stage."""
    item = await _get_item(db, item_id)
    _check_can_modify(current_user, item)

    if item.status == PipelineStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot advance a CONVERTED pipeline item",
        )

    if item.stage >= 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline item is already at the final stage (6 - Docs)",
        )

    old_stage = item.stage
    item.stage = old_stage + 1
    item.last_stage_change_at = datetime.now(timezone.utc)

    await _record_stage_history(
        db=db,
        item_id=item.id,
        from_stage=old_stage,
        to_stage=item.stage,
        from_status=item.status.value,
        to_status=item.status.value,
        changed_by_id=current_user.id,
        note=data.note,
    )

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="pipeline_item",
        entity_id=item.id,
        details={"stage": {"old": str(old_stage), "new": str(item.stage)}},
        ip_address=get_client_ip(request),
    )

    await db.commit()
    item = await _get_item(db, item.id)
    return _build_item_response(item)


@router.post("/{item_id}/revert", response_model=PipelineItemResponse)
async def revert_pipeline_item(
    item_id: UUID,
    data: PipelineRevertRequest,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Revert the pipeline item to the previous stage."""
    item = await _get_item(db, item_id)
    _check_can_modify(current_user, item)

    if item.status == PipelineStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot revert a CONVERTED pipeline item",
        )

    if item.stage <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline item is already at the first stage (1 - First Meeting)",
        )

    old_stage = item.stage
    item.stage = old_stage - 1
    item.last_stage_change_at = datetime.now(timezone.utc)

    await _record_stage_history(
        db=db,
        item_id=item.id,
        from_stage=old_stage,
        to_stage=item.stage,
        from_status=item.status.value,
        to_status=item.status.value,
        changed_by_id=current_user.id,
        note=data.note,
    )

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="pipeline_item",
        entity_id=item.id,
        details={"stage": {"old": str(old_stage), "new": str(item.stage)}},
        ip_address=get_client_ip(request),
    )

    await db.commit()
    item = await _get_item(db, item.id)
    return _build_item_response(item)


@router.post("/{item_id}/reactivate", response_model=PipelineItemResponse)
async def reactivate_pipeline_item(
    item_id: UUID,
    data: PipelineReactivateRequest,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Reactivate a BACK_BURNER or PASSED item back to ACTIVE."""
    item = await _get_item(db, item_id, load_history=True)
    _check_can_modify(current_user, item)

    if item.status == PipelineStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reactivate a CONVERTED pipeline item",
        )

    if item.status == PipelineStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline item is already ACTIVE",
        )

    old_stage = item.stage
    old_status = item.status

    # Determine target stage
    if data.stage is not None:
        target_stage = data.stage
    else:
        # Try to restore the stage from before it was shelved/passed
        target_stage = old_stage  # fallback: keep current stage
        for h in reversed(item.stage_history):
            if h.to_status in (PipelineStatus.BACK_BURNER.value, PipelineStatus.PASSED.value):
                if h.from_stage is not None:
                    target_stage = h.from_stage
                break

    item.status = PipelineStatus.ACTIVE
    item.stage = target_stage
    item.last_stage_change_at = datetime.now(timezone.utc)
    item.back_burner_reason = None
    item.passed_reason = None

    await _record_stage_history(
        db=db,
        item_id=item.id,
        from_stage=old_stage,
        to_stage=item.stage,
        from_status=old_status.value,
        to_status=PipelineStatus.ACTIVE.value,
        changed_by_id=current_user.id,
        note=data.note,
    )

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        entity_type="pipeline_item",
        entity_id=item.id,
        details={
            "status": {"old": old_status.value, "new": PipelineStatus.ACTIVE.value},
            "stage": {"old": str(old_stage), "new": str(item.stage)},
        },
        ip_address=get_client_ip(request),
    )

    await db.commit()
    item = await _get_item(db, item.id)
    return _build_item_response(item)
