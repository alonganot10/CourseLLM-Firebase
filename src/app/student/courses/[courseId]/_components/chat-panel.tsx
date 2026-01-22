"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProviderClient";
import {
  sendRagChat,
  ChatMessage as RagMessage,
} from "@/lib/ragClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

type ChatPanelProps = {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  courseMaterial: string;
};

type UiMessage = {
  role: "user" | "assistant";
  content: string;
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  courseId,
  courseTitle,
  courseDescription,
  courseMaterial,
}) => {
  const { firebaseUser } = useAuth();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    if (!firebaseUser) {
      setError("You must be logged in to chat.");
      return;
    }

    const nextMessages: UiMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      // Build the message history for the RAG service:
      const ragMessages: RagMessage[] = [
        {
          role: "system",
          content: `You are a helpful teaching assistant for the course "${courseTitle}" (${courseId}). Course description: ${courseDescription}. Use retrieved chunks from the search service as the main source of truth. If the answer is not clearly supported by the context, say you don't know.`,
        },
        {
          role: "system",
          content: `Additional course materials:\n${courseMaterial.slice(
            0,
            4000,
          )}`,
        },
        ...nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const resp = await sendRagChat({
        courseId,
        studentId: firebaseUser.uid,
        messages: ragMessages,
        idToken: await firebaseUser.getIdToken(),
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resp.answer },
      ]);
      // If you want, later you can store resp.chunks in state and show "Sources"
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to contact the tutor service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      <div className="border-b px-4 py-2">
        <div className="text-sm font-medium">Course tutor</div>
        <div className="text-xs text-muted-foreground">
          Ask questions about this course. Answers use your course materials.
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Start by asking about lectures, assignments, or exam topics.
            </p>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {error && (
        <div className="px-4 pb-2 text-xs text-red-500">{error}</div>
      )}

      <form onSubmit={handleSend} className="border-t px-4 py-3 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask your tutor a question about this course..."
          disabled={loading}
        />
        <div className="flex justify-end gap-2">
          <Button type="submit" size="sm" disabled={loading || !input.trim()}>
            {loading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Ask
          </Button>
        </div>
      </form>
    </div>
  );
};
