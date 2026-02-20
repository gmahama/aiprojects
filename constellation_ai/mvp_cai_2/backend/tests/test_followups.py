import pytest
from uuid import uuid4
from datetime import datetime, timezone, date, timedelta
from httpx import AsyncClient


async def _create_activity(client: AsyncClient, title: str = "Test Meeting") -> dict:
    """Helper to create an activity and return the response data."""
    response = await client.post(
        "/api/activities",
        json={
            "title": title,
            "activity_type": "MEETING",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "classification": "INTERNAL",
        },
    )
    assert response.status_code == 201, f"Failed to create activity: {response.text}"
    return response.json()


async def _create_followup(
    client: AsyncClient,
    activity_id: str,
    description: str = "Follow up on action items",
    due_date: str | None = None,
) -> dict:
    """Helper to create a followup and return the response data."""
    payload: dict = {"description": description}
    if due_date:
        payload["due_date"] = due_date

    response = await client.post(
        f"/api/followups/activities/{activity_id}/followups",
        json=payload,
    )
    assert response.status_code == 201, f"Failed to create followup: {response.text}"
    return response.json()


@pytest.mark.asyncio
async def test_list_followups_empty(client: AsyncClient):
    """Test listing followups when none exist."""
    response = await client.get("/api/followups")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_followups_with_data(client: AsyncClient):
    """Test listing followups when data exists."""
    activity = await _create_activity(client)
    await _create_followup(client, activity["id"], "First followup")
    await _create_followup(client, activity["id"], "Second followup")

    response = await client.get("/api/followups")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_create_followup(client: AsyncClient):
    """Test creating a followup for an activity."""
    activity = await _create_activity(client)
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    response = await client.post(
        f"/api/followups/activities/{activity['id']}/followups",
        json={
            "description": "Send follow-up email to contacts",
            "due_date": tomorrow,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Send follow-up email to contacts"
    assert data["due_date"] == tomorrow
    assert data["status"] == "OPEN"
    assert data["activity_id"] == activity["id"]
    assert data["completed_at"] is None
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_followup_minimal(client: AsyncClient):
    """Test creating a followup with only required fields."""
    activity = await _create_activity(client)

    response = await client.post(
        f"/api/followups/activities/{activity['id']}/followups",
        json={"description": "Minimal followup"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Minimal followup"
    assert data["due_date"] is None
    assert data["assigned_to"] is None
    assert data["status"] == "OPEN"


@pytest.mark.asyncio
async def test_create_followup_nonexistent_activity(client: AsyncClient):
    """Test creating a followup for a non-existent activity."""
    fake_id = str(uuid4())
    response = await client.post(
        f"/api/followups/activities/{fake_id}/followups",
        json={"description": "Orphan followup"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_followup_missing_description(client: AsyncClient):
    """Test creating a followup without required description."""
    activity = await _create_activity(client)

    response = await client.post(
        f"/api/followups/activities/{activity['id']}/followups",
        json={"due_date": "2026-03-01"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_followup_status_to_in_progress(client: AsyncClient):
    """Test updating followup status to IN_PROGRESS."""
    activity = await _create_activity(client)
    followup = await _create_followup(client, activity["id"])

    response = await client.patch(
        f"/api/followups/{followup['id']}",
        json={"status": "IN_PROGRESS"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "IN_PROGRESS"
    assert data["completed_at"] is None


@pytest.mark.asyncio
async def test_update_followup_status_to_completed(client: AsyncClient):
    """Test updating followup status to COMPLETED sets completed_at."""
    activity = await _create_activity(client)
    followup = await _create_followup(client, activity["id"])

    response = await client.patch(
        f"/api/followups/{followup['id']}",
        json={"status": "COMPLETED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_update_followup_status_to_cancelled(client: AsyncClient):
    """Test updating followup status to CANCELLED."""
    activity = await _create_activity(client)
    followup = await _create_followup(client, activity["id"])

    response = await client.patch(
        f"/api/followups/{followup['id']}",
        json={"status": "CANCELLED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_update_followup_description(client: AsyncClient):
    """Test updating followup description."""
    activity = await _create_activity(client)
    followup = await _create_followup(client, activity["id"], "Original description")

    response = await client.patch(
        f"/api/followups/{followup['id']}",
        json={"description": "Updated description"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_update_followup_not_found(client: AsyncClient):
    """Test updating a non-existent followup."""
    fake_id = str(uuid4())
    response = await client.patch(
        f"/api/followups/{fake_id}",
        json={"status": "COMPLETED"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_my_followups(client: AsyncClient, test_user):
    """Test getting followups assigned to the current user."""
    activity = await _create_activity(client)

    # Create followup assigned to test user
    response = await client.post(
        f"/api/followups/activities/{activity['id']}/followups",
        json={
            "description": "My followup",
            "assigned_to": str(test_user.id),
        },
    )
    assert response.status_code == 201

    # Create followup not assigned to anyone
    await _create_followup(client, activity["id"], "Unassigned followup")

    # Get my followups
    response = await client.get("/api/followups/my")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["description"] == "My followup"
    assert data["items"][0]["assigned_to"] == str(test_user.id)


@pytest.mark.asyncio
async def test_get_my_followups_empty(client: AsyncClient):
    """Test getting my followups when none are assigned."""
    response = await client.get("/api/followups/my")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_followups_pagination(client: AsyncClient):
    """Test followup list pagination."""
    activity = await _create_activity(client)
    for i in range(3):
        await _create_followup(client, activity["id"], f"Followup {i}")

    response = await client.get("/api/followups?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2


@pytest.mark.asyncio
async def test_list_followups_filter_by_status(client: AsyncClient):
    """Test filtering followups by status."""
    activity = await _create_activity(client)
    followup_open = await _create_followup(client, activity["id"], "Open one")
    followup_done = await _create_followup(client, activity["id"], "Done one")

    # Complete one
    await client.patch(
        f"/api/followups/{followup_done['id']}",
        json={"status": "COMPLETED"},
    )

    # Filter by OPEN
    response = await client.get("/api/followups?status_filter=OPEN")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "OPEN"

    # Filter by COMPLETED
    response = await client.get("/api/followups?status_filter=COMPLETED")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_reopen_completed_followup(client: AsyncClient):
    """Test that reopening a completed followup clears completed_at."""
    activity = await _create_activity(client)
    followup = await _create_followup(client, activity["id"])

    # Complete it
    await client.patch(
        f"/api/followups/{followup['id']}",
        json={"status": "COMPLETED"},
    )

    # Reopen it
    response = await client.patch(
        f"/api/followups/{followup['id']}",
        json={"status": "OPEN"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPEN"
    assert data["completed_at"] is None
