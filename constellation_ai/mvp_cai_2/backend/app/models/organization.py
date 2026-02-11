import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Enum, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OrgType(str, enum.Enum):
    ASSET_MANAGER = "ASSET_MANAGER"
    BROKER = "BROKER"
    CONSULTANT = "CONSULTANT"
    CORPORATE = "CORPORATE"
    OTHER = "OTHER"


class Classification(str, enum.Enum):
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    org_type: Mapped[OrgType | None] = mapped_column(
        Enum(OrgType, name="org_type"),
        nullable=True,
    )
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification: Mapped[Classification] = mapped_column(
        Enum(Classification, name="classification"),
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

    # Relationships
    owner: Mapped["User | None"] = relationship(
        "User",
        back_populates="owned_organizations",
        foreign_keys=[owner_id],
    )
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    contacts: Mapped[list["Contact"]] = relationship(
        "Contact",
        back_populates="organization",
    )
    tags: Mapped[list["OrganizationTag"]] = relationship(
        "OrganizationTag",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
