import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.organization import Classification


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=True,
    )
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
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    # Relationships
    organization: Mapped["Organization | None"] = relationship(
        "Organization",
        back_populates="contacts",
    )
    owner: Mapped["User | None"] = relationship(
        "User",
        back_populates="owned_contacts",
        foreign_keys=[owner_id],
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    tags: Mapped[list["ContactTag"]] = relationship(
        "ContactTag",
        back_populates="contact",
        cascade="all, delete-orphan",
    )
    activity_attendances: Mapped[list["ActivityAttendee"]] = relationship(
        "ActivityAttendee",
        back_populates="contact",
    )
    event_attendances: Mapped[list["EventAttendee"]] = relationship(
        "EventAttendee",
        back_populates="contact",
    )
