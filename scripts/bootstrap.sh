#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

echo "==> Bootstrapping repo dependencies"

# --- Node deps ---
corepack enable >/dev/null 2>&1 || true

if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not found. Install Node.js 18+ and enable corepack." >&2
  exit 1
fi

if [ ! -f "node_modules/next/dist/bin/next" ]; then
  echo "Installing Node dependencies (pnpm install)..."
  rm -rf node_modules
  pnpm install
else
  echo "Node dependencies already installed (next present)."
fi

if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "ERROR: python not found. Install Python 3.11+." >&2
  exit 1
fi


ensure_venv() {
  local svc_dir="$1"
  local req_main="$svc_dir/requirements.txt"
  local req_dev="$svc_dir/requirements-dev.txt"

  if [ ! -d "$svc_dir" ]; then
    echo "ERROR: missing directory: $svc_dir" >&2
    exit 1
  fi
  if [ ! -f "$req_main" ]; then
    echo "ERROR: missing: $req_main" >&2
    exit 1
  fi

  # Recreate venv if missing OR stale/broken (common after workstation reset)
  if [ ! -x "$svc_dir/.venv/bin/python" ]; then
    echo "Recreating venv: $svc_dir/.venv"
    rm -rf "$svc_dir/.venv"
    python3 -m venv "$svc_dir/.venv"
  fi


  # shellcheck disable=SC1090
  source "$svc_dir/.venv/bin/activate"
  "$PY" -m pip install -U pip >/dev/null
  echo "Installing Python deps for $svc_dir"
  "$PY" -m pip install -r "$req_main"
  if [ -f "$req_dev" ]; then
    "$PY" -m pip install -r "$req_dev"
  fi
  deactivate
}

ensure_venv "search-service"
ensure_venv "rag-service"

echo "==> Bootstrap complete"