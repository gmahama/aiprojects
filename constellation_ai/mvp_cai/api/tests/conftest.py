"""
Pytest configuration and fixtures for API tests.

Uses transactional rollback for test isolation - each test runs in a
transaction that is rolled back after the test completes.
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# Use test database URL from environment or default
# Inside Docker, the host is 'db'; locally it would be 'localhost'
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql://crm_user:crm_password@db:5432/crm_db_test",
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables at the start of the test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """
    Provide a transactional database session for each test.

    Rolls back all changes after each test for isolation.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    """
    Provide a TestClient with the test database session.
    """

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
