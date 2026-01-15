# API Documentation

## Overview

CourseLLM provides multiple API layers for different purposes:

1. **Search Service API** - FastAPI-based REST API for document search and indexing
2. **Next.js API Routes** - Server-side endpoints for authentication and data operations
3. **Firebase DataConnect API** - GraphQL API for structured data queries
4. **Genkit AI Flows** - AI-powered learning flows

This document provides comprehensive documentation for all API endpoints, request/response formats, authentication requirements, and usage examples.

---

## Table of Contents

- [Authentication](#authentication)
- [Search Service API](#search-service-api)
- [Next.js API Routes](#nextjs-api-routes)
- [Firebase DataConnect API](#firebase-dataconnect-api)
- [Genkit AI Flows](#genkit-ai-flows)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Overview

CourseLLM uses Firebase Authentication with JWT tokens for securing API endpoints.

### Authentication Flow

1. **Client obtains Firebase ID token**:
   ```javascript
   import { auth } from '@/lib/firebase';
   const token = await auth.currentUser?.getIdToken();
   ```

2. **Include token in API requests**:
   ```javascript
   fetch('/api/endpoint', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   })
   ```

3. **Server verifies token**:
   - Search Service: Firebase Admin SDK verifies token
   - Next.js Routes: Firebase Admin SDK or middleware
   - DataConnect: Built-in Firebase auth integration

### Token Format

```
Authorization: Bearer <firebase-id-token>
```

### Token Claims

```json
{
  "aud": "project-id",
  "auth_time": 1234567890,
  "email": "user@example.com",
  "email_verified": true,
  "exp": 1234571490,
  "firebase": {
    "identities": {
      "google.com": ["123456789"]
    },
    "sign_in_provider": "google.com"
  },
  "iat": 1234567890,
  "iss": "https://securetoken.google.com/project-id",
  "sub": "user-uid",
  "uid": "user-uid"
}
```

### Role-Based Authorization

User roles are stored in Firestore `/users/{uid}` documents:

```typescript
interface UserProfile {
  uid: string;
  role: 'student' | 'teacher';
  // ... other fields
}
```

**Permission Matrix**:

| Endpoint | Student | Teacher |
|----------|---------|---------|
| Search documents | ✅ | ✅ |
| Create/index documents | ❌ | ✅ |
| Update documents | ❌ | ✅ |
| Delete documents | ❌ | ✅ |
| View own dashboard | ✅ | ✅ |
| View student analytics | ❌ | ✅ |

---

## Search Service API

**Base URL**: `http://127.0.0.1:8080` (development) or `https://search-service-XXXXX.run.app` (production)

**Version**: v1

**Protocol**: REST over HTTP/HTTPS

**Content-Type**: `application/json`

### Endpoints Overview

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/v1/courses/{course_id}/documents:batchCreate` | Required | Teacher | Batch create/update documents |
| POST | `/v1/courses/{course_id}/documents:search` | Required | All | Search documents |
| POST | `/v1/courses/{course_id}/documents:ragSearch` | Required | All | RAG-optimized search |
| PATCH | `/v1/courses/{course_id}/documents/{document_id}` | Required | Teacher | Update single document |
| DELETE | `/v1/courses/{course_id}/documents/{document_id}` | Required | Teacher | Delete document |
| GET | `/health` | None | All | Health check |
| GET | `/metrics` | None | All | Prometheus metrics |

---

### POST /v1/courses/{course_id}/documents:batchCreate

Create or update multiple document chunks for a course.

**Authorization**: Teacher role required

**Path Parameters**:
- `course_id` (string, required): Unique course identifier

**Request Body**:

```json
{
  "documents": [
    {
      "id": "doc-uuid-1",           // Optional, auto-generated if not provided
      "course_id": "cs101",          // Set automatically from path parameter
      "source": "lecture-1.pdf",     // Optional, source file name
      "chunk_index": 0,              // Optional, chunk order in source
      "title": "Introduction",       // Optional, chunk title
      "headings": ["Chapter 1", "Section 1.1"],  // Optional, document structure
      "content": "The quick brown fox...",        // Required, searchable text
      "metadata": {                  // Optional, arbitrary key-value pairs
        "page": 1,
        "author": "Prof. Smith"
      }
    }
  ]
}
```

**Request Model (TypeScript)**:

```typescript
interface BatchCreateRequest {
  documents: DocumentChunk[];
}

interface DocumentChunk {
  id?: string;                    // Auto-generated UUID if not provided
  course_id: string;              // Set from path parameter
  source?: string;
  chunk_index?: number;
  title?: string;
  headings?: string[];
  content: string;                // Required
  metadata?: Record<string, any>;
  created_at?: string;            // ISO 8601, auto-generated
  updated_at?: string;            // ISO 8601, auto-generated
}
```

**Response** (200 OK):

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "course_id": "cs101",
      "source": "lecture-1.pdf",
      "chunk_index": 0,
      "title": "Introduction",
      "headings": ["Chapter 1", "Section 1.1"],
      "content": "The quick brown fox...",
      "metadata": {
        "page": 1,
        "author": "Prof. Smith"
      },
      "created_at": "2026-01-15T10:30:00.000Z",
      "updated_at": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not have teacher role
- `422 Unprocessable Entity`: Invalid request body

**Example (JavaScript)**:

```javascript
const response = await fetch('http://127.0.0.1:8080/v1/courses/cs101/documents:batchCreate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    documents: [
      {
        source: 'lecture-1.pdf',
        chunk_index: 0,
        title: 'Introduction to Computer Science',
        content: 'Computer science is the study of computation...'
      }
    ]
  })
});

const data = await response.json();
console.log(data.documents);
```

---

### POST /v1/courses/{course_id}/documents:search

Search documents using BM25 lexical search.

**Authorization**: Required (Student or Teacher)

**Path Parameters**:
- `course_id` (string, required): Course identifier to search within

**Request Body**:

```json
{
  "query": "machine learning algorithms",
  "page_size": 10,
  "mode": "lexical"
}
```

**Request Model**:

```typescript
interface SearchRequest {
  query: string;                  // Required, search query text
  page_size?: number;             // Optional, default: 10, max results to return
  mode?: "lexical" | "vector" | "hybrid";  // Optional, default: "lexical"
}
```

**Response** (200 OK):

```json
{
  "query": "machine learning algorithms",
  "mode": "lexical",
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "score": 8.453,
      "course_id": "cs101",
      "source": "lecture-5.pdf",
      "chunk_index": 2,
      "title": "Introduction to ML",
      "snippet": "Machine learning algorithms can be categorized into supervised...",
      "metadata": {
        "page": 12,
        "section": "5.2"
      }
    }
  ],
  "next_page_token": null
}
```

**Response Model**:

```typescript
interface SearchResponse {
  query: string;
  mode: "lexical" | "vector" | "hybrid";
  results: SearchResult[];
  next_page_token?: string | null;
}

interface SearchResult {
  id: string;
  score: number;                  // BM25 relevance score
  course_id: string;
  source?: string;
  chunk_index?: number;
  title?: string;
  snippet: string;                // First 200 characters of content
  metadata: Record<string, any>;
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Course not found or no documents indexed
- `422 Unprocessable Entity`: Invalid search parameters

**Example (JavaScript)**:

```javascript
const response = await fetch('http://127.0.0.1:8080/v1/courses/cs101/documents:search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'binary search tree',
    page_size: 5,
    mode: 'lexical'
  })
});

const data = await response.json();
data.results.forEach(result => {
  console.log(`${result.title}: ${result.snippet} (score: ${result.score})`);
});
```

---

### POST /v1/courses/{course_id}/documents:ragSearch

RAG-optimized search endpoint that returns full document content instead of snippets.

**Authorization**: Required (Student or Teacher)

**Path Parameters**:
- `course_id` (string, required): Course identifier

**Request Body**: Same as `/documents:search`

```json
{
  "query": "explain neural networks",
  "page_size": 5,
  "mode": "lexical"
}
```

**Response** (200 OK):

```json
{
  "query": "explain neural networks",
  "mode": "lexical",
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "score": 12.34,
      "course_id": "cs101",
      "source": "lecture-8.pdf",
      "chunk_index": 5,
      "title": "Neural Networks Basics",
      "content": "Neural networks are computing systems inspired by biological neural networks... [FULL CONTENT HERE]",
      "metadata": {
        "page": 45,
        "section": "8.3"
      }
    }
  ]
}
```

**Response Model**:

```typescript
interface RagSearchResponse {
  query: string;
  mode: string;
  results: RagSearchResult[];
}

interface RagSearchResult {
  id: string;
  score: number;
  course_id: string;
  source?: string;
  chunk_index?: number;
  title?: string;
  content: string;                // Full document content (not truncated)
  metadata?: Record<string, any>;
}
```

**Use Case**:

This endpoint is designed for Retrieval Augmented Generation (RAG). The full content is returned so it can be used as context for LLM prompts.

**Example (JavaScript)**:

```javascript
// 1. Search for relevant documents
const searchResponse = await fetch(
  'http://127.0.0.1:8080/v1/courses/cs101/documents:ragSearch',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'What is a linked list?',
      page_size: 3,
      mode: 'lexical'
    })
  }
);

const { results } = await searchResponse.json();

// 2. Build context for AI
const context = results.map(r => r.content).join('\n\n---\n\n');

// 3. Send to AI with context
const aiResponse = await callAI({
  prompt: `Context:\n${context}\n\nQuestion: What is a linked list?`
});
```

---

### PATCH /v1/courses/{course_id}/documents/{document_id}

Update a single document chunk.

**Authorization**: Teacher role required

**Path Parameters**:
- `course_id` (string, required): Course identifier
- `document_id` (string, required): Document UUID

**Request Body**:

All fields are optional. Only provided fields will be updated.

```json
{
  "source": "updated-lecture-1.pdf",
  "chunk_index": 1,
  "title": "Updated Title",
  "headings": ["New Chapter", "New Section"],
  "content": "Updated content...",
  "metadata": {
    "version": 2
  }
}
```

**Request Model**:

```typescript
interface UpdateDocumentChunk {
  source?: string;
  chunk_index?: number;
  title?: string;
  headings?: string[];
  content?: string;
  metadata?: Record<string, any>;
}
```

**Response** (200 OK):

Returns the full updated document:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "course_id": "cs101",
  "source": "updated-lecture-1.pdf",
  "chunk_index": 1,
  "title": "Updated Title",
  "headings": ["New Chapter", "New Section"],
  "content": "Updated content...",
  "metadata": {
    "version": 2
  },
  "created_at": "2026-01-15T10:30:00.000Z",
  "updated_at": "2026-01-15T11:45:00.000Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not a teacher
- `404 Not Found`: Document ID does not exist
- `422 Unprocessable Entity`: Invalid update payload

**Example (JavaScript)**:

```javascript
const response = await fetch(
  'http://127.0.0.1:8080/v1/courses/cs101/documents/550e8400-e29b-41d4-a716-446655440000',
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'This is the corrected content.',
      metadata: { corrected: true }
    })
  }
);

const updatedDoc = await response.json();
```

---

### DELETE /v1/courses/{course_id}/documents/{document_id}

Delete a document chunk from the index.

**Authorization**: Teacher role required

**Path Parameters**:
- `course_id` (string, required): Course identifier
- `document_id` (string, required): Document UUID

**Request Body**: None

**Response** (204 No Content):

Empty response body on success.

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User is not a teacher
- `404 Not Found`: Document ID does not exist

**Example (JavaScript)**:

```javascript
const response = await fetch(
  'http://127.0.0.1:8080/v1/courses/cs101/documents/550e8400-e29b-41d4-a716-446655440000',
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${firebaseToken}`
    }
  }
);

if (response.status === 204) {
  console.log('Document deleted successfully');
}
```

---

### GET /health

Health check endpoint for service monitoring.

**Authorization**: None

**Response** (200 OK):

```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T12:00:00.000Z",
  "indices": {
    "cs101": {
      "document_count": 150,
      "last_updated": "2026-01-15T11:30:00.000Z"
    },
    "cs202": {
      "document_count": 89,
      "last_updated": "2026-01-14T16:20:00.000Z"
    }
  }
}
```

**Use Case**: Kubernetes liveness/readiness probes, uptime monitoring

---

### GET /metrics

Prometheus-compatible metrics endpoint.

**Authorization**: None

**Response** (200 OK):

```
# HELP search_requests_total Total number of search requests
# TYPE search_requests_total counter
search_requests_total{endpoint="/v1/courses/{course_id}/documents:search"} 1543

# HELP search_request_duration_seconds Search request duration
# TYPE search_request_duration_seconds histogram
search_request_duration_seconds_bucket{le="0.1"} 1200
search_request_duration_seconds_bucket{le="0.5"} 1500
search_request_duration_seconds_bucket{le="1.0"} 1540
search_request_duration_seconds_sum 450.2
search_request_duration_seconds_count 1543

# HELP active_indices Number of active course indices
# TYPE active_indices gauge
active_indices 12
```

**Use Case**: Prometheus scraping, Grafana dashboards

---

## Next.js API Routes

**Base URL**: `http://localhost:9002/api` (development) or `https://your-domain.com/api` (production)

### POST /api/test-token

**⚠️ DEVELOPMENT ONLY**: Generate Firebase custom tokens for testing.

**Authorization**: None (but requires `ENABLE_TEST_AUTH=true` environment variable)

**Query Parameters**:
- `uid` (string, required): User ID for the custom token
- `role` (string, optional): Role to assign ('student' or 'teacher')
- `createProfile` (boolean, optional): Whether to create Firestore profile

**Response** (200 OK):

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "uid": "test-user-123",
  "profileCreated": true
}
```

**Error Responses**:
- `403 Forbidden`: Test auth not enabled
- `500 Internal Server Error`: Failed to generate token

**Example (JavaScript)**:

```javascript
// Only works when ENABLE_TEST_AUTH=true
const response = await fetch('/api/test-token?uid=test-student&role=student&createProfile=true');
const { token } = await response.json();

// Use token to sign in
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

await signInWithCustomToken(auth, token);
```

**Security Warning**:

This endpoint MUST NOT be enabled in production. It allows arbitrary user impersonation and bypasses OAuth.

---

## Firebase DataConnect API

**Base URL**: Auto-configured by Firebase SDK

**Protocol**: GraphQL over HTTP

**Authentication**: Firebase Auth tokens automatically included

### Schema Overview

DataConnect provides a strongly-typed GraphQL layer over Cloud SQL (PostgreSQL). The schema is defined in `dataconnect/schema/schema.gql`.

### Example Schema (Movies App)

```graphql
type User @table {
  id: String! @default(expr: "auth.uid")
  username: String! @col(dataType: "varchar(50)")
}

type Movie @table {
  title: String!
  imageUrl: String!
  genre: String
}

type MovieMetadata @table {
  movie: Movie! @unique
  rating: Float
  releaseYear: Int
  description: String
}

type Review @table(name: "Reviews", key: ["movie", "user"]) {
  user: User!
  movie: Movie!
  rating: Int
  reviewText: String
  reviewDate: Date! @default(expr: "request.time")
}
```

### Generated SDK Usage

#### TypeScript Client SDK

```typescript
import { listMovies, getMovieById } from '@dataconnect/generated';

// List all movies
const { data } = await listMovies();
console.log(data.movies);

// Get movie by ID
const { data } = await getMovieById({ id: 'movie-uuid' });
console.log(data.movie);
```

#### React Integration

```typescript
import { useListMoviesQuery } from '@dataconnect/generated';

function MovieList() {
  const { data, loading, error } = useListMoviesQuery();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data.movies.map(movie => (
        <div key={movie.id}>{movie.title}</div>
      ))}
    </div>
  );
}
```

### Authentication Levels

DataConnect supports fine-grained auth controls:

- `PUBLIC`: No authentication required
- `USER`: Any authenticated user
- `USER_EMAIL_VERIFIED`: Email verification required
- `NO_ACCESS`: Completely blocked (admin only)

**Example Query with Auth**:

```graphql
query ListUserReviews @auth(level: USER) {
  user(key: { id_expr: "auth.uid" }) {
    id
    username
    reviews: reviews_on_user {
      rating
      reviewText
      movie {
        title
      }
    }
  }
}
```

### Mutations

```graphql
mutation CreateMovie($title: String!, $genre: String!, $imageUrl: String!)
@auth(level: USER_EMAIL_VERIFIED) {
  movie_insert(data: { title: $title, genre: $genre, imageUrl: $imageUrl })
}

mutation AddReview($movieId: UUID!, $rating: Int!, $reviewText: String!)
@auth(level: USER) {
  review_upsert(
    data: {
      userId_expr: "auth.uid"
      movieId: $movieId
      rating: $rating
      reviewText: $reviewText
    }
  )
}
```

### Configuration

**Connector Configuration** (`dataconnect/example/connector.yaml`):

```yaml
connectorId: example
generate:
  adminNodeSdk:
    - outputDir: ../../src/dataconnect-admin-generated
      package: "@dataconnect/admin-generated"
  javascriptSdk:
    - outputDir: ../../src/dataconnect-generated
      package: "@dataconnect/generated"
      react: true
```

**Service Configuration** (`dataconnect/dataconnect.yaml`):

```yaml
specVersion: "v1"
serviceId: "coursellm-service"
location: "us-central1"
schema:
  source: "./schema"
  datasource:
    postgresql:
      database: "fdcdb"
      cloudSql:
        instanceId: "coursellm-service-fdc"
```

---

## Genkit AI Flows

**Location**: `src/ai/flows/`

**Protocol**: Server-side function calls (not direct HTTP API)

### Socratic Course Chat

**File**: `src/ai/flows/socratic-course-chat.ts`

**Purpose**: AI-powered tutoring using Socratic questioning method

**Input**:

```typescript
interface SocraticChatInput {
  userMessage: string;
  courseId: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**Output**:

```typescript
interface SocraticChatOutput {
  response: string;
  followUpQuestions?: string[];
  suggestedTopics?: string[];
}
```

**Usage** (Server Component):

```typescript
import { socraticCourseChat } from '@/ai/flows/socratic-course-chat';

const result = await socraticCourseChat({
  userMessage: 'What is recursion?',
  courseId: 'cs101',
  conversationHistory: previousMessages
});

console.log(result.response);
```

### Personalized Learning Assessment

**File**: `src/ai/flows/personalized-learning-assessment.ts`

**Purpose**: Evaluate student understanding and provide recommendations

**Input**:

```typescript
interface AssessmentInput {
  studentId: string;
  courseId: string;
  topic: string;
  studentAnswers?: Array<{
    question: string;
    answer: string;
  }>;
}
```

**Output**:

```typescript
interface AssessmentOutput {
  overallScore: number;           // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextTopics: string[];
}
```

**Usage**:

```typescript
import { personalizedLearningAssessment } from '@/ai/flows/personalized-learning-assessment';

const assessment = await personalizedLearningAssessment({
  studentId: 'user-uid',
  courseId: 'cs101',
  topic: 'Data Structures',
  studentAnswers: [
    { question: 'Explain a linked list', answer: 'A linked list is...' }
  ]
});

console.log(`Score: ${assessment.overallScore}%`);
console.log('Recommendations:', assessment.recommendations);
```

---

## Error Handling

### Standard Error Response Format

All APIs return errors in a consistent format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request body is malformed",
    "details": {
      "field": "documents",
      "reason": "Required field missing"
    }
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success with no response body |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily down |

### Common Error Scenarios

#### Authentication Errors

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "No valid authentication token provided"
  }
}
```

**Solution**: Include valid Firebase ID token in `Authorization` header

#### Authorization Errors

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "User does not have teacher role required for this operation"
  }
}
```

**Solution**: Ensure user has correct role in Firestore profile

#### Validation Errors

```json
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Invalid search mode",
    "details": {
      "field": "mode",
      "allowed_values": ["lexical", "vector", "hybrid"]
    }
  }
}
```

**Solution**: Check request body matches schema requirements

---

## Rate Limiting

### Current Implementation

Rate limiting is not currently enforced but is recommended for production.

### Recommended Limits (Production)

| Endpoint Type | Rate Limit | Window |
|---------------|------------|--------|
| Search operations | 100 requests | 1 minute |
| Document creation | 10 requests | 1 minute |
| Document updates | 50 requests | 1 minute |
| AI flows | 20 requests | 1 minute |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705324800
Retry-After: 60
```

---

## Best Practices

### 1. Authentication

- Always include Firebase ID token in requests
- Refresh tokens before they expire (< 1 hour lifetime)
- Handle 401 errors by re-authenticating

### 2. Error Handling

```typescript
async function searchDocuments(courseId: string, query: string) {
  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`/v1/courses/${courseId}/documents:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, page_size: 10, mode: 'lexical' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    return await response.json();
  } catch (error) {
    console.error('Search failed:', error);
    // Handle error appropriately
    throw error;
  }
}
```

### 3. Pagination

Currently, pagination is not fully implemented. For large result sets:

- Use `page_size` parameter to limit results
- Plan for `next_page_token` support in future versions

### 4. Batch Operations

- Use `batchCreate` instead of multiple individual creates
- Batch size recommendation: 10-50 documents per request
- Split very large batches to avoid timeouts

### 5. Caching

- Cache search results on client side when appropriate
- Use `react-query` or `swr` for automatic caching
- Invalidate cache after document updates

---

## SDK Examples

### TypeScript/JavaScript Client

```typescript
class SearchServiceClient {
  constructor(
    private baseUrl: string,
    private getToken: () => Promise<string>
  ) {}

  async search(courseId: string, query: string, pageSize = 10) {
    const token = await this.getToken();
    const response = await fetch(
      `${this.baseUrl}/v1/courses/${courseId}/documents:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, page_size: pageSize, mode: 'lexical' })
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async ragSearch(courseId: string, query: string, pageSize = 5) {
    const token = await this.getToken();
    const response = await fetch(
      `${this.baseUrl}/v1/courses/${courseId}/documents:ragSearch`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, page_size: pageSize, mode: 'lexical' })
      }
    );

    if (!response.ok) {
      throw new Error(`RAG search failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Usage
import { auth } from '@/lib/firebase';

const client = new SearchServiceClient(
  'http://127.0.0.1:8080',
  async () => (await auth.currentUser?.getIdToken()) || ''
);

const results = await client.search('cs101', 'binary tree');
```

### Python Client

```python
import requests
from typing import List, Dict, Any

class SearchServiceClient:
    def __init__(self, base_url: str, token_provider):
        self.base_url = base_url
        self.token_provider = token_provider

    def search(self, course_id: str, query: str, page_size: int = 10) -> Dict[str, Any]:
        token = self.token_provider()
        response = requests.post(
            f"{self.base_url}/v1/courses/{course_id}/documents:search",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={
                "query": query,
                "page_size": page_size,
                "mode": "lexical"
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = SearchServiceClient(
    "http://127.0.0.1:8080",
    lambda: get_firebase_token()
)

results = client.search("cs101", "algorithm complexity")
```

---

## Changelog

### Version 1.0.0 (2026-01-15)

- Initial API documentation
- Search Service API v1
- Next.js test token route (development only)
- Firebase DataConnect schema examples
- Genkit AI flows documentation

---

## Support

For API issues or questions:

1. Check [Architecture Documentation](./Architecture.md)
2. Review [Search Service README](../search-service/README.md)
3. Consult [OpenSpec specifications](../openspec/)

---

**Last Updated**: 2026-01-15  
**API Version**: 1.0.0  
**Maintainer**: CourseLLM Development Team
