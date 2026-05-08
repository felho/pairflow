import { resolve } from "node:path";

import type { PairflowCommandProfile } from "../config/bubbleConfigVocabulary.js";
import { shellQuote } from "../foundation/shellQuote.js";
import {
  remoteStartExternalPairflowCommandEnvVar,
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../bubble/remoteStartExecutionContext.js";
import {
  resolveExternalPairflowCommand,
  resolveWorktreePairflowEntrypoint
} from "./pairflowCommandPathAssessment.js";

export interface PairflowRemoteWorkspaceAuthority {
  workspaceRoot: string;
  externalPairflowCommand?: string;
}

export function buildPinnedPairflowCommand(
  workspacePath: string,
  profile: PairflowCommandProfile = "external",
  externalCommandOverride?: string
): string {
  if (profile === "external") {
    return externalCommandOverride !== undefined &&
      externalCommandOverride.trim().length > 0
      ? shellQuote(externalCommandOverride.trim())
      : "pairflow";
  }
  return `node ${shellQuote(resolveWorktreePairflowEntrypoint(workspacePath))}`;
}

export function buildPairflowCommandBootstrap(
  workspacePath: string,
  profile: PairflowCommandProfile = "external",
  externalCommandOverride?: string,
  remoteWorkspaceAuthority?: PairflowRemoteWorkspaceAuthority
): string[] {
  const resolvedWorktree = resolve(workspacePath.trim());
  const localEntrypoint = resolveWorktreePairflowEntrypoint(resolvedWorktree);
  const wrapperDir = resolve(resolvedWorktree, ".pairflow", "bin");
  const resolvedRemoteWorkspaceRoot =
    remoteWorkspaceAuthority?.workspaceRoot !== undefined
      ? resolve(remoteWorkspaceAuthority.workspaceRoot.trim())
      : undefined;
  const resolvedRemoteExternalCommand =
    remoteWorkspaceAuthority?.externalPairflowCommand?.trim().length
      ? remoteWorkspaceAuthority.externalPairflowCommand.trim()
      : undefined;
  const resolvedExternalCommand =
    profile === "external"
      ? externalCommandOverride?.trim().length
        ? externalCommandOverride.trim()
        : resolveExternalPairflowCommand(resolvedWorktree)
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
      ...(resolvedRemoteWorkspaceRoot !== undefined
        ? [
            `export ${remoteStartModeEnvVar}=${shellQuote(remoteStartModeInnerRemoteActivation)}`,
            `export ${remoteStartWorkspaceRootEnvVar}=${shellQuote(resolvedRemoteWorkspaceRoot)}`,
            ...(resolvedRemoteExternalCommand !== undefined
              ? [
                  `export ${remoteStartExternalPairflowCommandEnvVar}=${shellQuote(resolvedRemoteExternalCommand)}`
                ]
              : [])
          ]
        : []),
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
    ...(resolvedRemoteWorkspaceRoot !== undefined
      ? [
          `export ${remoteStartModeEnvVar}=${shellQuote(remoteStartModeInnerRemoteActivation)}`,
          `export ${remoteStartWorkspaceRootEnvVar}=${shellQuote(resolvedRemoteWorkspaceRoot)}`,
          ...(resolvedRemoteExternalCommand !== undefined
            ? [
                `export ${remoteStartExternalPairflowCommandEnvVar}=${shellQuote(resolvedRemoteExternalCommand)}`
              ]
            : [])
        ]
      : []),
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
  workspacePath: string,
  profile: PairflowCommandProfile = "external"
): string {
  const localEntrypoint = resolveWorktreePairflowEntrypoint(workspacePath);
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
