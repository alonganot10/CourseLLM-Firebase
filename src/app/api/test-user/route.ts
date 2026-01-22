import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";

export const runtime = "nodejs";

const ENABLED = process.env.ENABLE_TEST_AUTH === "true";

function initAdmin() {
  if (admin.apps.length) return;

  let serviceAccount: any = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", e);
    }
  }

  if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      : path.join(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

    if (fs.existsSync(p)) {
      serviceAccount = JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }

  if (!serviceAccount) {
    throw new Error(
      "Service account not provided in FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH"
    );
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

type Body = {
  email: string;
  password: string;
  role?: "student" | "teacher";
  department?: string;
  courses?: string[];
  uid?: string;
};

export async function POST(req: NextRequest) {
  if (!ENABLED) return NextResponse.json({ error: "test auth disabled" }, { status: 403 });

  try {
    initAdmin();

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: "Missing required fields: email, password" },
        { status: 400 }
      );
    }

    const email = String(body.email).trim();
    const password = String(body.password);
    const role = body.role ?? "student";
    const courses = Array.isArray(body.courses) ? body.courses : [];
    const department = body.department ?? null;

    let userRecord: admin.auth.UserRecord;

    try {
      if (body.uid) {
        userRecord = await admin.auth().getUser(String(body.uid));
        // Ensure email/password match what we expect.
        userRecord = await admin.auth().updateUser(userRecord.uid, {
          email,
          password,
          emailVerified: true,
        });
      } else {
        userRecord = await admin.auth().getUserByEmail(email);
        userRecord = await admin.auth().updateUser(userRecord.uid, {
          password,
          emailVerified: true,
        });
      }
    } catch {
      userRecord = await admin.auth().createUser({
        email,
        password,
        emailVerified: true,
      });
    }

    await admin
      .firestore()
      .doc(`users/${userRecord.uid}`)
      .set(
        {
          role,
          department,
          courses,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      uid: userRecord.uid,
      email,
      role,
      courses,
    });
  } catch (e: any) {
    console.error("test-user error", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to create test user" },
      { status: 500 }
    );
  }
}
