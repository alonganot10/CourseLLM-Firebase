// src/lib/ragClient.ts
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface RagChunk {
  id: string;
  score: number;
  course_id: string;
  source?: string;
  chunk_index?: number;
  title?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RagChatResponse {
  answer: string;
  chunks: RagChunk[];
}

export async function sendRagChat(opts: {
  courseId: string;
  studentId: string;
  messages: ChatMessage[];
}): Promise<RagChatResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_RAG_SERVICE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_RAG_SERVICE_URL is not set");
  }

  const res = await fetch(`${baseUrl}/v1/courses/${opts.courseId}/rag:chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: later: add Authorization: Bearer <id-token> if we secure rag-service
    },
    body: JSON.stringify({
      student_id: opts.studentId,
      course_id: opts.courseId,
      messages: opts.messages,
      top_k: 6,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG service error ${res.status}: ${text}`);
  }

  return res.json();
}
