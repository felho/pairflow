import { dirname } from "node:path";

import {
  parseBubbleConfigToml,
  renderBubbleConfigToml
} from "../../../../config/bubbleConfig.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import {
  remoteStartExternalPairflowCommandEnvVar,
  remoteStartModeEnvVar,
  remoteStartModeInnerRemoteActivation,
  remoteStartWorkspaceRootEnvVar
} from "../../../shared/bubble/remoteStartExecutionContext.js";

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;
const remoteHomeDirectoryStartMarker = "__PAIRFLOW_REMOTE_HOME_START__";
const remoteHomeDirectoryEndMarker = "__PAIRFLOW_REMOTE_HOME_END__";
const remoteStateSnapshotStartMarker = "__PAIRFLOW_REMOTE_STATE_JSON_START__";
const remoteStateSnapshotEndMarker = "__PAIRFLOW_REMOTE_STATE_JSON_END__";

export type RemoteBubbleStartErrorCode =
  | "REMOTE_HOME_DIRECTORY_INVALID"
  | "REMOTE_CONFIRMATION_INVALID"
  | "REMOTE_START_COMMAND_INVALID"
  | "REMOTE_START_PAYLOAD_INVALID"
  | "REMOTE_START_TRANSPORT_FAILED"
  | "REMOTE_STATE_SNAPSHOT_INVALID";

export class RemoteBubbleStartError extends Error {
  public readonly code: RemoteBubbleStartErrorCode;
  public readonly details:
    | {
        receivedState?: string | null;
        receivedRound?: number | null;
      }
    | undefined;
  public readonly context: Record<string, unknown> | undefined;

  public constructor(input: {
    code: RemoteBubbleStartErrorCode;
    message: string;
    details?: {
      receivedState?: string | null;
      receivedRound?: number | null;
    };
    context?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "RemoteBubbleStartError";
    this.code = input.code;
    this.details = input.details;
    this.context = input.context;
  }
}

export function buildSshTarget(input: {
  host: string;
  user?: string;
}): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

export function buildRemoteInstanceId(nowIso: string): string {
  return `inst_${nowIso.replace(/[-:.]/gu, "")}`;
}

export function isHomeRelativeRemotePath(path: string): boolean {
  return path === "~" || path.startsWith("~/");
}

export function resolveHomeRelativeRemotePath(input: {
  path: string;
  remoteHomeDirectory: string;
}): string {
  if (!isHomeRelativeRemotePath(input.path)) {
    return input.path;
  }

  const normalizedHome = input.remoteHomeDirectory.replace(/\/+$/u, "");
  if (input.path === "~") {
    return normalizedHome;
  }

  return `${normalizedHome}/${input.path.slice(2)}`;
}

export function quoteRemoteShellPath(path: string): string {
  return shellQuote(path);
}

function buildSshTransportArgs(): string[] {
  return sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]);
}

export function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...buildSshTransportArgs(),
    input.target,
    "bash",
    "-lc",
    input.script
  ];
}

export function buildScpCommandArgs(input: {
  sourcePath: string;
  destination: string;
}): string[] {
  return [
    "-rq",
    ...buildSshTransportArgs(),
    input.sourcePath,
    input.destination
  ];
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

export function describeTransportFailure(input: {
  command: "ssh" | "scp";
  exitCode: number;
  stdout: string;
  stderr: string;
}): string {
  const detailSource = input.stderr.trim().length > 0 ? input.stderr : input.stdout;
  return `${input.command} transport failed (exit ${input.exitCode}): ${summarizeTransportOutput(detailSource)}`;
}

export function assertSingleTokenPairflowCommand(command: string): string {
  if (command.trim().length === 0 || /\s/gu.test(command)) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_START_COMMAND_INVALID",
      message:
        "Remote pairflow_command must be a single executable token without whitespace; use pairflow_sync_command for compound shell workflows.",
      context: {
        pairflow_command: command
      }
    });
  }
  return command;
}

export function buildScpUploadDestination(input: {
  target: string;
  remoteClonePath: string;
}): string {
  const normalizedPath = `${input.remoteClonePath.replace(/\/+$/u, "")}/`;
  return `${input.target}:${normalizedPath}`;
}

export function rewriteRemoteBubbleTomlRepoPath(input: {
  bubbleTomlContent: string;
  remoteClonePath: string;
}): string {
  const parsed = parseBubbleConfigToml(input.bubbleTomlContent);
  return `${renderBubbleConfigToml({
    ...parsed,
    repo_path: input.remoteClonePath
  })}\n`;
}

export function buildCloneRemoteRepositoryScript(input: {
  originUrl: string;
  remoteClonePath: string;
  bubbleBranch: string;
  baseBranch: string;
}): string {
  const remoteParent = dirname(input.remoteClonePath);
  const quotedBubbleBranch = shellQuote(input.bubbleBranch);
  const quotedBaseBranch = shellQuote(input.baseBranch);
  const quotedOriginBaseRef = shellQuote(`origin/${input.baseBranch}`);
  return [
    "set -euo pipefail",
    `mkdir -p ${quoteRemoteShellPath(remoteParent)}`,
    `if [ -e ${quoteRemoteShellPath(input.remoteClonePath)} ]; then`,
    `  printf '%s\\n' ${shellQuote(`Remote clone path already exists: ${input.remoteClonePath}`)}`,
    "  exit 32",
    "fi",
    `git clone ${shellQuote(input.originUrl)} ${quoteRemoteShellPath(input.remoteClonePath)}`,
    `cd ${quoteRemoteShellPath(input.remoteClonePath)}`,
    `git checkout -B ${quotedBubbleBranch} ${quotedOriginBaseRef} || git checkout -B ${quotedBubbleBranch} ${quotedBaseBranch}`
  ].join("\n");
}

export function buildRemoteInnerStartScript(input: {
  pairflowCommand: string;
  bubbleId: string;
  remoteClonePath: string;
}): string {
  const quotedRemoteClonePath = quoteRemoteShellPath(input.remoteClonePath);
  const pairflowCommand = assertSingleTokenPairflowCommand(input.pairflowCommand);
  return [
    "set -euo pipefail",
    `cd ${quotedRemoteClonePath}`,
    `export PAIRFLOW_WORKTREE_ROOT=${quotedRemoteClonePath}`,
    `export ${remoteStartModeEnvVar}=${shellQuote(remoteStartModeInnerRemoteActivation)}`,
    `export ${remoteStartWorkspaceRootEnvVar}=${quotedRemoteClonePath}`,
    `export ${remoteStartExternalPairflowCommandEnvVar}=${shellQuote(pairflowCommand)}`,
    `${shellQuote(pairflowCommand)} bubble start --id ${shellQuote(input.bubbleId)} --repo ${quotedRemoteClonePath}`
  ].join("\n");
}

export function buildReadRemoteHomeDirectoryScript(): string {
  return [
    "set -euo pipefail",
    `printf '%s\\n' ${shellQuote(remoteHomeDirectoryStartMarker)}`,
    "printf '%s\\n' \"$HOME\"",
    `printf '%s\\n' ${shellQuote(remoteHomeDirectoryEndMarker)}`
  ].join("\n");
}

export function buildReadRemoteStateSnapshotScript(statePath: string): string {
  return [
    "set -euo pipefail",
    `printf '%s\\n' ${shellQuote(remoteStateSnapshotStartMarker)}`,
    `cat ${quoteRemoteShellPath(statePath)}`,
    `printf '\\n%s\\n' ${shellQuote(remoteStateSnapshotEndMarker)}`
  ].join("\n");
}

function extractMarkerEnvelopePayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  payloadLabel: string;
}): string {
  const markerPattern = new RegExp(
    `${input.startMarker}\\r?\\n([\\s\\S]*?)\\r?\\n${input.endMarker}`,
    "gu"
  );
  const matches = [...input.stdout.matchAll(markerPattern)];
  if (matches.length !== 1) {
    throw new RemoteBubbleStartError({
      code: "REMOTE_START_PAYLOAD_INVALID",
      message:
        `${input.payloadLabel} returned stdout without exactly one marker envelope.`
        + ` stdout_summary=${summarizeTransportOutput(input.stdout)}`,
      context: {
        payload_label: input.payloadLabel
      }
    });
  }
  return matches[0]?.[1] ?? "";
}

export function extractRemoteHomeDirectoryPayload(stdout: string): string {
  return extractMarkerEnvelopePayload({
    stdout,
    startMarker: remoteHomeDirectoryStartMarker,
    endMarker: remoteHomeDirectoryEndMarker,
    payloadLabel: "Remote home directory resolution"
  });
}

export function extractRemoteStateSnapshotPayload(stdout: string): string {
  return extractMarkerEnvelopePayload({
    stdout,
    startMarker: remoteStateSnapshotStartMarker,
    endMarker: remoteStateSnapshotEndMarker,
    payloadLabel: "Remote start confirmation"
  });
}
