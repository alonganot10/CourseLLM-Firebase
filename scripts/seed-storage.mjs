#!/usr/bin/env node
/*
  Uploads demo course files to Firebase Storage.

  These files are referenced by scripts/seed-demo.sh in the search-service index.
  Sources are stored as gs://<bucket>/demo/<courseId>/<docId>.md

  Requirements:
    - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    - FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON (or ADC on GCP)
*/

import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const USE_EMULATORS =
  process.env.USE_FIREBASE_EMULATORS === 'true' ||
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
  !!process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !!process.env.FIRESTORE_EMULATOR_HOST;


// Ensure Google Cloud Storage client uses an HTTP emulator endpoint.
// Some libs read STORAGE_EMULATOR_HOST and treat values without a protocol as HTTPS,
// which breaks against the Firebase Storage emulator (HTTP only).
if (USE_EMULATORS) {
  const hostport = process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST;
  if (hostport) {
    const withProto = hostport.startsWith('http://') || hostport.startsWith('https://')
      ? hostport
      : `http://${hostport}`;
    process.env.STORAGE_EMULATOR_HOST = withProto;
  }
}


function initAdmin() {
  if (admin.apps.length) return admin;

  // When running emulators, don't require a service account. Just make sure the projectId is set.
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

  // Fallback: Application Default Credentials (works on GCP / Cloud Run)
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin;
}


const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!BUCKET) {
  console.error('Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  process.exit(1);
}

// Demo course UUIDs (match src/lib/courseCatalog.ts)
const CS204 = '11111111-1111-1111-1111-111111111111';
const IR101 = '22222222-2222-2222-2222-222222222222';
const RAG301 = '33333333-3333-3333-3333-333333333333';

const DEMO_DOCS = [
  {
    courseId: CS204,
    docId: 'demo-cs204-1',
    title: 'Red-black trees',
    body: 'Red-black trees maintain balance using recoloring and rotations.',
  },
  {
    courseId: CS204,
    docId: 'demo-cs204-2',
    title: 'AVL trees',
    body: 'AVL trees keep balance by rotations based on balance factors.',
  },
  {
    courseId: IR101,
    docId: 'demo-ir101-1',
    title: 'BM25 basics',
    body: 'BM25 ranks documents using term frequency and document length normalization.',
  },
  {
    courseId: IR101,
    docId: 'demo-ir101-2',
    title: 'TF-IDF recap',
    body: 'TF-IDF weights terms by frequency and inverse document frequency.',
  },
  {
    courseId: RAG301,
    docId: 'demo-rag301-1',
    title: 'RAG overview',
    body: 'Retrieval-Augmented Generation combines retrieval with generation for grounded answers.',
  },
  {
    courseId: RAG301,
    docId: 'demo-rag301-2',
    title: 'Hybrid retrieval',
    body: 'Hybrid search mixes lexical (BM25) with vector similarity for better recall.',
  },
];

async function main() {
  const adm = initAdmin();
  const bucket = adm.storage().bucket(BUCKET);

  for (const d of DEMO_DOCS) {
    const objectPath = `demo/${d.courseId}/${d.docId}.md`;
    const content = `# ${d.title}\n\n${d.body}\n\n---\n\nThis is a demo file uploaded by scripts/seed-storage.mjs.`;
    await bucket.file(objectPath).save(content, {
      contentType: 'text/markdown; charset=utf-8',
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=0, no-cache',
      },
    });
  }
}

main().catch((e) => {
  console.error('seed-storage failed', e);
  process.exit(1);
});
