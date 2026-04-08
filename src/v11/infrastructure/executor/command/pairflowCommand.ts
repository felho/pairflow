import { accessSync, constants, existsSync, realpathSync } from "node:fs";
import { resolve, delimiter } from "node:path";

import { shellQuote } from "../../foundation/shell/shellQuote.js";
import type { PairflowCommandProfile } from "../../../../types/bubble.js";
import type { PairflowCommandPathAssessment } from "../../../shared/ports/pairflowCommand.js";

export type {
  PairflowCommandPathAssessment,
  PairflowCommandPathStatus
} from "../../../shared/ports/pairflowCommand.js";

function requireWorktreePath(worktreePath: string): string {
  const trimmed = worktreePath.trim();
  if (trimmed.length === 0) {
    throw new Error(
      "PAIRFLOW_COMMAND_WORKTREE_REQUIRED: context operation_id=resolve_pairflow_command_path worktree_path=empty."
    );
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

function normalizePathForComparison(path: string): string {
  const resolvedPath = resolve(path);
  return process.platform === "win32"
    ? resolvedPath.toLowerCase()
    : resolvedPath;
}

export function resolveWorktreePairflowEntrypoint(worktreePath: string): string {
  return resolve(requireWorktreePath(worktreePath), "dist", "cli", "index.js");
}

function resolveFirstPathCommand(
  commandName: string,
  input: {
    pathValue?: string | undefined;
    excludedDirectories?: readonly string[] | undefined;
  } = {}
): string | null {
  const pathValue = input.pathValue ?? process.env.PATH;
  if (typeof pathValue !== "string" || pathValue.trim().length === 0) {
    return null;
  }

  const suffixes =
    process.platform === "win32"
      ? [".exe", ".cmd", ".bat", ""]
      : [""];
  const excludedDirectories = new Set(
    (input.excludedDirectories ?? []).map((segment) =>
      normalizePathForComparison(segment)
    )
  );
  const segments = pathValue.split(delimiter).filter(
    (segment) =>
      segment.length > 0
      && !excludedDirectories.has(normalizePathForComparison(segment))
  );

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

export function resolveExternalPairflowCommand(worktreePath?: string): string | null {
  const excludedDirectories =
    worktreePath === undefined
      ? []
      : [resolve(requireWorktreePath(worktreePath), ".pairflow", "bin")];
  return resolveFirstPathCommand("pairflow", {
    excludedDirectories
  });
}

function isExternalPairflowAvailable(worktreePath?: string): boolean {
  return resolveExternalPairflowCommand(worktreePath) !== null;
}

function isPairflowDistCliEntrypoint(path: string | null): boolean {
  if (path === null) {
    return false;
  }
  const normalized = path.replace(/\\/gu, "/");
  return normalized.endsWith("/dist/cli/index.js");
}

function resolveExternalEntrypointConsistency(input: {
  localEntrypointExists: boolean;
  canonicalLocalEntrypoint: string | null;
  canonicalActiveEntrypoint: string | null;
}): "consistent" | "inconsistent" | "unknown" {
  if (
    input.localEntrypointExists
    && input.canonicalActiveEntrypoint !== null
    && input.canonicalLocalEntrypoint !== null
    && input.canonicalActiveEntrypoint === input.canonicalLocalEntrypoint
  ) {
    return "consistent";
  }

  if (
    input.localEntrypointExists
    && input.canonicalActiveEntrypoint !== null
    && input.canonicalLocalEntrypoint !== null
    && isPairflowDistCliEntrypoint(input.canonicalActiveEntrypoint)
  ) {
    return "inconsistent";
  }

  return "unknown";
}

interface PairflowCommandPathResolutionContext {
  profile: PairflowCommandProfile;
  localEntrypoint: string;
  activeEntrypoint: string | null;
  localEntrypointExists: boolean;
  canonicalLocalEntrypoint: string | null;
  canonicalActiveEntrypoint: string | null;
  pinnedCommand: string;
  externalPairflowAvailable: boolean;
}

function resolvePairflowCommandPathResolutionContext(input: {
  worktreePath: string;
  profile: PairflowCommandProfile;
  activeEntrypoint?: string | undefined;
  localEntrypointExists?: boolean | undefined;
  externalPairflowAvailable?: boolean | undefined;
}): PairflowCommandPathResolutionContext {
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

  return {
    profile: input.profile,
    localEntrypoint,
    activeEntrypoint,
    localEntrypointExists,
    canonicalLocalEntrypoint,
    canonicalActiveEntrypoint,
    pinnedCommand: buildPinnedPairflowCommand(input.worktreePath, input.profile),
    externalPairflowAvailable:
      input.externalPairflowAvailable ?? isExternalPairflowAvailable(input.worktreePath)
  };
}

function buildExternalPairflowCommandAssessment(
  input: PairflowCommandPathResolutionContext
): PairflowCommandPathAssessment {
  const entrypointConsistency = resolveExternalEntrypointConsistency({
    localEntrypointExists: input.localEntrypointExists,
    canonicalLocalEntrypoint: input.canonicalLocalEntrypoint,
    canonicalActiveEntrypoint: input.canonicalActiveEntrypoint
  });
  if (!input.externalPairflowAvailable) {
    const activeEntryDetail =
      input.canonicalActiveEntrypoint !== null
        ? ` Active entrypoint was resolved as ${input.activeEntrypoint}, but external profile requires PATH-resolved \`pairflow\` executable availability.`
        : "";
    return {
      status: "missing",
      reasonCode: "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency,
      message:
        `PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE: no PATH-resolved \`pairflow\` command available for external profile.${activeEntryDetail}`
    };
  }

  const activeEntryDetail =
    input.canonicalActiveEntrypoint !== null
      ? ` active entrypoint: ${input.activeEntrypoint}.`
      : "";
  const localEntryDetail =
    entrypointConsistency === "inconsistent"
      ? ` Worktree-local entrypoint ${input.localEntrypoint} differs from the active entrypoint, but external profile authority remains the PATH-resolved \`pairflow\` tool.`
      : "";
  return {
    status: "external",
    profile: input.profile,
    localEntrypoint: input.localEntrypoint,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable,
    pinnedCommand: input.pinnedCommand,
    entrypointConsistency,
    message:
      `external Pairflow command profile active (PATH-resolved \`pairflow\` available).${activeEntryDetail}${localEntryDetail}`
  };
}

function buildSelfHostPairflowCommandAssessment(
  input: PairflowCommandPathResolutionContext
): PairflowCommandPathAssessment {
  if (
    input.localEntrypointExists &&
    input.canonicalActiveEntrypoint !== null &&
    input.canonicalActiveEntrypoint === input.canonicalLocalEntrypoint
  ) {
    return {
      status: "worktree_local",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency: "consistent",
      message: `worktree-local Pairflow entrypoint active (${input.localEntrypoint})`
    };
  }

  if (!input.localEntrypointExists) {
    return {
      status: "stale",
      reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency:
        input.canonicalActiveEntrypoint !== null ? "inconsistent" : "unknown",
      message: `PAIRFLOW_COMMAND_PATH_STALE: worktree-local Pairflow entrypoint missing at ${input.localEntrypoint}.`
    };
  }

  if (input.canonicalActiveEntrypoint === null) {
    return {
      status: "unknown",
      reasonCode: "PAIRFLOW_COMMAND_PATH_UNRESOLVED",
      profile: input.profile,
      localEntrypoint: input.localEntrypoint,
      activeEntrypoint: input.activeEntrypoint,
      localEntrypointExists: input.localEntrypointExists,
      externalPairflowAvailable: input.externalPairflowAvailable,
      pinnedCommand: input.pinnedCommand,
      entrypointConsistency: "unknown",
      message:
        "PAIRFLOW_COMMAND_PATH_UNRESOLVED: active Pairflow entrypoint could not be resolved under self_host profile."
    };
  }

  return {
    status: "stale",
    reasonCode: "PAIRFLOW_COMMAND_PATH_STALE",
    profile: input.profile,
    localEntrypoint: input.localEntrypoint,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable,
    pinnedCommand: input.pinnedCommand,
    entrypointConsistency: "inconsistent",
    message:
      `PAIRFLOW_COMMAND_PATH_STALE: active Pairflow entrypoint ${input.activeEntrypoint ?? "unknown"} does not match worktree-local ${input.localEntrypoint}.`
  };
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
  const context = resolvePairflowCommandPathResolutionContext({
    worktreePath: input.worktreePath,
    profile,
    activeEntrypoint: input.activeEntrypoint,
    localEntrypointExists: input.localEntrypointExists,
    externalPairflowAvailable: input.externalPairflowAvailable
  });

  return profile === "external"
    ? buildExternalPairflowCommandAssessment(context)
    : buildSelfHostPairflowCommandAssessment(context);
}

export function buildPairflowCommandBootstrap(
  worktreePath: string,
  profile: PairflowCommandProfile = "external"
): string[] {
  const resolvedWorktree = requireWorktreePath(worktreePath);
  const localEntrypoint = resolveWorktreePairflowEntrypoint(resolvedWorktree);
  const wrapperDir = resolve(resolvedWorktree, ".pairflow", "bin");
  const resolvedExternalCommand =
    profile === "external"
      ? resolveExternalPairflowCommand(resolvedWorktree)
      : null;
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
      `export PAIRFLOW_WRAPPER_DIR=${shellQuote(wrapperDir)}`,
      'mkdir -p "$PAIRFLOW_WRAPPER_DIR"',
      'export PAIRFLOW_WRAPPER_PATH="$PAIRFLOW_WRAPPER_DIR/pairflow"',
      `export PAIRFLOW_EXTERNAL_COMMAND=${shellQuote(resolvedExternalCommand ?? "")}`,
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
      "In bubble panes, the command wrapper delegates to the PATH-resolved external `pairflow`; a worktree-local `dist/cli/index.js` is diagnostic only and never becomes implicit authority under `external`.",
      "Bubble panes also export `PAIRFLOW_WORKTREE_ROOT`, so bubble-scoped Pairflow commands can still resolve the active worktree if a child process loses its current directory.",
      "If external CLI is unavailable, install it globally or recreate the bubble with `--pairflow-command-profile self_host` in a Pairflow self-host worktree.",
      `Self-host local entrypoint (for opt-in only): ${localEntrypoint}.`
    ].join(" ");
  }
  return [
    `Use the worktree-local Pairflow CLI pinned in this pane (${localEntrypoint}).`,
    "The pane prepends a worktree-local `pairflow` wrapper to `PATH`; if a child process bypasses that wrapper, run the local entrypoint directly.",
    "Bubble panes also export `PAIRFLOW_WORKTREE_ROOT`, so bubble-scoped Pairflow commands can still resolve the active worktree if a child process loses its current directory.",
    "If startup prints `PAIRFLOW_COMMAND_PATH_STALE`, treat rollout readiness as blocked and rebuild/use the local worktree entrypoint before trusting Pairflow commands."
  ].join(" ");
}
