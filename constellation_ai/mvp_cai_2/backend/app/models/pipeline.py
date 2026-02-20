import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Text, Boolean, SmallInteger, Enum, DateTime, ForeignKey,
    CheckConstraint, Index, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PipelineStage(int, enum.Enum):
    FIRST_MEETING = 1
    QUANTITATIVE_DILIGENCE = 2
    PATRICK_MEETING = 3
    LIVE_DILIGENCE = 4
    REFERENCES = 5
    DOCS = 6


class PipelineStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    BACK_BURNER = "BACK_BURNER"
    PASSED = "PASSED"
    CONVERTED = "CONVERTED"


STAGE_LABELS: dict[int, str] = {
    1: "First Meeting",
    2: "Quantitative Diligence",
    3: "Patrick Meeting",
    4: "Live Diligence",
    5: "References",
    6: "Docs",
}


class PipelineItem(Base):
    __tablename__ = "pipeline_items"
    __table_args__ = (
        CheckConstraint("stage >= 1 AND stage <= 6", name="ck_pipeline_items_stage_range"),
        # The partial unique index is created in the migration via raw SQL
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id"),
        nullable=False,
    )
    primary_contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id"),
        nullable=True,
    )
    stage: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
        default=1,
        server_default="1",
    )
    status: Mapped[PipelineStatus] = mapped_column(
        Enum(PipelineStatus, name="pipeline_status", create_type=False),
        nullable=False,
        default=PipelineStatus.ACTIVE,
        server_default="ACTIVE",
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
    back_burner_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    passed_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    entered_pipeline_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_stage_change_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
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
    organization: Mapped["Organization"] = relationship(
        "Organization",
        foreign_keys=[organization_id],
    )
    primary_contact: Mapped["Contact | None"] = relationship(
        "Contact",
        foreign_keys=[primary_contact_id],
    )
    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_id],
    )
    created_by_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by],
    )
    stage_history: Mapped[list["PipelineStageHistory"]] = relationship(
        "PipelineStageHistory",
        back_populates="pipeline_item",
        order_by="PipelineStageHistory.changed_at",
    )


class PipelineStageHistory(Base):
    __tablename__ = "pipeline_stage_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    pipeline_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_items.id"),
        nullable=False,
    )
    from_stage: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    to_stage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    pipeline_item: Mapped["PipelineItem"] = relationship(
        "PipelineItem",
        back_populates="stage_history",
    )
    changed_by: Mapped["User"] = relationship("User")
