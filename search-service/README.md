# Search Service (BM25 / RAG)

## Overview

The Search Service is a FastAPI-based microservice that provides document indexing and search capabilities for CourseLLM. It implements BM25 (Best Matching 25) lexical search algorithm to rank and retrieve relevant course materials.

### Key Features

- **Per-Course Indexing**: Separate BM25 indices for each course
- **Lexical Search**: BM25-based ranking algorithm
- **RAG Support**: Full-content retrieval for Retrieval Augmented Generation
- **CRUD Operations**: Create, read, update, and delete document chunks
- **Authentication**: Firebase token verification and role-based access control
- **Monitoring**: Built-in health checks and Prometheus metrics
- **Test Support**: Comprehensive unit, API, and E2E test coverage

### Architecture

The service uses an in-memory storage architecture:
- Each course has a dedicated `BM25Index` instance
- Documents are stored as chunks with metadata
- Indices are rebuilt on service restart (not suitable for production scale)

**⚠️ Production Note**: For production deployment, replace in-memory storage with:
- Redis for distributed caching
- Cloud SQL for persistent storage
- Cloud Datastore for indexed documents

---

## Prerequisites

- Python 3.11+
- A virtual environment (recommended)
- Firebase service account credentials (for authentication)

---

## Installation

### 1. Navigate to service directory

```bash
cd search-service
```

### 2. Create virtual environment

```bash
python -m venv .venv
```

### 3. Activate virtual environment

**Windows (PowerShell)**:
```powershell
.venv\Scripts\Activate.ps1
```

**Windows (cmd)**:
```cmd
.venv\Scripts\activate.bat
```

**macOS/Linux**:
```bash
source .venv/bin/activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

## Run Locally

### Development Mode (with auto-reload)

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Service will be available at: [http://127.0.0.1:8080](http://127.0.0.1:8080)

### API Documentation (Swagger)

Once running, access interactive API docs:
- Swagger UI: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)
- ReDoc: [http://127.0.0.1:8080/redoc](http://127.0.0.1:8080/redoc)

---

## Authentication

### For Testing (Development Only)

Set the `TEST_AUTH_BYPASS` environment variable to bypass authentication:

```bash
TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080
```

**⚠️ WARNING**: Never use this in production. This bypasses all authentication.

### For Production

The service requires Firebase Admin SDK credentials:

1. **Download service account key**:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save JSON file to `secrets/firebase-admin.json`

2. **Set environment variable** (choose one):

   **Option A: File path**:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_PATH="./secrets/firebase-admin.json"
   ```

   **Option B: JSON string directly**:
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   ```

3. **Run with authentication**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8080
   ```

---

## API Overview

All routes are scoped by `course_id` and require authentication (except health/metrics).

### Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/v1/courses/{course_id}/documents:batchCreate` | ✅ | Teacher | Create/update document batch |
| POST | `/v1/courses/{course_id}/documents:search` | ✅ | All | Search documents (returns snippets) |
| POST | `/v1/courses/{course_id}/documents:ragSearch` | ✅ | All | Search for RAG (returns full content) |
| PATCH | `/v1/courses/{course_id}/documents/{document_id}` | ✅ | Teacher | Update single document |
| DELETE | `/v1/courses/{course_id}/documents/{document_id}` | ✅ | Teacher | Delete document |
| GET | `/health` | ❌ | All | Health check |
| GET | `/metrics` | ❌ | All | Prometheus metrics |

### Search Modes

Search requests support the following modes (via `mode` field):

- **`lexical`**: BM25 algorithm (currently implemented)
- **`vector`**: Semantic search (planned)
- **`hybrid`**: Combined lexical + semantic (planned)

For detailed API documentation, see: [../docs/API.md](../docs/API.md)

---

## Testing

We maintain three layers of tests:

### 1. Unit Tests (pytest)

Test pure logic like BM25 indexing/ranking with no network.

**Run unit tests**:
```bash
cd search-service
pytest tests/Unit/
```

**With coverage**:
```bash
pytest --cov=app --cov-report=term-missing
```

### 2. API Tests (pytest + FastAPI TestClient)

Hit the app in-process and validate request/response contracts.
Auth is bypassed via `dependency_overrides` inside tests.

**Run API tests**:
```bash
pytest tests/api/
```

### 3. End-to-End Tests (Playwright over HTTP)

Run a real uvicorn server and hit it over the network.
Auth is bypassed with `TEST_AUTH_BYPASS=1`.

**Terminal A** - Start server in E2E mode:
```bash
cd search-service
TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080
```

**Terminal B** - Run Playwright spec from repo root:
```bash
SEARCH_SERVICE_BASE_URL=http://127.0.0.1:8080 npx playwright test search-service/tests/search_service.e2e.spec.ts
```

**Notes**:
- The E2E spec uses `mode: "lexical"` for BM25 behavior
- If you run the service on a different host/port, update `SEARCH_SERVICE_BASE_URL`

### Run All Tests

```bash
cd search-service
pytest
```

### Test Configuration

Tests are configured in `pytest.ini`:

```ini
[pytest]
testpaths = tests
pythonpath = .
addopts = -q
```

---

## Common Issues & Troubleshooting

### 422 Unprocessable Entity

**Cause**: Request JSON doesn't match Pydantic models.

**Example**: Using `mode: "bm25"` instead of `mode: "lexical"`.

**Solution**: Check API documentation for correct request format.

### Import errors in pytest (ModuleNotFoundError: app)

**Cause**: pytest not running from correct directory or `pythonpath` not set.

**Solution**:
- Run pytest from `search-service/` directory
- Ensure `pytest.ini` includes `pythonpath = .`
- Verify `app/__init__.py` exists

### E2E forbidden/unauthorized

**Cause**: Server not started with `TEST_AUTH_BYPASS=1`.

**Solution**:
```bash
TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080
```

### Firebase authentication errors (production)

**Cause**: Missing or invalid service account credentials.

**Solution**:
- Verify `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON` is set
- Check service account JSON is valid
- Ensure service account has proper IAM permissions

---

## Project Structure

```
search-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app and route handlers
│   ├── models.py            # Pydantic request/response models
│   ├── index.py             # BM25Index implementation
│   ├── auth.py              # Firebase authentication middleware
│   ├── roles.py             # Role-based authorization
│   ├── monitoring.py        # Request monitoring and metrics
│   ├── health.py            # Health check endpoints
│   └── config.py            # Configuration settings
├── tests/
│   ├── Unit/
│   │   └── test_bm25_index.py   # BM25 algorithm tests
│   ├── api/
│   │   ├── conftest.py          # Test fixtures
│   │   ├── test_documents_api.py
│   │   └── test_search_endpoint.py
│   ├── test_search_flow.py      # Integration tests
│   └── search_service.e2e.spec.ts  # Playwright E2E tests
├── requirements.txt         # Production dependencies
├── requirements-dev.txt     # Development/test dependencies
├── pytest.ini               # Pytest configuration
├── Dockerfile               # Container image definition
└── README.md
```

---

## Dependencies

### Production (`requirements.txt`)

```
fastapi              # Web framework
uvicorn[standard]    # ASGI server
bm25s                # BM25 search algorithm
PyStemmer            # Text stemming for search
firebase-admin       # Firebase authentication
pydantic-settings    # Settings management
psutil               # System monitoring
httpx                # HTTP client
```

### Development (`requirements-dev.txt`)

```
pytest>=8.0.0        # Test framework
pytest-cov>=5.0.0    # Coverage reporting
```

---

## Monitoring

### Health Checks

**GET `/health`**

Returns service health status and index statistics:

```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T12:00:00Z",
  "indices": {
    "cs101": {
      "document_count": 150,
      "last_updated": "2026-01-15T11:30:00Z"
    }
  }
}
```

**Use cases**:
- Kubernetes liveness/readiness probes
- Uptime monitoring
- Service health dashboards

### Metrics

**GET `/metrics`**

Prometheus-compatible metrics endpoint:

```
# Request counts
search_requests_total{endpoint="/v1/courses/{course_id}/documents:search"} 1543

# Response times
search_request_duration_seconds_bucket{le="0.1"} 1200
search_request_duration_seconds_sum 450.2
search_request_duration_seconds_count 1543

# Active indices
active_indices 12
```

**Integration**:
- Prometheus scraping
- Grafana dashboards
- Alert rules

---

## Deployment

### Development (Local)

```bash
cd search-service
uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
```

### Production (Docker)

**Build image**:
```bash
docker build -t search-service .
```

**Run container**:
```bash
docker run -d \
  -p 8080:8080 \
  -e FIREBASE_SERVICE_ACCOUNT_JSON='...' \
  search-service
```

### Production (Google Cloud Run)

**Deploy with gcloud**:
```bash
gcloud run deploy search-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_SERVICE_ACCOUNT_JSON="$(cat secrets/firebase-admin.json)"
```

**Security Best Practice**: Use Cloud Secret Manager instead of environment variables:

```bash
# Create secret
gcloud secrets create firebase-admin --data-file=secrets/firebase-admin.json

# Deploy with secret
gcloud run deploy search-service \
  --source . \
  --region us-central1 \
  --update-secrets FIREBASE_SERVICE_ACCOUNT=/projects/PROJECT_ID/secrets/firebase-admin/versions/latest
```

---

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `TEST_AUTH_BYPASS` | Bypass auth (dev only) | No | `false` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account JSON string | Yes* | - |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON | Yes* | - |
| `PORT` | Server port | No | `8080` |
| `HOST` | Server host | No | `127.0.0.1` |

*Either `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH` is required (unless `TEST_AUTH_BYPASS=1`).

---

## Known Limitations

1. **In-Memory Storage**
   - Indices lost on restart
   - Limited to single instance
   - Not suitable for production scale

2. **No Vector Search**
   - Only lexical (BM25) search implemented
   - Semantic search planned for future

3. **No Pagination**
   - Returns top-k results only
   - No cursor-based pagination

4. **No Rate Limiting**
   - Relies on upstream API gateway
   - Should be added for production

---

## Future Enhancements

### Short-Term

- [ ] Add Redis for persistent indices
- [ ] Implement cursor-based pagination
- [ ] Add request rate limiting
- [ ] Improve error messages

### Long-Term

- [ ] Vector search with embeddings
- [ ] Hybrid search (BM25 + vector)
- [ ] Real-time index updates
- [ ] Distributed search across multiple instances
- [ ] Advanced analytics (query logs, popular searches)

---

## What This Satisfies

This implementation meets the following requirements:

✅ **Search Functionality**
- BM25 lexical search per course
- Document chunking and indexing
- Relevance scoring and ranking

✅ **RAG Support**
- Full-content retrieval endpoint
- Suitable for LLM context building

✅ **Authentication & Authorization**
- Firebase token verification
- Role-based access control (Student/Teacher)

✅ **Testing**
- Unit tests for search algorithm
- API tests for endpoint contracts
- E2E tests for full HTTP flows

✅ **Monitoring**
- Health check endpoints
- Prometheus metrics
- Request tracking

✅ **Production-Ready Features**
- Structured logging
- Error handling
- Configuration management
- Docker support

---

## Related Documentation

- **[API Documentation](../docs/API.md)** - Complete API reference
- **[Architecture](../docs/Architecture.md)** - System architecture overview
- **[Main README](../README.md)** - Project setup and overview

---

## Support

For issues or questions:
1. Check this README
2. Review API documentation: `../docs/API.md`
3. Check test files for usage examples
4. Consult architecture docs: `../docs/Architecture.md`

---

**Last Updated**: 2026-01-15  
**Version**: 1.0.0  
**Maintainer**: CourseLLM Development Team
