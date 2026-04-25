import type { BubbleStateSnapshot } from "../../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import { parseEnvelopeLine } from "../../../shared/protocol/envelope.js";
import { assertValidBubbleStateSnapshot } from "../../../shared/state/stateSchema.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  assertSingleTokenPairflowCommand,
  buildSshCommandArgs
} from "./sshBubbleStart.js";

const remoteCommitStateStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STATE_START__";
const remoteCommitStateEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STATE_END__";
const remoteCommitTranscriptStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__";
const remoteCommitTranscriptEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__";
const remoteCommitHeadShaStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__";
const remoteCommitHeadShaEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__";
const remoteCommitHeadMessageStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__";
const remoteCommitHeadMessageEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__";
const remoteCommitStagedFilesStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__";
const remoteCommitStagedFilesEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__";
const remoteCommitModeEnvVar = "PAIRFLOW_REMOTE_COMMIT_MODE";
const remoteCommitWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT";
const remoteCommitModeInnerRemoteExecution = "inner_remote_execution";

export interface ExecuteRemoteBubbleCommitCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  refs: string[];
  message?: string;
  stageAll: boolean;
}

export interface ExecuteRemoteBubbleCommitCommandResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  stateContent: string;
  transcriptContent: string;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}

type CommitResultMetadata = {
  readonly commitSha: string;
  readonly commitMessage: string;
  readonly stagedFiles: string[];
};

export interface RemoteBubbleCommitCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export class RemoteBubbleCommitCommandError extends Error {
  public readonly code:
    | "REMOTE_COMMIT_TRANSPORT_FAILED"
    | "REMOTE_COMMIT_PAYLOAD_INVALID";
  public readonly context?: Record<string, string | number>;

  public constructor(input: {
    code:
      | "REMOTE_COMMIT_TRANSPORT_FAILED"
      | "REMOTE_COMMIT_PAYLOAD_INVALID";
    message: string;
    context?: Record<string, string | number>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleCommitCommandError";
    this.code = input.code;
    if (input.context !== undefined) {
      this.context = input.context;
    }
  }
}

function buildRemoteBubbleCommitCommandLine(
  input: ExecuteRemoteBubbleCommitCommandInput
): string {
  const pairflowCommand = assertSingleTokenPairflowCommand(
    input.remoteTarget.pairflowCommand
  );
  const args = [
    pairflowCommand,
    "bubble",
    "commit",
    "--id",
    input.bubbleId,
    "--repo",
    input.remoteClonePath,
    ...(input.message !== undefined ? ["--message", input.message] : []),
    ...(input.stageAll ? ["--stage-all"] : []),
    ...input.refs.flatMap((ref) => ["--ref", ref])
  ];
  return args.map((value) => shellQuote(value)).join(" ");
}

export function buildRemoteBubbleCommitScript(
  input: ExecuteRemoteBubbleCommitCommandInput
): string {
  const bubbleDir = `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const statePath = `${bubbleDir}/state.json`;
  const transcriptPath = `${bubbleDir}/transcript.ndjson`;
  const remoteCommandLine = buildRemoteBubbleCommitCommandLine(input);

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `export ${remoteCommitModeEnvVar}=${shellQuote(remoteCommitModeInnerRemoteExecution)}`,
    `export ${remoteCommitWorkspaceRootEnvVar}=${shellQuote(input.remoteClonePath)}`,
    remoteCommandLine,
    `printf '%s\\n' ${shellQuote(remoteCommitStateStartMarker)}`,
    `cat ${shellQuote(statePath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitStateEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitTranscriptStartMarker)}`,
    `cat ${shellQuote(transcriptPath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitTranscriptEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitHeadShaStartMarker)}`,
    "git rev-parse HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitHeadShaEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitHeadMessageStartMarker)}`,
    "git log -1 --pretty=%s HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitHeadMessageEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitStagedFilesStartMarker)}`,
    "git diff-tree --no-commit-id --name-only -r HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitStagedFilesEndMarker)}`
  ].join("\n");
}

export function summarizeRemoteCommitTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function describeTransportFailure(input: {
  exitCode: number;
  stdout: string;
  stderr: string;
}): string {
  const detailSource = input.stderr.trim().length > 0 ? input.stderr : input.stdout;
  return `ssh transport failed (exit ${input.exitCode}): ${summarizeRemoteCommitTransportOutput(detailSource)}`;
}

export function extractRemoteCommitMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
}): string {
  const lines = input.stdout.split(/\r?\n/u);
  const startIndexes = lines
    .map((line, index) => (line === input.startMarker ? index : -1))
    .filter((index) => index >= 0);
  const endIndexes = lines
    .map((line, index) => (line === input.endMarker ? index : -1))
    .filter((index) => index >= 0);

  if (startIndexes.length !== 1 || endIndexes.length !== 1) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned stdout without exactly one ${input.label} marker envelope.`,
      context: {
        command_name: "commit",
        payload_label: input.label,
        marker_count: Math.min(startIndexes.length, endIndexes.length)
      }
    });
  }

  const startIndex = startIndexes[0];
  const endIndex = endIndexes[0];
  if (startIndex === undefined || endIndex === undefined || startIndex >= endIndex) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned ${input.label} markers in an invalid order.`,
      context: {
        command_name: "commit",
        payload_label: input.label,
        marker_count: 1
      }
    });
  }

  return lines.slice(startIndex + 1, endIndex).join("\n");
}

function parseRemoteBubbleState(input: {
  raw: string;
  bubbleId: string;
}): BubbleStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid state JSON for bubble ${input.bubbleId}.`,
      cause: error
    });
  }

  try {
    return assertValidBubbleStateSnapshot(parsed);
  } catch (error) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid state payload for bubble ${input.bubbleId}.`,
      cause: error
    });
  }
}

export function parseRemoteCommitTranscript(input: {
  raw: string;
  bubbleId: string;
}): {
  sequence: number;
  envelope: ProtocolEnvelope;
  metadata: CommitResultMetadata;
} {
  const lines = input.raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned an empty transcript payload for bubble ${input.bubbleId}.`
    });
  }

  const envelopes = lines.map((line, index) => {
    try {
      return parseEnvelopeLine(line);
    } catch (error) {
      throw new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_PAYLOAD_INVALID",
        message:
          `Remote commit returned invalid transcript line ${index + 1} for bubble ${input.bubbleId}.`,
        cause: error
      });
    }
  });

  const envelope = envelopes.at(-1);
  if (envelope === undefined || envelope.bubble_id !== input.bubbleId) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned a transcript tail for the wrong bubble: expected ${input.bubbleId}.`
    });
  }
  if (envelope.type !== "COMMIT_RESULT") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit did not finish with a COMMIT_RESULT envelope for bubble ${input.bubbleId}.`
    });
  }

  const metadata = parseCommitResultMetadata({
    envelope,
    bubbleId: input.bubbleId
  });

  return {
    // Sequence follows transcript line-count semantics used by sibling SSH parsers.
    sequence: envelopes.length,
    envelope,
    metadata
  };
}

function parseRequiredLine(input: {
  raw: string;
  bubbleId: string;
  label: string;
}): string {
  const trimmed = input.raw.trim();
  if (trimmed.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned an empty ${input.label} payload for bubble ${input.bubbleId}.`
    });
  }
  return trimmed;
}

function parseOutputLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && entry.length > 0)
  );
}

function haveSameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function parseCommitResultMetadata(input: {
  envelope: ProtocolEnvelope;
  bubbleId: string;
}): CommitResultMetadata {
  const metadata = input.envelope.payload.metadata;
  if (metadata === undefined) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned COMMIT_RESULT without metadata for bubble ${input.bubbleId}.`
    });
  }

  const commitSha = metadata.commit_sha;
  const rawCommitMessage = metadata.commit_message;
  const stagedFiles = metadata.staged_files;
  if (
    typeof commitSha !== "string" ||
    commitSha.length === 0 ||
    typeof rawCommitMessage !== "string" ||
    !isStringArray(stagedFiles)
  ) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid COMMIT_RESULT metadata for bubble ${input.bubbleId}.`
    });
  }
  const commitMessage = rawCommitMessage.trim();
  if (commitMessage.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid COMMIT_RESULT metadata for bubble ${input.bubbleId}.`
    });
  }

  return {
    commitSha,
    commitMessage,
    stagedFiles
  };
}

function assertCommitResultMatchesGitFacts(input: {
  bubbleId: string;
  metadata: CommitResultMetadata;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}): void {
  if (
    input.metadata.commitSha !== input.commitSha ||
    input.metadata.commitMessage !== input.commitMessage ||
    !haveSameStringSet(input.metadata.stagedFiles, input.stagedFiles)
  ) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit COMMIT_RESULT metadata does not match remote git facts for bubble ${input.bubbleId}.`,
      context: {
        command_name: "commit",
        payload_label: "commit-result",
        transcript_commit_sha: input.metadata.commitSha,
        git_commit_sha: input.commitSha
      }
    });
  }
}

export function validateRemoteCommitCompletionPayload(input: {
  bubbleId: string;
  stateContent: string;
  transcriptContent: string;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}): ExecuteRemoteBubbleCommitCommandResult {
  const state = parseRemoteBubbleState({
    raw: input.stateContent,
    bubbleId: input.bubbleId
  });
  if (state.bubble_id !== input.bubbleId) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned state for the wrong bubble: expected ${input.bubbleId}.`
    });
  }
  if (state.state !== "DONE") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned non-DONE state ${state.state} for bubble ${input.bubbleId}.`
    });
  }
  const { sequence, envelope, metadata } = parseRemoteCommitTranscript({
    raw: input.transcriptContent,
    bubbleId: input.bubbleId
  });
  assertCommitResultMatchesGitFacts({
    bubbleId: input.bubbleId,
    metadata,
    commitSha: input.commitSha,
    commitMessage: input.commitMessage,
    stagedFiles: input.stagedFiles
  });

  return {
    bubbleId: input.bubbleId,
    sequence,
    envelope,
    state,
    stateContent: input.stateContent,
    transcriptContent: input.transcriptContent,
    commitSha: input.commitSha,
    commitMessage: input.commitMessage,
    stagedFiles: input.stagedFiles
  };
}

async function runRemoteBubbleCommitTransport(input: {
  command: ExecuteRemoteBubbleCommitCommandInput;
  runCommand: NonNullable<RemoteBubbleCommitCommandDependencies["runCommand"]>;
  target: string;
  script: string;
}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    return await input.runCommand(
      "ssh",
      buildSshCommandArgs({ target: input.target, script: input.script })
    );
  } catch (error) {
    if (error instanceof RemoteBubbleCommitCommandError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message:
        `ssh transport failed before completion: ${summarizeRemoteCommitTransportOutput(reason)}`,
      context: {
        bubble_id: input.command.bubbleId,
        command_name: "commit",
        remote_host: input.command.remoteTarget.host
      },
      cause: error
    });
  }
}

export async function executeRemoteBubbleCommitCommand(
  input: ExecuteRemoteBubbleCommitCommandInput,
  dependencies: RemoteBubbleCommitCommandDependencies = {}
): Promise<ExecuteRemoteBubbleCommitCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const script = buildRemoteBubbleCommitScript(input);
  const target =
    input.remoteTarget.user !== undefined
      ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
      : input.remoteTarget.host;
  const result = await runRemoteBubbleCommitTransport({
    command: input,
    runCommand,
    target,
    script
  });

  if (result.exitCode !== 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message: describeTransportFailure({
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }),
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        remote_host: input.remoteTarget.host,
        exit_code: result.exitCode
      }
    });
  }

  const stateContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitStateStartMarker,
    endMarker: remoteCommitStateEndMarker,
    label: "state"
  });
  const transcriptContent = extractRemoteCommitMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitTranscriptStartMarker,
    endMarker: remoteCommitTranscriptEndMarker,
    label: "transcript"
  });
  const commitSha = parseRequiredLine({
    raw: extractRemoteCommitMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitHeadShaStartMarker,
      endMarker: remoteCommitHeadShaEndMarker,
      label: "head-sha"
    }),
    bubbleId: input.bubbleId,
    label: "head sha"
  });
  const commitMessage = parseRequiredLine({
    raw: extractRemoteCommitMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitHeadMessageStartMarker,
      endMarker: remoteCommitHeadMessageEndMarker,
      label: "head-message"
    }),
    bubbleId: input.bubbleId,
    label: "head message"
  });
  const stagedFiles = parseOutputLines(
    extractRemoteCommitMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitStagedFilesStartMarker,
      endMarker: remoteCommitStagedFilesEndMarker,
      label: "staged-files"
    })
  );
  return validateRemoteCommitCompletionPayload({
    bubbleId: input.bubbleId,
    stateContent,
    transcriptContent,
    commitSha,
    commitMessage,
    stagedFiles
  });
}
