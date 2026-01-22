import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

// This route must run on the Node.js runtime (firebase-admin Storage).
export const runtime = "nodejs";

type FirestoreProfile = {
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

async function getFirestoreProfile(uid: string): Promise<FirestoreProfile | null> {
  const adm = initAdmin();
  const db = adm.firestore();
  const snap = await db.doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return (snap.data() || {}) as FirestoreProfile;
}

function parseGsUrl(source: string): { bucket: string; objectPath: string } | null {
  // gs://bucket/path/to/object
  const m = source.match(/^gs:\/\/([^/]+)\/(.+)$/i);
  if (!m) return null;
  return { bucket: m[1], objectPath: m[2] };
}

function parseStorageUrl(source: string): { bucket: string; objectPath: string } | null {
  // storage://path/to/object  (bucket inferred from NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
  const m = source.match(/^storage:\/\/(.+)$/i);
  if (!m) return null;
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) return null;
  return { bucket, objectPath: m[1] };
}

async function signedUrlForSource(source: string): Promise<string | null> {
  if (!source || typeof source !== "string") return null;
  if (source.startsWith("http://") || source.startsWith("https://")) return source;
  if (source.startsWith("demo://")) return null;

  const parsed = parseGsUrl(source) || parseStorageUrl(source);
  if (!parsed) return null;

  const adm = initAdmin();
  const bucket = adm.storage().bucket(parsed.bucket);
  const file = bucket.file(parsed.objectPath);

  // v4 signed URL: short-lived and safe to share.
  const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires,
    responseDisposition: "inline",
  });
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const courseId: string = String(body?.courseId ?? "");
    const source: string = String(body?.source ?? "");

    if (!courseId || !source) {
      return NextResponse.json({ error: "Missing courseId or source" }, { status: 400 });
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
    const courses = Array.isArray(profile.courses) ? profile.courses.map((x) => String(x)) : [];
    const allowed = new Set(courses);

    if (role !== "teacher" && !allowed.has(courseId)) {
      return NextResponse.json({ error: "Not allowed to open files for this course" }, { status: 403 });
    }

    const url = await signedUrlForSource(source);
    if (!url) {
      return NextResponse.json(
        { error: "Source is not a supported file link", detail: source },
        { status: 400 }
      );
    }

    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("/api/document-link error", e);
    return NextResponse.json(
      { error: "Failed to generate document link", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
