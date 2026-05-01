import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { runExecutePairflowPlanContinuation } from "../../application/planWatch/agentRunnerBridge.js";
import {
  resolveLinkedBubbleTriggerIndex
} from "../../application/planWatch/linkedBubbleTriggerIndex.js";
import type {
  LinkedBubbleStatusPort,
  LinkedBubbleTriggerDiagnostic
} from "../../application/planWatch/linkedBubbleTriggerIndexContract.js";
import {
  validatePlanWatchLedgerData
} from "../../application/planWatch/planWatchLedger.js";
import {
  PLAN_WATCH_LEDGER_SCHEMA_VERSION,
  PlanWatchLedgerError,
  type PlanWatchLedgerData,
  type PlanWatchLedgerPort,
  type PlanWatchLedgerRecord
} from "../../application/planWatch/planWatchLedgerContract.js";
import type {
  PlanWatchLoopDependencies
} from "../../application/planWatch/planWatchLoopContract.js";
import {
  getBubbleStatusV11
} from "../../application/status/emitStatusV11.js";
import {
  withFileLock
} from "../../infrastructure/foundation/fs/fileLock.js";
import { linkedBubbleTriggerIndexDefaults } from "./linkedBubbleTriggerIndexDefaults.js";

const LEDGER_LOCK_TIMEOUT_MS = 5_000;

export function resolvePlanWatchLedgerPath(repoPath: string): string {
  return join(repoPath, ".pairflow", "runtime", "plan-watch", "ledger.json");
}

export function createFilePlanWatchLedgerPort(
  ledgerPath: string
): PlanWatchLedgerPort {
  return {
    read: () => withLedgerLock(ledgerPath, () => readLedgerFile(ledgerPath)),
    reserveRun: (record) =>
      withLedgerLock(ledgerPath, () => appendRunRecord(ledgerPath, record)),
    completeRun: (record) =>
      withLedgerLock(ledgerPath, () => completeRunRecord(ledgerPath, record)),
    observeDryRun: (record) =>
      withLedgerLock(ledgerPath, () => appendDryRunRecord(ledgerPath, record))
  };
}

export function createDefaultPlanWatchLoopDependencies(
  repoPath: string
): PlanWatchLoopDependencies {
  return {
    resolveLinkedBubbleTriggerIndex: (input) =>
      resolveLinkedBubbleTriggerIndex(input, {
        ...linkedBubbleTriggerIndexDefaults,
        getBubbleStatus: localBubbleStatusPort
      }),
    ledger: createFilePlanWatchLedgerPort(resolvePlanWatchLedgerPath(repoPath)),
    runExecutePairflowPlanContinuation
  };
}

export const localBubbleStatusPort: LinkedBubbleStatusPort = async (input) => {
  try {
    const status = await getBubbleStatusV11({
      repoPath: input.repoPath,
      bubbleId: input.bubbleId,
      now: input.now
    });
    return {
      state: status.state,
      observedAt: status.lastCommandAt ?? status.activeSince ?? input.now?.toISOString(),
      current: true,
      statusRef: `bubble:${status.bubbleId}:state:${status.state}:round:${status.round}`,
      metadata: {
        round: status.round,
        remoteExecution: status.remoteExecution?.viewKind,
        commandPathProfile: status.commandPath.profile
      }
    };
  } catch (error) {
    return bubbleStatusDiagnostic(
      "BUBBLE_STATUS_UNAVAILABLE",
      `Status for bubble ${input.bubbleId} could not be read: ${errorMessage(error)}`
    );
  }
};

async function readLedgerFile(path: string): Promise<PlanWatchLedgerData> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return emptyLedger();
    }
    throw new PlanWatchLedgerError(
      "ledger_unreadable",
      `Plan watch ledger could not be read at ${path}.`
    );
  }

  try {
    return validatePlanWatchLedgerData(JSON.parse(content));
  } catch (error) {
    if (error instanceof PlanWatchLedgerError) {
      throw error;
    }
    throw new PlanWatchLedgerError(
      "ledger_unreadable",
      `Plan watch ledger is not valid JSON at ${path}.`
    );
  }
}

async function writeLedgerFile(
  path: string,
  ledger: PlanWatchLedgerData
): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
    await rename(tempPath, path);
  } catch (error) {
    throw new PlanWatchLedgerError(
      "ledger_write_failed",
      `Plan watch ledger could not be written at ${path}: ${errorMessage(error)}`
    );
  }
}

async function appendRunRecord(
  path: string,
  record: PlanWatchLedgerRecord
): Promise<void> {
  const ledger = await readLedgerFile(path);
  if (ledger.records.some((existing) => existing.key === record.key && existing.mode === "run")) {
    throw new PlanWatchLedgerError(
      "ledger_write_failed",
      `PLAN_WATCH_RUN_RECORD_CONTENTION: Plan watch ledger already contains a run record. context: key=${record.key}`
    );
  }
  await writeLedgerFile(path, {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    records: [...ledger.records, record]
  });
}

async function completeRunRecord(
  path: string,
  record: PlanWatchLedgerRecord
): Promise<void> {
  const ledger = await readLedgerFile(path);
  const index = ledger.records.findIndex(
    (existing) =>
      existing.key === record.key
      && existing.mode === "run"
      && existing.invocationId === record.invocationId
      && existing.recordState === "reserved"
  );
  if (index < 0) {
    throw new PlanWatchLedgerError(
      "ledger_write_failed",
      `Reserved plan watch ledger record was not found for ${record.key}.`
    );
  }
  const records = [...ledger.records];
  records[index] = record;
  await writeLedgerFile(path, {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    records
  });
}

async function appendDryRunRecord(
  path: string,
  record: PlanWatchLedgerRecord
): Promise<PlanWatchLedgerRecord> {
  const ledger = await readLedgerFile(path);
  if (ledger.records.some((existing) => existing.key === record.key && existing.mode === "run")) {
    throw new PlanWatchLedgerError(
      "ledger_write_failed",
      `PLAN_WATCH_DRY_RUN_RECORD_CONTENTION: Plan watch ledger already contains a run record. context: key=${record.key}`
    );
  }
  const existingDryRunRecord = ledger.records.find(
    (existing) => existing.key === record.key && existing.mode === "dry_run"
  );
  if (existingDryRunRecord !== undefined) {
    return existingDryRunRecord;
  }
  await writeLedgerFile(path, {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    records: [...ledger.records, record]
  });
  return record;
}

function withLedgerLock<T>(
  ledgerPath: string,
  task: () => Promise<T>
): Promise<T> {
  return withFileLock(
    {
      lockPath: `${ledgerPath}.lock`,
      timeoutMs: LEDGER_LOCK_TIMEOUT_MS,
      ensureParentDir: true
    },
    task
  );
}

function emptyLedger(): PlanWatchLedgerData {
  return {
    schemaVersion: PLAN_WATCH_LEDGER_SCHEMA_VERSION,
    records: []
  };
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "ENOENT"
  );
}

function bubbleStatusDiagnostic(
  code: LinkedBubbleTriggerDiagnostic["code"],
  message: string
): LinkedBubbleTriggerDiagnostic {
  return {
    kind: "linked_bubble_trigger_diagnostic",
    scope: "bubble",
    code,
    severity: "error",
    message
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
