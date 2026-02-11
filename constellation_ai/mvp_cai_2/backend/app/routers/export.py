from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.dependencies import get_db, CurrentUser, DbSession
from app.models.user import User, UserRole
from app.auth.rbac import require_role
from app.services.export_service import ExportService

router = APIRouter()


@router.get("/{entity_type}/{entity_id}")
async def export_entity(
    entity_type: str,
    entity_id: UUID,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: DbSession = None,
) -> StreamingResponse:
    """
    Export a single entity with full history (Admin only).

    Returns a ZIP file containing:
    - Entity JSON data
    - All versions (for activities)
    - All attachments
    - Audit trail

    Supported entity types: contact, organization, activity
    """
    if entity_type not in ["contact", "organization", "activity"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity type: {entity_type}. Must be one of: contact, organization, activity",
        )

    export_service = ExportService(db, current_user)

    try:
        zip_buffer = await export_service.export_entity(entity_type, entity_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{entity_type}_{entity_id}.zip"'
        },
    )
