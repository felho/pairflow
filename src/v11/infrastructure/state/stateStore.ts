import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";

import {
  assertValidBubbleStateSnapshot,
  validateBubbleStateSnapshot
} from "../../shared/state/stateSchema.js";
import {
  FileLockTimeoutError,
  withFileLock
} from "../foundation/fs/fileLock.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  isAgentName,
  isAgentRole,
  isBubbleExecutionContextAwaitedOutputType,
  isBubbleLifecycleState,
  isMetaReviewExecutionContextAwaitedOutputType,
  isMetaReviewRecommendation,
  isMetaReviewRunStatus,
  isMetaReviewRuntimeDeliveryStatus,
  isReworkIntentStatus,
  type BubbleExecutionContext,
  type BubbleMetaReviewExecutionContext,
  type BubbleLifecycleState,
  type BubbleMetaReviewRuntimeDeliveryState,
  type BubbleMetaReviewSnapshotState,
  type BubbleReworkIntentRecord,
  type RoundRoleHistoryEntry,
  type BubbleStateSnapshot
} from "../../../types/bubble.js";
import {
  isInteger,
  isIsoTimestamp,
  isNonEmptyString,
  isRecord,
  SchemaValidationError,
  type ValidationError
} from "../../shared/validation/primitives.js";

export interface LoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface StateValidationDiagnostics {
  message: string;
  errors: ValidationError[];
}

export interface InspectedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
  stateValidation: StateValidationDiagnostics | null;
}

export interface WriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
  lockTimeoutMs?: number;
}

export class StateStoreConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StateStoreConflictError";
  }
}

function fingerprintState(state: BubbleStateSnapshot): string {
  const normalized = JSON.stringify(state);
  return createHash("sha256").update(normalized).digest("hex");
}

function serializeState(state: BubbleStateSnapshot): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function normalizeInspectableMetaReviewExecutionContext(
  value: unknown
): BubbleMetaReviewExecutionContext | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  const handoffId = value.handoff_id;
  const round = value.round;
  const awaitedOutputType = value.awaited_output_type;
  const startedAt = value.started_at;
  const deadlineAt = value.deadline_at;
  const attempt = value.attempt;

  if (!isNonEmptyString(handoffId)) {
    return null;
  }
  if (!isInteger(round) || round <= 0) {
    return null;
  }
  if (!isMetaReviewExecutionContextAwaitedOutputType(awaitedOutputType)) {
    return null;
  }
  if (!isIsoTimestamp(startedAt) || !isIsoTimestamp(deadlineAt)) {
    return null;
  }
  if (!isInteger(attempt) || attempt <= 0) {
    return null;
  }

  return {
    handoff_id: handoffId,
    round,
    awaited_output_type: awaitedOutputType,
    started_at: startedAt,
    deadline_at: deadlineAt,
    attempt
  };
}

function normalizeInspectableExecutionContext(
  value: unknown
): BubbleExecutionContext | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  const activeRole = value.active_role;
  const handoffId = value.handoff_id;
  const round = value.round;
  const awaitedOutputType = value.awaited_output_type;
  const startedAt = value.started_at;
  const deadlineAt = value.deadline_at;
  const attempt = value.attempt;

  if (!isAgentRole(activeRole)) {
    return null;
  }
  if (!isNonEmptyString(handoffId)) {
    return null;
  }
  if (!isInteger(round) || round <= 0) {
    return null;
  }
  if (!isBubbleExecutionContextAwaitedOutputType(awaitedOutputType)) {
    return null;
  }
  if (!isIsoTimestamp(startedAt) || !isIsoTimestamp(deadlineAt)) {
    return null;
  }
  if (!isInteger(attempt) || attempt <= 0) {
    return null;
  }

  return {
    active_role: activeRole,
    handoff_id: handoffId,
    round,
    awaited_output_type: awaitedOutputType,
    started_at: startedAt,
    deadline_at: deadlineAt,
    attempt
  };
}

function normalizeInspectableMetaReviewRuntimeDelivery(
  value: unknown
): BubbleMetaReviewRuntimeDeliveryState | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }

  const status = value.status;
  const reasonCode = value.reason_code;
  const message = value.message;
  const observedAt = value.observed_at;
  const observedForHandoffId = value.observed_for_handoff_id;
  const observedForRound = value.observed_for_round;

  if (!isMetaReviewRuntimeDeliveryStatus(status)) {
    return null;
  }
  if (reasonCode !== null && !isNonEmptyString(reasonCode)) {
    return null;
  }
  if (!isNonEmptyString(message)) {
    return null;
  }
  if (!isIsoTimestamp(observedAt)) {
    return null;
  }
  if (
    observedForHandoffId !== null &&
    !isNonEmptyString(observedForHandoffId)
  ) {
    return null;
  }
  if (
    observedForRound !== null &&
    (!isInteger(observedForRound) || observedForRound <= 0)
  ) {
    return null;
  }

  return {
    status,
    reason_code: reasonCode,
    message,
    observed_at: observedAt,
    observed_for_handoff_id: observedForHandoffId,
    observed_for_round: observedForRound
  };
}

function normalizeInspectableMetaReviewSnapshot(
  value: unknown
): BubbleMetaReviewSnapshotState | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return {
      execution_context: null,
      runtime_delivery: null,
      last_autonomous_run_id: null,
      last_autonomous_status: null,
      last_autonomous_recommendation: null,
      last_autonomous_summary: null,
      last_autonomous_report_ref: null,
      last_autonomous_rework_target_message: null,
      last_autonomous_updated_at: null,
      auto_rework_count: 0,
      auto_rework_limit: DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
      sticky_human_gate: false
    };
  }

  const autoReworkCount =
    isInteger(value.auto_rework_count) && value.auto_rework_count >= 0
      ? value.auto_rework_count
      : 0;
  const autoReworkLimit =
    isInteger(value.auto_rework_limit) && value.auto_rework_limit >= 1
      ? value.auto_rework_limit
      : DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT;

  return {
    execution_context: normalizeInspectableMetaReviewExecutionContext(
      value.execution_context
    ),
    runtime_delivery: normalizeInspectableMetaReviewRuntimeDelivery(
      value.runtime_delivery
    ),
    last_autonomous_run_id: isNonEmptyString(value.last_autonomous_run_id)
      ? value.last_autonomous_run_id.trim()
      : null,
    last_autonomous_status: isMetaReviewRunStatus(value.last_autonomous_status)
      ? value.last_autonomous_status
      : null,
    last_autonomous_recommendation:
      isMetaReviewRecommendation(value.last_autonomous_recommendation)
        ? value.last_autonomous_recommendation
        : null,
    last_autonomous_summary:
      typeof value.last_autonomous_summary === "string"
        ? value.last_autonomous_summary
        : null,
    last_autonomous_report_ref:
      typeof value.last_autonomous_report_ref === "string"
        ? value.last_autonomous_report_ref
        : null,
    last_autonomous_rework_target_message:
      typeof value.last_autonomous_rework_target_message === "string"
        ? value.last_autonomous_rework_target_message
        : null,
    last_autonomous_updated_at:
      typeof value.last_autonomous_updated_at === "string"
        ? value.last_autonomous_updated_at
        : null,
    auto_rework_count: autoReworkCount,
    auto_rework_limit: autoReworkLimit,
    sticky_human_gate: value.sticky_human_gate === true
  };
}

function normalizeInspectableRoundRoleEntry(
  value: unknown
): RoundRoleHistoryEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isInteger(value.round) || value.round <= 0) {
    return null;
  }
  if (!isAgentName(value.implementer) || !isAgentName(value.reviewer)) {
    return null;
  }
  if (!isIsoTimestamp(value.switched_at)) {
    return null;
  }

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
  if (!isRecord(value)) {
    return null;
  }

  if (!isNonEmptyString(value.intent_id) || !isNonEmptyString(value.message)) {
    return null;
  }
  if (!isNonEmptyString(value.requested_by) || !isIsoTimestamp(value.requested_at)) {
    return null;
  }
  if (!isReworkIntentStatus(value.status)) {
    return null;
  }

  const refs =
    value.refs === undefined
      ? undefined
      : (
          Array.isArray(value.refs)
          && value.refs.every((ref) => isNonEmptyString(ref))
            ? value.refs.map((ref) => ref.trim())
            : null
        );
  if (refs === null) {
    return null;
  }

  if (
    value.superseded_by_intent_id !== undefined
    && value.superseded_by_intent_id !== null
    && !isNonEmptyString(value.superseded_by_intent_id)
  ) {
    return null;
  }

  return {
    intent_id: value.intent_id.trim(),
    message: value.message,
    ...(refs !== undefined ? { refs } : {}),
    requested_by: value.requested_by.trim(),
    requested_at: value.requested_at,
    status: value.status,
    ...(isNonEmptyString(value.superseded_by_intent_id)
      ? { superseded_by_intent_id: value.superseded_by_intent_id.trim() }
      : {})
  };
}

function coerceInspectableBubbleStateSnapshot(
  value: unknown
): BubbleStateSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isNonEmptyString(value.bubble_id) || !isBubbleLifecycleState(value.state)) {
    return null;
  }

  if (!isInteger(value.round) || value.round < 0) {
    return null;
  }

  const metaReview = normalizeInspectableMetaReviewSnapshot(value.meta_review);
  const executionContext = normalizeInspectableExecutionContext(
    value.execution_context
  );
  const roundRoleHistory = Array.isArray(value.round_role_history)
    ? value.round_role_history.flatMap((entry) => {
      const normalized = normalizeInspectableRoundRoleEntry(entry);
      return normalized === null ? [] : [normalized];
    })
    : [];
  const pendingReworkIntent =
    normalizeInspectableReworkIntentRecord(value.pending_rework_intent);
  const reworkIntentHistory = Array.isArray(value.rework_intent_history)
    ? value.rework_intent_history.flatMap((entry) => {
      const normalized = normalizeInspectableReworkIntentRecord(entry);
      return normalized === null ? [] : [normalized];
    })
    : [];
  return {
    bubble_id: value.bubble_id.trim(),
    state: value.state,
    round: value.round,
    active_agent: isAgentName(value.active_agent) ? value.active_agent : null,
    active_since:
      typeof value.active_since === "string" ? value.active_since : null,
    active_role: isAgentRole(value.active_role) ? value.active_role : null,
    execution_context: executionContext,
    round_role_history: roundRoleHistory,
    last_command_at:
      typeof value.last_command_at === "string" ? value.last_command_at : null,
    pending_rework_intent: pendingReworkIntent,
    rework_intent_history: reworkIntentHistory,
    ...(metaReview !== undefined ? { meta_review: metaReview } : {})
  };
}

async function loadStateSnapshot(
  statePath: string
): Promise<InspectedStateSnapshot> {
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

export async function readStateSnapshot(
  statePath: string
): Promise<LoadedStateSnapshot> {
  const loaded = await loadStateSnapshot(statePath);
  if (loaded.stateValidation !== null) {
    throw new SchemaValidationError(
      loaded.stateValidation.message,
      loaded.stateValidation.errors
    );
  }
  return {
    state: loaded.state,
    fingerprint: loaded.fingerprint
  };
}

export async function inspectStateSnapshot(
  statePath: string
): Promise<InspectedStateSnapshot> {
  return loadStateSnapshot(statePath);
}

async function atomicWriteState(
  statePath: string,
  state: BubbleStateSnapshot
): Promise<void> {
  const parentDir = dirname(statePath);
  const tempPath = join(parentDir, `.state-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeState(state), { encoding: "utf8" });
    await rename(tempPath, statePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function withStateWriteLock<T>(
  statePath: string,
  timeoutMs: number,
  task: () => Promise<T>
): Promise<T> {
  const lockPath = `${statePath}.lock`;
  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs
      },
      task
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new StateStoreConflictError(
        `Could not acquire state write lock: ${lockPath}`
      );
    }

    throw error;
  }
}

export async function createStateSnapshot(
  statePath: string,
  state: BubbleStateSnapshot
): Promise<LoadedStateSnapshot> {
  const validated = assertValidBubbleStateSnapshot(state);
  await writeFile(statePath, serializeState(validated), {
    encoding: "utf8",
    flag: "wx"
  });
  return {
    state: validated,
    fingerprint: fingerprintState(validated)
  };
}

export async function writeStateSnapshot(
  statePath: string,
  state: BubbleStateSnapshot,
  options: WriteStateSnapshotOptions = {}
): Promise<LoadedStateSnapshot> {
  const validated = assertValidBubbleStateSnapshot(state);
  return withStateWriteLock(
    statePath,
    options.lockTimeoutMs ?? 5_000,
    async () => {
      const current = await readStateSnapshot(statePath);

      if (
        options.expectedFingerprint !== undefined &&
        options.expectedFingerprint !== current.fingerprint
      ) {
        throw new StateStoreConflictError(
          "State fingerprint mismatch; possible concurrent update."
        );
      }

      if (
        options.expectedState !== undefined &&
        options.expectedState !== current.state.state
      ) {
        throw new StateStoreConflictError(
          `Expected current state ${options.expectedState} but found ${current.state.state}.`
        );
      }

      await atomicWriteState(statePath, validated);

      return {
        state: validated,
        fingerprint: fingerprintState(validated)
      };
    }
  );
}
