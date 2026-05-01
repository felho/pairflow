import type { AgentRunnerBridgeResult } from "./agentRunnerBridgeContract.js";
import type { LinkedBubbleTriggerCandidate } from "./linkedBubbleTriggerIndexContract.js";
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

export function buildReservedPlanWatchLedgerRecord(input: {
  key: string;
  invocationId: string;
  candidate: LinkedBubbleTriggerCandidate;
  attemptedAt: string;
}): PlanWatchLedgerRecord {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    key: input.key,
    mode: "run",
    recordState: "reserved",
    invocationId: input.invocationId,
    triggerEvidence: buildPlanWatchTriggerEvidence(input.candidate),
    attemptedAt: input.attemptedAt
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
  if ("mode" in value && value.mode === "run") {
    return validateRunRecord(value);
  }
  if (value.mode === "dry_run" && value.recordState === "dry_run_observed") {
    return value as unknown as PlanWatchLedgerRecord;
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RECORD_STATE_UNSUPPORTED: Plan watch ledger record schema is unsupported. context: record_state=unsupported");
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
  if (value.recordState === "reserved") {
    return value as unknown as PlanWatchLedgerRecord;
  }
  if (
    value.recordState === "completed"
    && hasString(value, "completedAt")
    && hasString(value, "runnerStatus")
    && hasString(value, "runnerReasonCode")
  ) {
    return value as unknown as PlanWatchLedgerRecord;
  }
  throw new PlanWatchLedgerError("ledger_schema_unsupported", "PLAN_WATCH_LEDGER_RUN_RECORD_INVALID: Plan watch ledger record schema is unsupported. context: run_record=invalid");
}

function hasString(value: object, key: string): boolean {
  return key in value && typeof (value as Record<string, unknown>)[key] === "string";
}

function hasTriggerEvidence(value: object): boolean {
  const evidence = (value as Record<string, unknown>).triggerEvidence;
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
