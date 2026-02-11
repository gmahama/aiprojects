from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.models.organization import OrgType, Classification
from app.schemas.user import UserResponse
from app.schemas.tag import TagResponse


class OrganizationBase(BaseModel):
    name: str
    short_name: str | None = None
    org_type: OrgType | None = None
    website: str | None = None
    notes: str | None = None
    classification: Classification = Classification.INTERNAL


class OrganizationCreate(OrganizationBase):
    owner_id: UUID | None = None
    tag_ids: list[UUID] | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    org_type: OrgType | None = None
    website: str | None = None
    notes: str | None = None
    classification: Classification | None = None
    owner_id: UUID | None = None


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    short_name: str | None
    org_type: OrgType | None
    website: str | None
    classification: Classification
    owner_id: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrganizationListResponse(BaseModel):
    items: list[OrganizationResponse]
    total: int
    page: int
    page_size: int


class ContactSummary(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: str | None
    title: str | None

    class Config:
        from_attributes = True


class OrganizationDetail(OrganizationResponse):
    notes: str | None
    owner: UserResponse | None = None
    contacts: list[ContactSummary] = []
    tags: list[TagResponse] = []

    class Config:
        from_attributes = True
