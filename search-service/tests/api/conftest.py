import pytest
from fastapi.testclient import TestClient

from app.main import app
from app import main as main_module
from app.auth import get_current_user
from app.roles import is_teacher


@pytest.fixture()
def client():
    # Override auth so tests don't need Firebase tokens
    app.dependency_overrides[get_current_user] = lambda: {"uid": "test-user", "role": "student"}
    app.dependency_overrides[is_teacher] = lambda: {"uid": "test-user", "role": "teacher"}

    # Clear in-memory indices between tests
    main_module.course_indices.clear()

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
