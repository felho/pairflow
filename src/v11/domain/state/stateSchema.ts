import {
  assertValidation,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../../shared/validation/primitives.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import type { BubbleStateSnapshot } from "./snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "./snapshot/buildBubbleStateSnapshot.js";
import type { PersistedBubbleStateSnapshot } from "./snapshot/persistedBubbleStateSnapshot.js";
import { validateMetaReviewSnapshot } from "./metaReview/stateSchemaMetaReview.js";
import {
  validateBubbleStateActivityFields,
  validateBubbleStateCoreFields,
  validateReworkIntentState,
  validateRoundRoleHistory
} from "./snapshot/stateSchemaSnapshotSlices.js";
import {
  normalizeMetaReviewState,
  validateBubbleStateAuthority
} from "./authority/stateSchemaAuthority.js";

export function parseBubbleStateSnapshot(
  input: unknown
): ValidationResult<PersistedBubbleStateSnapshot> {
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

export function assertParsedBubbleStateSnapshot(input: unknown): PersistedBubbleStateSnapshot {
  const result = parseBubbleStateSnapshot(input);
  return assertValidation(result, "Invalid bubble state");
}

// Opt-in domain-variant parser. Step 4b-α (revised) introduces the variant
// model as additive API; consumers that want kind-discriminated narrowing
// invoke these functions explicitly. The canonical parser still returns
// the persisted shape; the parser switch to the variant union is the
// terminal Step 4b commit (mandatory final endpoint).

export function parseDomainBubbleStateSnapshot(
  input: unknown
): ValidationResult<BubbleStateSnapshot> {
  const persistedResult = parseBubbleStateSnapshot(input);
  if (!persistedResult.ok) {
    return persistedResult;
  }
  return validationOk(buildBubbleStateSnapshotVariant(persistedResult.value));
}

export function assertParsedDomainBubbleStateSnapshot(input: unknown): BubbleStateSnapshot {
  const result = parseDomainBubbleStateSnapshot(input);
  return assertValidation(result, "Invalid bubble state");
}
