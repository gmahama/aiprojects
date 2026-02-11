from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db, CurrentUser
from app.models.user import User, UserRole
from app.models.audit import AuditLog, AuditAction
from app.auth.rbac import require_role

router = APIRouter()


@router.get("")
async def query_audit_log(
    page: int = 1,
    page_size: int = 50,
    user_id: UUID | None = Query(None, description="Filter by user ID"),
    action: AuditAction | None = Query(None, description="Filter by action type"),
    entity_type: str | None = Query(None, description="Filter by entity type"),
    entity_id: UUID | None = Query(None, description="Filter by entity ID"),
    from_date: date | None = Query(None, alias="from", description="Start date"),
    to_date: date | None = Query(None, alias="to", description="End date"),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Query audit log entries (Admin only)."""
    offset = (page - 1) * page_size

    stmt = select(AuditLog)

    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if entity_id:
        stmt = stmt.where(AuditLog.entity_id == entity_id)
    if from_date:
        stmt = stmt.where(func.date(AuditLog.created_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(AuditLog.created_at) <= to_date)

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar()

    # Get audit entries
    stmt = stmt.offset(offset).limit(page_size).order_by(AuditLog.created_at.desc())
    result = await db.execute(stmt)
    entries = result.scalars().all()

    return {
        "items": [
            {
                "id": str(e.id),
                "user_id": str(e.user_id) if e.user_id else None,
                "action": e.action.value,
                "entity_type": e.entity_type,
                "entity_id": str(e.entity_id),
                "details": e.details,
                "ip_address": e.ip_address,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
