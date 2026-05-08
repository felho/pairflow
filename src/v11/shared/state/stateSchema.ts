import {
  assertValidation,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../validation/primitives.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../metaReview/metaReviewSnapshotTypes.js";
import type { BubbleStateSnapshot } from "./bubbleStateSnapshotTypes.js";
import { validateMetaReviewSnapshot } from "./stateSchemaMetaReview.js";
import {
  validateBubbleStateActivityFields,
  validateBubbleStateCoreFields,
  validateReworkIntentState,
  validateRoundRoleHistory
} from "./stateSchemaSnapshotSlices.js";
import {
  normalizeMetaReviewState,
  validateBubbleStateAuthority
} from "./stateSchemaAuthority.js";

export function validateBubbleStateSnapshot(
  input: unknown
): ValidationResult<BubbleStateSnapshot> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "State must be an object" }]);
  }

  const { bubbleId, state, round, validatedRound } =
    validateBubbleStateCoreFields(input, errors);
  const {
    activeAgent,
    activeRole,
    activeSince,
    lastCommandAt,
    executionContext
  } = validateBubbleStateActivityFields(input, errors);
  const roundRoleHistory = validateRoundRoleHistory(input.round_role_history, errors);
  const { pendingReworkIntent, reworkIntentHistory } =
    validateReworkIntentState(input, errors);

  let metaReview: BubbleMetaReviewSnapshotState | undefined;
  const metaReviewRaw = input.meta_review;
  if (metaReviewRaw !== undefined) {
    metaReview = validateMetaReviewSnapshot(metaReviewRaw, errors);
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

  const metaReviewAuthorityActive = validateBubbleStateAuthority({
    state,
    validatedRound,
    activeAgent,
    activeRole,
    activeSince,
    executionContext,
    metaReview,
    errors
  });

  if (errors.length > 0) {
    return validationFail(errors);
  }

  const normalizedMetaReview = normalizeMetaReviewState({
    metaReview,
    metaReviewAuthorityActive,
    executionContext
  });

  return validationOk({
    bubble_id: bubbleId,
    state,
    round,
    active_agent: activeAgent,
    active_since: activeSince,
    active_role: activeRole,
    execution_context: executionContext,
    round_role_history: roundRoleHistory,
    last_command_at: lastCommandAt,
    pending_rework_intent: pendingReworkIntent,
    rework_intent_history: reworkIntentHistory,
    ...(normalizedMetaReview !== undefined ? { meta_review: normalizedMetaReview } : {})
  });
}

export function assertValidBubbleStateSnapshot(input: unknown): BubbleStateSnapshot {
  const result = validateBubbleStateSnapshot(input);
  return assertValidation(result, "Invalid bubble state");
}
