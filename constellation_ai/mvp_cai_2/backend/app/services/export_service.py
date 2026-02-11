import json
import zipfile
import io
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.contact import Contact
from app.models.organization import Organization
from app.models.activity import Activity, ActivityVersion
from app.models.attachment import Attachment
from app.models.audit import AuditLog
from app.services.blob_service import get_blob_service


class ExportService:
    """Service for exporting entities with full history and attachments."""

    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.blob_service = get_blob_service()

    async def export_entity(self, entity_type: str, entity_id: UUID) -> io.BytesIO:
        """
        Export a single entity with its full history.

        Returns a ZIP file containing:
        - Entity JSON
        - All versions (for activities)
        - All attachments
        - Audit trail
        """
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            if entity_type == "contact":
                await self._export_contact(zip_file, entity_id)
            elif entity_type == "organization":
                await self._export_organization(zip_file, entity_id)
            elif entity_type == "activity":
                await self._export_activity(zip_file, entity_id)
            else:
                raise ValueError(f"Unknown entity type: {entity_type}")

            # Add audit trail
            await self._add_audit_trail(zip_file, entity_type, entity_id)

        zip_buffer.seek(0)
        return zip_buffer

    async def _export_contact(self, zip_file: zipfile.ZipFile, contact_id: UUID) -> None:
        """Export a contact entity."""
        stmt = (
            select(Contact)
            .where(Contact.id == contact_id)
            .options(
                selectinload(Contact.organization),
                selectinload(Contact.tags),
            )
        )
        result = await self.db.execute(stmt)
        contact = result.scalar_one_or_none()

        if not contact:
            raise ValueError(f"Contact not found: {contact_id}")

        contact_data = {
            "id": str(contact.id),
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "title": contact.title,
            "organization_id": str(contact.organization_id) if contact.organization_id else None,
            "organization_name": contact.organization.name if contact.organization else None,
            "classification": contact.classification.value,
            "notes": contact.notes,
            "created_at": contact.created_at.isoformat(),
            "updated_at": contact.updated_at.isoformat(),
            "tags": [
                {"tag_id": str(t.tag_id), "tagged_at": t.tagged_at.isoformat()}
                for t in contact.tags
            ],
        }

        zip_file.writestr(
            f"contact_{contact_id}.json",
            json.dumps(contact_data, indent=2),
        )

    async def _export_organization(self, zip_file: zipfile.ZipFile, org_id: UUID) -> None:
        """Export an organization entity."""
        stmt = (
            select(Organization)
            .where(Organization.id == org_id)
            .options(
                selectinload(Organization.contacts),
                selectinload(Organization.tags),
            )
        )
        result = await self.db.execute(stmt)
        org = result.scalar_one_or_none()

        if not org:
            raise ValueError(f"Organization not found: {org_id}")

        org_data = {
            "id": str(org.id),
            "name": org.name,
            "short_name": org.short_name,
            "org_type": org.org_type.value if org.org_type else None,
            "website": org.website,
            "notes": org.notes,
            "classification": org.classification.value,
            "created_at": org.created_at.isoformat(),
            "updated_at": org.updated_at.isoformat(),
            "contacts": [
                {
                    "id": str(c.id),
                    "name": f"{c.first_name} {c.last_name}",
                    "email": c.email,
                }
                for c in org.contacts
                if not c.is_deleted
            ],
            "tags": [
                {"tag_id": str(t.tag_id), "tagged_at": t.tagged_at.isoformat()}
                for t in org.tags
            ],
        }

        zip_file.writestr(
            f"organization_{org_id}.json",
            json.dumps(org_data, indent=2),
        )

    async def _export_activity(self, zip_file: zipfile.ZipFile, activity_id: UUID) -> None:
        """Export an activity with all versions and attachments."""
        stmt = (
            select(Activity)
            .where(Activity.id == activity_id)
            .options(
                selectinload(Activity.attendees),
                selectinload(Activity.tags),
                selectinload(Activity.attachments),
                selectinload(Activity.versions),
                selectinload(Activity.followups),
            )
        )
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()

        if not activity:
            raise ValueError(f"Activity not found: {activity_id}")

        activity_data = {
            "id": str(activity.id),
            "title": activity.title,
            "activity_type": activity.activity_type.value,
            "occurred_at": activity.occurred_at.isoformat(),
            "location": activity.location,
            "description": activity.description,
            "summary": activity.summary,
            "key_points": activity.key_points,
            "classification": activity.classification.value,
            "created_at": activity.created_at.isoformat(),
            "updated_at": activity.updated_at.isoformat(),
            "attendees": [
                {"contact_id": str(a.contact_id), "role": a.role}
                for a in activity.attendees
            ],
            "tags": [
                {"tag_id": str(t.tag_id), "tagged_at": t.tagged_at.isoformat()}
                for t in activity.tags
            ],
            "followups": [
                {
                    "id": str(f.id),
                    "description": f.description,
                    "status": f.status.value,
                    "due_date": f.due_date.isoformat() if f.due_date else None,
                }
                for f in activity.followups
            ],
        }

        zip_file.writestr(
            f"activity_{activity_id}.json",
            json.dumps(activity_data, indent=2),
        )

        # Export versions
        versions_data = [
            {
                "version_number": v.version_number,
                "snapshot": v.snapshot,
                "changed_at": v.changed_at.isoformat(),
                "changed_by": str(v.changed_by),
            }
            for v in activity.versions
        ]
        zip_file.writestr(
            f"activity_{activity_id}_versions.json",
            json.dumps(versions_data, indent=2),
        )

        # Export attachments
        for attachment in activity.attachments:
            if not attachment.is_deleted:
                try:
                    # Download from blob storage
                    response = await self.blob_service.download(attachment.blob_path)
                    content = b""
                    async for chunk in response.body_iterator:
                        content += chunk
                    zip_file.writestr(
                        f"attachments/{attachment.filename}",
                        content,
                    )
                except Exception:
                    # Log error but continue with export
                    pass

    async def _add_audit_trail(
        self, zip_file: zipfile.ZipFile, entity_type: str, entity_id: UUID
    ) -> None:
        """Add audit trail for the entity to the ZIP file."""
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(AuditLog.created_at)
        )
        result = await self.db.execute(stmt)
        audit_entries = result.scalars().all()

        audit_data = [
            {
                "id": str(a.id),
                "user_id": str(a.user_id) if a.user_id else None,
                "action": a.action.value,
                "details": a.details,
                "ip_address": a.ip_address,
                "created_at": a.created_at.isoformat(),
            }
            for a in audit_entries
        ]

        zip_file.writestr(
            f"{entity_type}_{entity_id}_audit.json",
            json.dumps(audit_data, indent=2),
        )
