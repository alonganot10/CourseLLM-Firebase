from datetime import datetime, timezone
import uuid

from app.index import BM25Index
from app.models import DocumentChunk


def _iso_now():
    return datetime.now(timezone.utc).isoformat()


def _make_model_instance(model_cls, **overrides):
    """
    Build a minimal valid Pydantic model instance without knowing required fields up front.
    Uses the model JSON schema required list + property types.
    """
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
            # pick first typed option
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


def test_empty_index_returns_no_results():
    idx = BM25Index()
    assert idx.search("anything", k=10) == []


def test_bm25_ranks_relevant_higher():
    idx = BM25Index()

    doc_a = _make_model_instance(
        DocumentChunk,
        id="a",
        content="transformers attention is all you need",
        title="Doc A",
    )
    doc_b = _make_model_instance(
        DocumentChunk,
        id="b",
        content="attention attention attention transformers",
        title="Doc B",
    )
    doc_c = _make_model_instance(
        DocumentChunk,
        id="c",
        content="database indexing with btree",
        title="Doc C",
    )

    idx.upsert(doc_a)
    idx.upsert(doc_b)
    idx.upsert(doc_c)

    results = idx.search("attention transformers", k=3)
    ids = [d.id for d, _ in results]

    # Most relevant should be b, irrelevant should be last
    assert ids[0] == "b"
    assert ids[-1] == "c"
