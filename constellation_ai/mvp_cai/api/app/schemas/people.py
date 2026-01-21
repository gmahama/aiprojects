import uuid
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def normalize_empty_string(v: Optional[str]) -> Optional[str]:
    """Convert empty strings to None."""
    if v is not None and isinstance(v, str) and v.strip() == "":
        return None
    return v


def normalize_tags(v: Optional[list[str]]) -> Optional[list[str]]:
    """Normalize tags: trim whitespace, lowercase, remove empties, dedupe."""
    if v is None:
        return None
    normalized = []
    seen = set()
    for tag in v:
        if tag is not None:
            tag = tag.strip().lower()
            if tag and tag not in seen:
                normalized.append(tag)
                seen.add(tag)
    return normalized if normalized else None


class PersonBase(BaseModel):
    """Base schema with common person fields."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    primary_email: Optional[EmailStr] = None
    employer: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None

    @field_validator("first_name", "last_name", "employer", "title", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v: Optional[str]) -> Optional[str]:
        return normalize_empty_string(v)

    @field_validator("primary_email", mode="before")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        v = normalize_empty_string(v)
        if v is not None:
            return v.lower().strip()
        return v

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags_field(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        return normalize_tags(v)


class PersonCreate(PersonBase):
    """Schema for creating a person."""

    first_name: Annotated[str, Field(min_length=1, max_length=255)]
    last_name: Annotated[str, Field(min_length=1, max_length=255)]


class PersonUpdate(PersonBase):
    """Schema for partial updates. All fields optional."""

    pass


class PersonRead(BaseModel):
    """Schema for reading a person."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    primary_email: Optional[str] = None
    employer: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    created_at: datetime
    updated_at: datetime


class PersonList(BaseModel):
    """Schema for paginated list of people."""

    items: list[PersonRead]
    total: int
    limit: int
    offset: int
