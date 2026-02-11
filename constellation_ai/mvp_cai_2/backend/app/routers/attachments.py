from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import get_db, CurrentUser, get_client_ip
from app.models.user import User
from app.models.activity import Activity
from app.models.attachment import Attachment, ALLOWED_CONTENT_TYPES
from app.models.audit import AuditAction
from app.auth.rbac import filter_by_classification
from app.services.audit_service import log_action, log_read
from app.services.blob_service import get_blob_service, BlobService
from app.schemas.attachment import AttachmentResponse, AttachmentUploadResponse

router = APIRouter()


def get_blob_svc() -> BlobService:
    return get_blob_service()


@router.post(
    "/activities/{activity_id}/attachments",
    response_model=AttachmentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachments(
    activity_id: UUID,
    files: list[UploadFile] = File(...),
    request: Request = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobService = Depends(get_blob_svc),
) -> dict:
    """Upload attachments to an activity."""
    accessible_classifications = filter_by_classification(current_user)

    # Verify activity exists and is accessible
    stmt = select(Activity).where(
        Activity.id == activity_id,
        Activity.is_deleted == False,
        Activity.classification.in_(accessible_classifications),
    )
    result = await db.execute(stmt)
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    uploaded = []
    errors = []

    for file in files:
        # Validate content type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            errors.append(f"File '{file.filename}' has unsupported content type: {file.content_type}")
            continue

        try:
            attachment_id = uuid4()
            blob_path = BlobService.generate_path(activity_id, attachment_id, file.filename)

            # Upload to blob storage
            _, checksum, file_size = await blob_service.upload(file, blob_path)

            # Create attachment record
            attachment = Attachment(
                id=attachment_id,
                activity_id=activity_id,
                filename=file.filename,
                content_type=file.content_type,
                file_size_bytes=file_size,
                blob_path=blob_path,
                checksum=checksum,
                classification=activity.classification,
                uploaded_by=current_user.id,
            )
            db.add(attachment)
            await db.flush()

            # Log upload
            await log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.CREATE,
                entity_type="attachment",
                entity_id=attachment.id,
                details={"filename": file.filename, "activity_id": str(activity_id)},
                ip_address=get_client_ip(request),
            )

            uploaded.append(attachment)

        except Exception as e:
            errors.append(f"Failed to upload '{file.filename}': {str(e)}")

    await db.commit()

    return {
        "uploaded": uploaded,
        "errors": errors,
    }


@router.get("/{attachment_id}/download")
async def download_attachment(
    attachment_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobService = Depends(get_blob_svc),
) -> StreamingResponse:
    """Download an attachment."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = (
        select(Attachment)
        .where(
            Attachment.id == attachment_id,
            Attachment.is_deleted == False,
        )
        .options(selectinload(Attachment.activity))
    )
    result = await db.execute(stmt)
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    # Check classification access
    if attachment.classification not in accessible_classifications:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to access this attachment",
        )

    # Log read for CONFIDENTIAL/RESTRICTED
    await log_read(
        db=db,
        user_id=current_user.id,
        entity_type="attachment",
        entity_id=attachment.id,
        classification=attachment.classification,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    try:
        return await blob_service.download(attachment.blob_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found in storage",
        )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: UUID,
    request: Request,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
    blob_service: BlobService = Depends(get_blob_svc),
) -> None:
    """Soft delete an attachment."""
    accessible_classifications = filter_by_classification(current_user)

    stmt = select(Attachment).where(
        Attachment.id == attachment_id,
        Attachment.is_deleted == False,
    )
    result = await db.execute(stmt)
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    if attachment.classification not in accessible_classifications:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete this attachment",
        )

    # Soft delete in database
    attachment.is_deleted = True
    attachment.deleted_at = datetime.utcnow()

    # Soft delete in blob storage
    await blob_service.delete(attachment.blob_path)

    await log_action(
        db=db,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        entity_type="attachment",
        entity_id=attachment.id,
        ip_address=get_client_ip(request),
    )

    await db.commit()
