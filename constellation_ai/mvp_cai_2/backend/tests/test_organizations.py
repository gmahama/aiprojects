import pytest
from uuid import uuid4
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_organizations_empty(client: AsyncClient):
    """Test listing organizations when none exist."""
    response = await client.get("/api/organizations")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert data["total"] == 0
    assert data["items"] == []


@pytest.mark.asyncio
async def test_list_organizations_with_data(client: AsyncClient):
    """Test listing organizations when data exists."""
    # Create two organizations
    await client.post(
        "/api/organizations",
        json={"name": "Org Alpha", "classification": "INTERNAL"},
    )
    await client.post(
        "/api/organizations",
        json={"name": "Org Beta", "classification": "INTERNAL"},
    )

    response = await client.get("/api/organizations")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    # Organizations are ordered by name
    names = [item["name"] for item in data["items"]]
    assert "Org Alpha" in names
    assert "Org Beta" in names


@pytest.mark.asyncio
async def test_create_organization_valid(client: AsyncClient):
    """Test creating an organization with all valid fields."""
    response = await client.post(
        "/api/organizations",
        json={
            "name": "East Rock Capital",
            "short_name": "ERC",
            "org_type": "ASSET_MANAGER",
            "website": "https://eastrock.com",
            "notes": "Primary fund manager",
            "classification": "INTERNAL",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "East Rock Capital"
    assert data["short_name"] == "ERC"
    assert data["org_type"] == "ASSET_MANAGER"
    assert data["website"] == "https://eastrock.com"
    assert data["classification"] == "INTERNAL"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_organization_minimal(client: AsyncClient):
    """Test creating an organization with only required fields."""
    response = await client.post(
        "/api/organizations",
        json={"name": "Minimal Org"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Minimal Org"
    assert data["classification"] == "INTERNAL"  # default
    assert data["short_name"] is None
    assert data["org_type"] is None


@pytest.mark.asyncio
async def test_create_organization_missing_name(client: AsyncClient):
    """Test creating an organization without the required name field."""
    response = await client.post(
        "/api/organizations",
        json={"short_name": "NoName"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_organization_exists(client: AsyncClient):
    """Test getting an organization that exists."""
    create_response = await client.post(
        "/api/organizations",
        json={
            "name": "Detail Org",
            "short_name": "DO",
            "org_type": "BROKER",
            "classification": "INTERNAL",
        },
    )
    assert create_response.status_code == 201
    org_id = create_response.json()["id"]

    response = await client.get(f"/api/organizations/{org_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Org"
    assert data["short_name"] == "DO"
    assert data["org_type"] == "BROKER"
    # Detail endpoint includes contacts and tags
    assert "contacts" in data
    assert "tags" in data


@pytest.mark.asyncio
async def test_get_organization_not_found(client: AsyncClient):
    """Test getting a non-existent organization."""
    fake_id = str(uuid4())
    response = await client.get(f"/api/organizations/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_organization(client: AsyncClient):
    """Test updating an organization."""
    create_response = await client.post(
        "/api/organizations",
        json={
            "name": "Original Name",
            "org_type": "CORPORATE",
            "classification": "INTERNAL",
        },
    )
    org_id = create_response.json()["id"]

    response = await client.patch(
        f"/api/organizations/{org_id}",
        json={
            "name": "Updated Name",
            "website": "https://updated.com",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["website"] == "https://updated.com"
    assert data["org_type"] == "CORPORATE"  # unchanged


@pytest.mark.asyncio
async def test_update_organization_not_found(client: AsyncClient):
    """Test updating a non-existent organization."""
    fake_id = str(uuid4())
    response = await client.patch(
        f"/api/organizations/{fake_id}",
        json={"name": "Nope"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_soft_delete_organization(client: AsyncClient):
    """Test that soft-deleting an organization excludes it from list and get."""
    # Create
    create_response = await client.post(
        "/api/organizations",
        json={"name": "To Be Deleted", "classification": "INTERNAL"},
    )
    org_id = create_response.json()["id"]

    # Verify it exists
    get_response = await client.get(f"/api/organizations/{org_id}")
    assert get_response.status_code == 200

    # Delete
    delete_response = await client.delete(f"/api/organizations/{org_id}")
    assert delete_response.status_code == 204

    # Verify get returns 404
    get_response = await client.get(f"/api/organizations/{org_id}")
    assert get_response.status_code == 404

    # Verify it's excluded from list
    list_response = await client.get("/api/organizations")
    assert list_response.status_code == 200
    ids = [item["id"] for item in list_response.json()["items"]]
    assert org_id not in ids


@pytest.mark.asyncio
async def test_delete_organization_not_found(client: AsyncClient):
    """Test deleting a non-existent organization."""
    fake_id = str(uuid4())
    response = await client.delete(f"/api/organizations/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_organizations_pagination(client: AsyncClient):
    """Test that pagination parameters work."""
    # Create 3 organizations
    for i in range(3):
        await client.post(
            "/api/organizations",
            json={"name": f"Page Org {i}", "classification": "INTERNAL"},
        )

    # Request page 1 with page_size=2
    response = await client.get("/api/organizations?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2

    # Request page 2
    response = await client.get("/api/organizations?page=2&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 1
    assert data["page"] == 2


@pytest.mark.asyncio
async def test_list_organizations_filter_by_type(client: AsyncClient):
    """Test filtering organizations by org_type."""
    await client.post(
        "/api/organizations",
        json={"name": "A Broker", "org_type": "BROKER", "classification": "INTERNAL"},
    )
    await client.post(
        "/api/organizations",
        json={
            "name": "A Consultant",
            "org_type": "CONSULTANT",
            "classification": "INTERNAL",
        },
    )

    response = await client.get("/api/organizations?org_type=BROKER")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "A Broker"
