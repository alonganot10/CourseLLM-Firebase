# System Architecture

## Overview
CourseLLM is a personalized learning platform integrating Next.js, Firebase services, and a custom Python Search Service for AI-powered features.

## Architecture Diagram
┌─────────────────────────────────────────────────────────────────┐
│ Client Layer │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Next.js 15 Frontend (React 18) │ │
│ │ - Server & Client Components │ │
│ │ - Tailwind CSS + Radix UI │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
│
│ HTTPS
▼
┌─────────────────────────────────────────────────────────────────┐
│ Firebase Services │
│ ┌────────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│ │ Auth │ │ Firestore │ │ DataConnect │ │
│ │ (Google OAuth)│ │ (NoSQL) │ │ (PostgreSQL) │ │
│ └────────────────┘ └──────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
│
│ REST API
▼
┌─────────────────────────────────────────────────────────────────┐
│ Microservices Layer (Custom) │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Search Service (FastAPI + Python 3.11) │ │
│ │ - BM25 Indexing & Search │ │
│ │ - RAG endpoint for LLM context │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────────┐
│ AI Layer │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Google Genkit 1.20.0 (Gemini 2.5 Flash) │ │
│ └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

## Core Components

### 1. Frontend (Next.js)
The main entry point. It handles user interaction, authentication state (via Firebase), and orchestration of backend calls.

### 2. Search Service (Custom Component)
A dedicated Python microservice handling document indexing and retrieval (RAG).

- **Technology**: FastAPI, Python 3.11, BM25.
- **Role**: Indexes course materials to provide context for AI answers.
- **Integration**: Verifies Firebase Auth tokens to ensure security.

#### API Interface
The Frontend communicates with this service via REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/courses/{id}/documents:batchCreate` | **Teacher Only**. Indexes new course chunks. |
| `POST` | `/v1/courses/{id}/documents:search` | Standard lexical search for the UI. |
| `POST` | `/v1/courses/{id}/documents:ragSearch` | **RAG**. Retrieves full content chunks with scores for AI context. |
| `PATCH/DELETE` | `/v1/courses/{id}/documents/{doc_id}` | Management endpoints for course content. |

### 3. Firebase Backend
- **Auth**: Handles identity (Google OAuth).
- **Firestore**: Stores user profiles, roles, and course metadata.
- **DataConnect**: Provides SQL-based analytics capabilities.

## Integration Logic (RAG Flow)

How the components work together to answer a student's question:

1. **User Query**: Student asks a question in the Chat UI.
2. **Retrieval**: Frontend calls Search Service (`ragSearch`) with the query.
3. **Context**: Search Service ranks documents (BM25) and returns top chunks.
4. **Generation**: Frontend sends `Query + Top Chunks` to the **AI Layer** (Genkit).
5. **Response**: AI generates a grounded answer and streams it back to the user.