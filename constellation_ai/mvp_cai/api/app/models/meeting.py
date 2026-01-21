import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.person import Person


class Meeting(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a meeting or interaction with one or more people."""

    __tablename__ = "meetings"

    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    agenda: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    next_steps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    attendee_associations: Mapped[list["MeetingAttendee"]] = relationship(
        "MeetingAttendee",
        back_populates="meeting",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def attendees(self) -> list["Person"]:
        """Access people who attended this meeting."""
        return [assoc.person for assoc in self.attendee_associations]

    __table_args__ = (
        Index("ix_meetings_occurred_at", "occurred_at"),
    )

    def __repr__(self) -> str:
        return f"<Meeting {self.type} @ {self.occurred_at}>"


class MeetingAttendee(Base):
    """
    Association table linking meetings to attendees.

    Uses a composite unique constraint on (meeting_id, person_id) rather than
    a composite primary key to allow for a separate auto-generated id if needed
    for future extensibility (e.g., audit trails).
    """

    __tablename__ = "meeting_attendees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("people.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # Relationships with explicit back_populates
    meeting: Mapped["Meeting"] = relationship(
        "Meeting",
        back_populates="attendee_associations",
    )
    person: Mapped["Person"] = relationship(
        "Person",
        back_populates="meeting_associations",
    )

    __table_args__ = (
        UniqueConstraint("meeting_id", "person_id", name="uq_meeting_person"),
        Index("ix_meeting_attendees_person_id", "person_id"),
    )

    def __repr__(self) -> str:
        return f"<MeetingAttendee meeting={self.meeting_id} person={self.person_id}>"
