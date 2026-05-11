import type { BubbleStateSnapshot } from "../../../domain/state/bubbleStateSnapshotTypes.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import type {
  ExecuteRemoteBubbleCommitCommandResult
} from "../../../shared/remote/commitRemoteExecution.js";
import { parseEnvelopeLine } from "../../../shared/protocol/envelope.js";
import { assertValidBubbleStateSnapshot } from "../../../domain/state/stateSchema.js";

type CommitResultMetadata = {
  readonly commitSha: string;
  readonly commitMessage: string;
  readonly stagedFiles: string[];
};

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

export function summarizeRemoteCommitTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
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

function parseRemoteCommitTranscript(input: {
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

  return {
    // Sequence follows transcript line-count semantics used by sibling SSH parsers.
    sequence: envelopes.length,
    envelope,
    metadata: parseCommitResultMetadata({
      envelope,
      bubbleId: input.bubbleId
    })
  };
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
