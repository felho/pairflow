import {
  isReworkIntentStatus,
  type BubbleReworkIntentRecord
} from "../../../types/bubble.js";
import {
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";

function validateOptionalRefs(input: {
  refs: unknown;
  pathPrefix: string;
  errors: ValidationError[];
}): string[] | undefined {
  if (input.refs === undefined) {
    return undefined;
  }

  if (!Array.isArray(input.refs)) {
    input.errors.push({
      path: `${input.pathPrefix}.refs`,
      message: "Must be an array when provided"
    });
    return undefined;
  }

  const parsedRefs: string[] = [];
  input.refs.forEach((ref, index) => {
    if (!isNonEmptyString(ref)) {
      input.errors.push({
        path: `${input.pathPrefix}.refs[${index}]`,
        message: "Must be a non-empty string"
      });
      return;
    }
    parsedRefs.push(ref);
  });

  return parsedRefs.length === input.refs.length ? parsedRefs : undefined;
}

function validateSupersededByIntentId(input: {
  status: unknown;
  supersededByIntentId: unknown;
  pathPrefix: string;
  errors: ValidationError[];
}): string | undefined {
  if (
    input.supersededByIntentId !== undefined &&
    !isNonEmptyString(input.supersededByIntentId)
  ) {
    input.errors.push({
      path: `${input.pathPrefix}.superseded_by_intent_id`,
      message: "Must be a non-empty string when provided"
    });
    return undefined;
  }

  if (
    isReworkIntentStatus(input.status) &&
    input.status !== "superseded" &&
    input.supersededByIntentId !== undefined
  ) {
    input.errors.push({
      path: `${input.pathPrefix}.superseded_by_intent_id`,
      message: "Only superseded intents may define superseded_by_intent_id"
    });
  }

  return isNonEmptyString(input.supersededByIntentId)
    ? input.supersededByIntentId
    : undefined;
}

export function validateReworkIntentRecord(
  input: unknown,
  pathPrefix: string,
  errors: ValidationError[]
): BubbleReworkIntentRecord | undefined {
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const intentId = input.intent_id;
  if (!isNonEmptyString(intentId)) {
    errors.push({
      path: `${pathPrefix}.intent_id`,
      message: "Must be a non-empty string"
    });
  }

  const message = input.message;
  if (!isNonEmptyString(message)) {
    errors.push({
      path: `${pathPrefix}.message`,
      message: "Must be a non-empty string"
    });
  }

  const refs = validateOptionalRefs({
    refs: input.refs,
    pathPrefix,
    errors
  });

  const requestedBy = input.requested_by;
  if (!isNonEmptyString(requestedBy)) {
    errors.push({
      path: `${pathPrefix}.requested_by`,
      message: "Must be a non-empty string"
    });
  }

  const requestedAt = input.requested_at;
  if (!isIsoTimestamp(requestedAt)) {
    errors.push({
      path: `${pathPrefix}.requested_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  const status = input.status;
  if (!isReworkIntentStatus(status)) {
    errors.push({
      path: `${pathPrefix}.status`,
      message: "Must be one of: pending, applied, superseded"
    });
  }

  const supersededByIntentId = validateSupersededByIntentId({
    status,
    supersededByIntentId: input.superseded_by_intent_id,
    pathPrefix,
    errors
  });

  if (
    !isNonEmptyString(intentId) ||
    !isNonEmptyString(message) ||
    !isNonEmptyString(requestedBy) ||
    !isIsoTimestamp(requestedAt) ||
    !isReworkIntentStatus(status)
  ) {
    return undefined;
  }

  return {
    intent_id: intentId,
    message,
    ...(refs !== undefined ? { refs } : {}),
    requested_by: requestedBy,
    requested_at: requestedAt,
    status,
    ...(isNonEmptyString(supersededByIntentId)
      ? { superseded_by_intent_id: supersededByIntentId }
      : {})
  };
}
