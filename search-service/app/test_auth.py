from fastapi.testclient import TestClient

from .main import app
from . import auth, roles


client = TestClient(app)


def override_student():
    # Simulates a normal authenticated student user
    return {"uid": "student1", "role": "student"}


def override_teacher():
    # Simulates an authenticated teacher user
    return {"uid": "teacher1", "role": "teacher"}


def reset_overrides():
    app.dependency_overrides = {}


def test_search_requires_auth():
    reset_overrides()
    # No overrides → real get_current_user + HTTPBearer → 401/403
    resp = client.post(
        "/v1/courses/demo/documents:search",
        json={"query": "hello", "page_size": 5, "mode": "lexical"},
    )
    assert resp.status_code in (401, 403)


def test_search_allows_any_authenticated_user():
    reset_overrides()
    # Any authenticated user (student) should be allowed to search
    app.dependency_overrides[auth.get_current_user] = override_student

    resp = client.post(
        "/v1/courses/demo/documents:search",
        json={"query": "hello", "page_size": 5, "mode": "lexical"},
    )
    assert resp.status_code == 200


def test_batch_create_forbidden_for_student():
    reset_overrides()
    # get_current_user returns a student; is_teacher still uses real logic
    app.dependency_overrides[auth.get_current_user] = override_student

    payload = {
        "documents": [
            {
                "id": "doc1",
                "course_id": "demo",
                "source": "test",
                "chunk_index": 0,
                "title": "Title",
                "content": "Some text",
                "metadata": {},
            }
        ]
    }

    resp = client.post(
        "/v1/courses/demo/documents:batchCreate",
        json=payload,
    )
    assert resp.status_code == 403


def test_batch_create_allows_teacher():
    reset_overrides()
    # For teacher, bypass is_teacher and just return a teacher dict
    app.dependency_overrides[roles.is_teacher] = override_teacher

    payload = {
        "documents": [
            {
                "id": "doc1",
                "course_id": "demo",
                "source": "test",
                "chunk_index": 0,
                "title": "Title",
                "content": "Some text",
                "metadata": {},
            }
        ]
    }

    resp = client.post(
        "/v1/courses/demo/documents:batchCreate",
        json=payload,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "documents" in body
    assert len(body["documents"]) == 1
