from fastapi.testclient import TestClient

from app.main import app
from app import auth, roles

client = TestClient(app)


def test_full_search_flow():
    # Make sure we run this test as an authenticated teacher
    app.dependency_overrides.clear()
    app.dependency_overrides[auth.get_current_user] = (
        lambda: {"uid": "teacher1", "role": "teacher"}
    )
    app.dependency_overrides[roles.is_teacher] = (
        lambda: {"uid": "teacher1", "role": "teacher"}
    )

    course_id = "llm-2025"

    # 1) Batch create
    resp = client.post(
        f"/v1/courses/{course_id}/documents:batchCreate",
        json={
            "documents": [
                {
                    "course_id": course_id,
                    "content": "Beam search is a decoding strategy.",
                },
                {
                    "course_id": course_id,
                    "content": "Greedy decoding always picks the most probable token.",
                },
            ]
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    ids = [doc["id"] for doc in body["documents"]]
    assert len(ids) == 2

    # 2) Search for beam
    resp = client.post(
        f"/v1/courses/{course_id}/documents:search",
        json={"query": "beam search", "page_size": 5, "mode": "lexical"},
    )
    assert resp.status_code == 200
    hits = resp.json()["results"]
    hit_ids = [h["id"] for h in hits]
    assert any("beam" in h["snippet"].lower() for h in hits)
    assert ids[0] in hit_ids

    # 3) Update first doc to mention greedy too
    resp = client.patch(
        f"/v1/courses/{course_id}/documents/{ids[0]}",
        json={"content": "Beam search and greedy search are decoding strategies."},
    )
    assert resp.status_code == 200

    # 4) Now search for greedy and ensure updated doc is found
    resp = client.post(
        f"/v1/courses/{course_id}/documents:search",
        json={"query": "greedy search", "page_size": 5, "mode": "lexical"},
    )
    assert resp.status_code == 200
    hits = resp.json()["results"]
    hit_ids = [h["id"] for h in hits]
    assert ids[0] in hit_ids

    # # 5) Delete that doc
    # resp = client.delete(
    #     f"/v1/courses/{course_id}/documents/{ids[0]}",
    # )
    # assert resp.status_code == 204

    # # 6) Ensure it's gone from search
    # resp = client.post(
    #     f"/v1/courses/{course_id}/documents:search",
    #     json={"query": "beam search", "page_size": 5, "mode": "lexical"},
    # )
    # assert resp.status_code == 200
    # hits = resp.json()["results"]
    # hit_ids = [h["id"] for h in hits]
    # assert ids[0] not in hit_ids
