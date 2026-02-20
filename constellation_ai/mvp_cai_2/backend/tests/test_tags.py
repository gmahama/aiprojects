import pytest
from uuid import uuid4
from httpx import AsyncClient


async def _create_tag_set(
    client: AsyncClient, name: str = "Test Set", description: str | None = None
) -> dict:
    """Helper to create a tag set and return the response data."""
    response = await client.post(
        "/api/tag-sets",
        json={"name": name, "description": description},
    )
    assert response.status_code == 201, f"Failed to create tag set: {response.text}"
    return response.json()


async def _create_tag(
    client: AsyncClient, tag_set_id: str, value: str = "Test Tag"
) -> dict:
    """Helper to create a tag within a tag set."""
    response = await client.post(
        f"/api/tag-sets/{tag_set_id}/tags",
        json={"value": value},
    )
    assert response.status_code == 201, f"Failed to create tag: {response.text}"
    return response.json()


@pytest.mark.asyncio
async def test_list_tag_sets_empty(client: AsyncClient):
    """Test listing tag sets when none exist."""
    response = await client.get("/api/tag-sets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.asyncio
async def test_list_tag_sets_with_data(client: AsyncClient):
    """Test listing tag sets with data."""
    await _create_tag_set(client, "Sector")
    await _create_tag_set(client, "Geography")

    response = await client.get("/api/tag-sets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [ts["name"] for ts in data]
    assert "Sector" in names
    assert "Geography" in names


@pytest.mark.asyncio
async def test_list_tag_sets_includes_tags(client: AsyncClient):
    """Test that listing tag sets includes their tags."""
    tag_set = await _create_tag_set(client, "Strategy")
    await _create_tag(client, tag_set["id"], "Long/Short")
    await _create_tag(client, tag_set["id"], "Global Macro")

    response = await client.get("/api/tag-sets")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert len(data[0]["tags"]) == 2
    tag_values = [t["value"] for t in data[0]["tags"]]
    assert "Long/Short" in tag_values
    assert "Global Macro" in tag_values


@pytest.mark.asyncio
async def test_create_tag_set(client: AsyncClient):
    """Test creating a tag set."""
    response = await client.post(
        "/api/tag-sets",
        json={"name": "Relationship Type", "description": "Type of relationship"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Relationship Type"
    assert data["description"] == "Type of relationship"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_tag_set_duplicate_name(client: AsyncClient):
    """Test that creating a tag set with a duplicate name fails."""
    await _create_tag_set(client, "Duplicate Set")

    response = await client.post(
        "/api/tag-sets",
        json={"name": "Duplicate Set"},
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_tag_set_missing_name(client: AsyncClient):
    """Test creating a tag set without required name field."""
    response = await client.post(
        "/api/tag-sets",
        json={"description": "No name provided"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_add_tag_to_set(client: AsyncClient):
    """Test adding a tag to a tag set."""
    tag_set = await _create_tag_set(client, "Sector Tags")
    tag_set_id = tag_set["id"]

    response = await client.post(
        f"/api/tag-sets/{tag_set_id}/tags",
        json={"value": "Healthcare"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["value"] == "Healthcare"
    assert data["tag_set_id"] == tag_set_id
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_add_tag_duplicate_value(client: AsyncClient):
    """Test that adding a duplicate tag value to the same set fails."""
    tag_set = await _create_tag_set(client, "Unique Values Set")
    tag_set_id = tag_set["id"]

    await _create_tag(client, tag_set_id, "Energy")

    response = await client.post(
        f"/api/tag-sets/{tag_set_id}/tags",
        json={"value": "Energy"},
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_add_tag_to_nonexistent_set(client: AsyncClient):
    """Test adding a tag to a non-existent tag set."""
    fake_id = str(uuid4())
    response = await client.post(
        f"/api/tag-sets/{fake_id}/tags",
        json={"value": "Orphan Tag"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_add_tag_missing_value(client: AsyncClient):
    """Test adding a tag without required value field."""
    tag_set = await _create_tag_set(client, "Value Required Set")
    response = await client.post(
        f"/api/tag-sets/{tag_set['id']}/tags",
        json={},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_deactivate_tag(client: AsyncClient):
    """Test deactivating a tag."""
    tag_set = await _create_tag_set(client, "Deactivation Set")
    tag = await _create_tag(client, tag_set["id"], "To Deactivate")
    tag_id = tag["id"]

    response = await client.patch(
        f"/api/tags/{tag_id}",
        json={"is_active": False},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is False
    assert data["value"] == "To Deactivate"


@pytest.mark.asyncio
async def test_update_tag_value(client: AsyncClient):
    """Test updating a tag's value."""
    tag_set = await _create_tag_set(client, "Rename Set")
    tag = await _create_tag(client, tag_set["id"], "Old Name")
    tag_id = tag["id"]

    response = await client.patch(
        f"/api/tags/{tag_id}",
        json={"value": "New Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["value"] == "New Name"


@pytest.mark.asyncio
async def test_update_tag_not_found(client: AsyncClient):
    """Test updating a non-existent tag."""
    fake_id = str(uuid4())
    response = await client.patch(
        f"/api/tags/{fake_id}",
        json={"is_active": False},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_deactivated_tags_excluded_from_list(client: AsyncClient):
    """Test that deactivated tags are excluded from tag set listing by default."""
    tag_set = await _create_tag_set(client, "Mixed Active Set")
    active_tag = await _create_tag(client, tag_set["id"], "Active Tag")
    inactive_tag = await _create_tag(client, tag_set["id"], "Inactive Tag")

    # Deactivate one tag
    await client.patch(
        f"/api/tags/{inactive_tag['id']}",
        json={"is_active": False},
    )

    # List without include_inactive -- should only show active tag
    response = await client.get("/api/tag-sets")
    assert response.status_code == 200
    data = response.json()
    tag_set_data = next(ts for ts in data if ts["id"] == tag_set["id"])
    tag_values = [t["value"] for t in tag_set_data["tags"]]
    assert "Active Tag" in tag_values
    assert "Inactive Tag" not in tag_values

    # List with include_inactive -- should show both
    response = await client.get("/api/tag-sets?include_inactive=true")
    assert response.status_code == 200
    data = response.json()
    tag_set_data = next(ts for ts in data if ts["id"] == tag_set["id"])
    tag_values = [t["value"] for t in tag_set_data["tags"]]
    assert "Active Tag" in tag_values
    assert "Inactive Tag" in tag_values


@pytest.mark.asyncio
async def test_same_tag_value_different_sets(client: AsyncClient):
    """Test that the same tag value can exist in different tag sets."""
    set_a = await _create_tag_set(client, "Set A")
    set_b = await _create_tag_set(client, "Set B")

    tag_a = await _create_tag(client, set_a["id"], "Shared Value")
    assert tag_a["value"] == "Shared Value"

    tag_b = await _create_tag(client, set_b["id"], "Shared Value")
    assert tag_b["value"] == "Shared Value"

    # They should be different tags
    assert tag_a["id"] != tag_b["id"]
