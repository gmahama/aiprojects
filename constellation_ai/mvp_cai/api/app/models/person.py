from typing import TYPE_CHECKING, Optional

from sqlalchemy import Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting, MeetingAttendee


class Person(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Represents an individual contact in the CRM.

    Tags implementation choice: Using PostgreSQL ARRAY(Text) rather than a
    normalized join table because:
    - Tags are simple strings without additional metadata (no description, color, etc.)
    - MVP scope doesn't require tag analytics or hierarchical tags
    - Array operations (contains, overlap) are sufficient for filtering
    - Simpler queries and fewer joins for common operations
    - Easy to migrate to a normalized table later if requirements change
    """

    __tablename__ = "people"

    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_email: Mapped[Optional[str]] = mapped_column(
        String(320),  # RFC 5321 max email length
        unique=True,
        nullable=True,
    )
    employer: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text),
        nullable=True,
        server_default="{}",
    )

    # Relationships
    meeting_associations: Mapped[list["MeetingAttendee"]] = relationship(
        "MeetingAttendee",
        back_populates="person",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def meetings(self) -> list["Meeting"]:
        """Access meetings this person has attended."""
        return [assoc.meeting for assoc in self.meeting_associations]

    __table_args__ = (
        # Case-insensitive index on primary_email defined in migration using lower()
        # Composite index for name-based searches and sorting
        Index("ix_people_last_first_name", "last_name", "first_name"),
    )

    def __repr__(self) -> str:
        return f"<Person {self.first_name} {self.last_name}>"
