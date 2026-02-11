from uuid import UUID
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.contact import Contact
from app.models.event import Event, EventType, EventAttendee, EventPitch, EventTag, EventVersion
from app.models.tag import Tag
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action, log_read
from app.schemas.event import (
    EventCreate,
    EventUpdate,
    EventResponse,
    EventListResponse,
    EventDetail,
    EventVersionResponse,
    AttendeeCreate,
    AttendeeResponse,
    PitchCreate,
    PitchResponse,
)
from app.schemas.tag import TagResponse

router = APIRouter()


@router.get("", response_model=EventListResponse)
async def list_events(
    page: int = 1,
    page_size: int = 25,
    event_type: EventType | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    owner_id: UUID | None = None,
    tag_ids: str | None = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List events with pagination and filtering."""
    offset = (page - 1) * page_size
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Event).where(
        Event.is_deleted == False,
        Event.classification.in_(accessible_classifications),
    )

    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if from_date:
        stmt = stmt.where(func.date(Event.occurred_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(Event.occurred_at) <= to_date)
    if owner_id:
        stmt = stmt.where(Event.owner_id == owner_id)
    if tag_ids:
        tag_id_list = [UUID(tid.strip()) for tid in tag_ids.split(",")]
        stmt = stmt.join(EventTag).where(EventTag.tag_id.in_(tag_id_list))

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get events
    stmt = stmt.offset(offset).limit(page_size).order_by(Event.occurred_at.desc())
    result = await db.execute(stmt)
    events = result.scalars().all()

    return {
        "items": events,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Event:
    """Create a new event with attendees, pitches, and tags."""
    event = Event(
        name=event_data.name,
        event_type=event_data.event_type,
        occurred_at=event_data.occurred_at,
        location=event_data.location,
        description=event_data.description,
        notes=event_data.notes,
        classification=event_data.classification,
        owner_id=current_user.id,
        created_by=current_user.id,
    )
    db.add(event)
    await db.flush()

    # Update search vector
    await _update_search_vector(db, event)

    # Add attendees
    if event_data.attendees:
        for attendee_data in event_data.attendees:
            contact_id = await _resolve_attendee_contact(db, attendee_data, current_user)
            if contact_id:
                event_attendee = EventAttendee(
                    event_id=event.id,
                    contact_id=contact_id,
                    role=attendee_data.role,
                    notes=attendee_data.notes,
                )
                db.add(event_attendee)

    # Add pitches
    if event_data.pitches:
        for pitch_data in event_data.pitches:
            pitch = EventPitch(
                event_id=event.id,
                ticker=pitch_data.ticker,
                company_name=pitch_data.company_name,
                thesis=pitch_data.thesis,
                notes=pitch_data.notes,
                pitched_by=pitch_data.pitched_by,
                is_bullish=pitch_data.is_bullish,
                created_by=current_user.id,
            )
            db.add(pitch)

    # Add tags
    if event_data.tag_ids:
        for tag_id in event_data.tag_ids:
            event_tag = EventTag(
                event_id=event.id,
                tag_id=tag_id,
                tagged_by=current_user.id,
            )
            db.add(event_tag)

    # Log creation
    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        entity_type="event",
        entity_id=event.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()
    await db.refresh(event)

    return event


@router.get("/{event_id}", response_model=EventDetail)
async def get_event(
    event_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get event details with attendees, pitches, tags, and versions."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Event)
        .where(
            Event.id == event_id,
            Event.is_deleted == False,
            Event.classification.in_(accessible_classifications),
        )
        .options(
            selectinload(Event.owner),
            selectinload(Event.attendees).selectinload(EventAttendee.contact).selectinload(Contact.organization),
            selectinload(Event.pitches).selectinload(EventPitch.pitcher),
            selectinload(Event.tags).selectinload(EventTag.tag),
            selectinload(Event.versions),
        )
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Log read for CONFIDENTIAL/RESTRICTED
    await log_read(
        db=db,
        user_id=current_user.id,
        entity_type="event",
        entity_id=event.id,
        classification=event.classification,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    return {
        **event.__dict__,
        "owner": event.owner,
        "attendees": [
            AttendeeResponse(
                contact_id=a.contact_id,
                first_name=a.contact.first_name,
                last_name=a.contact.last_name,
                email=a.contact.email,
                organization_name=a.contact.organization.name if a.contact.organization else None,
                role=a.role,
                notes=a.notes,
            )
            for a in event.attendees
        ],
        "pitches": [
            PitchResponse(
                id=p.id,
                ticker=p.ticker,
                company_name=p.company_name,
                thesis=p.thesis,
                notes=p.notes,
                pitched_by=p.pitched_by,
                pitcher_name=f"{p.pitcher.first_name} {p.pitcher.last_name}" if p.pitcher else None,
                is_bullish=p.is_bullish,
                created_by=p.created_by,
                created_at=p.created_at,
            )
            for p in event.pitches
        ],
        "tags": [
            TagResponse(
                id=et.tag.id,
                tag_set_id=et.tag.tag_set_id,
                value=et.tag.value,
                is_active=et.tag.is_active,
                created_at=et.tag.created_at,
            )
            for et in event.tags
        ],
        "versions": [
            EventVersionResponse(
                id=v.id,
                version_number=v.version_number,
                snapshot=v.snapshot,
                changed_by=v.changed_by,
                changed_at=v.changed_at,
            )
            for v in event.versions
        ],
    }


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: UUID,
    event_update: EventUpdate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> Event:
    """Update an event (creates a version snapshot)."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Event)
        .where(
            Event.id == event_id,
            Event.is_deleted == False,
            Event.classification.in_(accessible_classifications),
        )
        .options(selectinload(Event.versions))
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Create version snapshot before updating
    version_number = len(event.versions) + 1
    snapshot = {
        "name": event.name,
        "event_type": event.event_type.value,
        "occurred_at": event.occurred_at.isoformat(),
        "location": event.location,
        "description": event.description,
        "notes": event.notes,
        "classification": event.classification.value,
    }
    version = EventVersion(
        event_id=event.id,
        version_number=version_number,
        snapshot=snapshot,
        changed_by=current_user.id,
    )
    db.add(version)

    # Track changes for audit
    changes = {}
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        old_value = getattr(event, field)
        if old_value != value:
            changes[field] = {"old": str(old_value), "new": str(value)}
            setattr(event, field, value)

    # Update search vector if relevant fields changed
    if any(f in changes for f in ["name", "description", "notes"]):
        await _update_search_vector(db, event)

    if changes:
        await log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE,
            entity_type="event",
            entity_id=event.id,
            details=changes,
            ip_address=get_client_ip(request),
        )

    await db.commit()
    await db.refresh(event)

    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete an event."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Event).where(
        Event.id == event_id,
        Event.is_deleted == False,
        Event.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    event.is_deleted = True
    event.deleted_at = datetime.utcnow()

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="event",
        entity_id=event.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()


@router.post("/{event_id}/attendees", response_model=AttendeeResponse, status_code=status.HTTP_201_CREATED)
async def add_event_attendee(
    event_id: UUID,
    attendee_data: AttendeeCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add an attendee to an event. Can create a new contact inline."""
    accessible_classifications = filter_by_classification(current_user)

    # Verify event exists
    stmt = select(Event).where(
        Event.id == event_id,
        Event.is_deleted == False,
        Event.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Resolve contact (create if needed)
    contact_id = await _resolve_attendee_contact(db, attendee_data, current_user)
    if not contact_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either contact_id or name fields required",
        )

    # Check if already an attendee
    existing_stmt = select(EventAttendee).where(
        EventAttendee.event_id == event_id,
        EventAttendee.contact_id == contact_id,
    )
    existing_result = await db.execute(existing_stmt)
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact is already an attendee",
        )

    # Create attendee
    event_attendee = EventAttendee(
        event_id=event_id,
        contact_id=contact_id,
        role=attendee_data.role,
        notes=attendee_data.notes,
    )
    db.add(event_attendee)
    await db.commit()

    # Fetch contact details for response
    contact_stmt = (
        select(Contact)
        .where(Contact.id == contact_id)
        .options(selectinload(Contact.organization))
    )
    contact_result = await db.execute(contact_stmt)
    contact = contact_result.scalar_one()

    return {
        "contact_id": contact.id,
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "email": contact.email,
        "organization_name": contact.organization.name if contact.organization else None,
        "role": event_attendee.role,
        "notes": event_attendee.notes,
    }


@router.post("/{event_id}/pitches", response_model=PitchResponse, status_code=status.HTTP_201_CREATED)
async def add_event_pitch(
    event_id: UUID,
    pitch_data: PitchCreate,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Add a stock pitch to an event."""
    accessible_classifications = filter_by_classification(current_user)

    # Verify event exists
    stmt = select(Event).where(
        Event.id == event_id,
        Event.is_deleted == False,
        Event.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Create pitch
    pitch = EventPitch(
        event_id=event_id,
        ticker=pitch_data.ticker,
        company_name=pitch_data.company_name,
        thesis=pitch_data.thesis,
        notes=pitch_data.notes,
        pitched_by=pitch_data.pitched_by,
        is_bullish=pitch_data.is_bullish,
        created_by=current_user.id,
    )
    db.add(pitch)
    await db.commit()
    await db.refresh(pitch)

    # Fetch pitcher details if exists
    pitcher_name = None
    if pitch.pitched_by:
        pitcher_stmt = select(Contact).where(Contact.id == pitch.pitched_by)
        pitcher_result = await db.execute(pitcher_stmt)
        pitcher = pitcher_result.scalar_one_or_none()
        if pitcher:
            pitcher_name = f"{pitcher.first_name} {pitcher.last_name}"

    return {
        "id": pitch.id,
        "ticker": pitch.ticker,
        "company_name": pitch.company_name,
        "thesis": pitch.thesis,
        "notes": pitch.notes,
        "pitched_by": pitch.pitched_by,
        "pitcher_name": pitcher_name,
        "is_bullish": pitch.is_bullish,
        "created_by": pitch.created_by,
        "created_at": pitch.created_at,
    }


@router.get("/{event_id}/versions", response_model=list[EventVersionResponse])
async def get_event_versions(
    event_id: UUID,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> list:
    """Get version history for an event."""
    accessible_classifications = filter_by_classification(current_user)

    # First verify access to the event
    event_stmt = select(Event).where(
        Event.id == event_id,
        Event.is_deleted == False,
        Event.classification.in_(accessible_classifications),
    )
    event_result = await db.execute(event_stmt)
    if not event_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Get versions
    stmt = (
        select(EventVersion)
        .where(EventVersion.event_id == event_id)
        .order_by(EventVersion.version_number.desc())
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()

    return versions


async def _resolve_attendee_contact(
    db: AsyncSession,
    attendee_data: AttendeeCreate,
    current_user: User,
) -> UUID | None:
    """Resolve attendee to contact_id, creating new contact if needed."""
    if attendee_data.contact_id:
        # Verify contact exists
        stmt = select(Contact).where(
            Contact.id == attendee_data.contact_id,
            Contact.is_deleted == False,
        )
        result = await db.execute(stmt)
        contact = result.scalar_one_or_none()
        if contact:
            return contact.id
        return None

    # Create new contact if name provided
    if attendee_data.first_name and attendee_data.last_name:
        contact = Contact(
            first_name=attendee_data.first_name,
            last_name=attendee_data.last_name,
            email=attendee_data.email,
            organization_id=attendee_data.organization_id,
            created_by=current_user.id,
        )
        db.add(contact)
        await db.flush()
        return contact.id

    return None


async def _update_search_vector(db: AsyncSession, event: Event) -> None:
    """Update the search vector for full-text search."""
    # Combine searchable text
    text_parts = [
        event.name or "",
        event.description or "",
        event.notes or "",
    ]
    combined_text = " ".join(text_parts)

    # Update using raw SQL for tsvector
    await db.execute(
        text(
            "UPDATE events SET search_vector = to_tsvector('english', :text) WHERE id = :id"
        ),
        {"text": combined_text, "id": event.id},
    )
