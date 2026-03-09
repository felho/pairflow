import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

import { shellQuote } from "../util/shellQuote.js";

export type PairflowCommandPathStatus = "worktree_local" | "stale";

export interface PairflowCommandPathAssessment {
  status: PairflowCommandPathStatus;
  reasonCode?: "PAIRFLOW_COMMAND_PATH_STALE";
  localEntrypoint: string;
  activeEntrypoint: string | null;
  localEntrypointExists: boolean;
  pinnedCommand: string;
  message: string;
}

function requireWorktreePath(worktreePath: string): string {
  const trimmed = worktreePath.trim();
  if (trimmed.length === 0) {
    throw new Error("Worktree path is required to resolve Pairflow command path.");
  }
  return resolve(trimmed);
}

function canonicalizeExistingPath(path: string | null): string | null {
  if (path === null || !existsSync(path)) {
    return path;
  }
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
}

export function resolveWorktreePairflowEntrypoint(worktreePath: string): string {
  return resolve(requireWorktreePath(worktreePath), "dist", "cli", "index.js");
}

export function buildPinnedPairflowCommand(worktreePath: string): string {
  return `node ${shellQuote(resolveWorktreePairflowEntrypoint(worktreePath))}`;
}

export function assessPairflowCommandPath(input: {
  worktreePath: string;
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
}): PairflowCommandPathAssessment {
  const localEntrypoint = resolveWorktreePairflowEntrypoint(input.worktreePath);
  const activeEntrypoint =
    input.activeEntrypoint === undefined || input.activeEntrypoint.trim().length === 0
      ? null
      : resolve(input.activeEntrypoint.trim());
  const localEntrypointExists =
    input.localEntrypointExists ?? existsSync(localEntrypoint);
  const canonicalLocalEntrypoint = localEntrypointExists
    ? canonicalizeExistingPath(localEntrypoint)
    : localEntrypoint;
  const canonicalActiveEntrypoint = canonicalizeExistingPath(activeEntrypoint);
  const pinnedCommand = buildPinnedPairflowCommand(input.worktreePath);

  if (
    localEntrypointExists &&
    canonicalActiveEntrypoint !== null &&
    canonicalActiveEntrypoint === canonicalLocalEntrypoint
  ) {
    return {
      status: "worktree_local",
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      pinnedCommand,
      message: `worktree-local Pairflow entrypoint active (${localEntrypoint})`
    };
  }

  if (!localEntrypointExists) {
    return {
      status: "stale",
      reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      pinnedCommand,
      message: `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${localEntrypoint}.`
    };
  }

  return {
    status: "stale",
    reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
    localEntrypoint,
    activeEntrypoint,
    localEntrypointExists,
    pinnedCommand,
    message: `PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint ${activeEntrypoint ?? "unknown"} does not match worktree-local ${localEntrypoint}.`
  };
}

export function buildPairflowCommandBootstrap(worktreePath: string): string[] {
  const resolvedWorktree = requireWorktreePath(worktreePath);
  const localEntrypoint = resolveWorktreePairflowEntrypoint(resolvedWorktree);
  const wrapperDir = resolve(resolvedWorktree, ".pairflow", "bin");
  const staleMessage =
    `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${localEntrypoint}. ` +
    "Rollout readiness is blocked until worker commands use the bubble worktree build output.";

  return [
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(resolvedWorktree)}`,
    `export PAIRFLOW_LOCAL_ENTRYPOINT=${shellQuote(localEntrypoint)}`,
    `export PAIRFLOW_WRAPPER_DIR=${shellQuote(wrapperDir)}`,
    'mkdir -p "$PAIRFLOW_WRAPPER_DIR"',
    'cat > "$PAIRFLOW_WRAPPER_DIR/pairflow" <<\'PAIRFLOW_WRAPPER\'',
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    `PAIRFLOW_LOCAL_ENTRYPOINT=${shellQuote(localEntrypoint)}`,
    'if [ -f "$PAIRFLOW_LOCAL_ENTRYPOINT" ]; then',
    '  exec node "$PAIRFLOW_LOCAL_ENTRYPOINT" "$@"',
    "fi",
    `printf '%s\\n' ${shellQuote(staleMessage)}`,
    "exit 86",
    "PAIRFLOW_WRAPPER",
    'chmod +x "$PAIRFLOW_WRAPPER_DIR/pairflow"',
    'export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"',
    'if [ -f "$PAIRFLOW_LOCAL_ENTRYPOINT" ]; then',
    "  export PAIRFLOW_COMMAND_PATH_STATUS=worktree_local",
    "else",
    "  export PAIRFLOW_COMMAND_PATH_STATUS=stale",
    `  printf '%s\\n' ${shellQuote(staleMessage)}`,
    "fi"
  ];
}

export function buildPairflowCommandGuidance(worktreePath: string): string {
  const localEntrypoint = resolveWorktreePairflowEntrypoint(worktreePath);
  return [
    `Use the worktree-local Pairflow CLI pinned in this pane (${localEntrypoint}).`,
    "The pane prepends a worktree-local `pairflow` wrapper to `PATH`; if a child process bypasses that wrapper, run the local entrypoint directly.",
    "If startup prints `PAIRFLOW_COMMAND_PATH_STALE`, treat rollout readiness as blocked and rebuild/use the local worktree entrypoint before trusting Pairflow commands."
  ].join(" ");
}
