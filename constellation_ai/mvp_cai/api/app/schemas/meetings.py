import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def normalize_empty_string(v: Optional[str]) -> Optional[str]:
    """Convert empty strings to None."""
    if v is not None and isinstance(v, str) and v.strip() == "":
        return None
    return v


class AttendeeInput(BaseModel):
    """Input schema for specifying an attendee with optional role."""

    person_id: uuid.UUID
    role: Optional[str] = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: Optional[str]) -> Optional[str]:
        return normalize_empty_string(v)


class MeetingAttendeeRead(BaseModel):
    """Schema for reading attendee info in meeting responses."""

    model_config = ConfigDict(from_attributes=True)

    person_id: uuid.UUID
    role: Optional[str] = None
    # Include basic person info for convenience
    first_name: str
    last_name: str
    primary_email: Optional[str] = None


class MeetingBase(BaseModel):
    """Base schema with common meeting fields."""

    occurred_at: Optional[datetime] = None
    type: Optional[str] = None
    location: Optional[str] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    next_steps: Optional[str] = None

    @field_validator("type", "location", "agenda", "notes", "next_steps", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Optional[str]) -> Optional[str]:
        return normalize_empty_string(v)


class MeetingCreate(MeetingBase):
    """
    Schema for creating a meeting.

    Attendees can be specified either as:
    - A simple list of person_ids (attendees field)
    - A list of AttendeeInput objects with person_id and optional role
    """

    occurred_at: datetime
    type: str = Field(default="meeting", max_length=50)
    attendees: Optional[list[AttendeeInput | uuid.UUID]] = None

    @field_validator("attendees", mode="before")
    @classmethod
    def normalize_attendees(
        cls, v: Optional[list]
    ) -> Optional[list[AttendeeInput]]:
        """
        Normalize attendees to list of AttendeeInput.
        Accepts either UUIDs or AttendeeInput dicts, deduplicates by person_id.
        """
        if v is None:
            return None

        seen: set[uuid.UUID] = set()
        normalized: list[AttendeeInput] = []

        for item in v:
            if isinstance(item, dict):
                attendee = AttendeeInput(**item)
            elif isinstance(item, AttendeeInput):
                attendee = item
            elif isinstance(item, (str, uuid.UUID)):
                # Just a UUID, no role
                person_id = uuid.UUID(str(item)) if isinstance(item, str) else item
                attendee = AttendeeInput(person_id=person_id)
            else:
                raise ValueError(f"Invalid attendee format: {item}")

            # Deduplicate by person_id
            if attendee.person_id not in seen:
                seen.add(attendee.person_id)
                normalized.append(attendee)

        return normalized if normalized else None


class MeetingUpdate(MeetingBase):
    """
    Schema for partial meeting updates.

    If attendees is provided, it replaces the entire attendee set.
    To clear all attendees, pass an empty list: "attendees": []
    """

    attendees: Optional[list[AttendeeInput | uuid.UUID]] = None

    @field_validator("attendees", mode="before")
    @classmethod
    def normalize_attendees(
        cls, v: Optional[list]
    ) -> Optional[list[AttendeeInput]]:
        """
        Normalize attendees for update.

        Unlike create, we return [] for empty lists to allow clearing attendees.
        """
        if v is None:
            return None

        seen: set[uuid.UUID] = set()
        normalized: list[AttendeeInput] = []

        for item in v:
            if isinstance(item, dict):
                attendee = AttendeeInput(**item)
            elif isinstance(item, AttendeeInput):
                attendee = item
            elif isinstance(item, (str, uuid.UUID)):
                person_id = uuid.UUID(str(item)) if isinstance(item, str) else item
                attendee = AttendeeInput(person_id=person_id)
            else:
                raise ValueError(f"Invalid attendee format: {item}")

            if attendee.person_id not in seen:
                seen.add(attendee.person_id)
                normalized.append(attendee)

        # Return the list as-is (even if empty) to allow clearing attendees
        return normalized


class MeetingRead(BaseModel):
    """Schema for reading a meeting with attendees."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    occurred_at: datetime
    type: str
    location: Optional[str] = None
    agenda: Optional[str] = None
    notes: Optional[str] = None
    next_steps: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    attendees: list[MeetingAttendeeRead] = []


class MeetingList(BaseModel):
    """Schema for paginated list of meetings."""

    items: list[MeetingRead]
    total: int
    limit: int
    offset: int
