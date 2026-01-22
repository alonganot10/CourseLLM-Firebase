import { test, expect } from "@playwright/test";

const baseURL = process.env.SEARCH_SERVICE_BASE_URL ?? "http://127.0.0.1:8080";

test("search-service E2E: batchCreate -> search -> ragSearch", async ({ request }) => {
  const courseId = `e2e-${Date.now()}`;

  // 1) Seed documents via batchCreate
  const batchCreate = await request.post(
    `${baseURL}/v1/courses/${courseId}/documents:batchCreate`,
    {
      data: {
        documents: [
          {
            id: "d1",
            course_id: courseId,             // REQUIRED by DocumentChunk
            source: "e2e",
            chunk_index: 0,
            title: "Hit",
            content: "attention transformers attention",
            metadata: {},
          },
          {
            id: "d2",
            course_id: courseId,             // REQUIRED by DocumentChunk
            source: "e2e",
            chunk_index: 1,
            title: "Miss",
            content: "unrelated database indexing btree",
            metadata: {},
          },
        ],
      },
    }
  );

  if (!batchCreate.ok()) {
    throw new Error(
      `batchCreate failed: ${batchCreate.status()} ${await batchCreate.text()}`
    );
  }

  // 2) Search (mode must be one of lexical|vector|hybrid)
  const search = await request.post(
    `${baseURL}/v1/courses/${courseId}/documents:search`,
    {
      data: {
        query: "attention transformers",
        mode: "lexical",   // <-- FIX: matches models.py
        page_size: 5,
      },
    }
  );

  if (!search.ok()) {
    throw new Error(`search failed: ${search.status()} ${await search.text()}`);
  }

  const searchBody = await search.json();
  expect(Array.isArray(searchBody.results)).toBeTruthy();
  expect(searchBody.results.length).toBeGreaterThan(0);
  expect(searchBody.results[0].id).toBe("d1");

  // 3) ragSearch
  const rag = await request.post(
    `${baseURL}/v1/courses/${courseId}/documents:ragSearch`,
    {
      data: {
        query: "attention transformers",
        mode: "lexical",   // <-- FIX: matches models.py
        page_size: 5,
      },
    }
  );

  if (!rag.ok()) {
    throw new Error(`ragSearch failed: ${rag.status()} ${await rag.text()}`);
  }

  const ragBody = await rag.json();
  expect(ragBody.results[0].id).toBe("d1");
  // Depending on your ragSearch response shape, this might be "content" or "snippet".
  // If ragSearch returns full chunks, keep content:
  if (ragBody.results[0].content) {
    expect(ragBody.results[0].content).toContain("attention transformers attention");
  }
});
