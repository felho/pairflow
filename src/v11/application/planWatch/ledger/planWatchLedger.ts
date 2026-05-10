import type {
  AgentRunnerBridgeResult,
  AgentRunnerBridgeStatus
} from "../runner/agentRunnerBridgeContract.js";
import type { LinkedBubbleTriggerCandidate } from "../linkedTriggerIndex/linkedBubbleTriggerIndexContract.js";
import {
  PLAN_WATCH_LEDGER_SCHEMA_VERSION,
  PlanWatchLedgerError,
  type PlanWatchLedgerData,
  type PlanWatchLedgerRecord,
  type PlanWatchTriggerEvidence
} from "./planWatchLedgerContract.js";

export function buildPlanWatchTriggerEvidence(
  candidate: LinkedBubbleTriggerCandidate
): PlanWatchTriggerEvidence {
  return {
    planPath: candidate.planPath,
    taskId: candidate.taskId,
    taskPath: candidate.taskPath,
    bubbleId: candidate.bubbleId,
    bubbleRole: candidate.bubbleRole,
    observedState: candidate.observedState,
    ...(candidate.observedAt !== undefined ? { observedAt: candidate.observedAt } : {}),
    ...(candidate.statusRef !== undefined ? { statusRef: candidate.statusRef } : {}),
    ...(candidate.statusMetadata !== undefined
      ? { statusMetadata: candidate.statusMetadata }
      : {})
  };
}

export function buildPlanWatchRunNowTriggerEvidence(input: {
  planPath: string;
  forceRun: boolean;
  observedAt: string;
}): PlanWatchTriggerEvidence {
  return {
    planPath: input.planPath,
    triggerKind: "operator_run_now",
    ...(input.forceRun ? { forceRun: true } : {}),
    observedAt: input.observedAt
  };
}

export function buildReservedPlanWatchLedgerRecord(input: {
  key: string;
  invocationId: string;
  candidate: LinkedBubbleTriggerCandidate;
  attemptedAt: string;
  artifactDir?: string | undefined;
}): PlanWatchLedgerRecord {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    key: input.key,
    mode: "run",
    recordState: "reserved",
    invocationId: input.invocationId,
    triggerEvidence: buildPlanWatchTriggerEvidence(input.candidate),
    attemptedAt: input.attemptedAt,
    ...(input.artifactDir !== undefined ? { artifactDir: input.artifactDir } : {})
  };
}

export function buildReservedPlanWatchRunNowLedgerRecord(input: {
  key: string;
  invocationId: string;
  planPath: string;
  forceRun: boolean;
  attemptedAt: string;
  artifactDir?: string | undefined;
}): PlanWatchLedgerRecord {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    key: input.key,
    mode: "run",
    recordState: "reserved",
    invocationId: input.invocationId,
    triggerEvidence: buildPlanWatchRunNowTriggerEvidence({
      planPath: input.planPath,
      forceRun: input.forceRun,
      observedAt: input.attemptedAt
    }),
    attemptedAt: input.attemptedAt,
    ...(input.artifactDir !== undefined ? { artifactDir: input.artifactDir } : {})
  };
}

export function buildCompletedPlanWatchLedgerRecord(
  reserved: PlanWatchLedgerRecord,
  runnerResult: AgentRunnerBridgeResult
): PlanWatchLedgerRecord {
  return {
    ...reserved,
    recordState: "completed",
    completedAt: runnerResult.completedAt,
    runnerStatus: runnerResult.status,
    runnerReasonCode: runnerResult.reasonCode,
    ...(runnerResult.changedArtifacts !== undefined
      ? { changedArtifacts: runnerResult.changedArtifacts }
      : {}),
    ...(runnerResult.routeLedgerSummary !== undefined
      ? { routeLedgerSummary: runnerResult.routeLedgerSummary }
      : {}),
    ...(runnerResult.artifactDir !== undefined
      ? { artifactDir: runnerResult.artifactDir }
      : {}),
    ...(runnerResult.codexSessionId !== undefined
      ? { codexSessionId: runnerResult.codexSessionId }
      : {})
  };
}

export function buildDryRunPlanWatchLedgerRecord(input: {
  key: string;
  invocationId: string;
  candidate: LinkedBubbleTriggerCandidate;
  attemptedAt: string;
}): PlanWatchLedgerRecord {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    key: input.key,
    mode: "dry_run",
    recordState: "dry_run_observed",
    invocationId: input.invocationId,
    triggerEvidence: buildPlanWatchTriggerEvidence(input.candidate),
    attemptedAt: input.attemptedAt
  };
}

export function buildDryRunPlanWatchRunNowLedgerRecord(input: {
  key: string;
  invocationId: string;
  planPath: string;
  forceRun: boolean;
  attemptedAt: string;
}): PlanWatchLedgerRecord {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    key: input.key,
    mode: "dry_run",
    recordState: "dry_run_observed",
    invocationId: input.invocationId,
    triggerEvidence: buildPlanWatchRunNowTriggerEvidence({
      planPath: input.planPath,
      forceRun: input.forceRun,
      observedAt: input.attemptedAt
    }),
    attemptedAt: input.attemptedAt
  };
}

export function validatePlanWatchLedgerData(value: unknown): PlanWatchLedgerData {
  if (
    typeof value !== "object"
    || value === null
    || !("schemaVersion" in value)
    || value.schemaVersion !== PLAN_WATCH_LEDGER_SCHEMA_VERSION
    || !("records" in value)
    || !Array.isArray(value.records)
  ) {
    throw new PlanWatchLedgerError(
      "ledger_schema_unsupported",
      "PLAN_WATCH_LEDGER_SCHEMA_UNSUPPORTED: Plan watch ledger schema is unsupported. context: schemaVersion=missing_or_unsupported records=missing_or_invalid"
    );
  }

  const records = value.records.map((record) => validateRecord(record));
  const runKeys = new Set<string>();
  for (const record of records) {
    if (record.mode !== "run") {
      continue;
    }
    if (runKeys.has(record.key)) {
      throw new PlanWatchLedgerError(
        "ledger_schema_unsupported",
        `PLAN_WATCH_LEDGER_DUPLICATE_RUN_RECORD: Plan watch ledger contains multiple run records. context: key=${record.key}`
      );
    }
    runKeys.add(record.key);
  }

  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    records
  };
}

export function hasCompletedRunForKey(
  ledger: PlanWatchLedgerData,
  key: string
): boolean {
  return ledger.records.some(
    (record) =>
      record.key === key
      && record.mode === "run"
      && record.recordState === "completed"
  );
}

export function hasReservedRunForKey(
  ledger: PlanWatchLedgerData,
  key: string
): boolean {
  return ledger.records.some(
    (record) =>
      record.key === key
      && record.mode === "run"
      && record.recordState === "reserved"
  );
}

function validateRecord(value: unknown): PlanWatchLedgerRecord {
  assertRecordBase(value);
  if (!hasString(value, "mode")) {
    throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RECORD_MODE_UNSUPPORTED: Plan watch ledger record schema is unsupported. context: mode=missing");
  }
  if (value.mode === "run") {
    return validateRunRecord(value);
  }
  if (value.mode === "dry_run" && value.recordState === "dry_run_observed") {
    return validateDryRunRecord(value);
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RECORD_STATE_UNSUPPORTED: Plan watch ledger record schema is unsupported. context: mode_or_record_state=unsupported");
}

function assertRecordBase(
  value: unknown
): asserts value is Record<string, unknown> {
  if (
    typeof value === "object"
    && value !== null
    && hasString(value, "key")
    && hasString(value, "invocationId")
    && hasString(value, "attemptedAt")
    && "schemaVersion" in value
    && value.schemaVersion === PLAN_WATCH_LEDGER_SCHEMA_VERSION
    && hasTriggerEvidence(value)
  ) {
    return;
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RECORD_BASE_INVALID: Plan watch ledger record schema is unsupported. context: record_base=invalid");
}

function validateRunRecord(value: Record<string, unknown>): PlanWatchLedgerRecord {
  if ("artifactDir" in value && typeof value.artifactDir !== "string") {
    throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RUN_RECORD_INVALID: Plan watch ledger record schema is unsupported. context: artifact_dir=invalid");
  }
  if ("codexSessionId" in value && typeof value.codexSessionId !== "string") {
    throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RUN_RECORD_INVALID: Plan watch ledger record schema is unsupported. context: codex_session_id=invalid");
  }
  if (value.recordState === "reserved") {
    return value as unknown as PlanWatchLedgerRecord;
  }
  if (
    value.recordState === "completed"
    && hasString(value, "completedAt")
    && isRunnerStatus(value.runnerStatus)
    && hasNonEmptyString(value, "runnerReasonCode")
    && hasValidChangedArtifacts(value)
    && hasOptionalString(value, "routeLedgerSummary")
  ) {
    return value as unknown as PlanWatchLedgerRecord;
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RUN_RECORD_INVALID: Plan watch ledger record schema is unsupported. context: run_record=invalid");
}

function validateDryRunRecord(value: Record<string, unknown>): PlanWatchLedgerRecord {
  if (
    !("artifactDir" in value)
    && !("completedAt" in value)
    && !("runnerStatus" in value)
    && !("runnerReasonCode" in value)
    && !("changedArtifacts" in value)
    && !("routeLedgerSummary" in value)
    && !("codexSessionId" in value)
  ) {
    return value as unknown as PlanWatchLedgerRecord;
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_DRY_RUN_RECORD_INVALID: Plan watch ledger record schema is unsupported. context: dry_run_record=invalid");
}

function hasString(value: object, key: string): boolean {
  return key in value && typeof (value as Record<string, unknown>)[key] === "string";
}

function hasNonEmptyString(value: object, key: string): boolean {
  return (
    hasString(value, key)
    && (value as Record<string, unknown>)[key] !== ""
  );
}

function hasOptionalString(value: object, key: string): boolean {
  return !(key in value) || typeof (value as Record<string, unknown>)[key] === "string";
}

function hasValidChangedArtifacts(value: object): boolean {
  if (!("changedArtifacts" in value)) {
    return true;
  }
  const changedArtifacts = (value as Record<string, unknown>).changedArtifacts;
  return (
    Array.isArray(changedArtifacts)
    && changedArtifacts.every((artifact) => typeof artifact === "string")
  );
}

function isRunnerStatus(value: unknown): value is AgentRunnerBridgeStatus {
  return (
    value === "settled_checkpoint"
    || value === "human_checkpoint"
    || value === "blocked"
  );
}

function hasTriggerEvidence(value: object): boolean {
  const evidence = (value as Record<string, unknown>).triggerEvidence;
  if (
    typeof evidence === "object"
    && evidence !== null
    && hasString(evidence, "planPath")
    && (evidence as Record<string, unknown>).triggerKind === "operator_run_now"
    && (!("forceRun" in evidence) || typeof (evidence as Record<string, unknown>).forceRun === "boolean")
    && hasOptionalString(evidence, "observedAt")
  ) {
    return true;
  }
  return (
    typeof evidence === "object"
    && evidence !== null
    && hasString(evidence, "planPath")
    && hasString(evidence, "taskId")
    && hasString(evidence, "taskPath")
    && hasString(evidence, "bubbleId")
    && hasString(evidence, "bubbleRole")
    && hasString(evidence, "observedState")
  );
}
