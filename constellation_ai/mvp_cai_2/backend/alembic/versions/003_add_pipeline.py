"""Add pipeline tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pipeline_status enum
    pipeline_status = postgresql.ENUM(
        'ACTIVE', 'BACK_BURNER', 'PASSED', 'CONVERTED',
        name='pipeline_status',
        create_type=False,
    )
    pipeline_status.create(op.get_bind(), checkfirst=True)

    # Pipeline items table
    op.create_table(
        'pipeline_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('primary_contact_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stage', sa.SmallInteger(), nullable=False, server_default='1'),
        sa.Column('status', postgresql.ENUM('ACTIVE', 'BACK_BURNER', 'PASSED', 'CONVERTED', name='pipeline_status', create_type=False), nullable=False, server_default='ACTIVE'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('back_burner_reason', sa.Text(), nullable=True),
        sa.Column('passed_reason', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('entered_pipeline_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_stage_change_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['primary_contact_id'], ['contacts.id']),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.CheckConstraint('stage >= 1 AND stage <= 6', name='ck_pipeline_items_stage_range'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Partial unique index: only one ACTIVE or BACK_BURNER item per org (excluding deleted)
    op.execute(
        "CREATE UNIQUE INDEX uq_pipeline_org_active "
        "ON pipeline_items (organization_id) "
        "WHERE status IN ('ACTIVE', 'BACK_BURNER') AND is_deleted = FALSE"
    )

    # Pipeline stage history table (append-only)
    op.create_table(
        'pipeline_stage_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('pipeline_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('from_stage', sa.SmallInteger(), nullable=True),
        sa.Column('to_stage', sa.SmallInteger(), nullable=False),
        sa.Column('from_status', sa.String(20), nullable=True),
        sa.Column('to_status', sa.String(20), nullable=False),
        sa.Column('changed_by_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['pipeline_item_id'], ['pipeline_items.id']),
        sa.ForeignKeyConstraint(['changed_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('pipeline_stage_history')
    op.execute('DROP INDEX IF EXISTS uq_pipeline_org_active')
    op.drop_table('pipeline_items')
    op.execute('DROP TYPE IF EXISTS pipeline_status')
