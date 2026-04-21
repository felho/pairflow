import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type {
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult
} from "../../../application/merge/mergeCommandContract.js";
import { buildMergeImportRef } from "../../../application/merge/mergeCommandContract.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  buildSshCommandArgs
} from "./sshBubbleStart.js";

const remoteMergeExitStatusStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__";
const remoteMergeExitStatusEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__";
const remoteMergeStdoutStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__";
const remoteMergeStdoutEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__";
const remoteMergeStderrStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDERR_START__";
const remoteMergeStderrEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDERR_END__";
const remoteMergeReasonCodePattern =
  /^(?:[A-Za-z][A-Za-z0-9]*Error:\s+)?([A-Z][A-Z0-9_]{2,})(?::(?:\s|$)|$)/u;

export interface RemoteBubbleMergeCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

interface RemoteBubbleMergeCommandErrorContext {
  command_name: "merge";
  bubble_id?: string;
  remote_alias?: string;
  remote_host?: string;
  remote_clone_path?: string;
  remote_reason_code?: string;
  operation?: "transport" | "payload" | "command";
}

export class RemoteBubbleMergeCommandError extends Error {
  public readonly code:
    | "REMOTE_MERGE_TRANSPORT_FAILED"
    | "REMOTE_MERGE_PAYLOAD_INVALID"
    | "REMOTE_MERGE_COMMAND_FAILED"
    | (string & {});
  public readonly context: RemoteBubbleMergeCommandErrorContext | undefined;

  public constructor(input: {
    code:
      | "REMOTE_MERGE_TRANSPORT_FAILED"
      | "REMOTE_MERGE_PAYLOAD_INVALID"
      | "REMOTE_MERGE_COMMAND_FAILED"
      | (string & {});
    message: string;
    cause?: unknown;
    context?: RemoteBubbleMergeCommandErrorContext;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleMergeCommandError";
    this.code = input.code;
    this.context = input.context;
  }
}

function buildRemoteBubbleMergeCommandLine(
  input: ExecuteRemoteBubbleMergeCommandInput
): string {
  return [
    "git",
    "merge",
    "--no-ff",
    "--no-edit",
    shellQuote(input.bubbleBranch)
  ].join(" ");
}

export function buildRemoteBubbleMergeScript(
  input: ExecuteRemoteBubbleMergeCommandInput
): string {
  const remoteCommandLine = buildRemoteBubbleMergeCommandLine(input);
  const importRef = buildMergeImportRef(input.bubbleId);

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `base_branch=${shellQuote(input.baseBranch)}`,
    `bubble_branch=${shellQuote(input.bubbleBranch)}`,
    `import_ref=${shellQuote(importRef)}`,
    `bubble_id=${shellQuote(input.bubbleId)}`,
    `tmux_session_name=${shellQuote(input.tmuxSessionName ?? "")}`,
    "export base_branch bubble_branch import_ref bubble_id tmux_session_name",
    "stdout_file=$(mktemp)",
    "stderr_file=$(mktemp)",
    "cleanup() { rm -f \"$stdout_file\" \"$stderr_file\"; }",
    "trap cleanup EXIT",
    "command_exit_code=0",
    "set +e",
    "(",
    "  set -euo pipefail",
    "  git checkout \"$base_branch\" >&2",
    `  ${remoteCommandLine} >&2`,
    "  merge_commit_sha=$(git rev-parse HEAD)",
    "  git update-ref \"$import_ref\" \"$merge_commit_sha\"",
    "  export merge_commit_sha import_ref",
    "  node <<'NODE'",
    "const payload = {",
    "  bubbleId: process.env.bubble_id,",
    "  baseBranch: process.env.base_branch,",
    "  bubbleBranch: process.env.bubble_branch,",
    "  mergeCommitSha: process.env.merge_commit_sha,",
    "  importSource: {",
    "    kind: 'git_ref',",
    "    ref: process.env.import_ref,",
    "    commitSha: process.env.merge_commit_sha",
    "  },",
    "  cleanupPending: true",
    "};",
    "if (typeof process.env.tmux_session_name === 'string' && process.env.tmux_session_name.length > 0) {",
    "  payload.tmuxSessionName = process.env.tmux_session_name;",
    "}",
    "process.stdout.write(JSON.stringify(payload));",
    "NODE",
    `) >"$stdout_file" 2>"$stderr_file"`,
    "command_exit_code=$?",
    "set -e",
    "if [ \"$command_exit_code\" -ne 0 ]; then",
    "  if git rev-parse --verify -q MERGE_HEAD >/dev/null 2>&1; then",
    "    git merge --abort >/dev/null 2>&1 || true",
    "    printf '%s\\n' 'MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict' >>\"$stderr_file\"",
    "  fi",
    "fi",
    `printf '%s\\n' ${shellQuote(remoteMergeExitStatusStartMarker)}`,
    "printf '%s\\n' \"$command_exit_code\"",
    `printf '%s\\n' ${shellQuote(remoteMergeExitStatusEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeStdoutStartMarker)}`,
    "cat \"$stdout_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeStdoutEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteMergeStderrStartMarker)}`,
    "cat \"$stderr_file\"",
    `printf '\\n%s\\n' ${shellQuote(remoteMergeStderrEndMarker)}`
  ].join("\n");
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function escapeRegExpLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
}): string {
  const pattern = new RegExp(
    `${escapeRegExpLiteral(input.startMarker)}\\n([\\s\\S]*?)\\n${escapeRegExpLiteral(input.endMarker)}`,
    "gu"
  );
  const matches = [...input.stdout.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message:
        `Remote merge returned stdout without exactly one ${input.label} marker envelope.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return matches[0]?.[1] ?? "";
}

function parseRemoteExitStatus(stdout: string): number {
  const rawStatus = extractMarkerPayload({
    stdout,
    startMarker: remoteMergeExitStatusStartMarker,
    endMarker: remoteMergeExitStatusEndMarker,
    label: "exit-status"
  }).trim();
  if (!/^\d+$/u.test(rawStatus)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge returned an invalid exit status payload.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  const parsed = Number(rawStatus);
  return parsed;
}

function parseRemoteMergeResult(
  raw: string
): ExecuteRemoteBubbleMergeCommandResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge returned invalid JSON payload.",
      cause: error,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge returned a non-object JSON payload.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }

  const candidate = parsed as Record<string, unknown>;
  const importSource = candidate.importSource;
  const stringFields = [
    "bubbleId",
    "baseBranch",
    "bubbleBranch",
    "mergeCommitSha"
  ] as const;
  const forbiddenFields = [
    "pushedBaseBranch",
    "deletedRemoteBranch",
    "tmuxSessionExisted",
    "runtimeSessionRemoved",
    "removedWorktree",
    "removedBubbleBranch"
  ] as const;

  // Keep the parser compat-tolerant for bounded rollout extras such as legacy
  // `remoteCommitSha`, but only the normative pre-cleanup handoff fields below are
  // part of the contract this phase owns.

  for (const field of stringFields) {
    if (typeof candidate[field] !== "string" || candidate[field].trim().length === 0) {
      throw new RemoteBubbleMergeCommandError({
        code: "REMOTE_MERGE_PAYLOAD_INVALID",
        message: `Remote merge payload field '${field}' must be a non-empty string.`,
        context: {
          command_name: "merge",
          operation: "payload"
        }
      });
    }
  }
  for (const field of forbiddenFields) {
    if (field in candidate) {
      throw new RemoteBubbleMergeCommandError({
        code: "REMOTE_MERGE_PAYLOAD_INVALID",
        message: `Remote merge payload field '${field}' is not allowed in pre-cleanup handoff mode.`,
        context: {
          command_name: "merge",
          operation: "payload"
        }
      });
    }
  }

  if (candidate.cleanupPending !== true) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message:
        "Remote merge payload must keep cleanupPending=true for pre-cleanup handoff.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  if (
    importSource === null
    || typeof importSource !== "object"
    || Array.isArray(importSource)
  ) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload field 'importSource' must be an object.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }

  const importSourceRecord = importSource as Record<string, unknown>;
  if (importSourceRecord.kind !== "git_ref") {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload importSource.kind must equal 'git_ref'.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  if (
    typeof importSourceRecord.ref !== "string"
    || importSourceRecord.ref.trim().length === 0
  ) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload importSource.ref must be a non-empty string.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  if (
    typeof importSourceRecord.commitSha !== "string"
    || importSourceRecord.commitSha.trim().length === 0
  ) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload importSource.commitSha must be a non-empty string.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  if (
    "tmuxSessionName" in candidate
    && (
      typeof candidate.tmuxSessionName !== "string"
      || candidate.tmuxSessionName.trim().length === 0
    )
  ) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload tmuxSessionName must be a non-empty string when present.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return {
    bubbleId: candidate.bubbleId as string,
    baseBranch: candidate.baseBranch as string,
    bubbleBranch: candidate.bubbleBranch as string,
    mergeCommitSha: candidate.mergeCommitSha as string,
    importSource: {
      kind: "git_ref",
      ref: importSourceRecord.ref,
      commitSha: importSourceRecord.commitSha
    },
    cleanupPending: true,
    ...(typeof candidate.tmuxSessionName === "string"
      ? { tmuxSessionName: candidate.tmuxSessionName }
      : {})
  };
}

function buildRemoteCommandFailure(input: {
  stderr: string;
  stdout: string;
  bubbleId: string;
}): ConstructorParameters<typeof RemoteBubbleMergeCommandError>[0] {
  const detailSource =
    input.stderr.trim().length > 0 ? input.stderr.trim() : input.stdout.trim();
  const reasonCode = detailSource
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => remoteMergeReasonCodePattern.test(line))
    ?.match(remoteMergeReasonCodePattern)?.[1];
  return {
    code:
      (reasonCode as RemoteBubbleMergeCommandError["code"] | undefined)
      ?? "REMOTE_MERGE_COMMAND_FAILED",
    message:
      detailSource.length > 0
        ? detailSource
        : `Remote merge command failed for bubble ${input.bubbleId}.`,
    context: {
      command_name: "merge",
      bubble_id: input.bubbleId,
      operation: "command",
      ...(reasonCode !== undefined ? { remote_reason_code: reasonCode } : {})
    }
  };
}

export async function executeRemoteBubbleMergeCommand(
  input: ExecuteRemoteBubbleMergeCommandInput,
  dependencies: RemoteBubbleMergeCommandDependencies = {}
): Promise<ExecuteRemoteBubbleMergeCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const target = input.remoteTarget.user !== undefined
    ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
    : input.remoteTarget.host;
  const script = buildRemoteBubbleMergeScript(input);

  let transportResult: Awaited<ReturnType<typeof runCommand>>;
  try {
    transportResult = await runCommand("ssh", buildSshCommandArgs({
      target,
      script
    }));
  } catch (error) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_TRANSPORT_FAILED",
      message:
        `Remote merge transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(error instanceof Error ? error.message : String(error)),
      cause: error,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteTarget.alias,
        remote_host: input.remoteTarget.host,
        remote_clone_path: input.remoteClonePath,
        operation: "transport"
      }
    });
  }

  if (transportResult.exitCode !== 0) {
    const detailSource =
      transportResult.stderr.trim().length > 0
        ? transportResult.stderr
        : transportResult.stdout;
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_TRANSPORT_FAILED",
      message:
        `Remote merge transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(detailSource),
      cause: transportResult.stderr,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteTarget.alias,
        remote_host: input.remoteTarget.host,
        remote_clone_path: input.remoteClonePath,
        operation: "transport"
      }
    });
  }

  const exitStatus = parseRemoteExitStatus(transportResult.stdout);
  const stdoutPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeStdoutStartMarker,
    endMarker: remoteMergeStdoutEndMarker,
    label: "stdout"
  });
  const stderrPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeStderrStartMarker,
    endMarker: remoteMergeStderrEndMarker,
    label: "stderr"
  }).trim();

  if (exitStatus !== 0) {
    throw new RemoteBubbleMergeCommandError(buildRemoteCommandFailure({
      stderr: stderrPayload,
      stdout: stdoutPayload,
      bubbleId: input.bubbleId
    }));
  }

  return parseRemoteMergeResult(stdoutPayload);
}
