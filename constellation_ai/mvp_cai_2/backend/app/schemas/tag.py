from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class TagSetBase(BaseModel):
    name: str
    description: str | None = None


class TagSetCreate(TagSetBase):
    pass


class TagSetResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TagBase(BaseModel):
    value: str


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    value: str | None = None
    is_active: bool | None = None


class TagResponse(BaseModel):
    id: UUID
    tag_set_id: UUID
    value: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TagWithSetName(TagResponse):
    tag_set_name: str


class TagSetWithTags(TagSetResponse):
    tags: list[TagResponse] = []

    class Config:
        from_attributes = True
