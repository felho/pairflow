#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DOCKER_BIN="${DOCKER:-docker}"
IMAGE="${PAIRFLOW_GITHUB_LOCAL_IMAGE:-node:24-bookworm}"
PLATFORM="${PAIRFLOW_GITHUB_LOCAL_PLATFORM:-linux/amd64}"
CONTAINER_WORKDIR="${PAIRFLOW_GITHUB_LOCAL_WORKDIR:-/repo}"
VOLUME_PREFIX="${PAIRFLOW_GITHUB_LOCAL_VOLUME_PREFIX:-pairflow-github-local}"
VALIDATE_FROM="${PAIRFLOW_COMMIT_RANGE_FROM:-${VALIDATE_FROM:-}}"
VALIDATE_TO="${PAIRFLOW_COMMIT_RANGE_TO:-${VALIDATE_TO:-}}"

if ! command -v "$DOCKER_BIN" >/dev/null 2>&1; then
  echo "ci:github-local requires Docker. Install and start Docker Desktop, then retry."
  exit 127
fi

if ! "$DOCKER_BIN" info >/dev/null 2>&1; then
  echo "ci:github-local could not reach the Docker daemon. Start Docker Desktop, then retry."
  exit 1
fi

if { [[ -n "$VALIDATE_FROM" ]] && [[ -z "$VALIDATE_TO" ]]; } || { [[ -z "$VALIDATE_FROM" ]] && [[ -n "$VALIDATE_TO" ]]; }; then
  echo "ci:github-local requires both PAIRFLOW_COMMIT_RANGE_FROM and PAIRFLOW_COMMIT_RANGE_TO for explicit range validation."
  exit 1
fi

echo "ci:github-local start"
echo "  image: $IMAGE"
echo "  platform: $PLATFORM"
echo "  workflow parity: .github/workflows/release.yml validate job"
echo

"$DOCKER_BIN" run --rm \
  --platform "$PLATFORM" \
  -e CI=true \
  -e GITHUB_ACTIONS=true \
  -e VALIDATE_FROM="$VALIDATE_FROM" \
  -e VALIDATE_TO="$VALIDATE_TO" \
  -v "$ROOT_DIR:$CONTAINER_WORKDIR" \
  -v "$VOLUME_PREFIX-root-node-modules:$CONTAINER_WORKDIR/node_modules" \
  -v "$VOLUME_PREFIX-ui-node-modules:$CONTAINER_WORKDIR/ui/node_modules" \
  -v "$VOLUME_PREFIX-v3-node-modules:$CONTAINER_WORKDIR/v3/node_modules" \
  -v "$VOLUME_PREFIX-pnpm-store:/pnpm-store" \
  -w "$CONTAINER_WORKDIR" \
  "$IMAGE" \
  bash -lc '
    set -euo pipefail

    git config --global --add safe.directory "$PWD"
    corepack enable
    corepack prepare pnpm@10.8.1 --activate
    pnpm config set store-dir /pnpm-store

    echo "ci:github-local environment"
    node --version
    pnpm --version
    git --version
    echo

    echo "ci:github-local step: install root dependencies"
    pnpm install --frozen-lockfile
    echo

    echo "ci:github-local step: install UI dependencies"
    pnpm --dir ui install --frozen-lockfile
    echo

    echo "ci:github-local step: install v3 dependencies"
    pnpm --dir v3 install --frozen-lockfile
    echo

    echo "ci:github-local step: reject incomplete explicit commit range"
    if { [ -n "${VALIDATE_FROM:-}" ] && [ -z "${VALIDATE_TO:-}" ]; } || { [ -z "${VALIDATE_FROM:-}" ] && [ -n "${VALIDATE_TO:-}" ]; }; then
      echo "Both validate_from and validate_to are required when requesting explicit commit-policy range validation."
      exit 1
    fi
    echo "ci:github-local step passed: reject incomplete explicit commit range"
    echo

    if [ -n "${VALIDATE_FROM:-}" ] && [ -n "${VALIDATE_TO:-}" ]; then
      echo "ci:github-local step: validate optional explicit commit range"
      pnpm commit-policy:validate-range -- --from "$VALIDATE_FROM" --to "$VALIDATE_TO"
      echo
    else
      echo "ci:github-local step skipped: validate optional explicit commit range"
      echo
    fi

    echo "ci:github-local step: validate release automation config"
    pnpm release:validate
    echo

    echo "ci:github-local step: typecheck"
    pnpm typecheck
    echo

    echo "ci:github-local step: lint"
    pnpm lint
    echo

    echo "ci:github-local step: fitness checks"
    pnpm fitness:check:ci
    echo

    echo "ci:github-local step: test"
    pnpm test
    echo

    echo "ci:github-local step: v3 checks"
    pnpm v3:lint
    pnpm v3:typecheck
    pnpm v3:test
    pnpm v3:adr-check
    pnpm v3:coverage
    pnpm v3:packet-lint
    echo

    echo "ci:github-local step: build"
    pnpm build
    echo

    echo "ci:github-local passed"
  '
