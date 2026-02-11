import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, DateTime, Integer, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.organization import Classification


class EventType(str, enum.Enum):
    RETREAT = "RETREAT"
    DINNER = "DINNER"
    LUNCH = "LUNCH"
    OTHER = "OTHER"


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_events_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="event_type"),
        nullable=False,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification", create_type=False),
        default=Classification.INTERNAL,
        nullable=False,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # Full-text search vector
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="owned_events",
        foreign_keys=[owner_id],
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    attendees: Mapped[list["EventAttendee"]] = relationship(
        "EventAttendee",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    pitches: Mapped[list["EventPitch"]] = relationship(
        "EventPitch",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list["EventTag"]] = relationship(
        "EventTag",
        back_populates="event",
        cascade="all, delete-orphan",
    )
    versions: Mapped[list["EventVersion"]] = relationship(
        "EventVersion",
        back_populates="event",
        order_by="EventVersion.version_number",
    )


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id"),
        primary_key=True,
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id"),
        primary_key=True,
    )
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="attendees")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="event_attendances")


class EventPitch(Base):
    __tablename__ = "event_pitches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id"),
        nullable=False,
    )
    ticker: Mapped[str | None] = mapped_column(String(20), nullable=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    thesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    pitched_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id"),
        nullable=True,
    )
    is_bullish: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="pitches")
    pitcher: Mapped["Contact"] = relationship("Contact")
    creator: Mapped["User"] = relationship("User")


class EventTag(Base):
    __tablename__ = "event_tags"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id"),
        primary_key=True,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id"),
        primary_key=True,
    )
    tagged_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    tagged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="tags")
    tag: Mapped["Tag"] = relationship("Tag")
    tagger: Mapped["User"] = relationship("User")


class EventVersion(Base):
    __tablename__ = "event_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("events.id"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="versions")
    changer: Mapped["User"] = relationship("User")
