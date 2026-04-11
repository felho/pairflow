import { readFile, writeFile } from "node:fs/promises";

import type {
  BubbleLifecycleState,
  BubbleRemotePointer,
  BubbleRemotePointerKind,
  BubbleRemoteStateCache
} from "../../../../types/bubble.js";
import {
  isBubbleLifecycleState,
  isBubbleRemotePointerKind
} from "../../../../types/bubble.js";
import {
  SchemaValidationError,
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validateTcpPortList,
  validationFail,
  validationOk,
  type SchemaValidationErrorContext,
  type ValidationError,
  type ValidationResult
} from "../../../shared/validation/primitives.js";

const REMOTE_POINTER_INVALID = "REMOTE_POINTER_INVALID";
const REMOTE_STATE_CACHE_INVALID = "REMOTE_STATE_CACHE_INVALID";
const REMOTE_ARTIFACT_PARENT_DIR_MISSING = "REMOTE_ARTIFACT_PARENT_DIR_MISSING";
const REMOTE_ARTIFACT_READ_FAILED = "REMOTE_ARTIFACT_READ_FAILED";
const REMOTE_ARTIFACT_WRITE_FAILED = "REMOTE_ARTIFACT_WRITE_FAILED";

type RemoteArtifactIoErrorCode =
  | typeof REMOTE_ARTIFACT_PARENT_DIR_MISSING
  | typeof REMOTE_ARTIFACT_READ_FAILED
  | typeof REMOTE_ARTIFACT_WRITE_FAILED;

type JsonArtifactReadResult =
  | {
      status: "missing";
    }
  | {
      status: "present";
      value: unknown;
    };

export class RemoteArtifactIoError extends Error {
  public readonly code: RemoteArtifactIoErrorCode;
  public readonly operation: "read" | "write";
  public readonly artifactPath: string;
  public readonly cause: unknown;

  public constructor(input: {
    code: RemoteArtifactIoErrorCode;
    operation: "read" | "write";
    artifactPath: string;
    cause: unknown;
  }) {
    const reason =
      input.cause instanceof Error ? input.cause.message : String(input.cause);
    super(
      `${input.code}: Failed to ${input.operation} remote artifact at ${input.artifactPath}: ${reason}`
    );
    this.name = "RemoteArtifactIoError";
    this.code = input.code;
    this.operation = input.operation;
    this.artifactPath = input.artifactPath;
    this.cause = input.cause;
  }
}

function validatePortForwards(
  value: unknown,
  path: string,
  errors: ValidationError[]
): number[] | undefined {
  return validateTcpPortList({
    value,
    path,
    errors,
    invalidArrayMessage: "Must be an array of integers in range 1..65535",
    invalidEntryMessage: "Must be an integer in range 1..65535"
  });
}

export function validateRemotePointer(
  input: unknown
): ValidationResult<BubbleRemotePointer> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([
      {
        path: "$",
        message: "Remote pointer must be an object"
      }
    ]);
  }

  const allowedKeys = new Set([
    "kind",
    "host",
    "portForwards",
    "instanceId",
    "remoteClonePath",
    "tmuxSession",
    "startedAt"
  ]);
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      errors.push({
        path: key,
        message: "Unknown remote pointer field"
      });
    }
  }

  const host = input.host;
  if (!isNonEmptyString(host)) {
    errors.push({
      path: "host",
      message: "Must be a non-empty string"
    });
  }

  const kind = input.kind;
  if (!isBubbleRemotePointerKind(kind)) {
    errors.push({
      path: "kind",
      message: "Must be one of: created, started"
    });
  }

  const portForwards = validatePortForwards(
    input.portForwards,
    "portForwards",
    errors
  );

  const startedFieldNames = [
    "instanceId",
    "remoteClonePath",
    "tmuxSession",
    "startedAt"
  ] as const;
  const startedFieldValues = {
    instanceId: input.instanceId,
    remoteClonePath: input.remoteClonePath,
    tmuxSession: input.tmuxSession,
    startedAt: input.startedAt
  };
  const pointerKind = kind as BubbleRemotePointerKind | undefined;
  if (pointerKind === "created") {
    for (const field of startedFieldNames) {
      if (startedFieldValues[field] !== undefined) {
        errors.push({
          path: field,
          message: "Created remote pointer must not include started-only fields"
        });
      }
    }
  }
  if (pointerKind === "started") {
    const missingStartedFields = startedFieldNames.filter(
      (field) => startedFieldValues[field] === undefined
    );
    if (missingStartedFields.length > 0) {
      errors.push({
        path: "kind",
        message:
          "Started remote pointer requires instanceId, remoteClonePath, tmuxSession, and startedAt"
      });
    }
  }

  if (
    input.instanceId !== undefined
    && !isNonEmptyString(input.instanceId)
  ) {
    errors.push({
      path: "instanceId",
      message: "Must be a non-empty string"
    });
  }
  if (
    input.remoteClonePath !== undefined
    && !isNonEmptyString(input.remoteClonePath)
  ) {
    errors.push({
      path: "remoteClonePath",
      message: "Must be a non-empty string"
    });
  }
  if (
    input.tmuxSession !== undefined
    && !isNonEmptyString(input.tmuxSession)
  ) {
    errors.push({
      path: "tmuxSession",
      message: "Must be a non-empty string"
    });
  }
  if (
    input.startedAt !== undefined
    && !isIsoTimestamp(input.startedAt)
  ) {
    errors.push({
      path: "startedAt",
      message: "Must be an ISO timestamp"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  if (pointerKind === "started") {
    return validationOk({
      kind: "started",
      host: (host as string).trim(),
      instanceId: (input.instanceId as string).trim(),
      remoteClonePath: (input.remoteClonePath as string).trim(),
      tmuxSession: (input.tmuxSession as string).trim(),
      startedAt: input.startedAt as string,
      ...(portForwards !== undefined ? { portForwards } : {})
    });
  }

  return validationOk({
    kind: "created",
    host: (host as string).trim(),
    ...(portForwards !== undefined ? { portForwards } : {})
  });
}

export function validateRemoteStateCache(
  input: unknown
): ValidationResult<BubbleRemoteStateCache> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([
      {
        path: "$",
        message: "Remote state cache must be an object"
      }
    ]);
  }

  const allowedKeys = new Set([
    "lastCheckedAt",
    "state",
    "round",
    "maxRounds",
    "implementerStatus",
    "reviewerStatus"
  ]);
  const forbiddenPointerKeys = new Set([
    "host",
    "instanceId",
    "remoteClonePath",
    "tmuxSession",
    "startedAt",
    "portForwards"
  ]);
  for (const key of Object.keys(input)) {
    if (forbiddenPointerKeys.has(key)) {
      errors.push({
        path: key,
        message: "Pointer fields are not allowed in state-cache.json"
      });
      continue;
    }
    if (!allowedKeys.has(key)) {
      errors.push({
        path: key,
        message: "Unknown remote state cache field"
      });
    }
  }

  const lastCheckedAt = input.lastCheckedAt;
  if (!isIsoTimestamp(lastCheckedAt)) {
    errors.push({
      path: "lastCheckedAt",
      message: "Must be an ISO timestamp"
    });
  }

  const state = input.state;
  if (!isBubbleLifecycleState(state)) {
    errors.push({
      path: "state",
      message: "Must be a valid bubble lifecycle state"
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 0) {
    errors.push({
      path: "round",
      message: "Must be an integer >= 0"
    });
  }

  const maxRounds = input.maxRounds;
  if (!isInteger(maxRounds) || maxRounds <= 0) {
    errors.push({
      path: "maxRounds",
      message: "Must be a positive integer"
    });
  }

  const implementerStatus = input.implementerStatus;
  if (
    implementerStatus !== undefined
    && !isNonEmptyString(implementerStatus)
  ) {
    errors.push({
      path: "implementerStatus",
      message: "Must be a non-empty string"
    });
  }

  const reviewerStatus = input.reviewerStatus;
  if (
    reviewerStatus !== undefined
    && !isNonEmptyString(reviewerStatus)
  ) {
    errors.push({
      path: "reviewerStatus",
      message: "Must be a non-empty string"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    lastCheckedAt: lastCheckedAt as string,
    state: state as BubbleLifecycleState,
    round: round as number,
    maxRounds: maxRounds as number,
    ...(implementerStatus !== undefined
      ? { implementerStatus: (implementerStatus as string).trim() }
      : {}),
    ...(reviewerStatus !== undefined
      ? { reviewerStatus: (reviewerStatus as string).trim() }
      : {})
  });
}

function toSchemaValidationError(
  code: string,
  message: string,
  errors: ValidationError[],
  context?: SchemaValidationErrorContext
): SchemaValidationError {
  return new SchemaValidationError(`${code}: ${message}`, errors, context);
}

async function readJsonArtifact(path: string): Promise<JsonArtifactReadResult> {
  const raw = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    // Phase 1A intentionally collapses all ENOENT reads into a single "missing"
    // contract, whether the artifact never existed or disappeared before read completion.
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw new RemoteArtifactIoError({
      code: REMOTE_ARTIFACT_READ_FAILED,
      operation: "read",
      artifactPath: path,
      cause: error
    });
  });

  if (raw === undefined) {
    return { status: "missing" };
  }

  try {
    return {
      status: "present",
      value: JSON.parse(raw) as unknown
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SchemaValidationError(`Invalid JSON: ${reason}`, [
      {
        path: "$",
        message: reason
      }
    ]);
  }
}

async function writeJsonArtifact(path: string, value: unknown): Promise<void> {
  try {
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  } catch (error) {
    const code =
      (error as NodeJS.ErrnoException).code === "ENOENT"
        ? REMOTE_ARTIFACT_PARENT_DIR_MISSING
        : REMOTE_ARTIFACT_WRITE_FAILED;
    throw new RemoteArtifactIoError({
      code,
      operation: "write",
      artifactPath: path,
      cause: error
    });
  }
}

export async function readRemotePointer(
  path: string
): Promise<BubbleRemotePointer | null> {
  try {
    const parsed = await readJsonArtifact(path);
    if (parsed.status === "missing") {
      return null;
    }

    return assertValidation(
      validateRemotePointer(parsed.value),
      "Invalid remote pointer"
    );
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw toSchemaValidationError(
        REMOTE_POINTER_INVALID,
        error.message,
        error.errors,
        error.context
      );
    }
    throw error;
  }
}

export async function writeRemotePointer(
  path: string,
  value: BubbleRemotePointer
): Promise<void> {
  await writeJsonArtifact(path, value);
}

export async function readRemoteStateCache(
  path: string
): Promise<BubbleRemoteStateCache | null> {
  try {
    const parsed = await readJsonArtifact(path);
    if (parsed.status === "missing") {
      return null;
    }

    return assertValidation(
      validateRemoteStateCache(parsed.value),
      "Invalid remote state cache"
    );
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      throw toSchemaValidationError(
        REMOTE_STATE_CACHE_INVALID,
        error.message,
        error.errors,
        error.context
      );
    }
    throw error;
  }
}

export async function writeRemoteStateCache(
  path: string,
  value: BubbleRemoteStateCache
): Promise<void> {
  await writeJsonArtifact(path, value);
}
