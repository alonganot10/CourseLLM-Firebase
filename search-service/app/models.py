
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
import uuid

def gen_id():
    return str(uuid.uuid4())

class DocumentChunk(BaseModel):
    id: str = Field(default_factory=gen_id)
    course_id: str
    source: Optional[str] = None
    chunk_index: Optional[int] = None
    title: Optional[str] = None
    headings: Optional[List[str]] = None
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class BatchCreateRequest(BaseModel):
    documents: List[DocumentChunk]

class BatchCreateResponse(BaseModel):
    documents: List[DocumentChunk]

class SearchResult(BaseModel):
    id: str
    score: float
    course_id: str
    source: Optional[str] = None
    chunk_index: Optional[int] = None
    title: Optional[str] = None
    snippet: str 
    metadata: Dict[str, Any]

class SearchRequest(BaseModel):
    query: str
    page_size: int = 10
    mode: Literal["lexical", "vector", "hybrid"] = "lexical"

class SearchResponse(BaseModel):
    query: str
    mode: Literal["lexical", "vector", "hybrid"]
    results: List[SearchResult]
    next_page_token: Optional[str] = None

class UpdateDocumentChunk(BaseModel):
    source: Optional[str] = None
    chunk_index: Optional[int] = None
    title: Optional[str] = None
    headings: Optional[List[str]] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class UserProfile(BaseModel):
    uid: str
    role: str = "student"
    department: Optional[str] = None
    courses: List[str] = Field(default_factory=list)  # course_ids
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UpsertMeRequest(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    courses: Optional[List[str]] = None