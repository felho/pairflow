import type {
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandResult,
  RemoteMergeCleanupArtifacts,
  RemoteMergeImportSource
} from "../../../shared/remote/remoteMergeContract.js";
import { RemoteBubbleMergeCommandError } from "./sshBubbleMergeCommandError.js";

function parseJsonObjectPayload(input: {
  raw: string;
  invalidJsonMessage: string;
  nonObjectMessage: string;
}): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: input.invalidJsonMessage,
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
      message: input.nonObjectMessage,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return parsed as Record<string, unknown>;
}

function readRequiredString(candidate: Record<string, unknown>, field: string, subject: string): string {
  const value = candidate[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: `${subject} '${field}' must be a non-empty string.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return value;
}

function readOptionalNonEmptyString(
  candidate: Record<string, unknown>,
  field: string,
  subject: string
): string | undefined {
  if (!(field in candidate) || candidate[field] === undefined) {
    return undefined;
  }
  const value = candidate[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: `${subject} '${field}' must be a non-empty string when present.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return value;
}

function readBooleanField(candidate: Record<string, unknown>, field: string, subject: string): boolean {
  const value = candidate[field];
  if (typeof value !== "boolean") {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: `${subject} '${field}' must be a boolean.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return value;
}

function parseImportSource(value: unknown): RemoteMergeImportSource {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge payload field 'importSource' must be an object.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  const importSourceRecord = value as Record<string, unknown>;
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
  return {
    kind: "git_ref",
    ref: readRequiredString(importSourceRecord, "ref", "Remote merge payload importSource"),
    commitSha: readRequiredString(
      importSourceRecord,
      "commitSha",
      "Remote merge payload importSource"
    )
  };
}

function assertForbiddenFieldsAbsent(candidate: Record<string, unknown>, fields: readonly string[]): void {
  for (const field of fields) {
    if (field in candidate) {
      throw new RemoteBubbleMergeCommandError({
        code: "REMOTE_MERGE_PAYLOAD_INVALID",
        message:
          `Remote merge payload field '${field}' is not allowed in pre-cleanup handoff mode.`,
        context: {
          command_name: "merge",
          operation: "payload"
        }
      });
    }
  }
}

function readArtifactRecord(
  candidate: Record<string, unknown>,
  field: keyof RemoteMergeCleanupArtifacts
): Record<string, unknown> {
  const value = candidate[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: `Remote merge cleanup payload artifacts.${field} must be an object.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return value as Record<string, unknown>;
}

function parseCleanupArtifacts(candidate: Record<string, unknown>): RemoteMergeCleanupArtifacts {
  const artifacts = candidate.artifacts;
  if (artifacts === null || typeof artifacts !== "object" || Array.isArray(artifacts)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge cleanup payload field 'artifacts' must be an object.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  const artifactsRecord = artifacts as Record<string, unknown>;
  const worktree = readArtifactRecord(artifactsRecord, "worktree");
  const tmux = readArtifactRecord(artifactsRecord, "tmux");
  const runtimeSession = readArtifactRecord(artifactsRecord, "runtimeSession");
  const branch = readArtifactRecord(artifactsRecord, "branch");
  const tmuxSessionName = readOptionalNonEmptyString(
    tmux,
    "sessionName",
    "Remote merge cleanup payload artifacts.tmux"
  );

  return {
    worktree: {
      path: readRequiredString(worktree, "path", "Remote merge cleanup payload artifacts.worktree"),
      existed: readBooleanField(worktree, "existed", "Remote merge cleanup payload artifacts.worktree")
    },
    tmux: {
      ...(tmuxSessionName !== undefined ? { sessionName: tmuxSessionName } : {}),
      existed: readBooleanField(tmux, "existed", "Remote merge cleanup payload artifacts.tmux")
    },
    runtimeSession: {
      path: readRequiredString(
        runtimeSession,
        "path",
        "Remote merge cleanup payload artifacts.runtimeSession"
      ),
      existed: readBooleanField(
        runtimeSession,
        "existed",
        "Remote merge cleanup payload artifacts.runtimeSession"
      )
    },
    branch: {
      name: readRequiredString(branch, "name", "Remote merge cleanup payload artifacts.branch"),
      existed: readBooleanField(branch, "existed", "Remote merge cleanup payload artifacts.branch")
    }
  };
}

export function parseRemoteMergeResult(raw: string): ExecuteRemoteBubbleMergeCommandResult {
  const candidate = parseJsonObjectPayload({
    raw,
    invalidJsonMessage: "Remote merge returned invalid JSON payload.",
    nonObjectMessage: "Remote merge returned a non-object JSON payload."
  });
  const tmuxSessionName = readOptionalNonEmptyString(
    candidate,
    "tmuxSessionName",
    "Remote merge payload"
  );
  const bubbleId = readRequiredString(candidate, "bubbleId", "Remote merge payload field");
  const baseBranch = readRequiredString(candidate, "baseBranch", "Remote merge payload field");
  const bubbleBranch = readRequiredString(candidate, "bubbleBranch", "Remote merge payload field");
  const mergeCommitSha = readRequiredString(
    candidate,
    "mergeCommitSha",
    "Remote merge payload field"
  );

  assertForbiddenFieldsAbsent(candidate, [
    "pushedBaseBranch",
    "deletedRemoteBranch",
    "tmuxSessionExisted",
    "runtimeSessionRemoved",
    "removedWorktree",
    "removedBubbleBranch"
  ]);
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

  return {
    bubbleId,
    baseBranch,
    bubbleBranch,
    mergeCommitSha,
    importSource: parseImportSource(candidate.importSource),
    cleanupPending: true,
    ...(tmuxSessionName !== undefined ? { tmuxSessionName } : {})
  };
}

export function parseRemoteMergeCleanupResult(
  raw: string
): ExecuteRemoteBubbleMergeCleanupCommandResult {
  const candidate = parseJsonObjectPayload({
    raw,
    invalidJsonMessage: "Remote merge cleanup returned invalid JSON payload.",
    nonObjectMessage: "Remote merge cleanup returned a non-object JSON payload."
  });
  const tmuxSessionName = readOptionalNonEmptyString(
    candidate,
    "tmuxSessionName",
    "Remote merge cleanup payload"
  );

  return {
    bubbleId: readRequiredString(candidate, "bubbleId", "Remote merge cleanup payload field"),
    baseBranch: readRequiredString(
      candidate,
      "baseBranch",
      "Remote merge cleanup payload field"
    ),
    bubbleBranch: readRequiredString(
      candidate,
      "bubbleBranch",
      "Remote merge cleanup payload field"
    ),
    artifacts: parseCleanupArtifacts(candidate),
    tmuxSessionTerminated: readBooleanField(
      candidate,
      "tmuxSessionTerminated",
      "Remote merge cleanup payload field"
    ),
    runtimeSessionRemoved: readBooleanField(
      candidate,
      "runtimeSessionRemoved",
      "Remote merge cleanup payload field"
    ),
    removedWorktree: readBooleanField(
      candidate,
      "removedWorktree",
      "Remote merge cleanup payload field"
    ),
    removedBubbleBranch: readBooleanField(
      candidate,
      "removedBubbleBranch",
      "Remote merge cleanup payload field"
    ),
    ...(tmuxSessionName !== undefined ? { tmuxSessionName } : {})
  };
}
