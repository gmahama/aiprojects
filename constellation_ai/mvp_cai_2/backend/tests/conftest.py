import asyncio
import pytest
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy import text

from app.main import app as fastapi_app
from app.database import Base
from app.dependencies import get_db, get_current_user
from app.models.user import User, UserRole

# Import all models so that Base.metadata knows about them
import app.models  # noqa: F401

app = fastapi_app

# Use the Docker Compose PostgreSQL instance for tests.
TEST_DATABASE_URL = (
    "postgresql+asyncpg://constellation:constellation_dev@localhost:5432/constellation"
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """Create a fresh engine per test and ensure tables exist."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    # Ensure all tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Truncate all tables for a clean state
    async with engine.begin() as conn:
        table_names = [table.name for table in reversed(Base.metadata.sorted_tables)]
        if table_names:
            tables_str = ", ".join(table_names)
            await conn.execute(text(f"TRUNCATE TABLE {tables_str} CASCADE"))
    yield engine
    await engine.dispose()


@pytest.fixture(scope="function")
async def test_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a database session for each test."""
    async_session = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest.fixture(scope="function")
async def test_user(test_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@eastrock.com",
        display_name="Test User",
        role=UserRole.ADMIN,
        is_active=True,
    )
    test_session.add(user)
    await test_session.commit()
    await test_session.refresh(user)
    return user


@pytest.fixture(scope="function")
async def client(
    test_session: AsyncSession, test_user: User
) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with mocked dependencies."""

    async def override_get_db():
        yield test_session

    async def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
