import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

type Body = {
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = extractBearerToken(authHeader);
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    // Verify token (keeps this endpoint from becoming an open proxy).
    const adm = initAdmin();
    await adm.auth().verifyIdToken(token);

    const body = (await req.json()) as Body;
    const role = body?.role === "teacher" ? "teacher" : "student";
    const department = typeof body?.department === "string" ? body.department : undefined;
    const courses = Array.isArray(body?.courses) ? body.courses.map((c) => String(c)) : [];

    const baseUrl = (process.env.SEARCH_SERVICE_INTERNAL_BASE_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");

    const r = await fetch(`${baseUrl}/v1/users/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ role, department, courses }),
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json(
        { error: `search-service error ${r.status}`, detail: text },
        { status: 502 }
      );
    }

    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: true, searchService: data });
  } catch (e: any) {
    console.error("/api/search-profile error", e);
    return NextResponse.json(
      { error: "Invalid request", detail: String(e?.message ?? e) },
      { status: 400 }
    );
  }
}
