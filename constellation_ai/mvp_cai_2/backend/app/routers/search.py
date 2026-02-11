from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, Query

from app.dependencies import get_db, CurrentUser, DbSession
from app.models.activity import ActivityType
from app.services.search_service import SearchService
from app.schemas.search import SearchResponse

router = APIRouter()


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    type: str | None = Query(None, description="Entity types to search (comma-separated: contact,organization,activity)"),
    tags: str | None = Query(None, description="Tag IDs to filter by (comma-separated)"),
    from_date: date | None = Query(None, alias="from", description="Start date for activities"),
    to_date: date | None = Query(None, alias="to", description="End date for activities"),
    activity_type: ActivityType | None = Query(None, description="Activity type filter"),
    owner_id: UUID | None = Query(None, description="Owner ID filter"),
    organization_id: UUID | None = Query(None, description="Organization ID filter"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    current_user: CurrentUser = None,
    db: DbSession = None,
) -> dict:
    """
    Unified search across contacts, organizations, and activities.

    Results are sorted by relevance score and respect classification gating.
    """
    # Parse entity types
    entity_types = None
    if type:
        entity_types = [t.strip() for t in type.split(",")]

    # Parse tag IDs
    tag_ids = None
    if tags:
        tag_ids = [UUID(t.strip()) for t in tags.split(",")]

    # Create search service
    search_service = SearchService(db, current_user)

    # Perform search
    results = await search_service.search(
        query=q,
        entity_types=entity_types,
        tag_ids=tag_ids,
        from_date=from_date,
        to_date=to_date,
        activity_type=activity_type,
        owner_id=owner_id,
        organization_id=organization_id,
        limit=limit,
    )

    return {
        "items": results,
        "total": len(results),
        "query": q,
    }
