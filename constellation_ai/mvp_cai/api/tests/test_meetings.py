"""
Tests for the Meetings API endpoints.

Covers:
- Create meeting with and without attendees
- Create meeting with invalid attendee IDs (422)
- Get meeting by ID with attendees
- List meetings (unfiltered, by person_id, by date range)
- Update meeting fields and attendee replacement
- Add/remove attendee endpoints (idempotency)
"""
import uuid
from datetime import datetime, timedelta, timezone

import pytest


class TestCreateMeeting:
    """Tests for POST /meetings."""

    @pytest.fixture
    def sample_people(self, client):
        """Create sample people for meeting tests."""
        people = []
        for i, name in enumerate(["Alice", "Bob", "Charlie"]):
            response = client.post(
                "/people",
                json={"first_name": name, "last_name": "Test", "primary_email": f"{name.lower()}@test.com"},
            )
            people.append(response.json())
        return people

    def test_create_meeting_no_attendees(self, client):
        """Create a meeting with no attendees."""
        payload = {
            "occurred_at": "2025-01-15T10:00:00Z",
            "type": "coffee",
            "location": "Starbucks",
            "notes": "Initial discussion",
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "coffee"
        assert data["location"] == "Starbucks"
        assert data["notes"] == "Initial discussion"
        assert data["attendees"] == []
        assert "id" in data
        assert "created_at" in data

    def test_create_meeting_with_attendees(self, client, sample_people):
        """Create a meeting with attendees and verify join rows."""
        alice_id = sample_people[0]["id"]
        bob_id = sample_people[1]["id"]

        payload = {
            "occurred_at": "2025-01-15T14:00:00Z",
            "type": "zoom",
            "attendees": [
                {"person_id": alice_id, "role": "organizer"},
                {"person_id": bob_id, "role": "attendee"},
            ],
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert len(data["attendees"]) == 2

        attendee_map = {a["person_id"]: a for a in data["attendees"]}
        assert attendee_map[alice_id]["role"] == "organizer"
        assert attendee_map[alice_id]["first_name"] == "Alice"
        assert attendee_map[bob_id]["role"] == "attendee"

    def test_create_meeting_attendees_as_uuid_list(self, client, sample_people):
        """Create meeting with attendees as simple UUID list (no roles)."""
        alice_id = sample_people[0]["id"]
        bob_id = sample_people[1]["id"]

        payload = {
            "occurred_at": "2025-01-15T14:00:00Z",
            "type": "call",
            "attendees": [alice_id, bob_id],
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert len(data["attendees"]) == 2
        # Roles should be None when not provided
        for attendee in data["attendees"]:
            assert attendee["role"] is None

    def test_create_meeting_deduplicates_attendees(self, client, sample_people):
        """Duplicate attendee IDs should be deduplicated."""
        alice_id = sample_people[0]["id"]

        payload = {
            "occurred_at": "2025-01-15T14:00:00Z",
            "type": "call",
            "attendees": [alice_id, alice_id, alice_id],
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert len(data["attendees"]) == 1

    def test_create_meeting_invalid_attendee_id(self, client, sample_people):
        """Return 422 when attendee person_id doesn't exist."""
        fake_id = str(uuid.uuid4())

        payload = {
            "occurred_at": "2025-01-15T14:00:00Z",
            "type": "call",
            "attendees": [sample_people[0]["id"], fake_id],
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 422
        assert fake_id in response.json()["detail"]

    def test_create_meeting_empty_strings_normalized(self, client):
        """Empty strings should be normalized to null."""
        payload = {
            "occurred_at": "2025-01-15T10:00:00Z",
            "type": "meeting",
            "location": "",
            "notes": "   ",
        }

        response = client.post("/meetings", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["location"] is None
        assert data["notes"] is None


class TestGetMeeting:
    """Tests for GET /meetings/{id}."""

    @pytest.fixture
    def sample_people(self, client):
        """Create sample people."""
        people = []
        for name in ["Alice", "Bob"]:
            response = client.post(
                "/people",
                json={"first_name": name, "last_name": "Test"},
            )
            people.append(response.json())
        return people

    def test_get_meeting_with_attendees(self, client, sample_people):
        """Get a meeting and verify attendees are included."""
        # Create meeting with attendees
        create_response = client.post(
            "/meetings",
            json={
                "occurred_at": "2025-01-15T14:00:00Z",
                "type": "coffee",
                "attendees": [
                    {"person_id": sample_people[0]["id"], "role": "organizer"},
                    {"person_id": sample_people[1]["id"]},
                ],
            },
        )
        meeting_id = create_response.json()["id"]

        response = client.get(f"/meetings/{meeting_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == meeting_id
        assert len(data["attendees"]) == 2
        # Verify attendee info includes person details
        assert any(a["first_name"] == "Alice" for a in data["attendees"])

    def test_get_meeting_not_found(self, client):
        """Return 404 for non-existent meeting."""
        fake_id = str(uuid.uuid4())

        response = client.get(f"/meetings/{fake_id}")

        assert response.status_code == 404


class TestListMeetings:
    """Tests for GET /meetings."""

    @pytest.fixture
    def sample_data(self, client):
        """Create sample people and meetings for list tests."""
        # Create people
        people = []
        for name in ["Alice", "Bob", "Charlie"]:
            response = client.post(
                "/people",
                json={"first_name": name, "last_name": "Test"},
            )
            people.append(response.json())

        now = datetime.now(timezone.utc)

        # Create meetings at different times
        meetings = []
        meeting_data = [
            {"days_ago": 30, "type": "coffee", "attendees": [people[0]["id"]]},
            {"days_ago": 14, "type": "zoom", "attendees": [people[0]["id"], people[1]["id"]]},
            {"days_ago": 7, "type": "call", "attendees": [people[1]["id"]]},
            {"days_ago": 1, "type": "in-person", "attendees": [people[0]["id"], people[2]["id"]]},
        ]

        for md in meeting_data:
            occurred_at = (now - timedelta(days=md["days_ago"])).isoformat()
            response = client.post(
                "/meetings",
                json={
                    "occurred_at": occurred_at,
                    "type": md["type"],
                    "attendees": md["attendees"],
                },
            )
            meetings.append(response.json())

        return {"people": people, "meetings": meetings, "now": now}

    def test_list_meetings_unfiltered(self, client, sample_data):
        """List all meetings, ordered by occurred_at DESC."""
        response = client.get("/meetings")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4
        assert len(data["items"]) == 4

        # Verify DESC order (most recent first)
        dates = [item["occurred_at"] for item in data["items"]]
        assert dates == sorted(dates, reverse=True)

    def test_list_meetings_by_person_id(self, client, sample_data):
        """Filter meetings by person_id (attendee)."""
        alice_id = sample_data["people"][0]["id"]

        response = client.get("/meetings", params={"person_id": alice_id})

        assert response.status_code == 200
        data = response.json()
        # Alice is in meetings 0, 1, 3 (3 meetings)
        assert data["total"] == 3

        # Verify all returned meetings include Alice
        for meeting in data["items"]:
            attendee_ids = [a["person_id"] for a in meeting["attendees"]]
            assert alice_id in attendee_ids

    def test_list_meetings_from_date(self, client, sample_data):
        """Filter meetings with occurred_at >= from date."""
        now = sample_data["now"]
        from_date = (now - timedelta(days=10)).isoformat()

        response = client.get("/meetings", params={"from": from_date})

        assert response.status_code == 200
        data = response.json()
        # Meetings from 7 days ago and 1 day ago
        assert data["total"] == 2

    def test_list_meetings_to_date(self, client, sample_data):
        """Filter meetings with occurred_at <= to date."""
        now = sample_data["now"]
        to_date = (now - timedelta(days=10)).isoformat()

        response = client.get("/meetings", params={"to": to_date})

        assert response.status_code == 200
        data = response.json()
        # Meetings from 30 days ago and 14 days ago
        assert data["total"] == 2

    def test_list_meetings_date_range(self, client, sample_data):
        """Filter meetings within a date range (from and to)."""
        now = sample_data["now"]
        from_date = (now - timedelta(days=20)).isoformat()
        to_date = (now - timedelta(days=5)).isoformat()

        response = client.get("/meetings", params={"from": from_date, "to": to_date})

        assert response.status_code == 200
        data = response.json()
        # Meetings from 14 days ago and 7 days ago
        assert data["total"] == 2

    def test_list_meetings_pagination(self, client, sample_data):
        """Test limit and offset pagination."""
        response = client.get("/meetings", params={"limit": 2, "offset": 1})

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4
        assert len(data["items"]) == 2
        assert data["limit"] == 2
        assert data["offset"] == 1

    def test_list_meetings_combined_filters(self, client, sample_data):
        """Combine person_id and date filters."""
        alice_id = sample_data["people"][0]["id"]
        now = sample_data["now"]
        from_date = (now - timedelta(days=20)).isoformat()

        response = client.get(
            "/meetings",
            params={"person_id": alice_id, "from": from_date},
        )

        assert response.status_code == 200
        data = response.json()
        # Alice's meetings from past 20 days: meeting 1 (14 days) and meeting 3 (1 day)
        assert data["total"] == 2


class TestUpdateMeeting:
    """Tests for PATCH /meetings/{id}."""

    @pytest.fixture
    def sample_people(self, client):
        """Create sample people."""
        people = []
        for name in ["Alice", "Bob", "Charlie"]:
            response = client.post(
                "/people",
                json={"first_name": name, "last_name": "Test"},
            )
            people.append(response.json())
        return people

    @pytest.fixture
    def sample_meeting(self, client, sample_people):
        """Create a sample meeting with attendees."""
        response = client.post(
            "/meetings",
            json={
                "occurred_at": "2025-01-15T14:00:00Z",
                "type": "coffee",
                "location": "Starbucks",
                "attendees": [
                    {"person_id": sample_people[0]["id"], "role": "organizer"},
                    {"person_id": sample_people[1]["id"], "role": "attendee"},
                ],
            },
        )
        return response.json()

    def test_update_meeting_text_fields(self, client, sample_meeting):
        """Update only text fields, attendees unchanged."""
        meeting_id = sample_meeting["id"]

        response = client.patch(
            f"/meetings/{meeting_id}",
            json={
                "notes": "Great conversation!",
                "next_steps": "Follow up next week",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Great conversation!"
        assert data["next_steps"] == "Follow up next week"
        # Attendees unchanged
        assert len(data["attendees"]) == 2
        # Original fields unchanged
        assert data["location"] == "Starbucks"

    def test_update_meeting_replace_attendees(self, client, sample_meeting, sample_people):
        """Replace attendees entirely."""
        meeting_id = sample_meeting["id"]
        charlie_id = sample_people[2]["id"]

        response = client.patch(
            f"/meetings/{meeting_id}",
            json={
                "attendees": [{"person_id": charlie_id, "role": "solo"}],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["attendees"]) == 1
        assert data["attendees"][0]["person_id"] == charlie_id
        assert data["attendees"][0]["role"] == "solo"
        assert data["attendees"][0]["first_name"] == "Charlie"

    def test_update_meeting_clear_attendees(self, client, sample_meeting):
        """Clear all attendees by passing empty array."""
        meeting_id = sample_meeting["id"]

        response = client.patch(
            f"/meetings/{meeting_id}",
            json={"attendees": []},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["attendees"]) == 0

    def test_update_meeting_invalid_attendee_id(self, client, sample_meeting):
        """Return 422 when new attendee ID doesn't exist."""
        meeting_id = sample_meeting["id"]
        fake_id = str(uuid.uuid4())

        response = client.patch(
            f"/meetings/{meeting_id}",
            json={"attendees": [fake_id]},
        )

        assert response.status_code == 422

    def test_update_meeting_not_found(self, client):
        """Return 404 for non-existent meeting."""
        fake_id = str(uuid.uuid4())

        response = client.patch(f"/meetings/{fake_id}", json={"notes": "test"})

        assert response.status_code == 404


class TestDeleteMeeting:
    """Tests for DELETE /meetings/{id}."""

    def test_delete_meeting(self, client):
        """Delete a meeting."""
        # Create a meeting
        create_response = client.post(
            "/meetings",
            json={"occurred_at": "2025-01-15T14:00:00Z", "type": "test"},
        )
        meeting_id = create_response.json()["id"]

        response = client.delete(f"/meetings/{meeting_id}")

        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/meetings/{meeting_id}")
        assert get_response.status_code == 404

    def test_delete_meeting_not_found(self, client):
        """Return 404 for deleting non-existent meeting."""
        fake_id = str(uuid.uuid4())

        response = client.delete(f"/meetings/{fake_id}")

        assert response.status_code == 404


class TestAttendeeEndpoints:
    """Tests for POST/DELETE /meetings/{id}/attendees endpoints."""

    @pytest.fixture
    def sample_people(self, client):
        """Create sample people."""
        people = []
        for name in ["Alice", "Bob", "Charlie"]:
            response = client.post(
                "/people",
                json={"first_name": name, "last_name": "Test"},
            )
            people.append(response.json())
        return people

    @pytest.fixture
    def sample_meeting(self, client, sample_people):
        """Create a meeting with one attendee."""
        response = client.post(
            "/meetings",
            json={
                "occurred_at": "2025-01-15T14:00:00Z",
                "type": "coffee",
                "attendees": [{"person_id": sample_people[0]["id"]}],
            },
        )
        return response.json()

    def test_add_attendee(self, client, sample_meeting, sample_people):
        """Add a new attendee to a meeting."""
        meeting_id = sample_meeting["id"]
        bob_id = sample_people[1]["id"]

        response = client.post(
            f"/meetings/{meeting_id}/attendees",
            json={"person_id": bob_id, "role": "guest"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["attendees"]) == 2
        bob_attendee = next(a for a in data["attendees"] if a["person_id"] == bob_id)
        assert bob_attendee["role"] == "guest"

    def test_add_attendee_idempotent(self, client, sample_meeting, sample_people):
        """Adding existing attendee updates their role (idempotent)."""
        meeting_id = sample_meeting["id"]
        alice_id = sample_people[0]["id"]

        # Alice is already an attendee with no role
        response = client.post(
            f"/meetings/{meeting_id}/attendees",
            json={"person_id": alice_id, "role": "organizer"},
        )

        assert response.status_code == 200
        data = response.json()
        # Still only one attendee
        assert len(data["attendees"]) == 1
        # Role updated
        assert data["attendees"][0]["role"] == "organizer"

    def test_add_attendee_invalid_person_id(self, client, sample_meeting):
        """Return 422 for invalid person_id."""
        meeting_id = sample_meeting["id"]
        fake_id = str(uuid.uuid4())

        response = client.post(
            f"/meetings/{meeting_id}/attendees",
            json={"person_id": fake_id},
        )

        assert response.status_code == 422

    def test_add_attendee_meeting_not_found(self, client, sample_people):
        """Return 404 when meeting doesn't exist."""
        fake_meeting_id = str(uuid.uuid4())

        response = client.post(
            f"/meetings/{fake_meeting_id}/attendees",
            json={"person_id": sample_people[0]["id"]},
        )

        assert response.status_code == 404

    def test_remove_attendee(self, client, sample_meeting, sample_people):
        """Remove an attendee from a meeting."""
        meeting_id = sample_meeting["id"]
        alice_id = sample_people[0]["id"]

        response = client.delete(f"/meetings/{meeting_id}/attendees/{alice_id}")

        assert response.status_code == 200
        data = response.json()
        assert len(data["attendees"]) == 0

    def test_remove_attendee_idempotent(self, client, sample_meeting, sample_people):
        """Removing non-existent attendee doesn't error (idempotent)."""
        meeting_id = sample_meeting["id"]
        bob_id = sample_people[1]["id"]  # Bob is not an attendee

        response = client.delete(f"/meetings/{meeting_id}/attendees/{bob_id}")

        assert response.status_code == 200
        # Original attendee still there
        assert len(response.json()["attendees"]) == 1

    def test_remove_attendee_meeting_not_found(self, client, sample_people):
        """Return 404 when meeting doesn't exist."""
        fake_meeting_id = str(uuid.uuid4())

        response = client.delete(
            f"/meetings/{fake_meeting_id}/attendees/{sample_people[0]['id']}"
        )

        assert response.status_code == 404
