import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models import Meeting, MeetingAttendee, Person
from app.schemas.meetings import AttendeeInput, MeetingCreate, MeetingUpdate


class MeetingNotFoundError(Exception):
    """Raised when a meeting is not found."""

    def __init__(self, meeting_id: uuid.UUID):
        self.meeting_id = meeting_id
        super().__init__(f"Meeting not found: {meeting_id}")


class InvalidAttendeeError(Exception):
    """Raised when attendee person IDs don't exist."""

    def __init__(self, invalid_ids: list[uuid.UUID]):
        self.invalid_ids = invalid_ids
        super().__init__(f"Invalid person IDs: {invalid_ids}")


class MeetingsService:
    """Service layer for Meetings CRUD operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: MeetingCreate) -> Meeting:
        """
        Create a new meeting with optional attendees.

        All operations are performed in a single transaction.

        Raises:
            InvalidAttendeeError: If any attendee person_id doesn't exist.
        """
        # Validate attendee IDs exist
        attendee_inputs = data.attendees or []
        if attendee_inputs:
            self._validate_person_ids([a.person_id for a in attendee_inputs])

        # Create meeting
        meeting = Meeting(
            occurred_at=data.occurred_at,
            type=data.type,
            location=data.location,
            agenda=data.agenda,
            notes=data.notes,
            next_steps=data.next_steps,
        )
        self.db.add(meeting)
        self.db.flush()  # Get meeting.id

        # Create attendee associations
        for attendee_input in attendee_inputs:
            attendee = MeetingAttendee(
                meeting_id=meeting.id,
                person_id=attendee_input.person_id,
                role=attendee_input.role,
            )
            self.db.add(attendee)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise

        # Refresh with attendees loaded
        self.db.refresh(meeting)
        return self._load_meeting_with_attendees(meeting.id)

    def get_by_id(self, meeting_id: uuid.UUID) -> Meeting:
        """
        Get a meeting by ID with attendees.

        Raises:
            MeetingNotFoundError: If meeting doesn't exist.
        """
        meeting = self._load_meeting_with_attendees(meeting_id)
        if not meeting:
            raise MeetingNotFoundError(meeting_id)
        return meeting

    def update(self, meeting_id: uuid.UUID, data: MeetingUpdate) -> Meeting:
        """
        Partially update a meeting.

        If attendees is provided in data, replaces the entire attendee set.

        Raises:
            MeetingNotFoundError: If meeting doesn't exist.
            InvalidAttendeeError: If any new attendee person_id doesn't exist.
        """
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise MeetingNotFoundError(meeting_id)

        update_data = data.model_dump(exclude_unset=True)

        # Handle attendees replacement separately
        attendees_raw = update_data.pop("attendees", None)

        # Update scalar fields
        for field, value in update_data.items():
            setattr(meeting, field, value)

        # Replace attendees if provided
        if attendees_raw is not None:
            # Convert dicts back to AttendeeInput objects
            attendees_to_set = [
                AttendeeInput(**a) if isinstance(a, dict) else a
                for a in attendees_raw
            ]

            # Validate new attendee IDs
            if attendees_to_set:
                self._validate_person_ids([a.person_id for a in attendees_to_set])

            # Delete existing attendees
            self.db.query(MeetingAttendee).filter(
                MeetingAttendee.meeting_id == meeting_id
            ).delete()

            # Add new attendees
            for attendee_input in attendees_to_set:
                attendee = MeetingAttendee(
                    meeting_id=meeting_id,
                    person_id=attendee_input.person_id,
                    role=attendee_input.role,
                )
                self.db.add(attendee)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise

        return self._load_meeting_with_attendees(meeting_id)

    def delete(self, meeting_id: uuid.UUID) -> None:
        """
        Delete a meeting.

        Raises:
            MeetingNotFoundError: If meeting doesn't exist.
        """
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise MeetingNotFoundError(meeting_id)

        self.db.delete(meeting)
        self.db.commit()

    def search(
        self,
        person_id: Optional[uuid.UUID] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Meeting], int]:
        """
        Search and list meetings with optional filters.

        Args:
            person_id: Filter to meetings where this person is an attendee.
            from_date: Filter meetings with occurred_at >= from_date.
            to_date: Filter meetings with occurred_at <= to_date.
            limit: Max results (1-100).
            offset: Skip first N results.

        Returns:
            Tuple of (list of meetings with attendees, total count).
        """
        limit = max(1, min(100, limit))
        offset = max(0, offset)

        # Build base query
        base_query = self.db.query(Meeting)

        # Filter by person_id (meetings where person is attendee)
        if person_id:
            base_query = base_query.join(MeetingAttendee).filter(
                MeetingAttendee.person_id == person_id
            )

        # Filter by date range
        if from_date:
            base_query = base_query.filter(Meeting.occurred_at >= from_date)
        if to_date:
            base_query = base_query.filter(Meeting.occurred_at <= to_date)

        # Get total count
        total = base_query.count()

        # Get paginated results ordered by occurred_at DESC, id DESC
        meeting_ids = [
            m.id
            for m in base_query.order_by(Meeting.occurred_at.desc(), Meeting.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        ]

        # Load meetings with attendees
        if not meeting_ids:
            return [], total

        meetings = (
            self.db.query(Meeting)
            .options(
                joinedload(Meeting.attendee_associations).joinedload(
                    MeetingAttendee.person
                )
            )
            .filter(Meeting.id.in_(meeting_ids))
            .all()
        )

        # Restore order (in_ doesn't preserve order)
        id_to_meeting = {m.id: m for m in meetings}
        ordered_meetings = [id_to_meeting[mid] for mid in meeting_ids]

        return ordered_meetings, total

    def add_attendee(
        self, meeting_id: uuid.UUID, person_id: uuid.UUID, role: Optional[str] = None
    ) -> Meeting:
        """
        Add an attendee to a meeting (idempotent).

        If the attendee already exists, updates their role if provided.

        Raises:
            MeetingNotFoundError: If meeting doesn't exist.
            InvalidAttendeeError: If person doesn't exist.
        """
        # Verify meeting exists
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise MeetingNotFoundError(meeting_id)

        # Verify person exists
        self._validate_person_ids([person_id])

        # Check if attendee already exists
        existing = (
            self.db.query(MeetingAttendee)
            .filter(
                and_(
                    MeetingAttendee.meeting_id == meeting_id,
                    MeetingAttendee.person_id == person_id,
                )
            )
            .first()
        )

        if existing:
            # Update role if provided
            if role is not None:
                existing.role = role
        else:
            # Create new attendee
            attendee = MeetingAttendee(
                meeting_id=meeting_id,
                person_id=person_id,
                role=role,
            )
            self.db.add(attendee)

        self.db.commit()
        return self._load_meeting_with_attendees(meeting_id)

    def remove_attendee(self, meeting_id: uuid.UUID, person_id: uuid.UUID) -> Meeting:
        """
        Remove an attendee from a meeting (idempotent).

        Returns the updated meeting even if the attendee wasn't present.

        Raises:
            MeetingNotFoundError: If meeting doesn't exist.
        """
        # Verify meeting exists
        meeting = self.db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            raise MeetingNotFoundError(meeting_id)

        # Delete attendee if exists (idempotent - no error if not found)
        self.db.query(MeetingAttendee).filter(
            and_(
                MeetingAttendee.meeting_id == meeting_id,
                MeetingAttendee.person_id == person_id,
            )
        ).delete()

        self.db.commit()
        return self._load_meeting_with_attendees(meeting_id)

    def _validate_person_ids(self, person_ids: list[uuid.UUID]) -> None:
        """
        Validate that all person IDs exist.

        Raises:
            InvalidAttendeeError: If any person_id doesn't exist.
        """
        if not person_ids:
            return

        unique_ids = list(set(person_ids))
        existing = (
            self.db.query(Person.id).filter(Person.id.in_(unique_ids)).all()
        )
        existing_ids = {p.id for p in existing}

        missing = [pid for pid in unique_ids if pid not in existing_ids]
        if missing:
            raise InvalidAttendeeError(missing)

    def _load_meeting_with_attendees(self, meeting_id: uuid.UUID) -> Optional[Meeting]:
        """Load a meeting with its attendees eagerly loaded."""
        return (
            self.db.query(Meeting)
            .options(
                joinedload(Meeting.attendee_associations).joinedload(
                    MeetingAttendee.person
                )
            )
            .filter(Meeting.id == meeting_id)
            .first()
        )
