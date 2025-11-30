# Product Requirements Document (PRD): CourseLLM Platform

## 1. Overview and Objectives

**Vision:** To empower students and educators by providing a fast, relevant, and intelligent learning platform powered by modern AI and search technologies.

**Objective:** To design, build, and deploy a set of microservices that provide course content search, AI-powered chat, and personalized learning experiences. These services will be integrated into a cohesive learning platform.

## 2. Target Audience & Problem Statement

**Target Audience:**
- **Students:** Need to quickly find information, get answers to questions, and receive personalized guidance within their course materials.
- **Teachers/Educators:** Need to easily manage course content, monitor student progress, and create engaging learning experiences.

**Problem Statement:** Traditional learning platforms lack intelligent search and personalized feedback, making it difficult for users to find specific information and stay engaged. This leads to wasted time and a frustrating user experience.

## 3. System Components & Architecture

CourseLLM is designed as a microservices-based architecture. All services are deployed as independent components and communicate via REST APIs. The system is designed to be scalable, resilient, and maintainable.

### Frontend Application

A Next.js-based web application that provides the user interface for students and teachers.

### API Gateway

A central entry point for all client requests. It routes traffic to the appropriate backend microservice and can handle cross-cutting concerns like authentication and rate limiting.

### Backend Microservices

#### Content Search Service (Search Microservice)

- **Responsibility / Scope:**
    - Maintains a full-text index of all course content (document chunks) on a per-`course_id` basis using a BM25-based algorithm.
    - Exposes a REST API for indexing, updating, and searching course material.
    - Does NOT handle file uploads, user management, or LLM-driven chat, which are delegated to other services.

- **API (Current Implementation):**
    - `POST /v1/courses/{course_id}/documents:batchCreate`
        - **Input:** `BatchCreateRequest` (a list of document chunks).
        - **Output:** `BatchCreateResponse` (the list of created document chunks with their new IDs).
        - **Description:** Creates or updates a batch of document chunks for a specified course.

    - `POST /v1/courses/{course_id}/documents:search`
        - **Input:** `SearchRequest` containing a `query` (string), `page_size` (integer), and `mode` (e.g., `"lexical"`).
        - **Output:** `SearchResponse` containing the original query, mode, and a list of `SearchResult` objects (including `id`, `score`, `title`, `snippet`, and other metadata).
        - **Description:** Executes a BM25-based full-text search over the indexed content for a specific course.

    - `PATCH /v1/courses/{course_id}/documents/{document_id}`
        - **Input:** `UpdateDocumentChunk` (a partial update for a single chunk).
        - **Output:** `DocumentChunk` (the full, updated chunk).
        - **Description:** Updates the content or metadata of an existing document chunk.

    - `DELETE /v1/courses/{course_id}/documents/{document_id}`
        - **Input:** None.
        - **Output:** `204 No Content`.
        - **Description:** Removes a specific document chunk from the course's search index.

- **State / Storage:**
    - The service currently uses an in-memory dictionary (`Dict[str, BM25Index]`) to map a `course_id` to its corresponding BM25 index. 
    - This approach is suitable for local development and testing. Future iterations may replace this with a persistent, scalable index backend.

- **Authentication & Authorization:**
    - **Authentication:** All endpoints require a valid Firebase ID token, passed via the `Authorization: Bearer <ID_TOKEN>` header. The service uses the Firebase Admin SDK to validate tokens. Unauthenticated requests (e.g., a missing bearer token) are rejected with a `403 Forbidden` error, while requests with an invalid or expired token are rejected with a `401 Unauthorized` error. The service is not publicly accessible.
    - **Authorization / Roles:** Authorization is based on custom claims within the Firebase ID token.
        - **Search (`POST /documents:search`):** Accessible to any authenticated user (e.g., students, teachers).
        - **Indexing/Modification (`batchCreate`, `PATCH`, `DELETE`):** Restricted to users with a `role` custom claim equal to `"teacher"`. Unauthorized users receive a `403 Forbidden` error.
        - _Note: This role-based access can be refined in the future to grant permissions only to teachers of a specific course._

#### Other Microservices (To be detailed in future PRD updates)
- Chatbot / Conversation Service
- User / Enrollment Service
- Content Management Service

## 4. Quality & Testing

The CourseLLM platform is committed to high quality and reliability.

- **Content Search Service:** The service is covered by a suite of automated tests that verify:
    - All endpoints correctly reject unauthenticated or unauthorized requests (401/403).
    - Search functionality is available to all authenticated users.
    - Indexing and modification endpoints are properly restricted to users with a "teacher" role.
    - The end-to-end flow of indexing, searching, updating, and deleting content functions as expected.

## 5. Release Plan & Timeline

- **Milestone 1:** Develop the core Content Search Service with `bm25s`, a REST API, and Firebase Auth integration. (Completed)
- **Milestone 2:** Integrate the Search Service with the frontend application. (In Progress)
- **Milestone 3:** Develop the Chatbot / Conversation Service. (Target: TBD)

## 6. Metrics for Success

- **Search Relevance:** High click-through rate on the top 3 search results.
- **Search Speed:** Average search query response time under 500ms.
- **User Adoption:** High number of daily active users for search and chat features.

## 7. Assumptions and Constraints

- **Assumption:** Course content is pre-chunked and available for indexing.
- **Constraint:** The initial search implementation uses a BM25-based lexical search. Vector search is a potential future enhancement.
- **Constraint:** The system relies on Firebase for authentication and user identity management.
