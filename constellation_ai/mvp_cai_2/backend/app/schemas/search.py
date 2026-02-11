from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel

from app.models.activity import ActivityType


class SearchQuery(BaseModel):
    q: str
    entity_types: list[str] | None = None  # 'contact', 'organization', 'activity'
    tag_ids: list[UUID] | None = None
    from_date: date | None = None
    to_date: date | None = None
    activity_type: ActivityType | None = None
    owner_id: UUID | None = None
    organization_id: UUID | None = None


class SearchResult(BaseModel):
    entity_type: str
    entity_id: UUID
    title: str
    snippet: str | None
    relevance_score: float
    metadata: dict | None = None


class SearchResponse(BaseModel):
    items: list[SearchResult]
    total: int
    query: str
