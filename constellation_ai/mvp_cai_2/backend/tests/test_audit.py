import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app as fastapi_app
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.audit import AuditLog, AuditAction

app = fastapi_app


@pytest.mark.asyncio
async def test_create_contact_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Creating a contact should log a CREATE audit entry."""
    resp = await client.post(
        "/api/contacts",
        json={"first_name": "Audit", "last_name": "Test"},
    )
    assert resp.status_code == 201
    contact_id = resp.json()["id"]

    # Check audit log
    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "contact",
            AuditLog.entity_id == contact_id,
            AuditLog.action == AuditAction.CREATE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert str(entry.user_id) == str(test_user.id)


@pytest.mark.asyncio
async def test_update_contact_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Updating a contact should log an UPDATE audit entry with changes."""
    # Create contact
    resp = await client.post(
        "/api/contacts",
        json={"first_name": "Before", "last_name": "Update"},
    )
    assert resp.status_code == 201
    contact_id = resp.json()["id"]

    # Update contact
    resp = await client.patch(
        f"/api/contacts/{contact_id}",
        json={"first_name": "After"},
    )
    assert resp.status_code == 200

    # Check audit log for UPDATE
    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "contact",
            AuditLog.entity_id == contact_id,
            AuditLog.action == AuditAction.UPDATE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert entry.details is not None
    assert "first_name" in entry.details


@pytest.mark.asyncio
async def test_delete_contact_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Deleting a contact should log a DELETE audit entry."""
    # Create contact
    resp = await client.post(
        "/api/contacts",
        json={"first_name": "ToDelete", "last_name": "Contact"},
    )
    assert resp.status_code == 201
    contact_id = resp.json()["id"]

    # Delete contact
    resp = await client.delete(f"/api/contacts/{contact_id}")
    assert resp.status_code == 204

    # Check audit log for DELETE
    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "contact",
            AuditLog.entity_id == contact_id,
            AuditLog.action == AuditAction.DELETE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert str(entry.user_id) == str(test_user.id)


@pytest.mark.asyncio
async def test_create_organization_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Creating an organization should log a CREATE audit entry."""
    resp = await client.post(
        "/api/organizations",
        json={"name": "Audit Org"},
    )
    assert resp.status_code == 201
    org_id = resp.json()["id"]

    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "organization",
            AuditLog.entity_id == org_id,
            AuditLog.action == AuditAction.CREATE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None


@pytest.mark.asyncio
async def test_update_organization_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Updating an organization should log an UPDATE audit entry."""
    resp = await client.post(
        "/api/organizations",
        json={"name": "OrigName"},
    )
    assert resp.status_code == 201
    org_id = resp.json()["id"]

    resp = await client.patch(
        f"/api/organizations/{org_id}",
        json={"name": "NewName"},
    )
    assert resp.status_code == 200

    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "organization",
            AuditLog.entity_id == org_id,
            AuditLog.action == AuditAction.UPDATE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert entry.details is not None
    assert "name" in entry.details


@pytest.mark.asyncio
async def test_delete_organization_logs_audit(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Soft-deleting an organization should log a DELETE audit entry."""
    resp = await client.post(
        "/api/organizations",
        json={"name": "ToDeleteOrg"},
    )
    assert resp.status_code == 201
    org_id = resp.json()["id"]

    resp = await client.delete(f"/api/organizations/{org_id}")
    assert resp.status_code == 204

    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "organization",
            AuditLog.entity_id == org_id,
            AuditLog.action == AuditAction.DELETE,
        )
    )
    entry = result.scalar_one_or_none()
    assert entry is not None


@pytest.mark.asyncio
async def test_audit_entry_has_correct_fields(test_session: AsyncSession, test_user: User, client: AsyncClient):
    """Audit entries should have all required fields populated."""
    resp = await client.post(
        "/api/contacts",
        json={"first_name": "Fields", "last_name": "Check"},
    )
    assert resp.status_code == 201
    contact_id = resp.json()["id"]

    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "contact",
            AuditLog.entity_id == contact_id,
            AuditLog.action == AuditAction.CREATE,
        )
    )
    entry = result.scalar_one()
    assert entry.user_id == test_user.id
    assert entry.entity_type == "contact"
    assert str(entry.entity_id) == contact_id
    assert entry.action == AuditAction.CREATE
    assert entry.created_at is not None


@pytest.mark.asyncio
async def test_multiple_operations_create_multiple_audit_entries(
    test_session: AsyncSession, test_user: User, client: AsyncClient
):
    """Each CUD operation should create its own audit entry."""
    # Create
    resp = await client.post(
        "/api/contacts",
        json={"first_name": "Multi", "last_name": "Audit"},
    )
    contact_id = resp.json()["id"]

    # Update
    await client.patch(f"/api/contacts/{contact_id}", json={"first_name": "Updated"})

    # Delete
    await client.delete(f"/api/contacts/{contact_id}")

    # Should have 3 audit entries for this entity
    result = await test_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "contact",
            AuditLog.entity_id == contact_id,
        )
    )
    entries = result.scalars().all()
    actions = {e.action for e in entries}
    assert AuditAction.CREATE in actions
    assert AuditAction.UPDATE in actions
    assert AuditAction.DELETE in actions
    assert len(entries) == 3
