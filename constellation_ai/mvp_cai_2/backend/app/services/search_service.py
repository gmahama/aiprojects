from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.contact import Contact
from app.models.organization import Organization, Classification
from app.models.activity import Activity, ActivityType
from app.models.event import Event, EventType, EventTag, EventPitch
from app.models.tag import ContactTag, OrganizationTag, ActivityTag
from app.auth.rbac import filter_by_classification
from app.schemas.search import SearchResult


class SearchService:
    """Service for full-text search across entities."""

    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.accessible_classifications = filter_by_classification(user)

    async def search(
        self,
        query: str,
        entity_types: list[str] | None = None,
        tag_ids: list[UUID] | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
        activity_type: ActivityType | None = None,
        event_type: EventType | None = None,
        owner_id: UUID | None = None,
        organization_id: UUID | None = None,
        limit: int = 50,
    ) -> list[SearchResult]:
        """
        Perform a unified search across contacts, organizations, activities, and events.
        """
        results: list[SearchResult] = []

        # Default to all entity types if not specified
        if entity_types is None:
            entity_types = ["contact", "organization", "activity", "event"]

        # Search each entity type
        if "contact" in entity_types:
            contact_results = await self._search_contacts(query, tag_ids, organization_id, owner_id)
            results.extend(contact_results)

        if "organization" in entity_types:
            org_results = await self._search_organizations(query, tag_ids, owner_id)
            results.extend(org_results)

        if "activity" in entity_types:
            activity_results = await self._search_activities(
                query, tag_ids, from_date, to_date, activity_type, owner_id
            )
            results.extend(activity_results)

        if "event" in entity_types:
            event_results = await self._search_events(
                query, tag_ids, from_date, to_date, event_type, owner_id
            )
            results.extend(event_results)

        # Sort by relevance score and limit
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results[:limit]

    async def _search_contacts(
        self,
        query: str,
        tag_ids: list[UUID] | None,
        organization_id: UUID | None,
        owner_id: UUID | None,
    ) -> list[SearchResult]:
        """Search contacts by name, email, and notes."""
        search_term = f"%{query.lower()}%"

        stmt = (
            select(Contact)
            .where(
                Contact.is_deleted == False,
                Contact.classification.in_(self.accessible_classifications),
                or_(
                    func.lower(Contact.first_name).like(search_term),
                    func.lower(Contact.last_name).like(search_term),
                    func.lower(Contact.email).like(search_term),
                    func.lower(Contact.notes).like(search_term),
                ),
            )
            .options(selectinload(Contact.organization))
        )

        if organization_id:
            stmt = stmt.where(Contact.organization_id == organization_id)

        if owner_id:
            stmt = stmt.where(Contact.owner_id == owner_id)

        if tag_ids:
            stmt = stmt.join(ContactTag).where(ContactTag.tag_id.in_(tag_ids))

        result = await self.db.execute(stmt)
        contacts = result.scalars().all()

        return [
            SearchResult(
                entity_type="contact",
                entity_id=c.id,
                title=f"{c.first_name} {c.last_name}",
                snippet=c.notes[:200] if c.notes else c.email,
                relevance_score=self._calculate_relevance(query, f"{c.first_name} {c.last_name} {c.email or ''}"),
                metadata={
                    "organization": c.organization.name if c.organization else None,
                    "title": c.title,
                },
            )
            for c in contacts
        ]

    async def _search_organizations(
        self,
        query: str,
        tag_ids: list[UUID] | None,
        owner_id: UUID | None,
    ) -> list[SearchResult]:
        """Search organizations by name and notes."""
        search_term = f"%{query.lower()}%"

        stmt = select(Organization).where(
            Organization.is_deleted == False,
            Organization.classification.in_(self.accessible_classifications),
            or_(
                func.lower(Organization.name).like(search_term),
                func.lower(Organization.short_name).like(search_term),
                func.lower(Organization.notes).like(search_term),
            ),
        )

        if owner_id:
            stmt = stmt.where(Organization.owner_id == owner_id)

        if tag_ids:
            stmt = stmt.join(OrganizationTag).where(OrganizationTag.tag_id.in_(tag_ids))

        result = await self.db.execute(stmt)
        organizations = result.scalars().all()

        return [
            SearchResult(
                entity_type="organization",
                entity_id=o.id,
                title=o.name,
                snippet=o.notes[:200] if o.notes else o.website,
                relevance_score=self._calculate_relevance(query, f"{o.name} {o.short_name or ''}"),
                metadata={
                    "org_type": o.org_type.value if o.org_type else None,
                    "website": o.website,
                },
            )
            for o in organizations
        ]

    async def _search_activities(
        self,
        query: str,
        tag_ids: list[UUID] | None,
        from_date: date | None,
        to_date: date | None,
        activity_type: ActivityType | None,
        owner_id: UUID | None,
    ) -> list[SearchResult]:
        """Search activities using full-text search on title, summary, key_points, description."""
        # Use PostgreSQL full-text search
        ts_query = func.plainto_tsquery("english", query)

        stmt = select(Activity).where(
            Activity.is_deleted == False,
            Activity.classification.in_(self.accessible_classifications),
            or_(
                Activity.search_vector.op("@@")(ts_query),
                func.lower(Activity.title).like(f"%{query.lower()}%"),
            ),
        )

        if from_date:
            stmt = stmt.where(func.date(Activity.occurred_at) >= from_date)

        if to_date:
            stmt = stmt.where(func.date(Activity.occurred_at) <= to_date)

        if activity_type:
            stmt = stmt.where(Activity.activity_type == activity_type)

        if owner_id:
            stmt = stmt.where(Activity.owner_id == owner_id)

        if tag_ids:
            stmt = stmt.join(ActivityTag).where(ActivityTag.tag_id.in_(tag_ids))

        result = await self.db.execute(stmt)
        activities = result.scalars().all()

        return [
            SearchResult(
                entity_type="activity",
                entity_id=a.id,
                title=a.title,
                snippet=self._extract_snippet(query, a.summary or a.description or ""),
                relevance_score=self._calculate_activity_relevance(query, a),
                metadata={
                    "activity_type": a.activity_type.value,
                    "occurred_at": a.occurred_at.isoformat(),
                },
            )
            for a in activities
        ]

    def _calculate_relevance(self, query: str, text: str) -> float:
        """Calculate a simple relevance score based on query match."""
        query_lower = query.lower()
        text_lower = text.lower()

        # Exact match gets highest score
        if query_lower == text_lower:
            return 1.0

        # Starts with query gets high score
        if text_lower.startswith(query_lower):
            return 0.9

        # Contains exact query
        if query_lower in text_lower:
            return 0.7

        # Contains all words
        query_words = query_lower.split()
        if all(word in text_lower for word in query_words):
            return 0.5

        return 0.3

    def _calculate_activity_relevance(self, query: str, activity: Activity) -> float:
        """Calculate relevance score for activities."""
        text = f"{activity.title} {activity.summary or ''} {activity.key_points or ''}"
        return self._calculate_relevance(query, text)

    async def _search_events(
        self,
        query: str,
        tag_ids: list[UUID] | None,
        from_date: date | None,
        to_date: date | None,
        event_type: EventType | None,
        owner_id: UUID | None,
    ) -> list[SearchResult]:
        """Search events using full-text search on name, description, notes, and pitches."""
        # Use PostgreSQL full-text search
        ts_query = func.plainto_tsquery("english", query)

        stmt = select(Event).where(
            Event.is_deleted == False,
            Event.classification.in_(self.accessible_classifications),
            or_(
                Event.search_vector.op("@@")(ts_query),
                func.lower(Event.name).like(f"%{query.lower()}%"),
            ),
        )

        if from_date:
            stmt = stmt.where(func.date(Event.occurred_at) >= from_date)

        if to_date:
            stmt = stmt.where(func.date(Event.occurred_at) <= to_date)

        if event_type:
            stmt = stmt.where(Event.event_type == event_type)

        if owner_id:
            stmt = stmt.where(Event.owner_id == owner_id)

        if tag_ids:
            stmt = stmt.join(EventTag).where(EventTag.tag_id.in_(tag_ids))

        result = await self.db.execute(stmt)
        events = result.scalars().all()

        return [
            SearchResult(
                entity_type="event",
                entity_id=e.id,
                title=e.name,
                snippet=self._extract_snippet(query, e.description or e.notes or ""),
                relevance_score=self._calculate_event_relevance(query, e),
                metadata={
                    "event_type": e.event_type.value,
                    "occurred_at": e.occurred_at.isoformat(),
                    "location": e.location,
                },
            )
            for e in events
        ]

    def _calculate_event_relevance(self, query: str, event: Event) -> float:
        """Calculate relevance score for events."""
        text = f"{event.name} {event.description or ''} {event.notes or ''}"
        return self._calculate_relevance(query, text)

    def _extract_snippet(self, query: str, text: str, context_size: int = 100) -> str:
        """Extract a snippet from text around the query match."""
        if not text:
            return ""

        query_lower = query.lower()
        text_lower = text.lower()

        pos = text_lower.find(query_lower)
        if pos == -1:
            return text[:200]

        start = max(0, pos - context_size)
        end = min(len(text), pos + len(query) + context_size)

        snippet = text[start:end]
        if start > 0:
            snippet = "..." + snippet
        if end < len(text):
            snippet = snippet + "..."

        return snippet
