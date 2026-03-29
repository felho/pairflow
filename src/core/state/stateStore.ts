import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";

import {
  assertValidBubbleStateSnapshot,
  validateBubbleStateSnapshot
} from "./stateSchema.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";
import {
  DEFAULT_META_REVIEW_AUTO_REWORK_LIMIT,
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isMetaReviewRecommendation,
  isMetaReviewRunStatus,
  type BubbleLifecycleState,
  type BubbleMetaReviewSnapshotState,
  type BubbleStateSnapshot
} from "../../types/bubble.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord,
  SchemaValidationError,
  type ValidationError
} from "../validation.js";

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

function normalizeInspectableMetaReviewSnapshot(
  value: unknown
): BubbleMetaReviewSnapshotState | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return {
      execution_context: null,
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
    execution_context: null,
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
  return {
    bubble_id: value.bubble_id.trim(),
    state: value.state,
    round: value.round,
    active_agent: isAgentName(value.active_agent) ? value.active_agent : null,
    active_since:
      typeof value.active_since === "string" ? value.active_since : null,
    active_role: isAgentRole(value.active_role) ? value.active_role : null,
    round_role_history: [],
    last_command_at:
      typeof value.last_command_at === "string" ? value.last_command_at : null,
    pending_rework_intent: null,
    rework_intent_history: [],
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
