from datetime import datetime
from uuid import UUID
from pydantic import BaseModel

from app.models.event import EventType
from app.models.organization import Classification
from app.schemas.user import UserResponse
from app.schemas.tag import TagResponse


class AttendeeCreate(BaseModel):
    """Create an event attendee - either existing contact or new contact inline."""
    contact_id: UUID | None = None  # Existing contact
    # OR create new contact inline:
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    organization_id: UUID | None = None
    # Attendee-specific fields
    role: str | None = None
    notes: str | None = None


class AttendeeResponse(BaseModel):
    contact_id: UUID
    first_name: str
    last_name: str
    email: str | None
    organization_name: str | None
    role: str | None
    notes: str | None

    class Config:
        from_attributes = True


class PitchCreate(BaseModel):
    ticker: str | None = None
    company_name: str
    thesis: str | None = None
    notes: str | None = None
    pitched_by: UUID | None = None  # Contact who pitched
    is_bullish: bool | None = None


class PitchResponse(BaseModel):
    id: UUID
    ticker: str | None
    company_name: str
    thesis: str | None
    notes: str | None
    pitched_by: UUID | None
    pitcher_name: str | None = None
    is_bullish: bool | None
    created_by: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class EventBase(BaseModel):
    name: str
    event_type: EventType
    occurred_at: datetime
    location: str | None = None
    description: str | None = None
    notes: str | None = None
    classification: Classification = Classification.INTERNAL


class EventCreate(EventBase):
    attendees: list[AttendeeCreate] | None = None
    pitches: list[PitchCreate] | None = None
    tag_ids: list[UUID] | None = None


class EventUpdate(BaseModel):
    name: str | None = None
    event_type: EventType | None = None
    occurred_at: datetime | None = None
    location: str | None = None
    description: str | None = None
    notes: str | None = None
    classification: Classification | None = None


class EventResponse(BaseModel):
    id: UUID
    name: str
    event_type: EventType
    occurred_at: datetime
    location: str | None
    classification: Classification
    owner_id: UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EventListResponse(BaseModel):
    items: list[EventResponse]
    total: int
    page: int
    page_size: int


class EventVersionResponse(BaseModel):
    id: UUID
    version_number: int
    snapshot: dict
    changed_by: UUID
    changed_at: datetime

    class Config:
        from_attributes = True


class EventDetail(EventResponse):
    description: str | None
    notes: str | None
    owner: UserResponse | None = None
    attendees: list[AttendeeResponse] = []
    pitches: list[PitchResponse] = []
    tags: list[TagResponse] = []
    versions: list[EventVersionResponse] = []

    class Config:
        from_attributes = True
