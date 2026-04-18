import type { DeleteBubbleArtifacts, DeleteBubbleResult } from "../../../../contracts/deleteBubble.js";
export const remoteDeleteExitStatusStartMarker = "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__";
export const remoteDeleteExitStatusEndMarker = "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__";
export const remoteDeleteStdoutStartMarker = "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__";
export const remoteDeleteStdoutEndMarker = "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__";
export const remoteDeleteStderrStartMarker = "__PAIRFLOW_REMOTE_DELETE_STDERR_START__";
export const remoteDeleteStderrEndMarker = "__PAIRFLOW_REMOTE_DELETE_STDERR_END__";
const remoteDeleteReasonCodePattern =
  /^(?:[A-Za-z][A-Za-z0-9]*Error:\s+)?([A-Z][A-Z0-9_]{2,})(?::(?:\s|$)|$)/u;

export type ArchiveCaptureFileLabel = "bubble_toml" | "state_json" | "transcript_ndjson" | "inbox_ndjson" | "task_md";
type RemoteBubbleDeleteCommandErrorCode = "REMOTE_DELETE_TRANSPORT_FAILED" | "REMOTE_DELETE_PAYLOAD_INVALID" | "REMOTE_DELETE_COMMAND_FAILED" | (string & {});
export interface RemoteDeleteArchiveCapture {
  sourceBubbleDir: string;
  bubbleToml: string;
  stateJson: string;
  transcriptNdjson: string;
  inboxNdjson: string;
  taskMarkdown?: string;
}

export class RemoteBubbleDeleteCommandError extends Error {
  public readonly code: RemoteBubbleDeleteCommandErrorCode;
  public readonly context: Readonly<Record<string, unknown>> | undefined;

  public constructor(input: {
    code: RemoteBubbleDeleteCommandErrorCode;
    message: string;
    context?: Readonly<Record<string, unknown>>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleDeleteCommandError";
    this.code = input.code;
    this.context = input.context;
  }
}
function toRemoteDeletePayloadError(input: {
  message: string;
  context: Readonly<Record<string, unknown>>;
  cause?: unknown;
}): RemoteBubbleDeleteCommandError {
  return new RemoteBubbleDeleteCommandError({
    code: "REMOTE_DELETE_PAYLOAD_INVALID",
    message: input.message,
    context: input.context,
    ...(input.cause === undefined ? {} : { cause: input.cause })
  });
}
export function toRemoteDeleteCommandFailureError(input: {
  stderr: string;
  stdout: string;
  bubbleId: string;
  remoteAlias: string;
}): RemoteBubbleDeleteCommandError {
  const detailSource =
    input.stderr.trim().length > 0 ? input.stderr.trim() : input.stdout.trim();
  const reasonCode = detailSource
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => remoteDeleteReasonCodePattern.test(line))
    ?.match(remoteDeleteReasonCodePattern)?.[1];

  return new RemoteBubbleDeleteCommandError({
    code: reasonCode ?? "REMOTE_DELETE_COMMAND_FAILED",
    message:
      detailSource.length > 0
        ? detailSource
        : `Remote delete command failed for bubble ${input.bubbleId}.`,
    context: {
      bubbleId: input.bubbleId,
      remoteAlias: input.remoteAlias
    }
  });
}
export function buildCaptureMarker(
  label: ArchiveCaptureFileLabel,
  kind: "start" | "end"
): string {
  const normalizedLabel = label.toUpperCase();
  return `__PAIRFLOW_REMOTE_DELETE_CAPTURE_${normalizedLabel}_${kind.toUpperCase()}__`;
}
export function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}
function decodeBase64Payload(input: {
  raw: string;
  label: string;
  context: Readonly<Record<string, unknown>>;
}): string {
  const normalized = input.raw.trim();
  if (normalized.length > 0 && !/^[A-Za-z0-9+/=]+$/u.test(normalized)) {
    throw toRemoteDeletePayloadError({
      message: `Remote delete returned invalid base64 payload characters for ${input.label}.`,
      context: input.context
    });
  }
  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch (error) {
    throw toRemoteDeletePayloadError({
      message: `Remote delete returned invalid base64 payload for ${input.label}.`,
      context: input.context,
      cause: error
    });
  }
}
export function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
  base64Encoded?: boolean;
  context: Readonly<Record<string, unknown>>;
}): string {
  const lines = input.stdout.split(/\r?\n/gu);
  const startIndexes = lines
    .map((line, index) => line === input.startMarker ? index : -1)
    .filter((index) => index >= 0);
  const endIndexes = lines
    .map((line, index) => line === input.endMarker ? index : -1)
    .filter((index) => index >= 0);

  if (startIndexes.length !== 1 || endIndexes.length !== 1) {
    throw toRemoteDeletePayloadError({
      message:
        `Remote delete returned stdout without exactly one ${input.label} marker envelope.`,
      context: input.context
    });
  }

  const startIndex = startIndexes[0] as number;
  const endIndex = endIndexes[0] as number;
  if (endIndex <= startIndex) {
    throw toRemoteDeletePayloadError({
      message: `Remote delete returned misordered ${input.label} marker envelope.`,
      context: input.context
    });
  }

  const raw = lines.slice(startIndex + 1, endIndex).join("\n");
  if (input.base64Encoded === true) {
    return decodeBase64Payload({
      raw,
      label: input.label,
      context: input.context
    });
  }
  return raw;
}
function readRecordValue(input: {
  value: unknown;
  bubbleId: string;
  field: string;
}): Record<string, unknown> {
  if (
    input.value === null
    || typeof input.value !== "object"
    || Array.isArray(input.value)
  ) {
    throw toRemoteDeletePayloadError({
      message: `Remote delete payload field '${input.field}' must be an object.`,
      context: {
        bubbleId: input.bubbleId,
        field: input.field
      }
    });
  }
  return input.value as Record<string, unknown>;
}
function readBooleanField(input: {
  record: Record<string, unknown>;
  field: string;
  bubbleId: string;
}): boolean {
  const value = input.record[input.field];
  if (typeof value !== "boolean") {
    throw toRemoteDeletePayloadError({
      message: `Remote delete payload field '${input.field}' must be a boolean.`,
      context: {
        bubbleId: input.bubbleId,
        field: input.field
      }
    });
  }
  return value;
}
function readNonEmptyStringField(input: {
  record: Record<string, unknown>;
  field: string;
  bubbleId: string;
}): string {
  const value = input.record[input.field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw toRemoteDeletePayloadError({
      message: `Remote delete payload field '${input.field}' must be a non-empty string.`,
      context: {
        bubbleId: input.bubbleId,
        field: input.field
      }
    });
  }
  return value;
}
function readNullableStringField(input: {
  record: Record<string, unknown>;
  field: string;
  bubbleId: string;
}): string | null {
  const value = input.record[input.field];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw toRemoteDeletePayloadError({
      message: `Remote delete payload field '${input.field}' must be a string or null.`,
      context: {
        bubbleId: input.bubbleId,
        field: input.field
      }
    });
  }
  return value;
}
function parseDeleteArtifacts(input: {
  candidate: Record<string, unknown>;
  bubbleId: string;
}): DeleteBubbleArtifacts {
  const artifactsRecord = readRecordValue({
    value: input.candidate.artifacts,
    bubbleId: input.bubbleId,
    field: "artifacts"
  });
  const worktree = readRecordValue({
    value: artifactsRecord.worktree,
    bubbleId: input.bubbleId,
    field: "artifacts.worktree"
  });
  const tmux = readRecordValue({
    value: artifactsRecord.tmux,
    bubbleId: input.bubbleId,
    field: "artifacts.tmux"
  });
  const runtimeSession = readRecordValue({
    value: artifactsRecord.runtimeSession,
    bubbleId: input.bubbleId,
    field: "artifacts.runtimeSession"
  });
  const branch = readRecordValue({
    value: artifactsRecord.branch,
    bubbleId: input.bubbleId,
    field: "artifacts.branch"
  });

  return {
    worktree: {
      exists: readBooleanField({
        record: worktree,
        field: "exists",
        bubbleId: input.bubbleId
      }),
      path: readNonEmptyStringField({
        record: worktree,
        field: "path",
        bubbleId: input.bubbleId
      })
    },
    tmux: {
      exists: readBooleanField({
        record: tmux,
        field: "exists",
        bubbleId: input.bubbleId
      }),
      sessionName: readNonEmptyStringField({
        record: tmux,
        field: "sessionName",
        bubbleId: input.bubbleId
      })
    },
    runtimeSession: {
      exists: readBooleanField({
        record: runtimeSession,
        field: "exists",
        bubbleId: input.bubbleId
      }),
      sessionName: readNullableStringField({
        record: runtimeSession,
        field: "sessionName",
        bubbleId: input.bubbleId
      })
    },
    branch: {
      exists: readBooleanField({
        record: branch,
        field: "exists",
        bubbleId: input.bubbleId
      }),
      name: readNonEmptyStringField({
        record: branch,
        field: "name",
        bubbleId: input.bubbleId
      })
    }
  };
}
export function parseDeleteBubbleResult(input: {
  raw: string;
  bubbleId: string;
}): DeleteBubbleResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw toRemoteDeletePayloadError({
      message: "Remote delete returned invalid JSON payload.",
      context: {
        bubbleId: input.bubbleId,
        field: "payload"
      },
      cause: error
    });
  }

  const candidate = readRecordValue({
    value: parsed,
    bubbleId: input.bubbleId,
    field: "payload"
  });

  const bubbleId = readNonEmptyStringField({
    record: candidate,
    field: "bubbleId",
    bubbleId: input.bubbleId
  });
  if (bubbleId !== input.bubbleId) {
    throw toRemoteDeletePayloadError({
      message:
        `Remote delete payload bubbleId mismatch: expected '${input.bubbleId}' but received '${bubbleId}'.`,
      context: {
        bubbleId: input.bubbleId,
        payloadBubbleId: bubbleId
      }
    });
  }

  return {
    bubbleId,
    deleted: readBooleanField({
      record: candidate,
      field: "deleted",
      bubbleId: input.bubbleId
    }),
    requiresConfirmation: readBooleanField({
      record: candidate,
      field: "requiresConfirmation",
      bubbleId: input.bubbleId
    }),
    artifacts: parseDeleteArtifacts({
      candidate,
      bubbleId: input.bubbleId
    }),
    tmuxSessionTerminated: readBooleanField({
      record: candidate,
      field: "tmuxSessionTerminated",
      bubbleId: input.bubbleId
    }),
    runtimeSessionRemoved: readBooleanField({
      record: candidate,
      field: "runtimeSessionRemoved",
      bubbleId: input.bubbleId
    }),
    removedWorktree: readBooleanField({
      record: candidate,
      field: "removedWorktree",
      bubbleId: input.bubbleId
    }),
    removedBubbleBranch: readBooleanField({
      record: candidate,
      field: "removedBubbleBranch",
      bubbleId: input.bubbleId
    })
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
    label: `${input.label} capture`,
    context: {
      bubbleId: input.bubbleId,
      label: input.label
    }
  });

  const newlineIndex = raw.indexOf("\n");
  const presenceLine =
    newlineIndex === -1 ? raw.trim() : raw.slice(0, newlineIndex).trim();
  const content = newlineIndex === -1 ? "" : raw.slice(newlineIndex + 1);

  if (presenceLine !== "present" && presenceLine !== "missing") {
    throw toRemoteDeletePayloadError({
      message:
        `Remote delete returned invalid capture presence marker for ${input.label} on bubble ${input.bubbleId}.`,
      context: {
        bubbleId: input.bubbleId,
        label: input.label
      }
    });
  }

  return {
    present: presenceLine === "present",
    content:
      presenceLine === "present"
        ? decodeBase64Payload({
          raw: content,
          label: `${input.label} capture`,
          context: {
            bubbleId: input.bubbleId,
            label: input.label
          }
        })
        : ""
  };
}
export function parseArchiveCapture(input: {
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

  for (const [fileName, capture] of [
    ["bubble.toml", bubbleToml],
    ["state.json", stateJson],
    ["transcript.ndjson", transcriptNdjson],
    ["inbox.ndjson", inboxNdjson]
  ] as const) {
    if (!capture.present) {
      throw toRemoteDeletePayloadError({
        message:
          `Remote delete did not capture required archive source ${fileName} for bubble ${input.bubbleId}.`,
        context: {
          bubbleId: input.bubbleId,
          fileName
        }
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
