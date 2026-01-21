"""Create people and meetings tables

Revision ID: 001_initial
Revises:
Create Date: 2025-01-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create people table
    op.create_table(
        "people",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("primary_email", sa.String(320), nullable=True),
        sa.Column("employer", sa.String(255), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "tags",
            postgresql.ARRAY(sa.Text()),
            server_default="{}",
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("primary_email"),
    )

    # Case-insensitive index on primary_email using lower()
    op.create_index(
        "ix_people_primary_email_lower",
        "people",
        [sa.text("lower(primary_email)")],
        unique=False,
    )

    # Composite index on (last_name, first_name)
    op.create_index(
        "ix_people_last_first_name",
        "people",
        ["last_name", "first_name"],
        unique=False,
    )

    # Create meetings table
    op.create_table(
        "meetings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("agenda", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("next_steps", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Index on occurred_at
    op.create_index(
        "ix_meetings_occurred_at",
        "meetings",
        ["occurred_at"],
        unique=False,
    )

    # Create meeting_attendees join table
    op.create_table(
        "meeting_attendees",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("meeting_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["meeting_id"],
            ["meetings.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["person_id"],
            ["people.id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("meeting_id", "person_id", name="uq_meeting_person"),
    )

    # Index on person_id for efficient lookups of meetings by person
    op.create_index(
        "ix_meeting_attendees_person_id",
        "meeting_attendees",
        ["person_id"],
        unique=False,
    )


def downgrade() -> None:
    # Drop meeting_attendees table (and its indexes)
    op.drop_index("ix_meeting_attendees_person_id", table_name="meeting_attendees")
    op.drop_table("meeting_attendees")

    # Drop meetings table (and its indexes)
    op.drop_index("ix_meetings_occurred_at", table_name="meetings")
    op.drop_table("meetings")

    # Drop people table (and its indexes)
    op.drop_index("ix_people_last_first_name", table_name="people")
    op.drop_index("ix_people_primary_email_lower", table_name="people")
    op.drop_table("people")
