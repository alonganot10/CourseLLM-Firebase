// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

type FirestoreProfile = {
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
};

type SearchBody = {
  q?: string;
  query?: string;
  courseId?: string;
  topK?: number;
  page_size?: number;
  mode?: "lexical" | "vector" | "hybrid";
  type?: string; // UI sometimes sends "all"/"text" etc.
};

const USE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !!process.env.FIRESTORE_EMULATOR_HOST ||
  !!process.env.FIREBASE_STORAGE_EMULATOR_HOST;

function initAdmin() {
  if (admin.apps.length) return admin;

  if (USE_EMULATORS) {
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID (required for emulator mode)");
    admin.initializeApp({ projectId });
    return admin;
  }

  // Production: expects ADC or service account envs
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin;
}

function extractBearerToken(authHeader: string | null) {
  if (!authHeader) return null;
  const m = authHeader.match(/^\s*Bearer\s+(.+)\s*$/i);
  return m ? m[1] : null;
}

function clampInt(v: any, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as SearchBody;

    const qRaw = (body.q ?? body.query ?? "").toString();
    const q = qRaw.trim();
    if (!q) return NextResponse.json({ error: "Missing query (q)" }, { status: 400 });

    const courseId = body.courseId ? String(body.courseId).trim() : "";
    const topK = clampInt(body.topK ?? body.page_size, 5, 1, 20);

    // Default to lexical unless explicitly requested otherwise
    const mode: "lexical" | "vector" | "hybrid" =
      body.mode === "vector" || body.mode === "hybrid" ? body.mode : "lexical";

    const adm = initAdmin();
    const decoded = await adm.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // Read Firestore user profile (source of truth)
    const db = adm.firestore();
    const snap = await db.doc(`users/${uid}`).get();
    const profile = (snap.exists ? (snap.data() as FirestoreProfile) : null) || null;

    if (!profile) {
      return NextResponse.json(
        { error: "No user profile found. Complete onboarding first." },
        { status: 403 }
      );
    }

    const role: "student" | "teacher" =
      (profile.role as any) === "teacher" ? "teacher" : "student";
    const department = typeof profile.department === "string" ? profile.department : undefined;
    const courses = Array.isArray(profile.courses) ? profile.courses.map((c) => String(c)) : [];

    const baseUrl = (process.env.SEARCH_SERVICE_INTERNAL_BASE_URL || "http://127.0.0.1:8080").replace(
      /\/+$/,
      ""
    );

    // Sync profile to search-service (so it can enforce allowed courses)
    const syncResp = await fetch(`${baseUrl}/v1/users/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ role, department, courses }),
    });

    if (!syncResp.ok) {
      const text = await syncResp.text();
      return NextResponse.json(
        { error: `search-service sync error ${syncResp.status}`, detail: text },
        { status: 502 }
      );
    }

    // Perform search: course-specific endpoint preserves 403 for forbidden course checks
    const endpoint = courseId
      ? `${baseUrl}/v1/courses/${encodeURIComponent(courseId)}/documents:search`
      : `${baseUrl}/v1/documents:search`;

    const searchResp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ query: q, page_size: topK, mode }),
    });

    if (searchResp.status === 403) {
      const text = await searchResp.text();
      return NextResponse.json({ error: "Forbidden", detail: text }, { status: 403 });
    }

    if (!searchResp.ok) {
      const text = await searchResp.text();
      return NextResponse.json(
        { error: `search-service search error ${searchResp.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await searchResp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("/api/search error", e);
    return NextResponse.json(
      { error: "Invalid request", detail: String(e?.message ?? e) },
      { status: 400 }
    );
  }
}
