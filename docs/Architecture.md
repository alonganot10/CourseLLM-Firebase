# System Architecture

## Overview

CourseLLM is a microservices-based educational platform that combines Next.js frontend, Firebase backend services, and Python microservices to deliver AI-powered personalized learning experiences. The architecture emphasizes scalability, security, and maintainability through service separation and clear API boundaries.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Next.js 15 Frontend (React 18)                 │  │
│  │  - Server & Client Components                            │  │
│  │  - Tailwind CSS + Radix UI                               │  │
│  │  - React Context for Auth State                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Firebase Services                          │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   Firebase     │  │  Firestore   │  │  Firebase          │ │
│  │   Auth         │  │  Database    │  │  Storage           │ │
│  │  (Google OAuth)│  │  (NoSQL)     │  │  (Files)           │ │
│  └────────────────┘  └──────────────┘  └────────────────────┘ │
│                                                                 │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  DataConnect   │  │  Cloud       │  │  Hosting /         │ │
│  │  (GraphQL +    │  │  Functions   │  │  App Hosting       │ │
│  │  PostgreSQL)   │  │              │  │                    │ │
│  └────────────────┘  └──────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservices Layer                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │     Search Service (FastAPI + Python 3.11)               │  │
│  │  - BM25 Indexing & Search                                │  │
│  │  - Per-course document indices                           │  │
│  │  - RAG endpoint for LLM context                          │  │
│  │  - Deployed on Google Cloud Run                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        AI Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │     Google Genkit 1.20.0                                 │  │
│  │  - AI Flow Orchestration                                 │  │
│  │  - Google GenAI Plugin (Gemini 2.5 Flash)                │  │
│  │                                                           │  │
│  │  Flows:                                                   │  │
│  │  • socratic-course-chat.ts                               │  │
│  │  • personalized-learning-assessment.ts                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Application (Next.js)

**Technology**: Next.js 15, React 18, TypeScript

**Responsibilities**:
- Server-Side Rendering (SSR) and Static Site Generation (SSG)
- Client-side routing and navigation
- User interface rendering with Radix UI components
- Authentication state management via React Context
- API calls to backend services
- Real-time updates from Firestore

**Key Files**:
- `src/app/`: App Router pages and layouts
- `src/components/`: Reusable React components
- `src/lib/`: Utilities, Firebase initialization, type definitions
- `src/ai/`: Genkit AI flow definitions

**Communication**:
- **→ Firebase Auth**: User authentication via Firebase SDK
- **→ Firestore**: Direct reads/writes via Firebase SDK
- **→ DataConnect**: GraphQL queries via auto-generated SDK
- **→ Search Service**: HTTP REST API calls
- **→ Genkit Flows**: Server-side AI operations

### 2. Firebase Authentication

**Technology**: Firebase Authentication with Google OAuth provider

**Responsibilities**:
- User sign-in/sign-up with Google OAuth
- Session management and token generation
- User profile metadata (uid, email, displayName, photoURL)
- Custom token generation (test environment only)

**Security**:
- OAuth 2.0 flow with Google
- JWT tokens for authenticated requests
- Token verification on server-side via Firebase Admin SDK
- Role information stored separately in Firestore

**Integration Points**:
- Frontend: `src/lib/firebase.ts`, `src/lib/authService.ts`
- Auth Context: `src/components/AuthProviderClient.tsx`
- Test Route: `src/app/api/test-token/route.ts` (development only)

### 3. Firestore Database

**Technology**: Cloud Firestore (NoSQL Document Database)

**Responsibilities**:
- Store user profiles with role information
- Course metadata and configuration
- Student learning progress and history
- Teacher analytics data
- Real-time data synchronization

**Data Model**:
```
/users/{uid}
  - uid: string
  - email: string
  - displayName?: string
  - photoURL?: string
  - role: 'student' | 'teacher'
  - department: string
  - courses: string[]
  - profileComplete: boolean
  - authProviders: string[]
  - createdAt: timestamp
  - updatedAt: timestamp

/courses/{courseId}
  - courseId: string
  - title: string
  - description: string
  - teacherId: string
  - studentIds: string[]
  - materials: reference[]
  - createdAt: timestamp
```

**Security**:
- Security rules defined in `firestore.rules`
- Users can only read/write their own profile
- Teachers can read/write their courses
- Students can read courses they're enrolled in

### 4. Firebase DataConnect

**Technology**: Firebase DataConnect (GraphQL + Cloud SQL PostgreSQL)

**Responsibilities**:
- Strongly-typed data access layer
- Complex relational queries
- Auto-generated TypeScript SDK for type safety
- Structured course content storage

**Schema Location**: `dataconnect/schema/schema.gql`

**Connectors**: `dataconnect/example/`
- `connector.yaml`: SDK generation configuration
- `queries.gql`: GraphQL queries
- `mutations.gql`: GraphQL mutations

**Generated SDKs**:
- Client SDK: `src/dataconnect-generated/`
- Admin SDK: `src/dataconnect-admin-generated/`

**Example Schema** (from schema.gql):
- Users (keyed by Firebase Auth UID)
- Movies (example data model)
- Reviews (join table demonstrating relationships)

**Configuration**: `dataconnect/dataconnect.yaml`
- Service ID: `coursellm-service`
- Location: `us-central1`
- PostgreSQL backend via Cloud SQL

### 5. Search Service (Microservice)

**Technology**: FastAPI, Python 3.11, BM25 algorithm

**Responsibilities**:
- Index course documents and content chunks
- Perform lexical search using BM25 ranking
- Provide RAG (Retrieval Augmented Generation) endpoints
- Per-course index management
- Document CRUD operations

**API Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/courses/{course_id}/documents:batchCreate` | Create/update multiple document chunks |
| POST | `/v1/courses/{course_id}/documents:search` | Search documents using BM25 |
| POST | `/v1/courses/{course_id}/documents:ragSearch` | Search and return full content for RAG |
| PATCH | `/v1/courses/{course_id}/documents/{document_id}` | Update a single document |
| DELETE | `/v1/courses/{course_id}/documents/{document_id}` | Delete a document |
| GET | `/health` | Health check endpoint |
| GET | `/metrics` | Prometheus metrics |

**Architecture**:
- **In-memory indices**: Per-course BM25 indices stored in memory (not suitable for production scale)
- **Authentication**: Firebase token verification via `app/auth.py`
- **Authorization**: Role-based access control via `app/roles.py`
- **Monitoring**: Custom middleware for request tracking (`app/monitoring.py`)

**Key Components**:
- `app/main.py`: FastAPI application and route handlers
- `app/index.py`: BM25Index implementation
- `app/models.py`: Pydantic request/response models
- `app/auth.py`: Firebase authentication middleware
- `app/roles.py`: Role verification (teacher/student)

**Deployment**: Google Cloud Run

**Storage Limitation**: 
⚠️ Current implementation uses in-memory storage. For production, consider:
- Redis for distributed caching
- Cloud SQL for persistent storage
- Cloud Datastore for indexed documents

### 6. AI Layer (Google Genkit)

**Technology**: Google Genkit 1.20.0, Gemini 2.5 Flash

**Responsibilities**:
- AI flow orchestration
- Prompt management and versioning
- LLM interaction handling
- Context management for RAG
- Streaming responses

**Genkit Flows**:

#### Socratic Course Chat (`src/ai/flows/socratic-course-chat.ts`)
- Interactive Q&A with Socratic method
- Guides students through concepts with questions
- Uses course materials as context
- Maintains conversation history

#### Personalized Learning Assessment (`src/ai/flows/personalized-learning-assessment.ts`)
- Evaluates student understanding
- Generates personalized recommendations
- Adapts difficulty based on responses
- Provides learning path suggestions

**Configuration**: `src/ai/genkit.ts`
- Default model: `gemini-2.5-flash`
- Google GenAI plugin integration
- Flow registration and configuration

**Development UI**:
```bash
pnpm genkit:watch
```
Access at: http://localhost:4000

### 7. Firebase Cloud Functions

**Technology**: Firebase Cloud Functions (Node.js)

**Current Status**: Minimal implementation (placeholder)

**Location**: `functions/src/index.ts`

**Potential Use Cases**:
- Background data processing
- Scheduled tasks (cleanup, analytics aggregation)
- Webhook handlers
- Email/notification triggers
- User profile management automation

**Configuration**: `firebase.json`
- Max instances: 10 (cost control)
- Region: us-central1

### 8. Firebase Storage

**Technology**: Cloud Storage for Firebase

**Responsibilities**:
- Store course materials (PDFs, PPTs, documents)
- Store user-uploaded files
- Serve static assets

**Security**: 
- Rules defined in `storage.rules`
- Authentication required for uploads
- Public read for approved content

## Authentication Flow

### First-Time User Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth popup/redirect
   ↓
3. Firebase Auth creates user account
   ↓
4. Frontend detects new user (no Firestore profile)
   ↓
5. Redirect to /onboarding
   ↓
6. User fills: role, department, courses
   ↓
7. Write profile to Firestore users/{uid}
   ↓
8. Redirect to /{role}/dashboard
```

### Returning User Flow

```
1. User clicks "Sign in with Google"
   ↓
2. Google OAuth authentication
   ↓
3. Firebase Auth session established
   ↓
4. Frontend loads profile from Firestore
   ↓
5. Redirect to /{role}/dashboard based on profile.role
```

### Authentication Components

**Client Side**:
- `src/lib/firebase.ts`: Firebase SDK initialization
- `src/lib/authService.ts`: Auth helper functions
  - `signInWithGoogle()`: OAuth sign-in with popup/redirect fallback
  - `signOutUser()`: Sign out and clear session
  - `handleAuthError()`: Error handling

**React Context**:
- `src/components/AuthProviderClient.tsx`: Global auth state
  - Listens to `onAuthStateChanged`
  - Loads user profile from Firestore
  - Exposes `useAuth()` hook
  - Provides `onboardingRequired` flag

**Route Guards**:
- `src/components/RoleGuardClient.tsx`: Protects routes by role
  - Redirects unauthenticated users to `/login`
  - Redirects incomplete profiles to `/onboarding`
  - Enforces role-based access (student/teacher)

**Server Side**:
- Firebase Admin SDK for token verification
- Custom token generation for testing: `src/app/api/test-token/route.ts`
  - ⚠️ Only enabled when `ENABLE_TEST_AUTH=true`
  - Never use in production

## Search Integration

### Document Indexing Flow

```
1. Teacher uploads course material (frontend)
   ↓
2. Frontend parses document into chunks
   ↓
3. POST /v1/courses/{course_id}/documents:batchCreate
   ↓
4. Search Service creates BM25 index entries
   ↓
5. Documents ready for search
```

### Search Query Flow

```
1. User enters search query (frontend)
   ↓
2. POST /v1/courses/{course_id}/documents:search
   {
     "query": "user query",
     "page_size": 10,
     "mode": "lexical"
   }
   ↓
3. BM25 ranking algorithm scores documents
   ↓
4. Returns top-k results with scores
   ↓
5. Frontend displays search results
```

### RAG (Retrieval Augmented Generation) Flow

```
1. User asks question in AI chat
   ↓
2. POST /v1/courses/{course_id}/documents:ragSearch
   ↓
3. Search Service returns relevant document chunks
   ↓
4. Frontend sends chunks + question to Genkit flow
   ↓
5. AI generates answer using retrieved context
   ↓
6. Stream response back to user
```

**Integration Points**:
- Frontend: `src/lib/ragClient.ts` - HTTP client for search service
- Search Service: `app/main.py` - API endpoints
- AI Flows: Use RAG results as context for LLM

## Data Flow Examples

### Student Learning Session

```
┌─────────┐
│ Student │
└────┬────┘
     │ 1. Open course
     ▼
┌─────────────────┐
│ Next.js Frontend│
└────┬────────────┘
     │ 2. Fetch course data
     ▼
┌──────────────┐
│  Firestore   │
└────┬─────────┘
     │ 3. Course materials list
     ▼
┌─────────────────┐
│ Next.js Frontend│
└────┬────────────┘
     │ 4. Ask question in chat
     ▼
┌─────────────────┐
│ Search Service  │ 5. Find relevant chunks
└────┬────────────┘
     │ 6. Top-k documents
     ▼
┌─────────────────┐
│ Genkit AI Flow  │ 7. Generate Socratic response
└────┬────────────┘
     │ 8. Stream answer
     ▼
┌─────────────────┐
│ Next.js Frontend│
└────┬────────────┘
     │ 9. Display in chat
     ▼
┌─────────┐
│ Student │
└─────────┘
```

### Teacher Dashboard Update

```
┌─────────┐
│ Teacher │
└────┬────┘
     │ 1. View analytics
     ▼
┌─────────────────┐
│ Next.js Frontend│
└────┬────────────┘
     │ 2. Query student data
     ▼
┌──────────────┐
│ DataConnect  │ 3. Complex SQL query
│ (PostgreSQL) │
└────┬─────────┘
     │ 4. Aggregated results
     ▼
┌─────────────────┐
│ Next.js Frontend│
└────┬────────────┘
     │ 5. Render charts
     ▼
┌─────────┐
│ Teacher │
└─────────┘
```

## Security Architecture

### Authentication Layers

1. **Client-Side Auth**:
   - Firebase Auth SDK manages sessions
   - JWT tokens stored in browser
   - Auto-refresh tokens before expiry

2. **Server-Side Verification**:
   - Search Service verifies Firebase tokens
   - Admin SDK validates token signatures
   - Extracts user claims (uid, email)

3. **Authorization**:
   - Role stored in Firestore user profile
   - Middleware checks role for protected endpoints
   - Teacher-only: document creation/deletion
   - Student+Teacher: search/read operations

### Data Security

**Firestore Security Rules** (`firestore.rules`):
```javascript
// Users can only read/write their own profile
match /users/{userId} {
  allow read, write: if request.auth != null 
    && request.auth.uid == userId;
}

// Course access based on enrollment
match /courses/{courseId} {
  allow read: if request.auth != null 
    && isEnrolledOrTeacher(courseId);
  allow write: if request.auth != null 
    && isTeacher(courseId);
}
```

**Search Service Authorization** (`app/roles.py`):
```python
def is_teacher(current_user: dict):
    """Verify user has teacher role"""
    role = get_user_role(current_user['uid'])
    if role != 'teacher':
        raise HTTPException(403, "Teacher role required")
```

### Environment Security

**Development**:
- Test auth bypass flag: `TEST_AUTH_BYPASS=1`
- Never enable in production
- Service account JSON excluded from git

**Production**:
- Environment variables via Firebase/Cloud Run config
- Service account roles with minimum permissions
- HTTPS only for all communications
- CORS configuration for allowed origins

## Scalability Considerations

### Current Architecture Limitations

1. **Search Service In-Memory Storage**:
   - Problem: Indices lost on restart
   - Impact: Limited to single instance
   - Solution: Add Redis or persistent database

2. **Firestore Direct Access**:
   - Problem: High read costs for complex queries
   - Impact: Expensive for analytics
   - Solution: Use DataConnect for aggregations

3. **Cloud Functions Minimal Use**:
   - Problem: Background tasks run in frontend
   - Impact: Slow UX, blocks user interactions
   - Solution: Offload to Cloud Functions

### Scaling Strategy

**Horizontal Scaling**:
- Next.js: Serverless deployment (Firebase App Hosting)
- Search Service: Cloud Run auto-scales instances
- Cloud Functions: Automatic concurrency scaling
- Firestore: Automatically scales with load

**Vertical Scaling**:
- Cloud Run: Increase CPU/memory per instance
- PostgreSQL: Larger Cloud SQL instance
- Firebase quotas: Upgrade pricing plan

**Caching Strategy**:
- Frontend: React Query / SWR for client-side caching
- Search Service: Add Redis for frequently accessed indices
- DataConnect: Built-in PostgreSQL query caching
- CDN: Firebase Hosting CDN for static assets

## Monitoring & Observability

### Current Implementation

**Search Service Monitoring** (`app/monitoring.py`):
- Request count per endpoint
- Average response time
- Active index statistics
- Exposed via `/metrics` endpoint (Prometheus format)

**Health Checks**:
- `/health`: Service health status
- `/health/ready`: Readiness probe
- `/health/live`: Liveness probe

### Recommended Additions

1. **Application Performance Monitoring (APM)**:
   - Google Cloud Trace
   - Firebase Performance Monitoring
   - Error tracking with Sentry

2. **Logging**:
   - Structured logging (JSON format)
   - Google Cloud Logging integration
   - Log levels: DEBUG, INFO, WARN, ERROR

3. **Metrics**:
   - User session duration
   - AI flow execution time
   - Search query latency percentiles
   - Firestore read/write volume

4. **Alerts**:
   - High error rate (>5%)
   - Slow response time (>2s p95)
   - Service downtime
   - High costs

## Testing Architecture

### E2E Tests (Playwright)

**Location**: `tests/auth.spec.ts`

**Coverage**:
- Authentication flows (login, logout)
- Onboarding process
- Role-based redirects
- Dashboard access

**Test Environment**:
- Uses custom token authentication
- Test-only API route: `/api/test-token`
- Admin SDK writes profiles directly

**Running Tests**:
```bash
# Set test auth environment
$env:ENABLE_TEST_AUTH = "true"
$env:FIREBASE_SERVICE_ACCOUNT_PATH = ".\secrets\firebase-admin.json"

# Run tests
pnpm test:e2e
```

### Unit Tests (Python)

**Location**: `search-service/tests/`

**Structure**:
- `tests/Unit/`: Pure logic tests (BM25, chunking)
- `tests/api/`: API contract tests (FastAPI TestClient)
- `tests/search_service.e2e.spec.ts`: Full HTTP E2E tests

**Coverage**:
- BM25 index operations
- Search ranking accuracy
- API request/response validation
- Authentication middleware

**Running Tests**:
```bash
cd search-service

# Unit tests
pytest

# With coverage
pytest --cov=app --cov-report=term-missing

# E2E (requires running server)
TEST_AUTH_BYPASS=1 uvicorn app.main:app --host 127.0.0.1 --port 8080 &
SEARCH_SERVICE_BASE_URL=http://127.0.0.1:8080 npx playwright test search-service/tests/search_service.e2e.spec.ts
```

## Deployment Architecture

### Development Environment

```
┌──────────────────────────────────────┐
│     Local Development Machine        │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Next.js Dev Server (port 9002)│ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Firebase Emulators            │ │
│  │  - Auth: 9099                  │ │
│  │  - Firestore: 8080             │ │
│  │  - DataConnect: 9399           │ │
│  │  - Storage: 9199               │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Search Service (port 8080)    │ │
│  │  uvicorn + TEST_AUTH_BYPASS    │ │
│  └────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Production Environment

```
┌────────────────────────────────────────────────┐
│            Google Cloud / Firebase             │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Firebase Hosting / App Hosting          │ │
│  │  (Next.js SSR)                           │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Firebase Services                       │ │
│  │  - Authentication                        │ │
│  │  - Firestore                             │ │
│  │  - Storage                               │ │
│  │  - Cloud Functions                       │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  DataConnect                             │ │
│  │  - Cloud SQL (PostgreSQL)                │ │
│  │  - GraphQL API                           │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Cloud Run                               │ │
│  │  - Search Service (FastAPI)              │ │
│  │  - Auto-scaling                          │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

## Future Enhancements

### Short-Term Improvements

1. **Persistent Search Index**:
   - Migrate from in-memory to Redis/Cloud SQL
   - Add index snapshots for faster recovery
   - Implement distributed caching

2. **Enhanced Monitoring**:
   - Add Firebase Performance Monitoring
   - Integrate Google Cloud Trace
   - Set up alerting for critical metrics

3. **Cloud Functions Expansion**:
   - Background document processing
   - Scheduled analytics aggregation
   - Email notifications for teachers

### Long-Term Roadmap

1. **Vector Search Integration**:
   - Add semantic search alongside BM25
   - Hybrid search combining lexical + semantic
   - Embedding generation pipeline

2. **Real-Time Collaboration**:
   - WebSocket connections for live chat
   - Collaborative document editing
   - Real-time dashboard updates

3. **Advanced Analytics**:
   - Learning trajectory visualization
   - Predictive student performance models
   - Automated intervention recommendations

4. **Multi-Tenancy**:
   - Support multiple institutions
   - Tenant isolation at data layer
   - Custom branding per institution

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Genkit Documentation](https://firebase.google.com/docs/genkit)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Firebase DataConnect Guide](https://firebase.google.com/docs/data-connect)

---

**Last Updated**: 2026-01-15  
**Version**: 1.0  
**Maintainer**: CourseLLM Development Team
