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
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validateTcpPortList,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../../../shared/validation/primitives.js";

const remotePointerAllowedKeys = new Set([
  "kind",
  "host",
  "user",
  "portForwards",
  "instanceId",
  "remoteClonePath",
  "tmuxSession",
  "startedAt"
]);

const startedRemotePointerFields = [
  "instanceId",
  "remoteClonePath",
  "tmuxSession",
  "startedAt"
] as const;

const remoteStateCacheAllowedKeys = new Set([
  "lastCheckedAt",
  "state",
  "round",
  "maxRounds",
  "implementerStatus",
  "reviewerStatus"
]);

const forbiddenRemoteStateCachePointerKeys = new Set([
  "host",
  "user",
  "instanceId",
  "remoteClonePath",
  "tmuxSession",
  "startedAt",
  "portForwards"
]);

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

function pushUnknownFields(
  input: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  errors: ValidationError[],
  message: string
): void {
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      errors.push({
        path: key,
        message
      });
    }
  }
}

function validateRemotePointerDiscriminants(
  input: Record<string, unknown>,
  errors: ValidationError[]
): {
  host: unknown;
  user: unknown;
  kind: BubbleRemotePointerKind | undefined;
  portForwards: number[] | undefined;
} {
  pushUnknownFields(
    input,
    remotePointerAllowedKeys,
    errors,
    "Unknown remote pointer field"
  );

  const host = input.host;
  if (!isNonEmptyString(host)) {
    errors.push({
      path: "host",
      message: "Must be a non-empty string"
    });
  }

  const user = input.user;
  if (user !== undefined && !isNonEmptyString(user)) {
    errors.push({
      path: "user",
      message: "Must be a non-empty string"
    });
  }

  const rawKind = input.kind;
  if (!isBubbleRemotePointerKind(rawKind)) {
    errors.push({
      path: "kind",
      message: "Must be one of: created, started"
    });
  }

  return {
    host,
    user,
    kind: isBubbleRemotePointerKind(rawKind) ? rawKind : undefined,
    portForwards: validatePortForwards(
      input.portForwards,
      "portForwards",
      errors
    )
  };
}

function buildStartedRemotePointerFieldValues(input: Record<string, unknown>): Record<
  (typeof startedRemotePointerFields)[number],
  unknown
> {
  return {
    instanceId: input.instanceId,
    remoteClonePath: input.remoteClonePath,
    tmuxSession: input.tmuxSession,
    startedAt: input.startedAt
  };
}

function validateRemotePointerKindSpecificFields(input: {
  pointerKind: BubbleRemotePointerKind | undefined;
  startedFieldValues: Record<(typeof startedRemotePointerFields)[number], unknown>;
  errors: ValidationError[];
}): void {
  if (input.pointerKind === "created") {
    for (const field of startedRemotePointerFields) {
      if (input.startedFieldValues[field] !== undefined) {
        input.errors.push({
          path: field,
          message: "Created remote pointer must not include started-only fields"
        });
      }
    }
    return;
  }

  if (input.pointerKind !== "started") {
    return;
  }

  const missingStartedFields = startedRemotePointerFields.filter(
    (field) => input.startedFieldValues[field] === undefined
  );
  if (missingStartedFields.length > 0) {
    input.errors.push({
      path: "kind",
      message:
        "Started remote pointer requires instanceId, remoteClonePath, tmuxSession, and startedAt"
    });
  }
}

function validateOptionalRemotePointerFields(
  input: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (input.instanceId !== undefined && !isNonEmptyString(input.instanceId)) {
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
  if (input.tmuxSession !== undefined && !isNonEmptyString(input.tmuxSession)) {
    errors.push({
      path: "tmuxSession",
      message: "Must be a non-empty string"
    });
  }
  if (input.startedAt !== undefined && !isIsoTimestamp(input.startedAt)) {
    errors.push({
      path: "startedAt",
      message: "Must be an ISO timestamp"
    });
  }
}

function normalizeRemotePointer(input: {
  pointerKind: BubbleRemotePointerKind | undefined;
  host: unknown;
  user: unknown;
  portForwards: number[] | undefined;
  raw: Record<string, unknown>;
}): ValidationResult<BubbleRemotePointer> {
  if (input.pointerKind === "started") {
    return validationOk({
      kind: "started",
      host: (input.host as string).trim(),
      ...(input.user !== undefined ? { user: (input.user as string).trim() } : {}),
      instanceId: (input.raw.instanceId as string).trim(),
      remoteClonePath: (input.raw.remoteClonePath as string).trim(),
      tmuxSession: (input.raw.tmuxSession as string).trim(),
      startedAt: input.raw.startedAt as string,
      ...(input.portForwards !== undefined ? { portForwards: input.portForwards } : {})
    });
  }

  return validationOk({
    kind: "created",
    host: (input.host as string).trim(),
    ...(input.user !== undefined ? { user: (input.user as string).trim() } : {}),
    ...(input.portForwards !== undefined ? { portForwards: input.portForwards } : {})
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

  const { host, user, kind, portForwards } = validateRemotePointerDiscriminants(input, errors);
  validateRemotePointerKindSpecificFields({
    pointerKind: kind,
    startedFieldValues: buildStartedRemotePointerFieldValues(input),
    errors
  });
  validateOptionalRemotePointerFields(input, errors);

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return normalizeRemotePointer({
    pointerKind: kind,
    host,
    user,
    portForwards,
    raw: input
  });
}

function validateRemoteStateCacheFieldNames(
  input: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const key of Object.keys(input)) {
    if (forbiddenRemoteStateCachePointerKeys.has(key)) {
      errors.push({
        path: key,
        message: "Pointer fields are not allowed in state-cache.json"
      });
      continue;
    }
    if (!remoteStateCacheAllowedKeys.has(key)) {
      errors.push({
        path: key,
        message: "Unknown remote state cache field"
      });
    }
  }
}

function validateRemoteStateCacheScalarFields(
  input: Record<string, unknown>,
  errors: ValidationError[]
): {
  lastCheckedAt: unknown;
  state: unknown;
  round: unknown;
  maxRounds: unknown;
} {
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

  return {
    lastCheckedAt,
    state,
    round,
    maxRounds
  };
}

function validateOptionalRemoteStateCacheStatuses(
  input: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (
    input.implementerStatus !== undefined
    && !isNonEmptyString(input.implementerStatus)
  ) {
    errors.push({
      path: "implementerStatus",
      message: "Must be a non-empty string"
    });
  }

  if (
    input.reviewerStatus !== undefined
    && !isNonEmptyString(input.reviewerStatus)
  ) {
    errors.push({
      path: "reviewerStatus",
      message: "Must be a non-empty string"
    });
  }
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

  validateRemoteStateCacheFieldNames(input, errors);
  const { lastCheckedAt, state, round, maxRounds } =
    validateRemoteStateCacheScalarFields(input, errors);
  validateOptionalRemoteStateCacheStatuses(input, errors);

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    lastCheckedAt: lastCheckedAt as string,
    state: state as BubbleLifecycleState,
    round: round as number,
    maxRounds: maxRounds as number,
    ...(input.implementerStatus !== undefined
      ? { implementerStatus: (input.implementerStatus as string).trim() }
      : {}),
    ...(input.reviewerStatus !== undefined
      ? { reviewerStatus: (input.reviewerStatus as string).trim() }
      : {})
  });
}
