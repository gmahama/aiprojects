import uuid
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Person
from app.schemas.people import PersonCreate, PersonUpdate


class DuplicateEmailError(Exception):
    """Raised when attempting to use an email that already exists."""

    def __init__(self, email: str):
        self.email = email
        super().__init__(f"Email already exists: {email}")


class PersonNotFoundError(Exception):
    """Raised when a person is not found."""

    def __init__(self, person_id: uuid.UUID):
        self.person_id = person_id
        super().__init__(f"Person not found: {person_id}")


class PeopleService:
    """Service layer for People CRUD operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: PersonCreate) -> Person:
        """
        Create a new person.

        Raises:
            DuplicateEmailError: If email already exists (case-insensitive).
        """
        # Check for duplicate email (case-insensitive)
        if data.primary_email:
            existing = self._get_by_email(data.primary_email)
            if existing:
                raise DuplicateEmailError(data.primary_email)

        person = Person(
            first_name=data.first_name,
            last_name=data.last_name,
            primary_email=data.primary_email,
            employer=data.employer,
            title=data.title,
            notes=data.notes,
            tags=data.tags,
        )

        self.db.add(person)
        try:
            self.db.commit()
            self.db.refresh(person)
        except IntegrityError:
            self.db.rollback()
            raise DuplicateEmailError(data.primary_email or "")

        return person

    def get_by_id(self, person_id: uuid.UUID) -> Person:
        """
        Get a person by ID.

        Raises:
            PersonNotFoundError: If person doesn't exist.
        """
        person = self.db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise PersonNotFoundError(person_id)
        return person

    def update(self, person_id: uuid.UUID, data: PersonUpdate) -> Person:
        """
        Partially update a person.

        Raises:
            PersonNotFoundError: If person doesn't exist.
            DuplicateEmailError: If new email already exists.
        """
        person = self.get_by_id(person_id)

        update_data = data.model_dump(exclude_unset=True)

        # Check for duplicate email if being updated
        if "primary_email" in update_data:
            new_email = update_data["primary_email"]
            if new_email is not None:
                existing = self._get_by_email(new_email)
                if existing and existing.id != person_id:
                    raise DuplicateEmailError(new_email)

        for field, value in update_data.items():
            setattr(person, field, value)

        try:
            self.db.commit()
            self.db.refresh(person)
        except IntegrityError:
            self.db.rollback()
            raise DuplicateEmailError(update_data.get("primary_email", ""))

        return person

    def delete(self, person_id: uuid.UUID) -> None:
        """
        Delete a person.

        Raises:
            PersonNotFoundError: If person doesn't exist.
        """
        person = self.get_by_id(person_id)
        self.db.delete(person)
        self.db.commit()

    def search(
        self,
        query: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Person], int]:
        """
        Search and list people.

        Args:
            query: Free-text search across name, email, employer.
            tag: Filter by exact tag match (case-insensitive).
            limit: Max results (1-100).
            offset: Skip first N results.

        Returns:
            Tuple of (list of people, total count).
        """
        # Clamp limit to valid range
        limit = max(1, min(100, limit))
        offset = max(0, offset)

        base_query = self.db.query(Person)

        # Apply tag filter
        if tag:
            # PostgreSQL array contains with case-insensitive match
            normalized_tag = tag.strip().lower()
            base_query = base_query.filter(
                Person.tags.any(normalized_tag)
            )

        # Apply text search
        if query:
            search_term = f"%{query.lower()}%"
            base_query = base_query.filter(
                or_(
                    func.lower(Person.first_name).like(search_term),
                    func.lower(Person.last_name).like(search_term),
                    func.lower(Person.primary_email).like(search_term),
                    func.lower(Person.employer).like(search_term),
                )
            )

        # Get total count before pagination
        total = base_query.count()

        # Apply stable ordering: last_name, first_name, id
        results = (
            base_query
            .order_by(Person.last_name, Person.first_name, Person.id)
            .offset(offset)
            .limit(limit)
            .all()
        )

        return results, total

    def _get_by_email(self, email: str) -> Optional[Person]:
        """Get a person by email (case-insensitive)."""
        return (
            self.db.query(Person)
            .filter(func.lower(Person.primary_email) == email.lower())
            .first()
        )
