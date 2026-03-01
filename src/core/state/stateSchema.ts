import {
  assertValidation,
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation.js";
import {
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isReworkIntentStatus,
  type BubbleReworkIntentRecord,
  type BubbleStateSnapshot,
  type RoundRoleHistoryEntry
} from "../../types/bubble.js";

function validateRoundRoleEntry(
  input: unknown,
  index: number,
  errors: ValidationError[]
): RoundRoleHistoryEntry | undefined {
  const pathPrefix = `round_role_history[${index}]`;
  if (!isRecord(input)) {
    errors.push({
      path: pathPrefix,
      message: "Must be an object"
    });
    return undefined;
  }

  const round = input.round;
  if (!isInteger(round) || round <= 0) {
    errors.push({
      path: `${pathPrefix}.round`,
      message: "Must be a positive integer"
    });
  }

  const implementer = input.implementer;
  if (!isAgentName(implementer)) {
    errors.push({
      path: `${pathPrefix}.implementer`,
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = input.reviewer;
  if (!isAgentName(reviewer)) {
    errors.push({
      path: `${pathPrefix}.reviewer`,
      message: "Must be one of: codex, claude"
    });
  }

  const switchedAt = input.switched_at;
  if (!isIsoTimestamp(switchedAt)) {
    errors.push({
      path: `${pathPrefix}.switched_at`,
      message: "Must be a valid ISO timestamp"
    });
  }

  if (
    isAgentName(implementer) &&
    isAgentName(reviewer) &&
    implementer === reviewer
  ) {
    errors.push({
      path: pathPrefix,
      message: "implementer and reviewer cannot be the same agent"
    });
  }

  if (
    !isInteger(round) ||
    round <= 0 ||
    !isAgentName(implementer) ||
    !isAgentName(reviewer) ||
    !isIsoTimestamp(switchedAt)
  ) {
    return undefined;
  }

  return {
    round,
    implementer,
    reviewer,
    switched_at: switchedAt
  };
}

function validateReworkIntentRecord(
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

  const supersededByIntentId = input.superseded_by_intent_id;
  if (
    supersededByIntentId !== undefined &&
    !isNonEmptyString(supersededByIntentId)
  ) {
    errors.push({
      path: `${pathPrefix}.superseded_by_intent_id`,
      message: "Must be a non-empty string when provided"
    });
  }

  if (
    isReworkIntentStatus(status) &&
    status !== "superseded" &&
    supersededByIntentId !== undefined
  ) {
    errors.push({
      path: `${pathPrefix}.superseded_by_intent_id`,
      message: "Only superseded intents may define superseded_by_intent_id"
    });
  }

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
    requested_by: requestedBy,
    requested_at: requestedAt,
    status,
    ...(isNonEmptyString(supersededByIntentId)
      ? { superseded_by_intent_id: supersededByIntentId }
      : {})
  };
}

export function validateBubbleStateSnapshot(
  input: unknown
): ValidationResult<BubbleStateSnapshot> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "State must be an object" }]);
  }

  const bubbleId = input.bubble_id;
  if (!isNonEmptyString(bubbleId)) {
    errors.push({
      path: "bubble_id",
      message: "Must be a non-empty string"
    });
  }

  const state = input.state;
  if (!isBubbleLifecycleState(state)) {
    errors.push({
      path: "state",
      message:
        "Must be one of: CREATED, PREPARING_WORKSPACE, RUNNING, WAITING_HUMAN, READY_FOR_APPROVAL, APPROVED_FOR_COMMIT, COMMITTED, DONE, FAILED, CANCELLED"
    });
  }

  const round = input.round;
  if (!isInteger(round) || round < 0) {
    errors.push({
      path: "round",
      message: "Must be a non-negative integer"
    });
  }

  const activeAgent = input.active_agent;
  const activeRole = input.active_role;
  const activeSince = input.active_since;
  const lastCommandAt = input.last_command_at;

  if (!(activeAgent === null || isAgentName(activeAgent))) {
    errors.push({
      path: "active_agent",
      message: "Must be null or one of: codex, claude"
    });
  }

  if (!(activeRole === null || isAgentRole(activeRole))) {
    errors.push({
      path: "active_role",
      message: "Must be null or one of: implementer, reviewer"
    });
  }

  if (!(activeSince === null || isIsoTimestamp(activeSince))) {
    errors.push({
      path: "active_since",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  if (!(lastCommandAt === null || isIsoTimestamp(lastCommandAt))) {
    errors.push({
      path: "last_command_at",
      message: "Must be null or a valid ISO timestamp"
    });
  }

  const historyRaw = input.round_role_history;
  const roundRoleHistory: RoundRoleHistoryEntry[] = [];
  if (!Array.isArray(historyRaw)) {
    errors.push({
      path: "round_role_history",
      message: "Must be an array"
    });
  } else {
    historyRaw.forEach((entry, index) => {
      const validated = validateRoundRoleEntry(entry, index, errors);
      if (validated !== undefined) {
        roundRoleHistory.push(validated);
      }
    });
  }

  const pendingReworkIntentRaw = input.pending_rework_intent;
  let pendingReworkIntent: BubbleReworkIntentRecord | null = null;
  if (pendingReworkIntentRaw === undefined || pendingReworkIntentRaw === null) {
    pendingReworkIntent = null;
  } else {
    const validated = validateReworkIntentRecord(
      pendingReworkIntentRaw,
      "pending_rework_intent",
      errors
    );
    if (validated !== undefined) {
      pendingReworkIntent = validated;
    }
  }

  if (
    pendingReworkIntent !== null &&
    pendingReworkIntent.status !== "pending"
  ) {
    errors.push({
      path: "pending_rework_intent.status",
      message: "pending_rework_intent must have status=pending"
    });
  }

  const reworkIntentHistoryRaw = input.rework_intent_history;
  const reworkIntentHistory: BubbleReworkIntentRecord[] = [];
  if (reworkIntentHistoryRaw === undefined) {
    // Default to empty history for backward-compatible state files.
  } else if (!Array.isArray(reworkIntentHistoryRaw)) {
    errors.push({
      path: "rework_intent_history",
      message: "Must be an array"
    });
  } else {
    reworkIntentHistoryRaw.forEach((entry, index) => {
      const path = `rework_intent_history[${index}]`;
      const validated = validateReworkIntentRecord(entry, path, errors);
      if (validated === undefined) {
        return;
      }
      if (validated.status === "pending") {
        errors.push({
          path: `${path}.status`,
          message: "History intents cannot use status=pending"
        });
        return;
      }
      reworkIntentHistory.push(validated);
    });
  }

  const knownIntentIds = new Set<string>();
  if (pendingReworkIntent !== null) {
    knownIntentIds.add(pendingReworkIntent.intent_id);
  }
  for (const intent of reworkIntentHistory) {
    if (knownIntentIds.has(intent.intent_id)) {
      errors.push({
        path: "rework_intent_history",
        message: `Duplicate rework intent id: ${intent.intent_id}`
      });
      continue;
    }
    knownIntentIds.add(intent.intent_id);
  }

  const hasAnyActiveField =
    activeAgent !== null || activeRole !== null || activeSince !== null;
  const hasAllActiveFields =
    activeAgent !== null && activeRole !== null && activeSince !== null;

  if (hasAnyActiveField && !hasAllActiveFields) {
    errors.push({
      path: "active_*",
      message:
        "active_agent, active_role, and active_since must be provided together"
    });
  }

  if (state === "RUNNING" && !hasAllActiveFields) {
    errors.push({
      path: "active_*",
      message:
        "RUNNING state requires active_agent, active_role, and active_since"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    bubble_id: bubbleId as string,
    state: state as BubbleStateSnapshot["state"],
    round: round as number,
    active_agent: activeAgent as BubbleStateSnapshot["active_agent"],
    active_since: activeSince as BubbleStateSnapshot["active_since"],
    active_role: activeRole as BubbleStateSnapshot["active_role"],
    round_role_history: roundRoleHistory,
    last_command_at: lastCommandAt as BubbleStateSnapshot["last_command_at"],
    pending_rework_intent: pendingReworkIntent,
    rework_intent_history: reworkIntentHistory
  });
}

export function assertValidBubbleStateSnapshot(input: unknown): BubbleStateSnapshot {
  const result = validateBubbleStateSnapshot(input);
  return assertValidation(result, "Invalid bubble state");
}
