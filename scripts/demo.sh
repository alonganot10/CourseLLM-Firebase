#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

SEARCH_PORT=${SEARCH_PORT:-8080}
RAG_PORT=${RAG_PORT:-8002}
NEXT_PORT=${NEXT_PORT:-9003}
START_RAG_SERVICE=${START_RAG_SERVICE:-1}

if [ ! -f ".env.local" ]; then
  echo "ERROR: .env.local not found." >&2
  echo "Create it from .env.local.example:" >&2
  echo "  cp .env.local.example .env.local" >&2
  echo "  # then fill in keys/secrets" >&2
  exit 1
fi

# Export env vars from .env.local for this shell (server-only values are used by Next API routes).
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# --- Firebase emulator settings (computed after loading .env.local) ---
USE_EMULATORS="${NEXT_PUBLIC_USE_FIREBASE_EMULATORS:-false}"
AUTH_EMULATOR_HOSTPORT="${FIREBASE_AUTH_EMULATOR_HOST:-127.0.0.1:9099}"
FIRESTORE_EMULATOR_HOSTPORT="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8081}"
STORAGE_EMULATOR_HOSTPORT="${FIREBASE_STORAGE_EMULATOR_HOST:-127.0.0.1:9199}"
AUTH_EMULATOR_PORT="${AUTH_EMULATOR_HOSTPORT##*:}"
FIRESTORE_EMULATOR_PORT="${FIRESTORE_EMULATOR_HOSTPORT##*:}"
STORAGE_EMULATOR_PORT="${STORAGE_EMULATOR_HOSTPORT##*:}"

if [[ "$USE_EMULATORS" == "true" ]]; then
  # Ensure server-side Admin SDKs pick up emulator settings.
  export FIREBASE_AUTH_EMULATOR_HOST="$AUTH_EMULATOR_HOSTPORT"
  export FIRESTORE_EMULATOR_HOST="$FIRESTORE_EMULATOR_HOSTPORT"
  export FIREBASE_STORAGE_EMULATOR_HOST="$STORAGE_EMULATOR_HOSTPORT"
  # Some libraries (Google Cloud Storage client) use STORAGE_EMULATOR_HOST and require a URL with protocol.
  export STORAGE_EMULATOR_HOST="http://${STORAGE_EMULATOR_HOSTPORT}"
fi

# Ensure python services verify tokens against the correct Firebase project
if [[ -z "${FIREBASE_PROJECT_ID:-}" ]]; then
  export FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}"
fi

if [[ -z "${FIREBASE_PROJECT_ID:-}" ]]; then
  echo "ERROR: FIREBASE_PROJECT_ID (or NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set" >&2
  exit 1
fi

# Make service-account path absolute so it works even when services run from subdirs
if [[ -n "${FIREBASE_SERVICE_ACCOUNT_PATH:-}" && "${FIREBASE_SERVICE_ACCOUNT_PATH}" != /* ]]; then
  export FIREBASE_SERVICE_ACCOUNT_PATH="${ROOT_DIR}/${FIREBASE_SERVICE_ACCOUNT_PATH#./}"
fi

# Many libs also honor GOOGLE_APPLICATION_CREDENTIALS; set it for python services.
if [[ -n "${FIREBASE_SERVICE_ACCOUNT_PATH:-}" && -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  export GOOGLE_APPLICATION_CREDENTIALS="${FIREBASE_SERVICE_ACCOUNT_PATH}"
fi


port_free_or_die() {
  local port="$1"
  if ss -ltn "sport = :${port}" 2>/dev/null | grep -q LISTEN; then
    echo "ERROR: port ${port} is already in use" >&2
    exit 1
  fi
}

echo "==> Stopping any previous demo processes (freeing ports)"
WEB_PORT="$NEXT_PORT" SEARCH_PORT="$SEARCH_PORT" RAG_PORT="$RAG_PORT" bash scripts/down.sh || true
sleep 1

# Ensure ports are actually free now
port_free_or_die "$SEARCH_PORT"
if [[ "$START_RAG_SERVICE" == "1" ]]; then
  port_free_or_die "$RAG_PORT"
fi
port_free_or_die "$NEXT_PORT"

if [[ "$USE_EMULATORS" == "true" ]]; then
  port_free_or_die "$AUTH_EMULATOR_PORT"
  port_free_or_die "$FIRESTORE_EMULATOR_PORT"
  port_free_or_die "$STORAGE_EMULATOR_PORT"
fi

# Ensure deps are installed
bash scripts/bootstrap.sh

ensure_venv() {
  local svc_dir="$1"
  local req_file="$2"

  cd "$ROOT_DIR/$svc_dir"

  # If venv python doesn't exist or isn't executable, rebuild it (common after reset).
  if [[ ! -x ".venv/bin/python" ]]; then
    echo "==> Recreating venv for $svc_dir (stale or missing)"
    rm -rf .venv
    python3 -m venv .venv
  fi

  # Install/update deps (idempotent)
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -r "$req_file" >/dev/null
  deactivate

  cd "$ROOT_DIR"
}

run_uvicorn() {
  local host="$1" port="$2" app="$3"
  export PYTHONUNBUFFERED=1
  python -m uvicorn "$app" --host "$host" --port "$port"
}

wait_for_port() {
  local name="$1" port="$2"
  local tries=90
  echo "Waiting for $name on :$port"
  for _ in $(seq 1 "$tries"); do
    (echo > "/dev/tcp/127.0.0.1/${port}") >/dev/null 2>&1 && {
      echo "$name is up"
      return 0
    }
    sleep 1
  done
  echo "ERROR: $name did not become ready in time" >&2
  return 1
}

start_emulators() {
  if [[ "$USE_EMULATORS" != "true" ]]; then
    return 0
  fi

  if ! command -v firebase >/dev/null 2>&1; then
    echo "ERROR: firebase CLI not found (needed to run emulators). Install it with: npm i -g firebase-tools" >&2
    exit 1
  fi

  echo "==> Starting Firebase emulators (auth + firestore + storage)"
  mkdir -p .demo
  firebase emulators:start --only auth,firestore,storage --project "$FIREBASE_PROJECT_ID" > .demo/emulators.log 2>&1 &
  PID_EMULATORS=$!

  wait_for_port "auth emulator" "$AUTH_EMULATOR_PORT"
  wait_for_port "firestore emulator" "$FIRESTORE_EMULATOR_PORT"
  wait_for_port "storage emulator" "$STORAGE_EMULATOR_PORT"
}

cleanup() {
  echo -e "\n==> Shutting down..."
  [[ -n "${PID_EMULATORS:-}" ]] && kill "$PID_EMULATORS" 2>/dev/null || true
  [[ -n "${PID_SEARCH:-}" ]] && kill "$PID_SEARCH" 2>/dev/null || true
  [[ -n "${PID_RAG:-}" ]] && kill "$PID_RAG" 2>/dev/null || true
  [[ -n "${PID_WEB:-}" ]] && kill "$PID_WEB" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ensure_venv "search-service" "requirements.txt"
if [[ "$START_RAG_SERVICE" == "1" ]]; then
  ensure_venv "rag-service" "requirements.txt"
fi

start_emulators

echo "==> Starting search-service on :${SEARCH_PORT}"
(
  cd search-service
  # shellcheck disable=SC1091
  source .venv/bin/activate
  run_uvicorn "0.0.0.0" "$SEARCH_PORT" "app.main:app"
) &
PID_SEARCH=$!

if [[ "$START_RAG_SERVICE" == "1" ]]; then
  echo "==> Starting rag-service on :${RAG_PORT}"
  (
    cd rag-service
    # shellcheck disable=SC1091
    source .venv/bin/activate
    export SEARCH_SERVICE_URL="http://127.0.0.1:${SEARCH_PORT}"
    run_uvicorn "0.0.0.0" "$RAG_PORT" "app.main:app"
  ) &
  PID_RAG=$!
fi

echo "==> Starting Next.js web app on :${NEXT_PORT}"
(
  pnpm exec next dev -p "$NEXT_PORT"
) &
PID_WEB=$!

wait_for() {
  local name="$1"
  local url="$2"
  local tries=90
  echo "Waiting for $name: $url"
  for _ in $(seq 1 "$tries"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$name is up"
      return 0
    fi
    sleep 1
  done
  echo "ERROR: $name did not become ready in time" >&2
  return 1
}

wait_for "search-service" "http://127.0.0.1:${SEARCH_PORT}/health"
if [[ "$START_RAG_SERVICE" == "1" ]]; then
  wait_for "rag-service" "http://127.0.0.1:${RAG_PORT}/health"
fi
wait_for "web" "http://127.0.0.1:${NEXT_PORT}/login"

echo "==> Seeding demo data"
bash scripts/seed-demo.sh

echo -e "\n==> Demo is ready"
echo "Web:         http://127.0.0.1:${NEXT_PORT}"
echo "Search docs: http://127.0.0.1:${SEARCH_PORT}/docs"
if [[ "$START_RAG_SERVICE" == "1" ]]; then
  echo "RAG docs:    http://127.0.0.1:${RAG_PORT}/docs"
fi

echo -e "\n(Press Ctrl+C to stop everything)"
wait
