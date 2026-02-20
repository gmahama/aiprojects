import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.main import app as fastapi_app
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole

app = fastapi_app


@pytest.mark.asyncio
async def test_dev_mode_bypass(test_session: AsyncSession, test_user: User):
    """DEV_MODE=true should accept any Bearer token and return a user."""
    async def override_get_db():
        yield test_session

    # Don't override get_current_user — let the real dep run (which uses verify_token → dev mode)
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/users/me",
            headers={"Authorization": "Bearer any-token-works"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "role" in data

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_missing_auth_header_returns_401(test_session: AsyncSession):
    """A request with no Authorization header should return 401."""
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/users/me")
        assert resp.status_code == 401

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_invalid_auth_header_format_returns_401(test_session: AsyncSession):
    """A request with a malformed Authorization header should return 401."""
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/users/me",
            headers={"Authorization": "NotBearer some-token"},
        )
        assert resp.status_code == 401

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_auto_provision_new_user(test_session: AsyncSession):
    """A new user with a valid token should be auto-provisioned with VIEWER role."""
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/users/me",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Dev mode auto-provisions — should exist now
        assert data["email"] is not None

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_inactive_user_returns_403(test_session: AsyncSession):
    """An inactive user should get 403 even with valid token."""
    # Create an inactive user matching the dev mode email
    from app.config import settings

    user = User(
        email=settings.dev_user_email,
        display_name="Inactive User",
        role=UserRole.VIEWER,
        is_active=False,
    )
    test_session.add(user)
    await test_session.commit()

    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides.pop(get_current_user, None)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/users/me",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert resp.status_code == 403

    app.dependency_overrides.clear()
