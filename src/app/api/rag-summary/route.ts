import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

import { generateSearchRagSummary } from "@/ai/flows/search-rag-summary";

// Ensure this route always runs in the Node.js runtime (Genkit + firebase-admin are Node-only).
export const runtime = "nodejs";

type FirestoreProfile = {
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
};

type RagSource = {
  id: string;
  courseId: string;
  title?: string;
  content: string;
  score: number;
  source?: string;
  sourceUrl?: string;
};

function initAdmin() {
  if (admin.apps.length) return admin;

  let serviceAccount: any = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", e);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const p = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const raw = fs.readFileSync(p, "utf8");
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to read service account file", e);
    }
  }

  if (!serviceAccount) {
    // Fallback: Application Default Credentials (works on GCP / Cloud Run).
    try {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      return admin;
    } catch (e) {
      throw new Error(
        "Firebase Admin credentials not configured. Provide FIREBASE_SERVICE_ACCOUNT_JSON/FIREBASE_SERVICE_ACCOUNT_PATH or enable Application Default Credentials."
      );
    }
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin;
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const m = authHeader.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? m[1] : null;
}

async function getFirestoreProfile(uid: string): Promise<FirestoreProfile | null> {
  const adm = initAdmin();
  const db = adm.firestore();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return (snap.data() || {}) as FirestoreProfile;
}

function normalizeText(s: string) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, maxChars: number) {
  const t = normalizeText(s);
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1) + "…";
}

async function ragSearchCourse(opts: {
  baseUrl: string;
  authHeader: string | null;
  courseId: string;
  query: string;
  pageSize: number;
}): Promise<RagSource[]> {
  const { baseUrl, authHeader, courseId, query, pageSize } = opts;

  const r = await fetch(`${baseUrl}/v1/courses/${encodeURIComponent(courseId)}/documents:ragSearch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    // search-service validates `mode` as one of: lexical | vector | hybrid
    body: JSON.stringify({ query, page_size: pageSize, mode: "lexical" }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`search-service ragSearch error ${r.status}: ${text}`);
  }

  const data = await r.json().catch(() => ({}));
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((x: any) => {
      const url =
        x.source && typeof x.source === "string" && x.source.startsWith("http") ? x.source : undefined;
      return {
        id: String(x.id ?? ""),
        courseId: String(x.course_id ?? courseId),
        title: x.title || x.source || "Untitled",
        content: String(x.content ?? ""),
        score: Number(x.score ?? 0),
        source: typeof x.source === "string" ? x.source : undefined,
        sourceUrl: url,
      } as RagSource;
    })
    .filter((x: RagSource) => x.id.length > 0 && x.content.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const q: string = body.q ?? body.query ?? "";
    const courseId: string = body.courseId ?? "";
    const topK: number = Number(body.topK ?? 6);

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ answer: "", sources: [] });
    }

    const authHeader = req.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const adm = initAdmin();
    const decoded = await adm.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const profile = await getFirestoreProfile(uid);
    if (!profile) {
      return NextResponse.json(
        { error: "No user profile found. Complete onboarding first." },
        { status: 403 }
      );
    }

    const role: "student" | "teacher" = (profile.role as any) === "teacher" ? "teacher" : "student";
    const department = typeof profile.department === "string" ? profile.department : undefined;
    const courses = Array.isArray(profile.courses) ? profile.courses.map((x) => String(x)) : [];
    const allowed = new Set(courses);

    if (role !== "teacher" && courses.length === 0) {
      return NextResponse.json(
        { error: "No registered courses. Complete onboarding first." },
        { status: 403 }
      );
    }

    if (courseId && role !== "teacher" && !allowed.has(courseId)) {
      return NextResponse.json({ error: "Not allowed to use RAG on this course" }, { status: 403 });
    }

    // Determine which course scopes to retrieve from.
    const scopedCourses: string[] = courseId
      ? [courseId]
      : role === "teacher"
        ? (courses.length > 0 ? courses : [])
        : courses;

    if (scopedCourses.length === 0) {
      return NextResponse.json(
        { error: "Pick a course to generate an AI summary." },
        { status: 400 }
      );
    }

    const baseUrl = (process.env.SEARCH_SERVICE_INTERNAL_BASE_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");


    // Best-effort: keep search-service's in-memory /v1/users/me profile in sync.
    try {
      await fetch(`${baseUrl}/v1/users/me`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ role, department, courses }),
      });
    } catch (e) {
      console.warn("Failed to sync /v1/users/me to search-service", e);
    }

    const k = Math.min(Math.max(topK, 1), 12);
    const perCourseK = courseId ? k : Math.max(2, Math.ceil(k / Math.min(scopedCourses.length, 4)));

    // Retrieve chunks.
    const all: RagSource[] = [];
    for (const cid of scopedCourses) {
      const chunks = await ragSearchCourse({
        baseUrl,
        authHeader,
        courseId: cid,
        query: q,
        pageSize: perCourseK,
      });
      all.push(...chunks);
    }

    // Deduplicate by id, keep best score.
    const bestById = new Map<string, RagSource>();
    for (const s of all) {
      const prev = bestById.get(s.id);
      if (!prev || s.score > prev.score) bestById.set(s.id, s);
    }

    let sources = Array.from(bestById.values());
    // Enforce course scoping server-side (never trust the client).
    if (role !== "teacher") {
      sources = sources.filter((s) => allowed.has(String(s.courseId)));
    }

    sources.sort((a, b) => b.score - a.score);
    sources = sources.slice(0, k);

    if (sources.length === 0) {
      return NextResponse.json({ answer: "I couldn't find relevant course content for that query.", sources: [] });
    }

    // Build a numbered sources blob for the model.
    const sourcesText = sources
      .map((s, i) => {
        const title = s.title ? normalizeText(s.title) : s.id;
        const content = truncate(s.content, 1200);
        return `[${i + 1}] (course=${s.courseId}) ${title}\n${content}`;
      })
      .join("\n\n");

    const llm = await generateSearchRagSummary({ question: q, sourcesText });

    // Return answer + sources so UI can show citations.
    return NextResponse.json({
      answer: llm.answer,
      sources: sources.map((s, i) => ({
        index: i + 1,
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        score: s.score,
        snippet: truncate(s.content, 240),
        source: s.source,
        url: s.sourceUrl,
      })),
    });
  } catch (e: any) {
    console.error("/api/rag-summary error", e);
    return NextResponse.json(
      { error: "Failed to generate AI summary", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
