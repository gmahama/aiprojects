"""Add events tables

Revision ID: 002
Revises: 001
Create Date: 2026-02-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create event_type enum
    event_type = postgresql.ENUM(
        'RETREAT', 'DINNER', 'LUNCH', 'OTHER',
        name='event_type',
        create_type=False
    )
    event_type.create(op.get_bind(), checkfirst=True)

    # Events table
    op.create_table(
        'events',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('event_type', postgresql.ENUM('RETREAT', 'DINNER', 'LUNCH', 'OTHER', name='event_type', create_type=False), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('classification', postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False), nullable=False, server_default='INTERNAL'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('search_vector', postgresql.TSVECTOR(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_events_search_vector', 'events', ['search_vector'], postgresql_using='gin')

    # Event attendees table (M:N junction)
    op.create_table(
        'event_attendees',
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contact_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('event_id', 'contact_id')
    )

    # Event pitches table (stocks pitched at events)
    op.create_table(
        'event_pitches',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=True),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('thesis', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('pitched_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_bullish', sa.Boolean(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.ForeignKeyConstraint(['pitched_by'], ['contacts.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Event tags table (M:N junction)
    op.create_table(
        'event_tags',
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.ForeignKeyConstraint(['tagged_by'], ['users.id']),
        sa.PrimaryKeyConstraint('event_id', 'tag_id')
    )

    # Event versions table (append-only history)
    op.create_table(
        'event_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('snapshot', postgresql.JSONB(), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('event_versions')
    op.drop_table('event_tags')
    op.drop_table('event_pitches')
    op.drop_table('event_attendees')
    op.drop_index('ix_events_search_vector', table_name='events')
    op.drop_table('events')

    # Drop event_type enum
    op.execute('DROP TYPE IF EXISTS event_type')
