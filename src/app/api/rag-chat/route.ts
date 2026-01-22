import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

// Ensure this route always runs in the Node.js runtime (firebase-admin is Node-only).
export const runtime = "nodejs";

type FirestoreProfile = {
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
};

type ChatRole = "system" | "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type Body = {
  courseId?: string;
  course_id?: string;
  messages?: ChatMessage[];
  topK?: number;
  top_k?: number;
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const courseId = String(body.courseId ?? body.course_id ?? "").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const topK = Number(body.topK ?? body.top_k ?? 6);

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }
    if (messages.length === 0) {
      return NextResponse.json({ error: "At least one message is required" }, { status: 400 });
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

    if (role !== "teacher" && !allowed.has(courseId)) {
      return NextResponse.json(
        { error: "Not allowed to chat in this course" },
        { status: 403 }
      );
    }

    const searchBaseUrl = (
      process.env.SEARCH_SERVICE_INTERNAL_BASE_URL ||
      process.env.SEARCH_SERVICE_BASE_URL ||
      "http://127.0.0.1:8080"
    ).replace(/\/+$/, "");

    // Best-effort: keep search-service's in-memory /v1/users/me profile in sync.
    try {
      await fetch(`${searchBaseUrl}/v1/users/me`, {
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

    const ragBaseUrl = (process.env.RAG_SERVICE_BASE_URL || "http://127.0.0.1:8002").replace(/\/+$/, "");
    const k = Math.min(Math.max(topK, 1), 12);

    const r = await fetch(`${ragBaseUrl}/v1/courses/${encodeURIComponent(courseId)}/rag:chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ student_id: uid, course_id: courseId, messages, top_k: k }),
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `rag-service error ${r.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (e: any) {
    console.error("/api/rag-chat error", e);
    return NextResponse.json(
      { error: "Invalid request", detail: String(e?.message ?? e) },
      { status: 400 }
    );
  }
}
