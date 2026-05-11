import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  isMetaReviewRuntimeDeliveryStatus,
  type BubbleMetaReviewRuntimeDeliveryState,
  type BubbleMetaReviewSnapshotState
} from "../../shared/metaReview/metaReviewSnapshotTypes.js";
import {
  isBubbleExecutionContextAwaitedOutputType,
  isMetaReviewExecutionContextAwaitedOutputType,
  type BubbleExecutionContext,
  type BubbleMetaReviewExecutionContext
} from "../../domain/state/executionContextTypes.js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  isAgentName,
  isAgentRole
} from "../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../domain/state/bubbleStateSnapshotTypes.js";
import type {
  BubbleReworkIntentRecord
} from "../../domain/state/reworkIntentTypes.js";
import type {
  RoundRoleHistoryEntry
} from "../../domain/state/roundRoleHistoryTypes.js";
import {
  assertValidBubbleStateSnapshot,
  validateBubbleStateSnapshot
} from "../../domain/state/stateSchema.js";
import {
  normalizeMetaReviewRuntimeDeliveryCorrelation
} from "../../shared/metaReview/metaReviewSnapshot.js";
import { isBubbleLifecycleState } from "../../../contracts/kernel/lifecycle.js";
import {
  isReworkIntentStatus
} from "../../domain/state/reworkIntentTypes.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  SchemaValidationError,
  type ValidationError
} from "../../shared/validation/primitives.js";

export interface StateValidationDiagnostics {
  message: string;
  errors: ValidationError[];
}

export interface InspectedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
  stateValidation: StateValidationDiagnostics | null;
}

const inspectStatePreE1ExecutionAuthorityRejectedReasonCode =
  "INSPECT_STATE_PRE_E1_EXECUTION_AUTHORITY_REJECTED";

export function fingerprintState(state: BubbleStateSnapshot): string {
  const normalized = JSON.stringify(state);
  return createHash("sha256").update(normalized).digest("hex");
}

function hasPreE1ExecutionAuthorityShape(value: unknown): boolean {
  return isRecord(value) && !Object.hasOwn(value, "execution_id");
}

function hasFailClosedPreE1Authority(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  if (hasPreE1ExecutionAuthorityShape(input.execution_context)) {
    return true;
  }

  if (!isRecord(input.meta_review)) {
    return false;
  }

  return hasPreE1ExecutionAuthorityShape(input.meta_review.execution_context);
}

function throwPreE1ExecutionAuthorityInspectionError(
  errors: ValidationError[]
): never {
  const firstAuthorityError =
    errors.find((error) =>
      error.message.startsWith(
        "ACTOR_EMIT_CONTEXT_PRE_E1_EXECUTION_ID_MISSING"
      )
    ) ?? errors[0];

  throw new SchemaValidationError({
    message:
      `${inspectStatePreE1ExecutionAuthorityRejectedReasonCode}: inspection rejected a pre-E1 execution authority snapshot; fresh authority remint is required.`,
    errors,
    context: {
      source: "assert_validation",
      errorCount: errors.length,
      firstErrorPath: firstAuthorityError?.path
    }
  });
}

function normalizeInspectableMetaReviewExecutionContext(
  value: unknown
): BubbleMetaReviewExecutionContext | null {
  if (value === undefined || value === null || !isRecord(value)) return null;
  if (!Object.hasOwn(value, "execution_id")) return null;
  if (!isNonEmptyString(value.handoff_id)) return null;
  if (!isNonEmptyString(value.execution_id)) return null;
  if (!isInteger(value.round) || value.round <= 0) return null;
  if (!isMetaReviewExecutionContextAwaitedOutputType(value.awaited_output_type)) return null;
  if (!isIsoTimestamp(value.started_at) || !isIsoTimestamp(value.deadline_at)) return null;
  if (!isInteger(value.attempt) || value.attempt <= 0) return null;
  return {
    handoff_id: value.handoff_id,
    execution_id: value.execution_id,
    round: value.round,
    awaited_output_type: value.awaited_output_type,
    started_at: value.started_at,
    deadline_at: value.deadline_at,
    attempt: value.attempt
  };
}

function normalizeInspectableExecutionContext(
  value: unknown
): BubbleExecutionContext | null {
  if (value === undefined || value === null || !isRecord(value)) return null;
  if (!Object.hasOwn(value, "execution_id")) return null;
  if (!isAgentRole(value.active_role) || !isNonEmptyString(value.handoff_id)) return null;
  if (!isNonEmptyString(value.execution_id)) return null;
  if (!isInteger(value.round) || value.round <= 0) return null;
  if (!isBubbleExecutionContextAwaitedOutputType(value.awaited_output_type)) return null;
  if (!isIsoTimestamp(value.started_at) || !isIsoTimestamp(value.deadline_at)) return null;
  if (!isInteger(value.attempt) || value.attempt <= 0) return null;
  return {
    active_role: value.active_role,
    handoff_id: value.handoff_id,
    execution_id: value.execution_id,
    round: value.round,
    awaited_output_type: value.awaited_output_type,
    started_at: value.started_at,
    deadline_at: value.deadline_at,
    attempt: value.attempt
  };
}

function normalizeInspectableMetaReviewRuntimeDelivery(
  value: unknown
): BubbleMetaReviewRuntimeDeliveryState | null {
  if (value === undefined || value === null || !isRecord(value)) return null;
  if (!isMetaReviewRuntimeDeliveryStatus(value.status)) return null;
  if (value.reason_code !== null && !isNonEmptyString(value.reason_code)) return null;
  if (!isNonEmptyString(value.message) || !isIsoTimestamp(value.observed_at)) return null;
  if (value.observed_for_handoff_id !== null && value.observed_for_handoff_id !== undefined && !isNonEmptyString(value.observed_for_handoff_id)) return null;
  if (value.observed_for_round !== null && value.observed_for_round !== undefined && (!isInteger(value.observed_for_round) || value.observed_for_round <= 0)) return null;
  const correlation = normalizeMetaReviewRuntimeDeliveryCorrelation({
    observedForHandoffId:
      isNonEmptyString(value.observed_for_handoff_id)
        ? value.observed_for_handoff_id
        : null,
    observedForRound:
      isInteger(value.observed_for_round) && value.observed_for_round > 0
        ? value.observed_for_round
        : null
  });
  // Inspect fallback keeps malformed diagnostic snapshots non-authoritative:
  // partially correlated persisted fields are normalized to null/null so
  // downstream readers never see a synthetic active projection.
  return {
    status: value.status,
    reason_code: value.reason_code,
    message: value.message,
    observed_at: value.observed_at,
    observed_for_handoff_id: correlation.observedForHandoffId,
    observed_for_round: correlation.observedForRound
  };
}

function normalizeInspectableMetaReviewSnapshot(
  value: unknown
): BubbleMetaReviewSnapshotState | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    return {
      execution_context: null,
      runtime_delivery: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false,
      consecutive_clean_runs: 0
    };
  }

  return {
    execution_context: normalizeInspectableMetaReviewExecutionContext(value.execution_context),
    runtime_delivery: normalizeInspectableMetaReviewRuntimeDelivery(value.runtime_delivery),
    auto_rework_count: isInteger(value.auto_rework_count) && value.auto_rework_count >= 0 ? value.auto_rework_count : 0,
    auto_rework_limit: isInteger(value.auto_rework_limit) && value.auto_rework_limit >= 1 ? value.auto_rework_limit : DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
    sticky_human_gate: value.sticky_human_gate === true,
    consecutive_clean_runs: isInteger(value.consecutive_clean_runs) && value.consecutive_clean_runs >= 0 ? value.consecutive_clean_runs : 0
  };
}

function normalizeInspectableRoundRoleEntry(value: unknown): RoundRoleHistoryEntry | null {
  if (!isRecord(value)) return null;
  if (!isInteger(value.round) || value.round <= 0) return null;
  if (!isAgentName(value.implementer) || !isAgentName(value.reviewer)) return null;
  if (!isIsoTimestamp(value.switched_at)) return null;
  return {
    round: value.round,
    implementer: value.implementer,
    reviewer: value.reviewer,
    switched_at: value.switched_at
  };
}

function normalizeInspectableReworkIntentRecord(
  value: unknown
): BubbleReworkIntentRecord | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.intent_id) || !isNonEmptyString(value.message)) return null;
  if (!isNonEmptyString(value.requested_by) || !isIsoTimestamp(value.requested_at)) return null;
  if (!isReworkIntentStatus(value.status)) return null;

  const refs =
    value.refs === undefined
      ? undefined
      : Array.isArray(value.refs) && value.refs.every((ref) => isNonEmptyString(ref))
        ? value.refs.map((ref) => ref.trim())
        : null;
  if (refs === null) return null;
  if (value.superseded_by_intent_id !== undefined && value.superseded_by_intent_id !== null && !isNonEmptyString(value.superseded_by_intent_id)) {
    return null;
  }

  return {
    intent_id: value.intent_id.trim(),
    message: value.message,
    ...(refs !== undefined ? { refs } : {}),
    requested_by: value.requested_by.trim(),
    requested_at: value.requested_at,
    status: value.status,
    ...(isNonEmptyString(value.superseded_by_intent_id) ? { superseded_by_intent_id: value.superseded_by_intent_id.trim() } : {})
  };
}

function coerceInspectableBubbleStateSnapshot(value: unknown): BubbleStateSnapshot | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.bubble_id) || !isBubbleLifecycleState(value.state)) return null;
  if (!isInteger(value.round) || value.round < 0) return null;

  const roundRoleHistory = Array.isArray(value.round_role_history)
    ? value.round_role_history.flatMap((entry) => {
        const normalized = normalizeInspectableRoundRoleEntry(entry);
        return normalized === null ? [] : [normalized];
      })
    : [];
  const reworkIntentHistory = Array.isArray(value.rework_intent_history)
    ? value.rework_intent_history.flatMap((entry) => {
        const normalized = normalizeInspectableReworkIntentRecord(entry);
        return normalized === null ? [] : [normalized];
      })
    : [];
  const normalizedMetaReview = normalizeInspectableMetaReviewSnapshot(
    value.meta_review
  );

  return {
    bubble_id: value.bubble_id.trim(),
    state: value.state,
    round: value.round,
    active_agent: isAgentName(value.active_agent) ? value.active_agent : null,
    active_since: typeof value.active_since === "string" ? value.active_since : null,
    active_role: isAgentRole(value.active_role) ? value.active_role : null,
    execution_context: normalizeInspectableExecutionContext(value.execution_context),
    round_role_history: roundRoleHistory,
    last_command_at: typeof value.last_command_at === "string" ? value.last_command_at : null,
    pending_rework_intent: normalizeInspectableReworkIntentRecord(value.pending_rework_intent),
    rework_intent_history: reworkIntentHistory,
    ...(normalizedMetaReview !== undefined
      ? { meta_review: normalizedMetaReview }
      : {})
  };
}

async function loadStateSnapshot(statePath: string): Promise<InspectedStateSnapshot> {
  const raw = await readFile(statePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const result = validateBubbleStateSnapshot(parsed);
  if (result.ok) {
    return {
      state: result.value,
      fingerprint: fingerprintState(result.value),
      stateValidation: null
    };
  }

  if (hasFailClosedPreE1Authority(parsed)) {
    throwPreE1ExecutionAuthorityInspectionError(result.errors);
  }

  const inspectable = coerceInspectableBubbleStateSnapshot(parsed);
  if (inspectable === null) {
    const state = assertValidBubbleStateSnapshot(parsed);
    return {
      state,
      fingerprint: fingerprintState(state),
      stateValidation: null
    };
  }

  return {
    state: inspectable,
    fingerprint: fingerprintState(inspectable),
    stateValidation: {
      message: "Invalid bubble state",
      errors: result.errors
    }
  };
}

export async function inspectStateSnapshot(statePath: string): Promise<InspectedStateSnapshot> {
  return loadStateSnapshot(statePath);
}
