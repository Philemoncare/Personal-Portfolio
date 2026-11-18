from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import create_app
from app.models import AdminUser

TEST_ADMIN_EMAIL = "admin@test.dev"
TEST_ADMIN_PASSWORD = "work-system-test-password"


@pytest.fixture(autouse=True)
def reset_rate_limiters() -> Iterator[None]:
    """Keep per-client counters from leaking between tests."""

    from app.api.v1.auth import login_limiter, reset_request_limiter, verify_limiter
    from app.services.contact import contact_limiter
    from app.services.otp import otp_request_limiter

    for limiter in (
        contact_limiter,
        login_limiter,
        verify_limiter,
        reset_request_limiter,
        otp_request_limiter,
    ):
        limiter._hits.clear()
    yield
    for limiter in (
        contact_limiter,
        login_limiter,
        verify_limiter,
        reset_request_limiter,
        otp_request_limiter,
    ):
        limiter._hits.clear()


@pytest.fixture()
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session: Session, monkeypatch: pytest.MonkeyPatch, tmp_path) -> Iterator[TestClient]:
    from app.core.config import settings

    # Tests must never provision the real bootstrap administrator or write into
    # the developer media directory.
    monkeypatch.setattr(settings, "initial_admin_email", None)
    monkeypatch.setattr(settings, "media_storage_dir", str(tmp_path / "media"))

    app = create_app()

    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_client(client: TestClient, db_session: Session) -> TestClient:
    admin = AdminUser(
        email=TEST_ADMIN_EMAIL,
        password_hash=hash_password(TEST_ADMIN_PASSWORD),
        is_active=True,
    )
    db_session.add(admin)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"identifier": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return client
