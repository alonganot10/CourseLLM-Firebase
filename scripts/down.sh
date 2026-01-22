#!/usr/bin/env bash
set -euo pipefail

# Default ports used in this repo
WEB_PORT="${WEB_PORT:-9003}"
SEARCH_PORT="${SEARCH_PORT:-8080}"
RAG_PORT="${RAG_PORT:-8002}"

# Firebase Emulator Suite defaults (match firebase.json)
AUTH_EMULATOR_PORT="${AUTH_EMULATOR_PORT:-9099}"
FIRESTORE_EMULATOR_PORT="${FIRESTORE_EMULATOR_PORT:-8081}"
STORAGE_EMULATOR_PORT="${STORAGE_EMULATOR_PORT:-9199}"
EMULATOR_UI_PORT="${EMULATOR_UI_PORT:-4000}"
EMULATOR_HUB_PORT="${EMULATOR_HUB_PORT:-4400}"

port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :${port}" 2>/dev/null | grep -q LISTEN
    return $?
  fi
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  return 1
}

kill_tree() {
  local pid="$1"
  local sig="${2:-TERM}"

  # children first
  if command -v pgrep >/dev/null 2>&1; then
    local kids
    kids="$(pgrep -P "${pid}" 2>/dev/null || true)"
    for k in ${kids}; do
      kill_tree "${k}" "${sig}" || true
    done
  fi

  kill "-${sig}" "${pid}" 2>/dev/null || true
}

stop_docker_emulators_if_present() {
  # If emulators are running via Docker, "killing a port PID" may not stop them cleanly.
  if command -v docker >/dev/null 2>&1; then
    if [[ -f "docker-compose.emulators.yml" ]]; then
      docker compose -f docker-compose.emulators.yml down --remove-orphans >/dev/null 2>&1 || true
    fi
  fi
}

kill_port() {
  local port="$1"

  if ! port_listening "${port}"; then
    return 0
  fi

  echo "Freeing port ${port}..."

  # 0) If Docker emulators are up, try stopping them first.
  stop_docker_emulators_if_present

  # 1) Best: kill by PID from lsof (LISTEN only), including process tree.
  if command -v lsof >/dev/null 2>&1; then
    local pids=""
    pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      for pid in ${pids}; do
        kill_tree "${pid}" "TERM" || true
      done
      sleep 0.3
      for pid in ${pids}; do
        kill_tree "${pid}" "KILL" || true
      done
      sleep 0.2
    fi
  fi

  # 2) Fallback: fuser kills by port even when ss can't show PIDs (common in sandbox envs).
  if port_listening "${port}" && command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${port}/tcp" >/dev/null 2>&1 || true
    sleep 0.3
    if port_listening "${port}"; then
      fuser -k -KILL "${port}/tcp" >/dev/null 2>&1 || true
      sleep 0.2
    fi
  fi

  # 3) Last resort: kill common dev commands that tend to keep ports alive / respawn.
  if port_listening "${port}"; then
    pkill -f "next dev" >/dev/null 2>&1 || true
    pkill -f "pnpm.*dev" >/dev/null 2>&1 || true
    pkill -f "uvicorn" >/dev/null 2>&1 || true
    pkill -f "firebase.*emulators" >/dev/null 2>&1 || true
    sleep 0.3
  fi

  if port_listening "${port}"; then
    echo "ERROR: failed to free port ${port}" >&2
    if command -v ss >/dev/null 2>&1; then
      ss -ltnp "sport = :${port}" 2>/dev/null || ss -ltn "sport = :${port}" 2>/dev/null || true
    elif command -v lsof >/dev/null 2>&1; then
      lsof -nP -iTCP:"${port}" -sTCP:LISTEN || true
    fi
    return 1
  fi

  return 0
}

err=0
for p in \
  "${WEB_PORT}" \
  "${SEARCH_PORT}" \
  "${RAG_PORT}" \
  "${AUTH_EMULATOR_PORT}" \
  "${FIRESTORE_EMULATOR_PORT}" \
  "${STORAGE_EMULATOR_PORT}" \
  "${EMULATOR_UI_PORT}" \
  "${EMULATOR_HUB_PORT}"; do
  [[ -n "${p}" ]] || continue
  kill_port "${p}" || err=1
done

if [[ "${err}" -ne 0 ]]; then
  echo "Some ports could not be freed." >&2
  exit 1
fi

echo "Ports freed."
