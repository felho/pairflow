#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${PAIRFLOW_UI_TMUX_SESSION:-pf-ui-server}"
HOST="${PAIRFLOW_UI_HOST:-127.0.0.1}"
PORT="${PAIRFLOW_UI_PORT:-4173}"
LOG_PATH="${PAIRFLOW_UI_LOG_PATH:-/tmp/pairflow-ui.log}"
UI_ENTRY="$ROOT_DIR/dist/cli/index.js"
PROCESS_PATTERN="$UI_ENTRY ui"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

is_listening() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

print_listener() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
}

session_exists() {
  tmux has-session -t "$SESSION_NAME" 2>/dev/null
}

kill_direct_ui_processes() {
  local pids
  pids="$(pgrep -f "$PROCESS_PATTERN" || true)"
  if [[ -n "$pids" ]]; then
    # shellcheck disable=SC2086
    kill $pids || true
  fi
}

start_ui() {
  require_command tmux
  require_command node

  if session_exists; then
    echo "UI tmux session already exists: $SESSION_NAME"
  else
    local launch_command
    printf -v launch_command \
      "cd %q && exec node %q ui --host %q --port %q >> %q 2>&1" \
      "$ROOT_DIR" \
      "$UI_ENTRY" \
      "$HOST" \
      "$PORT" \
      "$LOG_PATH"
    tmux new-session -d -s "$SESSION_NAME" "$launch_command"
    echo "Started UI tmux session: $SESSION_NAME"
  fi

  sleep 1
  if ! is_listening; then
    echo "UI server failed to listen on ${HOST}:${PORT}" >&2
    if [[ -f "$LOG_PATH" ]]; then
      echo "--- UI log tail ---" >&2
      tail -n 80 "$LOG_PATH" >&2 || true
    fi
    exit 1
  fi

  echo "UI server is listening on http://${HOST}:${PORT}"
  print_listener
}

stop_ui() {
  if session_exists; then
    tmux kill-session -t "$SESSION_NAME"
    echo "Stopped UI tmux session: $SESSION_NAME"
  else
    echo "UI tmux session not found: $SESSION_NAME"
  fi

  kill_direct_ui_processes
  sleep 1

  if is_listening; then
    echo "Warning: something is still listening on port $PORT" >&2
    print_listener >&2
    exit 1
  fi

  echo "UI server is stopped (port $PORT is free)."
}

status_ui() {
  echo "Root: $ROOT_DIR"
  echo "Session: $SESSION_NAME"
  echo "Host/port: ${HOST}:${PORT}"
  echo "Log: $LOG_PATH"

  if session_exists; then
    echo "Session status: running"
    tmux list-sessions | rg "^${SESSION_NAME}:" || true
  else
    echo "Session status: stopped"
  fi

  if is_listening; then
    echo "Port status: listening"
    print_listener
  else
    echo "Port status: not listening"
  fi
}

usage() {
  cat <<EOF
Usage: scripts/ui-server.sh <start|stop|restart|status>

Env vars:
  PAIRFLOW_UI_TMUX_SESSION  (default: pf-ui-server)
  PAIRFLOW_UI_HOST          (default: 127.0.0.1)
  PAIRFLOW_UI_PORT          (default: 4173)
  PAIRFLOW_UI_LOG_PATH      (default: /tmp/pairflow-ui.log)
EOF
}

main() {
  local action="${1:-}"
  case "$action" in
    start)
      start_ui
      ;;
    stop)
      stop_ui
      ;;
    restart)
      stop_ui || true
      start_ui
      ;;
    status)
      status_ui
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
