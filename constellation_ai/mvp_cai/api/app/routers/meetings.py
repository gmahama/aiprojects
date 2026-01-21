import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.meetings import (
    AttendeeInput,
    MeetingAttendeeRead,
    MeetingCreate,
    MeetingList,
    MeetingRead,
    MeetingUpdate,
)
from app.services.meetings import (
    InvalidAttendeeError,
    MeetingNotFoundError,
    MeetingsService,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])


def get_meetings_service(db: Session = Depends(get_db)) -> MeetingsService:
    """Dependency that provides a MeetingsService instance."""
    return MeetingsService(db)


def _meeting_to_read(meeting) -> MeetingRead:
    """Convert a Meeting model to MeetingRead schema."""
    attendees = [
        MeetingAttendeeRead(
            person_id=assoc.person_id,
            role=assoc.role,
            first_name=assoc.person.first_name,
            last_name=assoc.person.last_name,
            primary_email=assoc.person.primary_email,
        )
        for assoc in meeting.attendee_associations
    ]

    return MeetingRead(
        id=meeting.id,
        occurred_at=meeting.occurred_at,
        type=meeting.type,
        location=meeting.location,
        agenda=meeting.agenda,
        notes=meeting.notes,
        next_steps=meeting.next_steps,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        attendees=attendees,
    )


@router.post(
    "",
    response_model=MeetingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new meeting",
)
def create_meeting(
    data: MeetingCreate,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingRead:
    """
    Create a new meeting with optional attendees.

    - **occurred_at**: Required datetime of the meeting
    - **type**: Meeting type (e.g., "coffee", "call", "zoom")
    - **attendees**: List of attendee objects with person_id and optional role,
      or just a list of person_id UUIDs

    Example attendees formats:
    ```json
    // Simple list of UUIDs
    "attendees": ["uuid1", "uuid2"]

    // With roles
    "attendees": [
        {"person_id": "uuid1", "role": "organizer"},
        {"person_id": "uuid2", "role": "attendee"}
    ]
    ```

    Duplicate person_ids are automatically deduplicated.
    """
    try:
        meeting = service.create(data)
        return _meeting_to_read(meeting)
    except InvalidAttendeeError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid person IDs: {[str(id) for id in e.invalid_ids]}",
        )


@router.get(
    "/{meeting_id}",
    response_model=MeetingRead,
    summary="Get a meeting by ID",
)
def get_meeting(
    meeting_id: uuid.UUID,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingRead:
    """Get a meeting by ID including all attendees."""
    try:
        meeting = service.get_by_id(meeting_id)
        return _meeting_to_read(meeting)
    except MeetingNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )


@router.get(
    "",
    response_model=MeetingList,
    summary="List and filter meetings",
)
def list_meetings(
    person_id: Annotated[
        Optional[uuid.UUID],
        Query(description="Filter to meetings with this person as attendee"),
    ] = None,
    from_date: Annotated[
        Optional[datetime],
        Query(alias="from", description="Filter meetings with occurred_at >= this datetime"),
    ] = None,
    to_date: Annotated[
        Optional[datetime],
        Query(alias="to", description="Filter meetings with occurred_at <= this datetime"),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=100, description="Max results to return"),
    ] = 20,
    offset: Annotated[
        int,
        Query(ge=0, description="Number of results to skip"),
    ] = 0,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingList:
    """
    List meetings with optional filters.

    - **person_id**: Only return meetings where this person is an attendee
    - **from**: Filter meetings with occurred_at >= this datetime (ISO format)
    - **to**: Filter meetings with occurred_at <= this datetime (ISO format)

    Results are ordered by occurred_at DESC (most recent first).
    """
    meetings, total = service.search(
        person_id=person_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )

    return MeetingList(
        items=[_meeting_to_read(m) for m in meetings],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/{meeting_id}",
    response_model=MeetingRead,
    summary="Update a meeting",
)
def update_meeting(
    meeting_id: uuid.UUID,
    data: MeetingUpdate,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingRead:
    """
    Partially update a meeting.

    Only provided fields will be updated. If **attendees** is provided,
    it completely replaces the existing attendee set.

    To clear all attendees, pass `"attendees": []`.
    """
    try:
        meeting = service.update(meeting_id, data)
        return _meeting_to_read(meeting)
    except MeetingNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )
    except InvalidAttendeeError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid person IDs: {[str(id) for id in e.invalid_ids]}",
        )


@router.delete(
    "/{meeting_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a meeting",
)
def delete_meeting(
    meeting_id: uuid.UUID,
    service: MeetingsService = Depends(get_meetings_service),
) -> None:
    """Delete a meeting. Attendee associations are automatically removed."""
    try:
        service.delete(meeting_id)
    except MeetingNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )


# Optional attendee management endpoints


@router.post(
    "/{meeting_id}/attendees",
    response_model=MeetingRead,
    summary="Add an attendee to a meeting",
)
def add_attendee(
    meeting_id: uuid.UUID,
    data: AttendeeInput,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingRead:
    """
    Add an attendee to a meeting.

    This operation is idempotent: adding an existing attendee updates their role
    if a new role is provided.
    """
    try:
        meeting = service.add_attendee(meeting_id, data.person_id, data.role)
        return _meeting_to_read(meeting)
    except MeetingNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )
    except InvalidAttendeeError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid person IDs: {[str(id) for id in e.invalid_ids]}",
        )


@router.delete(
    "/{meeting_id}/attendees/{person_id}",
    response_model=MeetingRead,
    summary="Remove an attendee from a meeting",
)
def remove_attendee(
    meeting_id: uuid.UUID,
    person_id: uuid.UUID,
    service: MeetingsService = Depends(get_meetings_service),
) -> MeetingRead:
    """
    Remove an attendee from a meeting.

    This operation is idempotent: removing a non-existent attendee
    does not produce an error.
    """
    try:
        meeting = service.remove_attendee(meeting_id, person_id)
        return _meeting_to_read(meeting)
    except MeetingNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found",
        )
