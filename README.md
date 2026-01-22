# CourseLLM-Firebase

Monorepo for the CourseLLM project (web app + Search + RAG).

## What's inside

- **Next.js web app** (root) — UI + server-side API routes that:
  - enforce course-level access control (based on Firestore user profile),
  - proxy calls to the Search/RAG services,
  - resolve document links (Storage emulator in local dev; signed links in production).
- **search-service** (`search-service/`) — FastAPI service (BM25 / vector / hybrid).
- **rag-service** (`rag-service/`) — FastAPI service (retrieval + Gemini summary).

## One-command demo (recommended)

This repo is set up to run **Firebase emulators** locally for **Auth + Firestore + Storage**.  
That makes local runs (and grading) reproducible and avoids “prod vs local auth/rules misalignment”.

### Requirements (choose one)

To run the Firebase Emulator Suite you need **either**:

- **Docker** (recommended for grading: no host Java needed), **or**
- **Java** installed (Firebase CLI emulators need Java for Firestore/Storage).

Also required:
- Node + pnpm
- Python 3.11+ (for the FastAPI services)

### 0) Configure env

1) Copy the template:

```bash
cp .env.local.example .env.local
```

2) Edit `.env.local`:

- Set:
  - `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` (recommended)
- Optional:
  - `GEMINI_API_KEY=<your key>` (enables `/api/rag-summary`)

> For emulator-only local runs you should *not* need a Firebase Admin service account JSON.
> If you do enable any dev-only admin shortcuts (like `/api/test-token`), those may require a service account—avoid that for grading.

### 1) Run the demo

From repo root:

```bash
make demo
```

What this does:

- installs Node + Python deps (`make bootstrap`),
- starts Firebase emulators (Auth + Firestore + Storage),
- starts **search-service** + **rag-service** + **Next.js**,
- seeds demo data (including demo Auth users + Firestore profiles),
- uploads demo files into the **Storage emulator** (local only).

### 2) Log in

After `make demo`, the script writes demo credentials to:

```
.demo/credentials.txt
```

Open the web app and log in with any demo user.

### 3) Verify it works

- Go to **Search**.
- You should see only the courses registered to the logged-in user.
- Search within a course.
- Click a result title / “open” icon to open the underlying file.
- Click **Generate AI summary** to run RAG (requires `GEMINI_API_KEY`).

## Ports used

App/services:
- **Next.js web**: `9003`
- **search-service**: `8080`
- **rag-service**: `8002`

Firebase emulators:
- **Auth**: `9099`
- **Firestore**: `8081` (moved off 8080 to avoid clashing with search-service)
- **Storage**: `9199`
- Emulator UI (optional): `4000`
- Emulator Hub: `4400`

## Docker emulators (recommended for grading)

If you want a “no Java on host” setup, run emulators via Docker:

1) Put `docker-compose.emulators.yml` in the **repo root**.
2) Put the emulator Dockerfile at `docker/emulators/Dockerfile`.
3) Start emulators:

```bash
docker compose -f docker-compose.emulators.yml up -d --build
```

Then run services (either `make demo` if it detects emulators are already running, or run manually):

```bash
make bootstrap
cd search-service && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080
cd rag-service && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002
pnpm dev
```

## How file links work

Search documents have a `source` field. For real files, store it as one of:

- `gs://<bucket>/<objectPath>` (production)
- `storage://<objectPath>` (uses configured bucket in prod)
- `https://...` (direct URL)

The web app resolves non-HTTP sources via:

- `POST /api/document-link`

Local dev (emulator mode):
- returns an emulator-friendly URL (or a proxy endpoint) to open the file without production credentials.

Production:
- returns a short-lived signed URL (GCS signed link).

## Manual run (3 terminals)

If you prefer manual startup:

```bash
make bootstrap
```

Terminal 1:
```bash
cd search-service && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080
```

Terminal 2:
```bash
cd rag-service && ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002
```

Terminal 3:
```bash
pnpm dev
```

Seed demo data (optional):

```bash
make seed-demo
```

## Troubleshooting

### “Auth emulator isn’t booting”
Check emulator logs:

```bash
tail -n 200 .demo/emulators.log
```

If you see something like “Could not spawn `java -version`”, you’re starting Firestore/Storage emulators without Java.
Fix by either installing Java, or using the Docker emulators path above.

### Ports already in use
See what’s listening:

```bash
lsof -iTCP:9099 -sTCP:LISTEN -n -P || true
lsof -iTCP:8081 -sTCP:LISTEN -n -P || true
lsof -iTCP:9199 -sTCP:LISTEN -n -P || true
```

## Notes / safety rails

- `ENABLE_TEST_AUTH=true` exposes `/api/test-token` (dev-only). Do not enable in production.
- For grading: prefer the emulator-only flow (no prod credentials, no private buckets).

### Storage emulator note (Node/Admin seeding)

The Firebase Storage emulator speaks **HTTP**. Some Node libraries (used by `firebase-admin` under the hood) also read `STORAGE_EMULATOR_HOST` and may treat values without a protocol as **HTTPS**, which causes TLS errors like:

`ssl3_get_record:wrong version number`

Fix: set:

- `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` (no protocol, per Firebase docs)
- `STORAGE_EMULATOR_HOST=http://127.0.0.1:9199` (with protocol, for Google Cloud Storage client)
