import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, DateTime, Integer, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.organization import Classification


class ActivityType(str, enum.Enum):
    MEETING = "MEETING"
    CALL = "CALL"
    EMAIL = "EMAIL"
    NOTE = "NOTE"
    LLM_INTERACTION = "LLM_INTERACTION"
    SLACK_NOTE = "SLACK_NOTE"


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType, name="activity_type"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_points: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification", create_type=False),
        default=Classification.INTERNAL,
        nullable=False,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
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
        back_populates="owned_activities",
        foreign_keys=[owner_id],
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    attendees: Mapped[list["ActivityAttendee"]] = relationship(
        "ActivityAttendee",
        back_populates="activity",
        cascade="all, delete-orphan",
    )
    tags: Mapped[list["ActivityTag"]] = relationship(
        "ActivityTag",
        back_populates="activity",
        cascade="all, delete-orphan",
    )
    attachments: Mapped[list["Attachment"]] = relationship(
        "Attachment",
        back_populates="activity",
    )
    followups: Mapped[list["FollowUp"]] = relationship(
        "FollowUp",
        back_populates="activity",
    )
    versions: Mapped[list["ActivityVersion"]] = relationship(
        "ActivityVersion",
        back_populates="activity",
        order_by="ActivityVersion.version_number",
    )


class ActivityAttendee(Base):
    __tablename__ = "activity_attendees"

    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("activities.id"),
        primary_key=True,
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id"),
        primary_key=True,
    )
    role: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    activity: Mapped["Activity"] = relationship("Activity", back_populates="attendees")
    contact: Mapped["Contact"] = relationship("Contact", back_populates="activity_attendances")


class ActivityVersion(Base):
    __tablename__ = "activity_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    activity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("activities.id"),
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
    activity: Mapped["Activity"] = relationship("Activity", back_populates="versions")
    changer: Mapped["User"] = relationship("User")
