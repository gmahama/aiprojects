from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.models.organization import Classification


class AttachmentResponse(BaseModel):
    id: UUID
    activity_id: UUID
    filename: str
    content_type: str
    file_size_bytes: int | None
    checksum: str | None
    version_number: int
    parent_attachment_id: UUID | None
    classification: Classification
    uploaded_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    uploaded: list[AttachmentResponse]
    errors: list[str] = []
