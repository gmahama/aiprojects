"""
Tests for the People API endpoints.

Covers:
- Create person (success and duplicate email failure)
- Get person by ID
- Partial update (PATCH)
- Search by name, email, employer
- Tag filtering
- Pagination (limit/offset)
- Delete person
"""
import uuid

import pytest


class TestCreatePerson:
    """Tests for POST /people."""

    def test_create_person_success(self, client):
        """Successfully create a person with all fields."""
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "primary_email": "john.doe@example.com",
            "employer": "Acme Corp",
            "title": "Engineer",
            "notes": "Met at conference",
            "tags": ["VIP", "engineering"],
        }

        response = client.post("/people", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["primary_email"] == "john.doe@example.com"
        assert data["employer"] == "Acme Corp"
        assert data["title"] == "Engineer"
        assert data["notes"] == "Met at conference"
        # Tags should be normalized to lowercase
        assert set(data["tags"]) == {"vip", "engineering"}
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_person_minimal(self, client):
        """Create person with only required fields."""
        payload = {
            "first_name": "Jane",
            "last_name": "Smith",
        }

        response = client.post("/people", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["primary_email"] is None
        assert data["employer"] is None

    def test_create_person_duplicate_email(self, client):
        """Reject duplicate email (case-insensitive)."""
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "primary_email": "duplicate@example.com",
        }
        client.post("/people", json=payload)

        # Try to create another person with same email (different case)
        payload2 = {
            "first_name": "Jane",
            "last_name": "Smith",
            "primary_email": "DUPLICATE@example.com",
        }

        response = client.post("/people", json=payload2)

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"]

    def test_create_person_empty_string_normalized(self, client):
        """Empty strings should be normalized to null."""
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "employer": "",
            "title": "   ",
        }

        response = client.post("/people", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["employer"] is None
        assert data["title"] is None

    def test_create_person_invalid_email(self, client):
        """Reject invalid email format."""
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "primary_email": "not-an-email",
        }

        response = client.post("/people", json=payload)

        assert response.status_code == 422

    def test_create_person_tags_normalized(self, client):
        """Tags should be trimmed, lowercased, and deduplicated."""
        payload = {
            "first_name": "John",
            "last_name": "Doe",
            "tags": ["  VIP  ", "vip", "Engineering", ""],
        }

        response = client.post("/people", json=payload)

        assert response.status_code == 201
        data = response.json()
        # Should be deduplicated and normalized
        assert set(data["tags"]) == {"vip", "engineering"}

    def test_create_person_missing_required_fields(self, client):
        """Reject missing required fields."""
        response = client.post("/people", json={"first_name": "John"})

        assert response.status_code == 422


class TestGetPerson:
    """Tests for GET /people/{id}."""

    def test_get_person_success(self, client):
        """Successfully retrieve a person by ID."""
        # Create a person first
        create_response = client.post(
            "/people",
            json={"first_name": "John", "last_name": "Doe"},
        )
        person_id = create_response.json()["id"]

        response = client.get(f"/people/{person_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == person_id
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"

    def test_get_person_not_found(self, client):
        """Return 404 for non-existent person."""
        fake_id = str(uuid.uuid4())

        response = client.get(f"/people/{fake_id}")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_person_invalid_id(self, client):
        """Return 422 for invalid UUID format."""
        response = client.get("/people/not-a-uuid")

        assert response.status_code == 422


class TestUpdatePerson:
    """Tests for PATCH /people/{id}."""

    def test_update_person_partial(self, client):
        """Partial update should only modify provided fields."""
        # Create a person
        create_response = client.post(
            "/people",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "employer": "Old Corp",
                "title": "Junior Dev",
            },
        )
        person_id = create_response.json()["id"]

        # Update only employer
        response = client.patch(
            f"/people/{person_id}",
            json={"employer": "New Corp"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["employer"] == "New Corp"
        # Other fields unchanged
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["title"] == "Junior Dev"

    def test_update_person_email(self, client):
        """Update email address."""
        create_response = client.post(
            "/people",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "primary_email": "old@example.com",
            },
        )
        person_id = create_response.json()["id"]

        response = client.patch(
            f"/people/{person_id}",
            json={"primary_email": "new@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["primary_email"] == "new@example.com"

    def test_update_person_duplicate_email(self, client):
        """Reject update to duplicate email."""
        # Create two people
        client.post(
            "/people",
            json={"first_name": "John", "last_name": "Doe", "primary_email": "john@example.com"},
        )
        create_response = client.post(
            "/people",
            json={"first_name": "Jane", "last_name": "Smith", "primary_email": "jane@example.com"},
        )
        jane_id = create_response.json()["id"]

        # Try to update Jane's email to John's
        response = client.patch(
            f"/people/{jane_id}",
            json={"primary_email": "john@example.com"},
        )

        assert response.status_code == 409

    def test_update_person_not_found(self, client):
        """Return 404 for updating non-existent person."""
        fake_id = str(uuid.uuid4())

        response = client.patch(f"/people/{fake_id}", json={"first_name": "Updated"})

        assert response.status_code == 404

    def test_update_person_set_null(self, client):
        """Set optional fields to null explicitly."""
        create_response = client.post(
            "/people",
            json={"first_name": "John", "last_name": "Doe", "employer": "Acme"},
        )
        person_id = create_response.json()["id"]

        response = client.patch(
            f"/people/{person_id}",
            json={"employer": None},
        )

        assert response.status_code == 200
        assert response.json()["employer"] is None


class TestSearchPeople:
    """Tests for GET /people (search/list)."""

    @pytest.fixture
    def sample_people(self, client):
        """Create sample people for search tests."""
        people_data = [
            {"first_name": "Alice", "last_name": "Anderson", "employer": "Tech Corp", "tags": ["engineering"]},
            {"first_name": "Bob", "last_name": "Brown", "primary_email": "bob@startup.io", "tags": ["sales"]},
            {"first_name": "Charlie", "last_name": "Chen", "employer": "Tech Corp", "tags": ["engineering", "vip"]},
            {"first_name": "Diana", "last_name": "Davis", "employer": "Finance Inc", "tags": ["sales"]},
            {"first_name": "Eve", "last_name": "Edwards", "primary_email": "eve@tech.com", "tags": ["engineering"]},
        ]
        created = []
        for data in people_data:
            response = client.post("/people", json=data)
            created.append(response.json())
        return created

    def test_list_people_default(self, client, sample_people):
        """List all people with default pagination."""
        response = client.get("/people")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 5
        assert data["limit"] == 20
        assert data["offset"] == 0

    def test_search_by_first_name(self, client, sample_people):
        """Search by first name (case-insensitive)."""
        response = client.get("/people", params={"query": "alice"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Alice"

    def test_search_by_last_name(self, client, sample_people):
        """Search by last name."""
        response = client.get("/people", params={"query": "chen"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["last_name"] == "Chen"

    def test_search_by_email(self, client, sample_people):
        """Search by email (partial match)."""
        response = client.get("/people", params={"query": "startup"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Bob"

    def test_search_by_employer(self, client, sample_people):
        """Search by employer."""
        response = client.get("/people", params={"query": "tech corp"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        employers = {item["first_name"] for item in data["items"]}
        assert employers == {"Alice", "Charlie"}

    def test_filter_by_tag(self, client, sample_people):
        """Filter by exact tag match."""
        response = client.get("/people", params={"tag": "engineering"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        names = {item["first_name"] for item in data["items"]}
        assert names == {"Alice", "Charlie", "Eve"}

    def test_filter_by_tag_case_insensitive(self, client, sample_people):
        """Tag filter should be case-insensitive."""
        response = client.get("/people", params={"tag": "ENGINEERING"})

        assert response.status_code == 200
        assert response.json()["total"] == 3

    def test_search_and_filter_combined(self, client, sample_people):
        """Combine text search with tag filter."""
        response = client.get("/people", params={"query": "tech", "tag": "engineering"})

        assert response.status_code == 200
        data = response.json()
        # Alice and Charlie have "engineering" tag and work at "Tech Corp"
        # Eve has "engineering" tag and email at tech.com
        assert data["total"] == 3

    def test_pagination_limit(self, client, sample_people):
        """Limit number of results."""
        response = client.get("/people", params={"limit": 2})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5  # Total count unchanged
        assert len(data["items"]) == 2
        assert data["limit"] == 2

    def test_pagination_offset(self, client, sample_people):
        """Skip results with offset."""
        response = client.get("/people", params={"limit": 2, "offset": 2})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2
        assert data["offset"] == 2

    def test_stable_ordering(self, client, sample_people):
        """Results should be consistently ordered by last_name, first_name."""
        response = client.get("/people")

        data = response.json()
        last_names = [item["last_name"] for item in data["items"]]
        assert last_names == sorted(last_names)

    def test_limit_clamped_to_max(self, client, sample_people):
        """Limit should be clamped to max 100."""
        response = client.get("/people", params={"limit": 200})

        assert response.status_code == 422  # FastAPI validates Query params

    def test_empty_search_results(self, client, sample_people):
        """Return empty list for no matches."""
        response = client.get("/people", params={"query": "nonexistent"})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []


class TestDeletePerson:
    """Tests for DELETE /people/{id}."""

    def test_delete_person_success(self, client):
        """Successfully delete a person."""
        # Create a person
        create_response = client.post(
            "/people",
            json={"first_name": "John", "last_name": "Doe"},
        )
        person_id = create_response.json()["id"]

        # Delete
        response = client.delete(f"/people/{person_id}")

        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/people/{person_id}")
        assert get_response.status_code == 404

    def test_delete_person_not_found(self, client):
        """Return 404 for deleting non-existent person."""
        fake_id = str(uuid.uuid4())

        response = client.delete(f"/people/{fake_id}")

        assert response.status_code == 404
