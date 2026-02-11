from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel

from app.models.followup import FollowUpStatus


class FollowUpBase(BaseModel):
    description: str
    due_date: date | None = None


class FollowUpCreate(FollowUpBase):
    assigned_to: UUID | None = None


class FollowUpUpdate(BaseModel):
    description: str | None = None
    assigned_to: UUID | None = None
    due_date: date | None = None
    status: FollowUpStatus | None = None


class FollowUpResponse(BaseModel):
    id: UUID
    activity_id: UUID
    description: str
    assigned_to: UUID | None
    assigned_to_name: str | None = None
    due_date: date | None
    status: FollowUpStatus
    completed_at: datetime | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FollowUpListResponse(BaseModel):
    items: list[FollowUpResponse]
    total: int
    page: int
    page_size: int
