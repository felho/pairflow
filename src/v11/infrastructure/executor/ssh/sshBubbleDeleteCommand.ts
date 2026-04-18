import type { DeleteBubbleResult } from "../../../../contracts/deleteBubble.js";
import {
  remoteDeleteModeEnvVar,
  remoteDeleteModeInnerRemoteExecution,
  remoteDeleteWorkspaceRootEnvVar
} from "../../../application/delete/remoteDeleteExecutionContext.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  assertSingleTokenPairflowCommand,
  buildSshCommandArgs
} from "./sshBubbleStart.js";

const remoteDeleteExitStatusStartMarker =
  "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__";
const remoteDeleteExitStatusEndMarker =
  "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__";
const remoteDeleteStdoutStartMarker =
  "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__";
const remoteDeleteStdoutEndMarker =
  "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__";
const remoteDeleteStderrStartMarker =
  "__PAIRFLOW_REMOTE_DELETE_STDERR_START__";
const remoteDeleteStderrEndMarker =
  "__PAIRFLOW_REMOTE_DELETE_STDERR_END__";
const remoteDeleteReasonCodePattern =
  /^(?:[A-Za-z][A-Za-z0-9]*Error:\s+)?([A-Z][A-Z0-9_]{2,})(?::(?:\s|$)|$)/u;

type ArchiveCaptureFileLabel =
  | "bubble_toml"
  | "state_json"
  | "transcript_ndjson"
  | "inbox_ndjson"
  | "task_md";

export interface RemoteDeleteArchiveCapture {
  sourceBubbleDir: string;
  bubbleToml: string;
  stateJson: string;
  transcriptNdjson: string;
  inboxNdjson: string;
  taskMarkdown?: string;
}

export interface ExecuteRemoteBubbleDeleteCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  force: boolean;
}

export interface ExecuteRemoteBubbleDeleteCommandResult {
  result: DeleteBubbleResult;
  archiveCapture?: RemoteDeleteArchiveCapture;
}

export interface RemoteBubbleDeleteCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export class RemoteBubbleDeleteCommandError extends Error {
  public readonly code:
    | "REMOTE_DELETE_TRANSPORT_FAILED"
    | "REMOTE_DELETE_PAYLOAD_INVALID"
    | "REMOTE_DELETE_COMMAND_FAILED"
    | (string & {});

  public constructor(input: {
    code:
      | "REMOTE_DELETE_TRANSPORT_FAILED"
      | "REMOTE_DELETE_PAYLOAD_INVALID"
      | "REMOTE_DELETE_COMMAND_FAILED"
      | (string & {});
    message: string;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleDeleteCommandError";
    this.code = input.code;
  }
}

function buildRemoteBubbleDeleteCommandLine(
  input: ExecuteRemoteBubbleDeleteCommandInput
): string {
  const pairflowCommand = assertSingleTokenPairflowCommand(
    input.remoteTarget.pairflowCommand
  );
  const args = [
    pairflowCommand,
    "bubble",
    "delete",
    "--id",
    input.bubbleId,
    "--repo",
    input.remoteClonePath,
    ...(input.force ? ["--force"] : []),
    "--json"
  ];
  return args.map((value) => shellQuote(value)).join(" ");
}

function buildCaptureMarker(label: ArchiveCaptureFileLabel, kind: "start" | "end"): string {
  const normalizedLabel = label.toUpperCase();
  return `__PAIRFLOW_REMOTE_DELETE_CAPTURE_${normalizedLabel}_${kind.toUpperCase()}__`;
}

function buildCaptureSnippet(input: {
  label: ArchiveCaptureFileLabel;
  path: string;
}): string {
  const failureMessage =
    `REMOTE_DELETE_CAPTURE_FAILED: Failed to capture ${input.label} from ${input.path}`;
  return [
    `printf '%s\\n' ${shellQuote(buildCaptureMarker(input.label, "start"))}`,
    `if [ -f ${shellQuote(input.path)} ]; then`,
    "  printf '%s\\n' 'present'",
    `  if ! base64 < ${shellQuote(input.path)} | tr -d '\\n'; then`,
    `    printf '%s\\n' ${shellQuote(failureMessage)} >&2`,
    "    exit 91",
    "  fi",
    "  printf '\\n'",
    "else",
    "  printf '%s\\n' 'missing'",
    "fi",
    `printf '\\n%s\\n' ${shellQuote(buildCaptureMarker(input.label, "end"))}`
  ].join("\n");
}

export function buildRemoteBubbleDeleteScript(
  input: ExecuteRemoteBubbleDeleteCommandInput
): string {
  const remoteCommandLine = buildRemoteBubbleDeleteCommandLine(input);
  const remoteBubbleDir =
    `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const remoteTaskPath = `${remoteBubbleDir}/artifacts/task.md`;

  return [
    "set -euo pipefail",
    `if [ ! -d ${shellQuote(input.remoteClonePath)} ]; then`,
    `  printf '%s\\n' ${shellQuote(`REMOTE_DELETE_INVALID_TARGET: Missing remote clone path ${input.remoteClonePath}`)} >&2`,
    "  exit 1",
    "fi",
    `cd ${shellQuote(`${input.remoteClonePath}/..`)}`,
    buildCaptureSnippet({
      label: "bubble_toml",
      path: `${remoteBubbleDir}/bubble.toml`
    }),
    buildCaptureSnippet({
      label: "state_json",
      path: `${remoteBubbleDir}/state.json`
    }),
    buildCaptureSnippet({
      label: "transcript_ndjson",
      path: `${remoteBubbleDir}/transcript.ndjson`
    }),
    buildCaptureSnippet({
      label: "inbox_ndjson",
      path: `${remoteBubbleDir}/inbox.ndjson`
    }),
    buildCaptureSnippet({
      label: "task_md",
      path: remoteTaskPath
    }),
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `export ${remoteDeleteModeEnvVar}=${shellQuote(remoteDeleteModeInnerRemoteExecution)}`,
    `export ${remoteDeleteWorkspaceRootEnvVar}=${shellQuote(input.remoteClonePath)}`,
    "stdout_file=$(mktemp)",
    "stderr_file=$(mktemp)",
    "cleanup() { rm -f \"$stdout_file\" \"$stderr_file\"; }",
    "trap cleanup EXIT",
    "command_exit_code=0",
    "set +e",
    `${remoteCommandLine} >"$stdout_file" 2>"$stderr_file"`,
    "command_exit_code=$?",
    "set -e",
    `printf '%s\\n' ${shellQuote(remoteDeleteExitStatusStartMarker)}`,
    "printf '%s\\n' \"$command_exit_code\"",
    `printf '%s\\n' ${shellQuote(remoteDeleteExitStatusEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteDeleteStdoutStartMarker)}`,
    "base64 < \"$stdout_file\" | tr -d '\\n'",
    `printf '\\n%s\\n' ${shellQuote(remoteDeleteStdoutEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteDeleteStderrStartMarker)}`,
    "base64 < \"$stderr_file\" | tr -d '\\n'",
    `printf '\\n%s\\n' ${shellQuote(remoteDeleteStderrEndMarker)}`
  ].join("\n");
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function decodeBase64Payload(input: {
  raw: string;
  label: string;
}): string {
  const normalized = input.raw.trim();
  if (normalized.length > 0 && !/^[A-Za-z0-9+/=]+$/u.test(normalized)) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: `Remote delete returned invalid base64 payload characters for ${input.label}.`
    });
  }
  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch (error) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: `Remote delete returned invalid base64 payload for ${input.label}.`,
      cause: error
    });
  }
}

function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
  base64Encoded?: boolean;
}): string {
  const lines = input.stdout.split(/\r?\n/gu);
  const startIndexes = lines
    .map((line, index) => line === input.startMarker ? index : -1)
    .filter((index) => index >= 0);
  const endIndexes = lines
    .map((line, index) => line === input.endMarker ? index : -1)
    .filter((index) => index >= 0);

  if (startIndexes.length !== 1 || endIndexes.length !== 1) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete returned stdout without exactly one ${input.label} marker envelope.`
    });
  }

  const startIndex = startIndexes[0] as number;
  const endIndex = endIndexes[0] as number;
  if (endIndex <= startIndex) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete returned misordered ${input.label} marker envelope.`
    });
  }

  const raw = lines.slice(startIndex + 1, endIndex).join("\n");
  if (input.base64Encoded === true) {
    return decodeBase64Payload({
      raw,
      label: input.label
    });
  }
  return raw;
}

function parseDeleteBubbleResult(input: {
  raw: string;
  bubbleId: string;
}): DeleteBubbleResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete returned invalid JSON payload.",
      cause: error
    });
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete returned a non-object JSON payload."
    });
  }

  const candidate = parsed as Record<string, unknown>;
  const topLevelStringFields = ["bubbleId"] as const;
  const topLevelBooleanFields = [
    "deleted",
    "requiresConfirmation",
    "tmuxSessionTerminated",
    "runtimeSessionRemoved",
    "removedWorktree",
    "removedBubbleBranch"
  ] as const;

  for (const field of topLevelStringFields) {
    if (typeof candidate[field] !== "string" || candidate[field].trim().length === 0) {
      throw new RemoteBubbleDeleteCommandError({
        code: "REMOTE_DELETE_PAYLOAD_INVALID",
        message: `Remote delete payload field '${field}' must be a non-empty string.`
      });
    }
  }
  if (candidate.bubbleId !== input.bubbleId) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete payload bubbleId mismatch: expected '${input.bubbleId}' but received '${String(candidate.bubbleId)}'.`
    });
  }
  for (const field of topLevelBooleanFields) {
    if (typeof candidate[field] !== "boolean") {
      throw new RemoteBubbleDeleteCommandError({
        code: "REMOTE_DELETE_PAYLOAD_INVALID",
        message: `Remote delete payload field '${field}' must be a boolean.`
      });
    }
  }

  const artifacts = candidate.artifacts;
  if (artifacts === null || typeof artifacts !== "object" || Array.isArray(artifacts)) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete payload field 'artifacts' must be an object."
    });
  }

  const artifactRecord = artifacts as Record<string, unknown>;
  const nestedArtifacts = {
    worktree: artifactRecord.worktree,
    tmux: artifactRecord.tmux,
    runtimeSession: artifactRecord.runtimeSession,
    branch: artifactRecord.branch
  };

  for (const [field, value] of Object.entries(nestedArtifacts)) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new RemoteBubbleDeleteCommandError({
        code: "REMOTE_DELETE_PAYLOAD_INVALID",
        message: `Remote delete payload artifact '${field}' must be an object.`
      });
    }
  }

  const worktree = nestedArtifacts.worktree as Record<string, unknown>;
  const tmux = nestedArtifacts.tmux as Record<string, unknown>;
  const runtimeSession = nestedArtifacts.runtimeSession as Record<string, unknown>;
  const branch = nestedArtifacts.branch as Record<string, unknown>;

  if (
    typeof worktree.exists !== "boolean"
    || typeof worktree.path !== "string"
    || worktree.path.trim().length === 0
    || typeof tmux.exists !== "boolean"
    || typeof tmux.sessionName !== "string"
    || tmux.sessionName.trim().length === 0
    || typeof runtimeSession.exists !== "boolean"
    || (runtimeSession.sessionName !== null
      && runtimeSession.sessionName !== undefined
      && typeof runtimeSession.sessionName !== "string")
    || typeof branch.exists !== "boolean"
    || typeof branch.name !== "string"
    || branch.name.trim().length === 0
  ) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete payload artifacts contain invalid field types."
    });
  }

  const worktreeExists = worktree.exists;
  const worktreePath = worktree.path;
  const tmuxExists = tmux.exists;
  const tmuxSessionName = tmux.sessionName;
  const runtimeSessionExists = runtimeSession.exists;
  const runtimeSessionName =
    runtimeSession.sessionName === undefined
      ? null
      : runtimeSession.sessionName;
  const branchExists = branch.exists;
  const branchName = branch.name;
  const bubbleId = candidate.bubbleId;
  const deleted = candidate.deleted as boolean;
  const requiresConfirmation = candidate.requiresConfirmation as boolean;
  const tmuxSessionTerminated = candidate.tmuxSessionTerminated as boolean;
  const runtimeSessionRemoved = candidate.runtimeSessionRemoved as boolean;
  const removedWorktree = candidate.removedWorktree as boolean;
  const removedBubbleBranch = candidate.removedBubbleBranch as boolean;

  return {
    bubbleId,
    deleted,
    requiresConfirmation,
    artifacts: {
      worktree: {
        exists: worktreeExists,
        path: worktreePath
      },
      tmux: {
        exists: tmuxExists,
        sessionName: tmuxSessionName
      },
      runtimeSession: {
        exists: runtimeSessionExists,
        sessionName: runtimeSessionName
      },
      branch: {
        exists: branchExists,
        name: branchName
      }
    },
    tmuxSessionTerminated,
    runtimeSessionRemoved,
    removedWorktree,
    removedBubbleBranch
  };
}

function parseCapturedFile(input: {
  stdout: string;
  label: ArchiveCaptureFileLabel;
  bubbleId: string;
}): {
  present: boolean;
  content: string;
} {
  const raw = extractMarkerPayload({
    stdout: input.stdout,
    startMarker: buildCaptureMarker(input.label, "start"),
    endMarker: buildCaptureMarker(input.label, "end"),
    label: `${input.label} capture`
  });

  const newlineIndex = raw.indexOf("\n");
  const presenceLine =
    newlineIndex === -1 ? raw.trim() : raw.slice(0, newlineIndex).trim();
  const content = newlineIndex === -1 ? "" : raw.slice(newlineIndex + 1);

  if (presenceLine !== "present" && presenceLine !== "missing") {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete returned invalid capture presence marker for ${input.label} on bubble ${input.bubbleId}.`
    });
  }

  return {
    present: presenceLine === "present",
    content:
      presenceLine === "present"
        ? decodeBase64Payload({
          raw: content,
          label: `${input.label} capture`
        })
        : ""
  };
}

function parseArchiveCapture(input: {
  stdout: string;
  bubbleId: string;
  remoteClonePath: string;
}): RemoteDeleteArchiveCapture {
  const bubbleToml = parseCapturedFile({
    stdout: input.stdout,
    label: "bubble_toml",
    bubbleId: input.bubbleId
  });
  const stateJson = parseCapturedFile({
    stdout: input.stdout,
    label: "state_json",
    bubbleId: input.bubbleId
  });
  const transcriptNdjson = parseCapturedFile({
    stdout: input.stdout,
    label: "transcript_ndjson",
    bubbleId: input.bubbleId
  });
  const inboxNdjson = parseCapturedFile({
    stdout: input.stdout,
    label: "inbox_ndjson",
    bubbleId: input.bubbleId
  });
  const taskMd = parseCapturedFile({
    stdout: input.stdout,
    label: "task_md",
    bubbleId: input.bubbleId
  });

  const requiredCaptures = [
    ["bubble.toml", bubbleToml],
    ["state.json", stateJson],
    ["transcript.ndjson", transcriptNdjson],
    ["inbox.ndjson", inboxNdjson]
  ] as const;
  for (const [fileName, capture] of requiredCaptures) {
    if (!capture.present) {
      throw new RemoteBubbleDeleteCommandError({
        code: "REMOTE_DELETE_PAYLOAD_INVALID",
        message:
          `Remote delete did not capture required archive source ${fileName} for bubble ${input.bubbleId}.`
      });
    }
  }

  return {
    sourceBubbleDir:
      `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`,
    bubbleToml: bubbleToml.content,
    stateJson: stateJson.content,
    transcriptNdjson: transcriptNdjson.content,
    inboxNdjson: inboxNdjson.content,
    ...(taskMd.present ? { taskMarkdown: taskMd.content } : {})
  };
}

function parseRemoteCommandFailure(input: {
  stderr: string;
  stdout: string;
  bubbleId: string;
}): RemoteBubbleDeleteCommandError {
  const detailSource =
    input.stderr.trim().length > 0 ? input.stderr.trim() : input.stdout.trim();
  const reasonCode = detailSource
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => remoteDeleteReasonCodePattern.test(line))
    ?.match(remoteDeleteReasonCodePattern)?.[1];
  return new RemoteBubbleDeleteCommandError({
    code: (reasonCode ?? "REMOTE_DELETE_COMMAND_FAILED"),
    message:
      detailSource.length > 0
        ? detailSource
        : `Remote delete command failed for bubble ${input.bubbleId}.`
  });
}

export async function executeRemoteBubbleDeleteCommand(
  input: ExecuteRemoteBubbleDeleteCommandInput,
  dependencies: RemoteBubbleDeleteCommandDependencies = {}
): Promise<ExecuteRemoteBubbleDeleteCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const target =
    input.remoteTarget.user !== undefined
      ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
      : input.remoteTarget.host;
  const script = buildRemoteBubbleDeleteScript(input);

  let transportResult: Awaited<ReturnType<typeof runCommand>>;
  try {
    transportResult = await runCommand("ssh", buildSshCommandArgs({
      target,
      script
    }));
  } catch (error) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_TRANSPORT_FAILED",
      message:
        `Remote delete transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(error instanceof Error ? error.message : String(error)),
      cause: error
    });
  }

  if (transportResult.exitCode !== 0) {
    const detailSource =
      transportResult.stderr.trim().length > 0
        ? transportResult.stderr
        : transportResult.stdout;
    const reasonCode = detailSource
      .split(/\r?\n/gu)
      .map((line) => line.trim())
      .find((line) => remoteDeleteReasonCodePattern.test(line))
      ?.match(remoteDeleteReasonCodePattern)?.[1];
    throw new RemoteBubbleDeleteCommandError({
      code: reasonCode ?? "REMOTE_DELETE_TRANSPORT_FAILED",
      message:
        `Remote delete transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(detailSource),
      cause: detailSource
    });
  }

  const commandExitCode = Number.parseInt(
    extractMarkerPayload({
      stdout: transportResult.stdout,
      startMarker: remoteDeleteExitStatusStartMarker,
      endMarker: remoteDeleteExitStatusEndMarker,
      label: "delete exit status"
    }).trim(),
    10
  );
  if (!Number.isSafeInteger(commandExitCode) || commandExitCode < 0) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete returned an invalid exit status payload."
    });
  }

  const stdout = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteDeleteStdoutStartMarker,
    endMarker: remoteDeleteStdoutEndMarker,
    label: "delete stdout",
    base64Encoded: true
  });
  const stderr = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteDeleteStderrStartMarker,
    endMarker: remoteDeleteStderrEndMarker,
    label: "delete stderr",
    base64Encoded: true
  });

  if (commandExitCode !== 0 && commandExitCode !== 2) {
    throw parseRemoteCommandFailure({
      stderr,
      stdout,
      bubbleId: input.bubbleId
    });
  }

  const result = parseDeleteBubbleResult({
    raw: stdout,
    bubbleId: input.bubbleId
  });
  if (!input.force && result.deleted) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete payload contract invalid for bubble ${input.bubbleId}: non-force remote delete must stay on the confirmation contract and must not report deleted=true.`
    });
  }

  if (commandExitCode === 2) {
    return { result };
  }

  return {
    result,
    ...(result.deleted
      ? {
          archiveCapture: parseArchiveCapture({
            stdout: transportResult.stdout,
            bubbleId: input.bubbleId,
            remoteClonePath: input.remoteClonePath
          })
        }
      : {})
  };
}
