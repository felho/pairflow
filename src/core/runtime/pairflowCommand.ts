import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { resolve, delimiter } from "node:path";

import { shellQuote } from "../util/shellQuote.js";
import type { PairflowCommandProfile } from "../../types/bubble.js";

export type PairflowCommandPathStatus =
  | "worktree_local"
  | "external"
  | "stale"
  | "missing"
  | "unknown";

export interface PairflowCommandPathAssessment {
  status: PairflowCommandPathStatus;
  reasonCode?:
    | "PAIRFLOW_COMMAND_PATH_STALE"
    | "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
    | "PAIRFLOW_COMMAND_PATH_UNRESOLVED";
  profile: PairflowCommandProfile;
  localEntrypoint: string;
  activeEntrypoint: string | null;
  localEntrypointExists: boolean;
  externalPairflowAvailable: boolean;
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

function resolveFirstPathCommand(commandName: string): string | null {
  const pathValue = process.env.PATH;
  if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
    return null;
  }

  const suffixes =
    process.platform === "win32"
      ? [".exe", ".cmd", ".bat", ""]
      : [""];
  const segments = pathValue.split(delimiter).filter((segment) => segment.length > 0);

  for (const segment of segments) {
    for (const suffix of suffixes) {
      const candidate = resolve(segment, `${commandName}${suffix}`);
      if (!existsSync(candidate)) {
        continue;
      }
      try {
        accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        continue;
      }
    }
  }

  return null;
}
function isExternalPairflowAvailable(): boolean {
  return resolveFirstPathCommand("pairflow") !== null;
}

export function buildPinnedPairflowCommand(
  worktreePath: string,
  profile: PairflowCommandProfile = "external"
): string {
  if (profile === "external") {
    return "pairflow";
  }
  return `node ${shellQuote(resolveWorktreePairflowEntrypoint(worktreePath))}`;
}

export function assessPairflowCommandPath(input: {
  worktreePath: string;
  profile?: PairflowCommandProfile | undefined;
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
  externalPairflowAvailable?: boolean | undefined;
}): PairflowCommandPathAssessment {
  const profile = input.profile ?? "external";
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
  const pinnedCommand = buildPinnedPairflowCommand(input.worktreePath, profile);
  const externalPairflowAvailable =
    input.externalPairflowAvailable ?? isExternalPairflowAvailable();

  if (profile === "external") {
    if (!externalPairflowAvailable) {
      const activeEntryDetail =
        canonicalActiveEntrypoint !== null
          ? ` Active entrypoint was resolved as ${activeEntrypoint}, but external profile requires PATH-resolved \`pairflow\` executable availability.`
          : "";
      return {
        status: "missing",
        reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
        profile,
        localEntrypoint,
        activeEntrypoint,
        localEntrypointExists,
        externalPairflowAvailable,
        pinnedCommand,
        message:
          `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE: no PATH-resolved \`pairflow\` command available for external profile.${activeEntryDetail}`
      };
    }
    const activeEntryDetail =
      canonicalActiveEntrypoint !== null
        ? ` active entrypoint: ${activeEntrypoint}.`
        : "";
    return {
      status: "external",
      profile,
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      externalPairflowAvailable,
      pinnedCommand,
      message:
        `external Pairflow command profile active (${externalPairflowAvailable ? "PATH-resolved `pairflow` available" : "PATH `pairflow` unavailable but active entrypoint is already resolved"}).${activeEntryDetail}`
    };
  }

  if (
    localEntrypointExists &&
    canonicalActiveEntrypoint !== null &&
    canonicalActiveEntrypoint === canonicalLocalEntrypoint
  ) {
    return {
      status: "worktree_local",
      profile,
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      externalPairflowAvailable,
      pinnedCommand,
      message: `worktree-local Pairflow entrypoint active (${localEntrypoint})`
    };
  }

  if (!localEntrypointExists) {
    return {
      status: "stale",
      reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
      profile,
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      externalPairflowAvailable,
      pinnedCommand,
      message: `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${localEntrypoint}.`
    };
  }

  if (canonicalActiveEntrypoint === null) {
    return {
      status: "unknown",
      reasonCode: "PAIRFLOW_COMMAND_PATH_UNRESOLVED",
      profile,
      localEntrypoint,
      activeEntrypoint,
      localEntrypointExists,
      externalPairflowAvailable,
      pinnedCommand,
      message:
        "PAIRFLOW_COMMAND_PATH_UNRESOLVED: active Pairflow entrypoint could not be resolved under self_host profile."
    };
  }

  return {
    status: "stale",
    reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
    profile,
    localEntrypoint,
    activeEntrypoint,
    localEntrypointExists,
    externalPairflowAvailable,
    pinnedCommand,
    message: `PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint ${activeEntrypoint ?? "unknown"} does not match worktree-local ${localEntrypoint}.`
  };
}

export function buildPairflowCommandBootstrap(
  worktreePath: string,
  profile: PairflowCommandProfile = "external"
): string[] {
  const resolvedWorktree = requireWorktreePath(worktreePath);
  const localEntrypoint = resolveWorktreePairflowEntrypoint(resolvedWorktree);
  const wrapperDir = resolve(resolvedWorktree, ".pairflow", "bin");
  const externalUnavailableMessage =
    "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE: PATH-resolved `pairflow` command is unavailable. " +
    "Install pairflow globally or run with --pairflow-command-profile self_host in Pairflow self-host worktrees.";
  const staleMessage =
    `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${localEntrypoint}. ` +
    "Rollout readiness is blocked until worker commands use the bubble worktree build output.";

  if (profile === "external") {
    return [
      `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(resolvedWorktree)}`,
      `export PAIRFLOW_COMMAND_PROFILE=${shellQuote(profile)}`,
      `export PAIRFLOW_LOCAL_ENTRYPOINT=${shellQuote(localEntrypoint)}`,
      `export PAIRFLOW_WRAPPER_DIR=${shellQuote(wrapperDir)}`,
      'mkdir -p "$PAIRFLOW_WRAPPER_DIR"',
      'export PAIRFLOW_WRAPPER_PATH="$PAIRFLOW_WRAPPER_DIR/pairflow"',
      'export PAIRFLOW_EXTERNAL_COMMAND="$(command -v pairflow || true)"',
      'if [ "$PAIRFLOW_EXTERNAL_COMMAND" = "$PAIRFLOW_WRAPPER_PATH" ]; then',
      '  export PAIRFLOW_EXTERNAL_COMMAND=""',
      "fi",
      'cat > "$PAIRFLOW_WRAPPER_DIR/pairflow" <<\'PAIRFLOW_WRAPPER\'',
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'PAIRFLOW_EXTERNAL_COMMAND="${PAIRFLOW_EXTERNAL_COMMAND:-}"',
      'PAIRFLOW_WRAPPER_PATH="${PAIRFLOW_WRAPPER_PATH:-}"',
      'if [ -n "$PAIRFLOW_EXTERNAL_COMMAND" ] && [ -x "$PAIRFLOW_EXTERNAL_COMMAND" ] && [ "$PAIRFLOW_EXTERNAL_COMMAND" != "$PAIRFLOW_WRAPPER_PATH" ] && [ "$PAIRFLOW_EXTERNAL_COMMAND" != "$0" ]; then',
      '  exec "$PAIRFLOW_EXTERNAL_COMMAND" "$@"',
      "fi",
      `printf '%s\\n' ${shellQuote(externalUnavailableMessage)}`,
      "exit 87",
      "PAIRFLOW_WRAPPER",
      'chmod +x "$PAIRFLOW_WRAPPER_DIR/pairflow"',
      'export PATH="$PAIRFLOW_WRAPPER_DIR:$PATH"',
      'if [ -n "$PAIRFLOW_EXTERNAL_COMMAND" ] && [ -x "$PAIRFLOW_EXTERNAL_COMMAND" ]; then',
      "  export PAIRFLOW_COMMAND_PATH_STATUS=external",
      "else",
      "  export PAIRFLOW_COMMAND_PATH_STATUS=missing",
      `  printf '%s\\n' ${shellQuote(externalUnavailableMessage)}`,
      "fi"
    ];
  }

  return [
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(resolvedWorktree)}`,
    `export PAIRFLOW_COMMAND_PROFILE=${shellQuote(profile)}`,
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

export function buildPairflowCommandGuidance(
  worktreePath: string,
  profile: PairflowCommandProfile = "external"
): string {
  const localEntrypoint = resolveWorktreePairflowEntrypoint(worktreePath);
  if (profile === "external") {
    return [
      "Default command profile is `external`; Pairflow commands are resolved from PATH.",
      "If external CLI is unavailable, install it globally or recreate the bubble with `--pairflow-command-profile self_host` in a Pairflow self-host worktree.",
      `Self-host local entrypoint (for opt-in only): ${localEntrypoint}.`
    ].join(" ");
  }
  return [
    `Use the worktree-local Pairflow CLI pinned in this pane (${localEntrypoint}).`,
    "The pane prepends a worktree-local `pairflow` wrapper to `PATH`; if a child process bypasses that wrapper, run the local entrypoint directly.",
    "If startup prints `PAIRFLOW_COMMAND_PATH_STALE`, treat rollout readiness as blocked and rebuild/use the local worktree entrypoint before trusting Pairflow commands."
  ].join(" ");
}
