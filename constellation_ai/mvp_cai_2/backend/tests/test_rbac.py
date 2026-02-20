import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app as fastapi_app
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.organization import Classification
from app.models.contact import Contact

app = fastapi_app


async def make_user(session: AsyncSession, role: UserRole, email: str) -> User:
    """Helper to create a user with a given role."""
    user = User(
        email=email,
        display_name=f"{role.value} User",
        role=role,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


def make_client_with_user(session: AsyncSession, user: User):
    """Set up dependency overrides for a specific user."""
    async def override_get_db():
        yield session

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user


# --- Admin-only endpoint tests ---

@pytest.mark.asyncio
async def test_admin_can_list_users(test_session: AsyncSession):
    """ADMIN should access GET /api/users."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-rbac@test.com")
    make_client_with_user(test_session, admin)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/users")
        assert resp.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_list_users(test_session: AsyncSession):
    """VIEWER should get 403 on GET /api/users (admin-only)."""
    viewer = await make_user(test_session, UserRole.VIEWER, "viewer-rbac@test.com")
    make_client_with_user(test_session, viewer)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/users")
        assert resp.status_code == 403

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analyst_cannot_list_users(test_session: AsyncSession):
    """ANALYST should get 403 on admin-only endpoints."""
    analyst = await make_user(test_session, UserRole.ANALYST, "analyst-rbac@test.com")
    make_client_with_user(test_session, analyst)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/users")
        assert resp.status_code == 403

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_can_access_audit_log(test_session: AsyncSession):
    """ADMIN should access GET /api/audit."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-audit@test.com")
    make_client_with_user(test_session, admin)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/audit")
        assert resp.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_access_audit_log(test_session: AsyncSession):
    """VIEWER should get 403 on GET /api/audit."""
    viewer = await make_user(test_session, UserRole.VIEWER, "viewer-audit@test.com")
    make_client_with_user(test_session, viewer)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/audit")
        assert resp.status_code == 403

    app.dependency_overrides.clear()


# --- Classification gating tests ---

@pytest.mark.asyncio
async def test_viewer_only_sees_internal_contacts(test_session: AsyncSession):
    """VIEWER should only see INTERNAL contacts, not CONFIDENTIAL or RESTRICTED."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-class@test.com")
    viewer = await make_user(test_session, UserRole.VIEWER, "viewer-class@test.com")

    # Create contacts at different classification levels
    for cls, name in [
        (Classification.INTERNAL, "Public"),
        (Classification.CONFIDENTIAL, "Confidential"),
        (Classification.RESTRICTED, "Restricted"),
    ]:
        contact = Contact(
            first_name=name,
            last_name="Contact",
            classification=cls,
            created_by=admin.id,
        )
        test_session.add(contact)
    await test_session.commit()

    # As VIEWER, list contacts
    make_client_with_user(test_session, viewer)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/contacts")
        assert resp.status_code == 200
        data = resp.json()
        names = [c["first_name"] for c in data["items"]]
        assert "Public" in names
        assert "Confidential" not in names
        assert "Restricted" not in names

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analyst_sees_internal_and_confidential(test_session: AsyncSession):
    """ANALYST should see INTERNAL and CONFIDENTIAL contacts."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-cls2@test.com")
    analyst = await make_user(test_session, UserRole.ANALYST, "analyst-cls@test.com")

    for cls, name in [
        (Classification.INTERNAL, "Public"),
        (Classification.CONFIDENTIAL, "Confidential"),
        (Classification.RESTRICTED, "Restricted"),
    ]:
        contact = Contact(
            first_name=name,
            last_name="Contact",
            classification=cls,
            created_by=admin.id,
        )
        test_session.add(contact)
    await test_session.commit()

    make_client_with_user(test_session, analyst)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/contacts")
        assert resp.status_code == 200
        data = resp.json()
        names = [c["first_name"] for c in data["items"]]
        assert "Public" in names
        assert "Confidential" in names
        assert "Restricted" not in names

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_admin_sees_all_classifications(test_session: AsyncSession):
    """ADMIN should see all classification levels."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-all@test.com")

    for cls, name in [
        (Classification.INTERNAL, "Public"),
        (Classification.CONFIDENTIAL, "Confidential"),
        (Classification.RESTRICTED, "Restricted"),
    ]:
        contact = Contact(
            first_name=name,
            last_name="Contact",
            classification=cls,
            created_by=admin.id,
        )
        test_session.add(contact)
    await test_session.commit()

    make_client_with_user(test_session, admin)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/contacts")
        assert resp.status_code == 200
        data = resp.json()
        names = [c["first_name"] for c in data["items"]]
        assert "Public" in names
        assert "Confidential" in names
        assert "Restricted" in names

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_viewer_cannot_see_confidential_contact_detail(test_session: AsyncSession):
    """VIEWER should get 404 when trying to access a CONFIDENTIAL contact."""
    admin = await make_user(test_session, UserRole.ADMIN, "admin-detail@test.com")
    viewer = await make_user(test_session, UserRole.VIEWER, "viewer-detail@test.com")

    contact = Contact(
        first_name="Secret",
        last_name="Person",
        classification=Classification.CONFIDENTIAL,
        created_by=admin.id,
    )
    test_session.add(contact)
    await test_session.commit()
    await test_session.refresh(contact)

    make_client_with_user(test_session, viewer)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get(f"/api/contacts/{contact.id}")
        assert resp.status_code == 404

    app.dependency_overrides.clear()


# --- Write permission tests ---

@pytest.mark.asyncio
async def test_viewer_can_list_contacts(test_session: AsyncSession):
    """VIEWER should be able to list contacts (read access)."""
    viewer = await make_user(test_session, UserRole.VIEWER, "viewer-read@test.com")
    make_client_with_user(test_session, viewer)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/contacts")
        assert resp.status_code == 200

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analyst_can_create_contact(test_session: AsyncSession):
    """ANALYST should be able to create contacts."""
    analyst = await make_user(test_session, UserRole.ANALYST, "analyst-create@test.com")
    make_client_with_user(test_session, analyst)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/contacts",
            json={"first_name": "New", "last_name": "Contact"},
        )
        assert resp.status_code == 201

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_manager_can_create_organization(test_session: AsyncSession):
    """MANAGER should be able to create organizations."""
    manager = await make_user(test_session, UserRole.MANAGER, "mgr-create@test.com")
    make_client_with_user(test_session, manager)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/organizations",
            json={"name": "New Org"},
        )
        assert resp.status_code == 201

    app.dependency_overrides.clear()
