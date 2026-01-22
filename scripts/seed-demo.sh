#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

SEARCH_PORT=${SEARCH_PORT:-8080}
NEXT_PORT=${NEXT_PORT:-9003}

# Demo course UUIDs (match src/lib/courseCatalog.ts)
CS204="11111111-1111-1111-1111-111111111111"
IR101="22222222-2222-2222-2222-222222222222"
RAG301="33333333-3333-3333-3333-333333333333"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing command: $1" >&2; exit 1; }
}
need_cmd curl
need_cmd jq
need_cmd node

if [ -z "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_FIREBASE_API_KEY is not set (check .env.local)" >&2
  exit 1
fi

if [ -z "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" ]; then
  echo "ERROR: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set (check .env.local)" >&2
  exit 1
fi

API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY"
WEB_BASE="http://127.0.0.1:${NEXT_PORT}"
SEARCH_BASE="http://127.0.0.1:${SEARCH_PORT}"
BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"

exchange_custom_to_id_token() {
  local custom_token="$1"
  # If FIREBASE_AUTH_EMULATOR_HOST is set, route through the Auth emulator.
  # Base becomes: http://<host>:<port>/identitytoolkit.googleapis.com/...
  local base="https://identitytoolkit.googleapis.com"
  if [ -n "${FIREBASE_AUTH_EMULATOR_HOST:-}" ]; then
    base="http://${FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com"
  fi

  curl -s -X POST "${base}/v1/accounts:signInWithCustomToken?key=${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"${custom_token}\",\"returnSecureToken\":true}" \
    | jq -r .idToken
}

get_custom_token() {
  local uid="$1"
  local role="$2"
  local courses_csv="$3"
  local create_profile="${4:-false}"

  curl -s "${WEB_BASE}/api/test-token?uid=${uid}&role=${role}&createProfile=${create_profile}&courses=${courses_csv}" | jq -r .token
}


mkdir -p .demo

echo "==> Seeding demo Firebase Auth users (email/password) + Firestore profiles"
node scripts/seed-firebase-users.mjs >/dev/null

echo "==> Creating demo teacher token (used to seed documents into search-service)"
TEACHER_CUSTOM=$(get_custom_token "demo-teacher" "teacher" "${CS204},${IR101},${RAG301}" "true")
TEACHER_ID=$(exchange_custom_to_id_token "$TEACHER_CUSTOM")

if [ -z "$TEACHER_ID" ] || [ "$TEACHER_ID" = "null" ]; then
  echo "ERROR: failed to create teacher ID token. Is ENABLE_TEST_AUTH=true and FIREBASE_SERVICE_ACCOUNT_PATH set?" >&2
  exit 1
fi

echo "==> Syncing teacher profile to search-service (/v1/users/me)"
curl -fsS -X POST "${WEB_BASE}/api/search-profile" \
  -H "Authorization: Bearer ${TEACHER_ID}" \
  -H "Content-Type: application/json" \
  -d '{}' >/dev/null

# --- Seed documents ---

echo "==> Uploading demo source files to Firebase Storage (${BUCKET})"
node scripts/seed-storage.mjs >/dev/null

seed_course() {
  local course_id="$1"
  local doc_id="$2"
  local title="$3"
  local content="$4"

  local source="gs://${BUCKET}/demo/${course_id}/${doc_id}.md"

  curl -fsS -X POST "${SEARCH_BASE}/v1/courses/${course_id}/documents:batchCreate" \
    -H "Authorization: Bearer ${TEACHER_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"documents\":[{\"id\":\"${doc_id}\",\"course_id\":\"${course_id}\",\"title\":\"${title}\",\"source\":\"${source}\",\"chunk_index\":0,\"content\":\"${content}\",\"metadata\":{\"type\":\"demo\"}}]}" \
    | jq -e . >/dev/null
}

echo "==> Seeding demo documents (3 courses)"
seed_course "$CS204" "demo-cs204-1" "Red-black trees" "Red-black trees maintain balance using recoloring and rotations."
seed_course "$CS204" "demo-cs204-2" "AVL trees" "AVL trees keep balance by rotations based on balance factors."
seed_course "$IR101" "demo-ir101-1" "BM25 basics" "BM25 ranks documents using term frequency and document length normalization."
seed_course "$IR101" "demo-ir101-2" "TF-IDF recap" "TF-IDF weights terms by frequency and inverse document frequency."
seed_course "$RAG301" "demo-rag301-1" "RAG overview" "Retrieval-Augmented Generation combines retrieval with generation for grounded answers."
seed_course "$RAG301" "demo-rag301-2" "Hybrid retrieval" "Hybrid search mixes lexical (BM25) with vector similarity for better recall."

# --- Create demo students ---
echo "==> Creating demo student tokens"
STUDENT1_CUSTOM=$(get_custom_token "demo-student-cs204" "student" "${CS204}")
STUDENT1_ID=$(exchange_custom_to_id_token "$STUDENT1_CUSTOM")

echo "$STUDENT1_ID" > .demo/student_cs204.idtoken

STUDENT2_CUSTOM=$(get_custom_token "demo-student-ir-rag" "student" "${IR101},${RAG301}")
STUDENT2_ID=$(exchange_custom_to_id_token "$STUDENT2_CUSTOM")

echo "$STUDENT2_ID" > .demo/student_ir_rag.idtoken

# --- Quick verification (API-level) ---

echo "==> Verifying access control (expected: CS204 allowed for student1; IR101 forbidden)"

curl -s -X POST "${WEB_BASE}/api/search" \
  -H "Authorization: Bearer ${STUDENT1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"q\":\"rotations\",\"courseId\":\"${CS204}\"}" \
  | jq -e '.results | length >= 1' >/dev/null

echo "==> Verifying document link resolution (expected: signed URL + 200 on fetch)"
SOURCE=$(curl -s -X POST "${WEB_BASE}/api/search" \
  -H "Authorization: Bearer ${STUDENT1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"q\":\"rotations\",\"courseId\":\"${CS204}\"}" \
  | jq -r '.results[0].source')

SIGNED_URL=$(curl -s -X POST "${WEB_BASE}/api/document-link" \
  -H "Authorization: Bearer ${STUDENT1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":\"${CS204}\",\"source\":\"${SOURCE}\"}" \
  | jq -r '.url')

if [ -z "${SIGNED_URL}" ] || [ "${SIGNED_URL}" = "null" ]; then
  echo "ERROR: failed to resolve signed URL for source: ${SOURCE}" >&2
  exit 1
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${SIGNED_URL}")
if [ "${HTTP_CODE}" != "200" ]; then
  echo "ERROR: expected 200 fetching signed URL; got ${HTTP_CODE}" >&2
  exit 1
fi

FORBIDDEN=$(curl -s -o /tmp/forbidden.json -w "%{http_code}" -X POST "${WEB_BASE}/api/search" \
  -H "Authorization: Bearer ${STUDENT1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"q\":\"BM25\",\"courseId\":\"${IR101}\"}")

if [ "$FORBIDDEN" != "403" ]; then
  echo "ERROR: expected 403 when student1 searches IR101; got ${FORBIDDEN}" >&2
  cat /tmp/forbidden.json >&2
  exit 1
fi

echo "==> Verifying rag-service can retrieve via /api/rag-chat (expected: 200)"

curl -s -X POST "${WEB_BASE}/api/rag-chat" \
  -H "Authorization: Bearer ${STUDENT1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":\"${CS204}\",\"messages\":[{\"role\":\"user\",\"content\":\"Explain rotations\"}],\"topK\":4}" \
  | jq -e '.answer | type == "string"' >/dev/null

if [ -n "${GEMINI_API_KEY:-}" ] && [ "${GEMINI_API_KEY}" != "your_gemini_api_key_here" ]; then
  echo "==> Verifying /api/rag-summary (Gemini) (expected: 200)"
  curl -s -X POST "${WEB_BASE}/api/rag-summary" \
    -H "Authorization: Bearer ${STUDENT1_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"q\":\"rotations\",\"courseId\":\"${CS204}\",\"topK\":6}" \
    | jq -e '.answer | type == "string"' >/dev/null
else
  echo "(Skipping /api/rag-summary check: GEMINI_API_KEY not set)"
fi

echo "==> Seed complete"
echo "Saved tokens (for curl testing):"
echo "  .demo/student_cs204.idtoken"
echo "  .demo/student_ir_rag.idtoken"
