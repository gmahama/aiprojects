from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog, AuditAction
from app.models.organization import Classification


async def log_action(
    db: AsyncSession,
    user_id: UUID | None,
    action: AuditAction,
    entity_type: str,
    entity_id: UUID,
    details: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """
    Log an action to the audit log.

    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Type of action (CREATE, READ, UPDATE, DELETE)
        entity_type: Type of entity being acted upon (e.g., 'contact', 'activity')
        entity_id: ID of the entity
        details: Optional additional details (e.g., diff for UPDATE)
        ip_address: Optional client IP address
    """
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(audit_entry)
    await db.flush()
    return audit_entry


async def log_read(
    db: AsyncSession,
    user_id: UUID | None,
    entity_type: str,
    entity_id: UUID,
    classification: Classification,
    ip_address: str | None = None,
) -> AuditLog | None:
    """
    Log a READ action for CONFIDENTIAL and RESTRICTED records only.

    Returns None if logging is not required for this classification level.
    """
    if classification == Classification.INTERNAL:
        return None

    return await log_action(
        db=db,
        user_id=user_id,
        action=AuditAction.READ,
        entity_type=entity_type,
        entity_id=entity_id,
        details={"classification": classification.value},
        ip_address=ip_address,
    )
