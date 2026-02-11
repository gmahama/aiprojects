"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    user_role = postgresql.ENUM('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER', name='user_role', create_type=False)
    user_role.create(op.get_bind(), checkfirst=True)

    org_type = postgresql.ENUM('ASSET_MANAGER', 'BROKER', 'CONSULTANT', 'CORPORATE', 'OTHER', name='org_type', create_type=False)
    org_type.create(op.get_bind(), checkfirst=True)

    classification = postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False)
    classification.create(op.get_bind(), checkfirst=True)

    activity_type = postgresql.ENUM('MEETING', 'CALL', 'EMAIL', 'NOTE', 'LLM_INTERACTION', 'SLACK_NOTE', name='activity_type', create_type=False)
    activity_type.create(op.get_bind(), checkfirst=True)

    followup_status = postgresql.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='followup_status', create_type=False)
    followup_status.create(op.get_bind(), checkfirst=True)

    audit_action = postgresql.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', name='audit_action', create_type=False)
    audit_action.create(op.get_bind(), checkfirst=True)

    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('entra_object_id', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('role', postgresql.ENUM('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER', name='user_role', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('entra_object_id'),
        sa.UniqueConstraint('email')
    )

    # Organizations table
    op.create_table(
        'organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('short_name', sa.String(100), nullable=True),
        sa.Column('org_type', postgresql.ENUM('ASSET_MANAGER', 'BROKER', 'CONSULTANT', 'CORPORATE', 'OTHER', name='org_type', create_type=False), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('classification', postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False), nullable=False, server_default='INTERNAL'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Contacts table
    op.create_table(
        'contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('first_name', sa.String(255), nullable=False),
        sa.Column('last_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('classification', postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False), nullable=False, server_default='INTERNAL'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Tag sets table
    op.create_table(
        'tag_sets',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Tags table
    op.create_table(
        'tags',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('tag_set_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('value', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tag_set_id'], ['tag_sets.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tag_set_id', 'value', name='uq_tag_set_value')
    )

    # Contact tags table
    op.create_table(
        'contact_tags',
        sa.Column('contact_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.ForeignKeyConstraint(['tagged_by'], ['users.id']),
        sa.PrimaryKeyConstraint('contact_id', 'tag_id')
    )

    # Organization tags table
    op.create_table(
        'organization_tags',
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.ForeignKeyConstraint(['tagged_by'], ['users.id']),
        sa.PrimaryKeyConstraint('organization_id', 'tag_id')
    )

    # Activities table
    op.create_table(
        'activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('activity_type', postgresql.ENUM('MEETING', 'CALL', 'EMAIL', 'NOTE', 'LLM_INTERACTION', 'SLACK_NOTE', name='activity_type', create_type=False), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('key_points', sa.Text(), nullable=True),
        sa.Column('classification', postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False), nullable=False, server_default='INTERNAL'),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
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
    op.create_index('ix_activities_search_vector', 'activities', ['search_vector'], postgresql_using='gin')

    # Activity attendees table
    op.create_table(
        'activity_attendees',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('contact_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(50), nullable=True),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id']),
        sa.PrimaryKeyConstraint('activity_id', 'contact_id')
    )

    # Activity tags table
    op.create_table(
        'activity_tags',
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tag_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tagged_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id']),
        sa.ForeignKeyConstraint(['tagged_by'], ['users.id']),
        sa.PrimaryKeyConstraint('activity_id', 'tag_id')
    )

    # Activity versions table
    op.create_table(
        'activity_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('snapshot', postgresql.JSONB(), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Attachments table
    op.create_table(
        'attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('filename', sa.Text(), nullable=False),
        sa.Column('content_type', sa.String(255), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('blob_path', sa.Text(), nullable=False),
        sa.Column('checksum', sa.String(64), nullable=True),
        sa.Column('version_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('parent_attachment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('classification', postgresql.ENUM('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classification', create_type=False), nullable=False, server_default='INTERNAL'),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['parent_attachment_id'], ['attachments.id']),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Follow-ups table
    op.create_table(
        'followups',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('activity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('status', postgresql.ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='followup_status', create_type=False), nullable=False, server_default='OPEN'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['activity_id'], ['activities.id']),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # Audit log table
    op.create_table(
        'audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action', postgresql.ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', name='audit_action', create_type=False), nullable=False),
        sa.Column('entity_type', sa.String(100), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_log_entity', 'audit_log', ['entity_type', 'entity_id'])
    op.create_index('ix_audit_log_user_created', 'audit_log', ['user_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('audit_log')
    op.drop_table('followups')
    op.drop_table('attachments')
    op.drop_table('activity_versions')
    op.drop_table('activity_tags')
    op.drop_table('activity_attendees')
    op.drop_table('activities')
    op.drop_table('organization_tags')
    op.drop_table('contact_tags')
    op.drop_table('tags')
    op.drop_table('tag_sets')
    op.drop_table('contacts')
    op.drop_table('organizations')
    op.drop_table('users')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS audit_action')
    op.execute('DROP TYPE IF EXISTS followup_status')
    op.execute('DROP TYPE IF EXISTS activity_type')
    op.execute('DROP TYPE IF EXISTS classification')
    op.execute('DROP TYPE IF EXISTS org_type')
    op.execute('DROP TYPE IF EXISTS user_role')
