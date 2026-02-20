import pytest
from uuid import uuid4
from datetime import datetime, timezone
from httpx import AsyncClient


async def _create_activity(client: AsyncClient, title: str = "Test Meeting") -> dict:
    """Helper to create an activity and return the response data."""
    response = await client.post(
        "/api/activities",
        json={
            "title": title,
            "activity_type": "MEETING",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "description": "A test meeting",
            "location": "Conference Room A",
            "summary": "Discussed quarterly results",
            "key_points": "Revenue up 10%",
            "classification": "INTERNAL",
        },
    )
    assert response.status_code == 201, f"Failed to create activity: {response.text}"
    return response.json()


@pytest.mark.asyncio
async def test_list_activities_empty(client: AsyncClient):
    """Test listing activities when none exist."""
    response = await client.get("/api/activities")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_activities_with_data(client: AsyncClient):
    """Test listing activities when data exists."""
    await _create_activity(client, "Meeting One")
    await _create_activity(client, "Meeting Two")

    response = await client.get("/api/activities")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_create_activity_valid(client: AsyncClient):
    """Test creating an activity with all fields."""
    occurred_at = datetime.now(timezone.utc).isoformat()
    response = await client.post(
        "/api/activities",
        json={
            "title": "Q1 Earnings Call",
            "activity_type": "CALL",
            "occurred_at": occurred_at,
            "description": "Quarterly earnings discussion",
            "location": "Phone",
            "summary": "Strong Q1 performance",
            "key_points": "Revenue growth 15%, margins expanded",
            "classification": "INTERNAL",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Q1 Earnings Call"
    assert data["activity_type"] == "CALL"
    assert data["classification"] == "INTERNAL"
    assert "id" in data
    assert "owner_id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_activity_with_attendees(client: AsyncClient):
    """Test creating an activity with attendees."""
    # First create a contact to use as attendee
    contact_response = await client.post(
        "/api/contacts",
        json={
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane@example.com",
            "classification": "INTERNAL",
        },
    )
    assert contact_response.status_code == 201
    contact_id = contact_response.json()["id"]

    # Create activity with that contact as attendee
    response = await client.post(
        "/api/activities",
        json={
            "title": "Meeting with Jane",
            "activity_type": "MEETING",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "classification": "INTERNAL",
            "attendees": [
                {"contact_id": contact_id, "role": "ATTENDEE"},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Meeting with Jane"

    # Verify attendees via detail endpoint
    detail = await client.get(f"/api/activities/{data['id']}")
    assert detail.status_code == 200
    detail_data = detail.json()
    assert len(detail_data["attendees"]) == 1
    assert detail_data["attendees"][0]["contact_id"] == contact_id
    assert detail_data["attendees"][0]["role"] == "ATTENDEE"


@pytest.mark.asyncio
async def test_create_activity_with_tags(client: AsyncClient):
    """Test creating an activity with tags."""
    # Create a tag set and tag
    tag_set_resp = await client.post(
        "/api/tag-sets",
        json={"name": "Activity Sector", "description": "Sector tags"},
    )
    assert tag_set_resp.status_code == 201
    tag_set_id = tag_set_resp.json()["id"]

    tag_resp = await client.post(
        f"/api/tag-sets/{tag_set_id}/tags",
        json={"value": "Technology"},
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    # Create activity with that tag
    response = await client.post(
        "/api/activities",
        json={
            "title": "Tech Review",
            "activity_type": "NOTE",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "classification": "INTERNAL",
            "tag_ids": [tag_id],
        },
    )
    assert response.status_code == 201

    # Verify tags via detail
    detail = await client.get(f"/api/activities/{response.json()['id']}")
    assert detail.status_code == 200
    detail_data = detail.json()
    assert len(detail_data["tags"]) == 1
    assert detail_data["tags"][0]["value"] == "Technology"


@pytest.mark.asyncio
async def test_create_activity_missing_required_fields(client: AsyncClient):
    """Test creating an activity without required fields."""
    # Missing title
    response = await client.post(
        "/api/activities",
        json={
            "activity_type": "MEETING",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert response.status_code == 422

    # Missing activity_type
    response = await client.post(
        "/api/activities",
        json={
            "title": "No type",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert response.status_code == 422

    # Missing occurred_at
    response = await client.post(
        "/api/activities",
        json={
            "title": "No date",
            "activity_type": "MEETING",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_activity_detail(client: AsyncClient):
    """Test getting full activity detail."""
    created = await _create_activity(client, "Detail Test Activity")
    activity_id = created["id"]

    response = await client.get(f"/api/activities/{activity_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Detail Test Activity"
    assert data["activity_type"] == "MEETING"
    assert data["description"] == "A test meeting"
    assert data["summary"] == "Discussed quarterly results"
    assert data["key_points"] == "Revenue up 10%"
    assert "attendees" in data
    assert "tags" in data
    assert "attachments" in data
    assert "followups" in data
    assert "versions" in data


@pytest.mark.asyncio
async def test_get_activity_not_found(client: AsyncClient):
    """Test getting a non-existent activity."""
    fake_id = str(uuid4())
    response = await client.get(f"/api/activities/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_activity(client: AsyncClient):
    """Test updating an activity triggers version snapshot."""
    created = await _create_activity(client, "Original Title")
    activity_id = created["id"]

    # Update the activity
    response = await client.patch(
        f"/api/activities/{activity_id}",
        json={
            "title": "Updated Title",
            "summary": "Updated summary text",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"

    # Check that a version was created
    versions_response = await client.get(f"/api/activities/{activity_id}/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["snapshot"]["title"] == "Original Title"


@pytest.mark.asyncio
async def test_update_activity_multiple_versions(client: AsyncClient):
    """Test that multiple updates create multiple version snapshots."""
    created = await _create_activity(client, "V1 Title")
    activity_id = created["id"]

    # First update
    await client.patch(
        f"/api/activities/{activity_id}",
        json={"title": "V2 Title"},
    )

    # Second update
    await client.patch(
        f"/api/activities/{activity_id}",
        json={"title": "V3 Title"},
    )

    versions_response = await client.get(f"/api/activities/{activity_id}/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()
    assert len(versions) == 2
    # Versions are ordered by version_number desc
    assert versions[0]["version_number"] == 2
    assert versions[1]["version_number"] == 1


@pytest.mark.asyncio
async def test_update_activity_not_found(client: AsyncClient):
    """Test updating a non-existent activity."""
    fake_id = str(uuid4())
    response = await client.patch(
        f"/api/activities/{fake_id}",
        json={"title": "Nope"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_soft_delete_activity(client: AsyncClient):
    """Test that soft-deleting an activity excludes it from list and get."""
    created = await _create_activity(client, "To Be Deleted")
    activity_id = created["id"]

    # Delete
    delete_response = await client.delete(f"/api/activities/{activity_id}")
    assert delete_response.status_code == 204

    # Verify get returns 404
    get_response = await client.get(f"/api/activities/{activity_id}")
    assert get_response.status_code == 404

    # Verify excluded from list
    list_response = await client.get("/api/activities")
    assert list_response.status_code == 200
    ids = [item["id"] for item in list_response.json()["items"]]
    assert activity_id not in ids


@pytest.mark.asyncio
async def test_delete_activity_not_found(client: AsyncClient):
    """Test deleting a non-existent activity."""
    fake_id = str(uuid4())
    response = await client.delete(f"/api/activities/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_activities_pagination(client: AsyncClient):
    """Test activity list pagination."""
    for i in range(3):
        await _create_activity(client, f"Paginated {i}")

    response = await client.get("/api/activities?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2


@pytest.mark.asyncio
async def test_list_activities_filter_by_type(client: AsyncClient):
    """Test filtering activities by type."""
    # Create a MEETING
    await client.post(
        "/api/activities",
        json={
            "title": "A Meeting",
            "activity_type": "MEETING",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "classification": "INTERNAL",
        },
    )
    # Create a CALL
    await client.post(
        "/api/activities",
        json={
            "title": "A Call",
            "activity_type": "CALL",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "classification": "INTERNAL",
        },
    )

    response = await client.get("/api/activities?activity_type=CALL")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["activity_type"] == "CALL"


@pytest.mark.asyncio
async def test_get_activity_versions_empty(client: AsyncClient):
    """Test getting versions for an activity that has not been updated."""
    created = await _create_activity(client, "No Updates")
    activity_id = created["id"]

    response = await client.get(f"/api/activities/{activity_id}/versions")
    assert response.status_code == 200
    assert response.json() == []
