import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.people import PersonCreate, PersonList, PersonRead, PersonUpdate
from app.services.people import (
    DuplicateEmailError,
    PeopleService,
    PersonNotFoundError,
)

router = APIRouter(prefix="/people", tags=["people"])


def get_people_service(db: Session = Depends(get_db)) -> PeopleService:
    """Dependency that provides a PeopleService instance."""
    return PeopleService(db)


@router.post(
    "",
    response_model=PersonRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new person",
)
def create_person(
    data: PersonCreate,
    service: PeopleService = Depends(get_people_service),
) -> PersonRead:
    """
    Create a new person in the CRM.

    - **first_name**: Required
    - **last_name**: Required
    - **primary_email**: Must be unique (case-insensitive) if provided
    - **tags**: Will be normalized (lowercase, trimmed, deduplicated)
    """
    try:
        person = service.create(data)
        return PersonRead.model_validate(person)
    except DuplicateEmailError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A person with email '{e.email}' already exists",
        )


@router.get(
    "/{person_id}",
    response_model=PersonRead,
    summary="Get a person by ID",
)
def get_person(
    person_id: uuid.UUID,
    service: PeopleService = Depends(get_people_service),
) -> PersonRead:
    """Get a person by their unique ID."""
    try:
        person = service.get_by_id(person_id)
        return PersonRead.model_validate(person)
    except PersonNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found",
        )


@router.patch(
    "/{person_id}",
    response_model=PersonRead,
    summary="Update a person",
)
def update_person(
    person_id: uuid.UUID,
    data: PersonUpdate,
    service: PeopleService = Depends(get_people_service),
) -> PersonRead:
    """
    Partially update a person.

    Only provided fields will be updated. Omitted fields remain unchanged.
    """
    try:
        person = service.update(person_id, data)
        return PersonRead.model_validate(person)
    except PersonNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found",
        )
    except DuplicateEmailError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A person with email '{e.email}' already exists",
        )


@router.get(
    "",
    response_model=PersonList,
    summary="Search and list people",
)
def list_people(
    query: Annotated[
        Optional[str],
        Query(description="Search across name, email, employer"),
    ] = None,
    tag: Annotated[
        Optional[str],
        Query(description="Filter by tag (exact match, case-insensitive)"),
    ] = None,
    limit: Annotated[
        int,
        Query(ge=1, le=100, description="Max results to return"),
    ] = 20,
    offset: Annotated[
        int,
        Query(ge=0, description="Number of results to skip"),
    ] = 0,
    service: PeopleService = Depends(get_people_service),
) -> PersonList:
    """
    Search and list people with pagination.

    - **query**: Free-text search (case-insensitive) across first name, last name,
      email, and employer
    - **tag**: Filter by exact tag match
    - **limit**: Maximum number of results (default: 20, max: 100)
    - **offset**: Skip first N results for pagination
    """
    people, total = service.search(
        query=query,
        tag=tag,
        limit=limit,
        offset=offset,
    )

    return PersonList(
        items=[PersonRead.model_validate(p) for p in people],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete(
    "/{person_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a person",
)
def delete_person(
    person_id: uuid.UUID,
    service: PeopleService = Depends(get_people_service),
) -> None:
    """
    Delete a person from the CRM.

    Related meeting attendee records will be automatically deleted (CASCADE).
    """
    try:
        service.delete(person_id)
    except PersonNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person not found",
        )
