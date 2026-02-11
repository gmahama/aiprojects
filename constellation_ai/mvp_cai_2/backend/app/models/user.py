import enum
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Enum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    entra_object_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.VIEWER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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
    owned_organizations: Mapped[list["Organization"]] = relationship(
        "Organization",
        back_populates="owner",
        foreign_keys="Organization.owner_id",
    )
    owned_contacts: Mapped[list["Contact"]] = relationship(
        "Contact",
        back_populates="owner",
        foreign_keys="Contact.owner_id",
    )
    owned_activities: Mapped[list["Activity"]] = relationship(
        "Activity",
        back_populates="owner",
        foreign_keys="Activity.owner_id",
    )
    assigned_followups: Mapped[list["FollowUp"]] = relationship(
        "FollowUp",
        back_populates="assigned_to_user",
        foreign_keys="FollowUp.assigned_to",
    )
    owned_events: Mapped[list["Event"]] = relationship(
        "Event",
        back_populates="owner",
        foreign_keys="Event.owner_id",
    )
