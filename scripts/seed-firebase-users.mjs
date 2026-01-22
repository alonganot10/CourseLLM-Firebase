#!/usr/bin/env node
/*
  Creates/upserts demo email+password users in Firebase Auth and matching
  Firestore profiles under users/{uid}.

  This enables a "one click" demo where you can log into the web UI using
  email/password (no Google sign-in) without manual setup.

  WARNING: This writes to the *real* Firebase project referenced by the
  service account / env config. Use a dedicated dev project.
*/

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const USE_EMULATORS =
  process.env.USE_FIREBASE_EMULATORS === 'true' ||
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !!process.env.FIRESTORE_EMULATOR_HOST;

function initAdmin() {
  if (admin.apps.length) return admin;

  // Safer defaults: when running emulators, don't require service account and
  // don't accidentally write to production if credentials are present.
  if (USE_EMULATORS) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Missing FIREBASE_PROJECT_ID (required for emulator mode)');
    }
    admin.initializeApp({ projectId });
    return admin;
  }

  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const p = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const raw = fs.readFileSync(p, 'utf8');
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to read service account file', e);
    }
  }

  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return admin;
  }

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin;
}

// Demo course UUIDs (match src/lib/courseCatalog.ts)
const CS204 = '11111111-1111-1111-1111-111111111111';
const IR101 = '22222222-2222-2222-2222-222222222222';
const RAG301 = '33333333-3333-3333-3333-333333333333';

const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || 'Demo1234!';

const USERS = [
  {
    uid: 'demo-teacher',
    email: 'demo.teacher@example.com',
    displayName: 'Demo Teacher',
    role: 'teacher',
    courses: [CS204, IR101, RAG301],
  },
  {
    uid: 'demo-student-cs204',
    email: 'demo.student1@example.com',
    displayName: 'Demo Student 1',
    role: 'student',
    courses: [CS204],
  },
  {
    uid: 'demo-student-ir-rag',
    email: 'demo.student2@example.com',
    displayName: 'Demo Student 2',
    role: 'student',
    courses: [IR101, RAG301],
  },
];

async function upsertAuthUser(adm, u) {
  try {
    // Prefer uid-stable upserts.
    await adm.auth().getUser(u.uid);
    await adm.auth().updateUser(u.uid, {
      email: u.email,
      password: DEFAULT_PASSWORD,
      displayName: u.displayName,
      emailVerified: true,
    });
    return;
  } catch (e) {
    // If user doesn't exist, create. If something else fails, try by email.
  }

  try {
    // If the email exists under a different uid, do not clobber it.
    const existingByEmail = await adm.auth().getUserByEmail(u.email);
    if (existingByEmail?.uid && existingByEmail.uid !== u.uid) {
      console.warn(
        `WARN: email ${u.email} already exists under uid ${existingByEmail.uid}. Skipping create for uid ${u.uid}.`
      );
      return;
    }
  } catch (e) {
    // not found -> ok
  }

  await adm.auth().createUser({
    uid: u.uid,
    email: u.email,
    password: DEFAULT_PASSWORD,
    displayName: u.displayName,
    emailVerified: true,
  });
}

async function upsertProfile(adm, u) {
  const db = adm.firestore();
  await db.doc(`users/${u.uid}`).set(
    {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      department: 'Demo Dept',
      courses: u.courses,
      profileComplete: true,
      updatedAt: adm.firestore.FieldValue.serverTimestamp(),
      createdAt: adm.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function main() {
  const adm = initAdmin();
  for (const u of USERS) {
    await upsertAuthUser(adm, u);
    await upsertProfile(adm, u);
  }

  // Write credentials to .demo for convenience
  const outDir = path.resolve(process.cwd(), '.demo');
  fs.mkdirSync(outDir, { recursive: true });
  const lines = [
    'Demo login credentials (email/password):',
    `Password: ${DEFAULT_PASSWORD}`,
    '',
    ...USERS.map((u) => `- ${u.role}: ${u.email}  (uid: ${u.uid})`),
    '',
    'Note: These accounts are created in your configured Firebase project.',
  ];
  fs.writeFileSync(path.join(outDir, 'credentials.txt'), lines.join('\n'), 'utf8');
}

main().catch((e) => {
  console.error('seed-firebase-users failed', e);
  process.exit(1);
});
