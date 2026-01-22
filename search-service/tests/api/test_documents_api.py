from datetime import datetime, timezone
import uuid

from app.models import DocumentChunk, BatchCreateRequest, SearchRequest, UpdateDocumentChunk


def _iso_now():
    return datetime.now(timezone.utc).isoformat()


def _make_model_instance(model_cls, **overrides):
    schema = model_cls.model_json_schema()
    required = schema.get("required", [])
    props = schema.get("properties", {})

    def pick_value(name: str, prop: dict):
        if name == "id":
            return str(uuid.uuid4())
        if prop.get("format") == "date-time" or name.endswith("_at"):
            return _iso_now()

        t = prop.get("type")
        if t is None and "anyOf" in prop:
            for opt in prop["anyOf"]:
                if "type" in opt:
                    t = opt["type"]
                    prop = opt
                    break

        if t == "string":
            return f"test-{name}"
        if t == "integer":
            return 0
        if t == "number":
            return 0.0
        if t == "boolean":
            return False
        if t == "object":
            return {}
        if t == "array":
            return []
        return "test"

    data = {}
    for f in required:
        if f in overrides:
            continue
        data[f] = pick_value(f, props.get(f, {}))

    data.update(overrides)
    return model_cls(**data)


def test_search_empty_returns_no_results(client):
    course_id = "cs101"
    req = _make_model_instance(SearchRequest, query="attention", page_size=5)
    r = client.post(f"/v1/courses/{course_id}/documents:search", json=req.model_dump(by_alias=True))
    assert r.status_code == 200
    body = r.json()
    assert body["query"] == "attention"
    assert body["results"] == []


def test_batch_create_then_search_returns_hits(client):
    course_id = "cs101"

    d1 = _make_model_instance(
        DocumentChunk,
        id="d1",
        content="attention transformers attention",
        title="Hit",
    )
    d2 = _make_model_instance(
        DocumentChunk,
        id="d2",
        content="unrelated database systems",
        title="Miss",
    )

    batch = _make_model_instance(BatchCreateRequest, documents=[d1, d2])
    r1 = client.post(
        f"/v1/courses/{course_id}/documents:batchCreate",
        json=batch.model_dump(by_alias=True),
    )
    assert r1.status_code == 200
    created = r1.json()["documents"]
    assert len(created) == 2

    search = _make_model_instance(SearchRequest, query="attention transformers", page_size=5)
    r2 = client.post(
        f"/v1/courses/{course_id}/documents:search",
        json=search.model_dump(by_alias=True),
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["query"] == "attention transformers"
    assert isinstance(body["results"], list)
    assert body["results"][0]["id"] == "d1"


def test_rag_search_returns_full_content(client):
    course_id = "cs101"

    d1 = _make_model_instance(
        DocumentChunk,
        id="d1",
        content="FULL_CONTENT_123 " * 30,
        title="Chunk",
    )
    batch = _make_model_instance(BatchCreateRequest, documents=[d1])
    client.post(
        f"/v1/courses/{course_id}/documents:batchCreate",
        json=batch.model_dump(by_alias=True),
    )

    req = _make_model_instance(SearchRequest, query="FULL_CONTENT_123", page_size=5)
    r = client.post(
        f"/v1/courses/{course_id}/documents:ragSearch",
        json=req.model_dump(by_alias=True),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["results"][0]["id"] == "d1"
    assert "FULL_CONTENT_123" in body["results"][0]["content"]  # ragSearch returns full content


def test_patch_then_delete_document(client):
    course_id = "cs101"

    d1 = _make_model_instance(
        DocumentChunk,
        id="d1",
        content="old content",
        title="Chunk",
    )
    batch = _make_model_instance(BatchCreateRequest, documents=[d1])
    client.post(
        f"/v1/courses/{course_id}/documents:batchCreate",
        json=batch.model_dump(by_alias=True),
    )

    patch = _make_model_instance(UpdateDocumentChunk, content="new content")
    r_patch = client.patch(
        f"/v1/courses/{course_id}/documents/d1",
        json=patch.model_dump(by_alias=True),
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["content"] == "new content"

    r_del = client.delete(f"/v1/courses/{course_id}/documents/d1")
    assert r_del.status_code == 204

    # Confirm it's gone
    req = _make_model_instance(SearchRequest, query="new content", page_size=5)
    r_search = client.post(
        f"/v1/courses/{course_id}/documents:search",
        json=req.model_dump(by_alias=True),
    )
    assert r_search.status_code == 200
    assert r_search.json()["results"] == []
