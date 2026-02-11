from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.models.activity import ActivityType
from app.models.organization import Classification
from app.schemas.user import UserResponse
from app.schemas.tag import TagResponse
from app.schemas.followup import FollowUpResponse, FollowUpCreate


class AttendeeCreate(BaseModel):
    contact_id: UUID
    role: str | None = None


class AttendeeResponse(BaseModel):
    contact_id: UUID
    first_name: str
    last_name: str
    email: str | None
    organization_name: str | None
    role: str | None

    class Config:
        from_attributes = True


class ActivityBase(BaseModel):
    title: str
    activity_type: ActivityType
    occurred_at: datetime
    description: str | None = None
    location: str | None = None
    summary: str | None = None
    key_points: str | None = None
    classification: Classification = Classification.INTERNAL


class ActivityCreate(ActivityBase):
    attendees: list[AttendeeCreate] | None = None
    tag_ids: list[UUID] | None = None
    followups: list[FollowUpCreate] | None = None


class ActivityUpdate(BaseModel):
    title: str | None = None
    activity_type: ActivityType | None = None
    occurred_at: datetime | None = None
    description: str | None = None
    location: str | None = None
    summary: str | None = None
    key_points: str | None = None
    classification: Classification | None = None


class ActivityResponse(BaseModel):
    id: UUID
    title: str
    activity_type: ActivityType
    occurred_at: datetime
    location: str | None
    classification: Classification
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    page_size: int


class AttachmentSummary(BaseModel):
    id: UUID
    filename: str
    content_type: str
    file_size_bytes: int | None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityVersionResponse(BaseModel):
    id: UUID
    version_number: int
    snapshot: dict
    changed_by: UUID
    changed_at: datetime

    class Config:
        from_attributes = True


class ActivityDetail(ActivityResponse):
    description: str | None
    summary: str | None
    key_points: str | None
    owner: UserResponse | None = None
    attendees: list[AttendeeResponse] = []
    tags: list[TagResponse] = []
    attachments: list[AttachmentSummary] = []
    followups: list[FollowUpResponse] = []
    versions: list[ActivityVersionResponse] = []

    class Config:
        from_attributes = True
