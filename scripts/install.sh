#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

os="$(uname -s)"
hint() {
  case "$1" in
    node) [ "$os" = "Darwin" ] && echo "Install Node.js: brew install node" || echo "Install Node.js: sudo apt install -y nodejs" ;;
    pnpm) echo "Install pnpm: curl -fsSL https://get.pnpm.io/install.sh | sh -" ;;
    git) [ "$os" = "Darwin" ] && echo "Install git: brew install git" || echo "Install git: sudo apt install -y git" ;;
    tmux) [ "$os" = "Darwin" ] && echo "Install tmux: brew install tmux" || echo "Install tmux: sudo apt install -y tmux" ;;
  esac
}
need() {
  command -v "$1" >/dev/null 2>&1 && return 0
  echo "Missing required command: $1" >&2
  echo "$(hint "$1")" >&2
  exit 1
}

need node
need pnpm
need git
need tmux

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 22 ]; then
  echo "Node.js >= 22 is required (found $(node -v))." >&2
  exit 1
fi

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building Pairflow..."
pnpm build

echo "Linking pairflow globally..."
if ! pnpm link --global 2>/dev/null; then
  echo "Setting up pnpm global bin directory..."
  SHELL="${SHELL:-/bin/bash}" pnpm setup >/dev/null 2>&1 || true
  export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
  export PATH="$PNPM_HOME:$PATH"
  pnpm link --global
fi

if ! command -v pairflow >/dev/null 2>&1; then
  echo "Warning: pairflow is not on PATH after global link." >&2
  echo "Add pnpm global bin to PATH: $(pnpm bin --global):\$PATH" >&2
fi

echo "Initializing runtime directories..."
mkdir -p "$ROOT_DIR"/.pairflow/{bubbles,locks,runtime}
[ -f "$ROOT_DIR/.pairflow/sessions.json" ] || printf '[]\n' > "$ROOT_DIR/.pairflow/sessions.json"

echo "Running smoke test..."
if command -v pairflow >/dev/null 2>&1; then
  if ! pairflow bubble list --repo "$ROOT_DIR" --json >/dev/null; then
    echo "Smoke test failed: pairflow bubble list --repo \"$ROOT_DIR\" --json" >&2
    exit 1
  fi
else
  if ! node ./dist/cli/index.js bubble list --repo "$ROOT_DIR" --json >/dev/null; then
    echo "Smoke test failed: node ./dist/cli/index.js bubble list --repo \"$ROOT_DIR\" --json" >&2
    exit 1
  fi
fi

cat <<'MSG'
Install complete.
Next steps:
  1) pairflow bubble list --repo . --json
  2) pairflow bubble create --id demo --repo . --base main --task "Your task"
  3) pairflow bubble start --id demo --repo .
MSG
