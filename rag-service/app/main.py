from typing import List, Literal, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
import os
import httpx


# ----- Types -----

Role = Literal["system", "user", "assistant"]


class ChatMessage(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    student_id: str
    course_id: str
    messages: List[ChatMessage]
    top_k: int = 6


class RagChunk(BaseModel):
    id: str
    score: float
    course_id: str
    source: Optional[str] = None
    chunk_index: Optional[int] = None
    title: Optional[str] = None
    content: str
    metadata: Optional[dict] = None


class ChatResponse(BaseModel):
    answer: str
    chunks: List[RagChunk]


# ----- Config -----

# Base URL of the search-service in local dev.
# For now we assume search-service runs on http://localhost:8000
SEARCH_SERVICE_URL = os.getenv("SEARCH_SERVICE_URL", "http://localhost:8000")

app = FastAPI(title="CourseLLM RAG Tutor Service")


# ----- Helpers -----

async def retrieve_chunks(course_id: str, query: str, top_k: int) -> List[RagChunk]:
    """
    Call the search-service RAG endpoint:
      POST /v1/courses/{course_id}/documents:ragSearch

    and convert the response into RagChunk objects.
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{SEARCH_SERVICE_URL}/v1/courses/{course_id}/documents:ragSearch",
            json={
                "query": query,
                "page_size": top_k,
                "mode": "rag",
            },
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"search-service error {resp.status_code}: {resp.text}",
        )

    data = resp.json()
    chunks: List[RagChunk] = []

    for item in data.get("results", []):
        chunks.append(
            RagChunk(
                id=item["id"],
                score=item["score"],
                course_id=item["course_id"],
                source=item.get("source"),
                chunk_index=item.get("chunk_index"),
                title=item.get("title"),
                content=item["content"],
                metadata=item.get("metadata"),
            )
        )

    return chunks


async def call_llm_with_rag(question: str, chunks: List[RagChunk], history: List[ChatMessage]) -> str:
    """
    TEMP STUB: Build a simple text answer using retrieved chunks.
    Later: replace this with a real LLM call (DSPy/Genkit/OpenAI/etc).
    """
    # Keep last few user/assistant messages for context
    history_text = "\n".join(f"{m.role.upper()}: {m.content}" for m in history[-6:])

    # Short preview of the retrieved content
    context_preview = "\n\n".join(
        f"[chunk {i+1}, score={c.score:.3f}] {c.content[:200]}"
        for i, c in enumerate(chunks)
    )

    # Very dumb answer — but enough to exercise the pipeline
    return (
        "RAG STUB ANSWER\n\n"
        f"Question: {question}\n\n"
        f"History (last turns):\n{history_text}\n\n"
        f"Using {len(chunks)} retrieved chunks.\n"
        f"Context preview:\n{context_preview}"
    )


# ----- API -----

@app.post("/v1/courses/{course_id}/rag:chat", response_model=ChatResponse)
async def rag_chat(course_id: str, req: ChatRequest):
    """
    Main RAG chat endpoint.

    1. Take the last user message as the query.
    2. Retrieve chunks from search-service.
    3. Call the (stub) LLM with the retrieved context.
    4. Return the answer + the chunks (for UI 'sources').
    """
    # Sanity checks
    if course_id != req.course_id:
        raise HTTPException(status_code=400, detail="course_id mismatch between path and body")

    last_user = next((m for m in reversed(req.messages) if m.role == "user"), None)
    if not last_user:
        raise HTTPException(status_code=400, detail="At least one user message is required")

    # 1) Retrieve relevant chunks
    chunks = await retrieve_chunks(course_id=course_id, query=last_user.content, top_k=req.top_k)

    # 2) Call LLM (stub)
    answer = await call_llm_with_rag(last_user.content, chunks, req.messages)

    return ChatResponse(answer=answer, chunks=chunks)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8002, reload=True)
