from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr

from app.models.organization import Classification
from app.schemas.user import UserResponse
from app.schemas.tag import TagResponse


class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    title: str | None = None
    notes: str | None = None
    classification: Classification = Classification.INTERNAL


class ContactCreate(ContactBase):
    organization_id: UUID | None = None
    owner_id: UUID | None = None
    tag_ids: list[UUID] | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    title: str | None = None
    organization_id: UUID | None = None
    owner_id: UUID | None = None
    notes: str | None = None
    classification: Classification | None = None


class OrganizationSummary(BaseModel):
    id: UUID
    name: str
    short_name: str | None

    class Config:
        from_attributes = True


class ContactResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    title: str | None
    organization_id: UUID | None
    organization: OrganizationSummary | None = None
    classification: Classification
    owner_id: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    page_size: int


class ActivitySummary(BaseModel):
    id: UUID
    title: str
    activity_type: str
    occurred_at: datetime

    class Config:
        from_attributes = True


class ContactDetail(ContactResponse):
    notes: str | None
    owner: UserResponse | None = None
    tags: list[TagResponse] = []
    recent_activities: list[ActivitySummary] = []

    class Config:
        from_attributes = True
