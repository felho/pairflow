import type {
  AgentRunnerBridgeReasonCode,
  AgentRunnerBridgeStatus
} from "./agentRunnerBridgeContract.js";
import type { LinkedBubbleTriggerCandidate } from "./linkedBubbleTriggerIndexContract.js";

export const PLAN_WATCH_LEDGER_SCHEMA_VERSION = 1;

export type PlanWatchLedgerMode = "run" | "dry_run";
export type PlanWatchLedgerRecordState =
  | "reserved"
  | "completed"
  | "dry_run_observed";

export interface PlanWatchTriggerEvidence {
  planPath: string;
  taskId: string;
  taskPath: string;
  bubbleId: string;
  bubbleRole: LinkedBubbleTriggerCandidate["bubbleRole"];
  observedState: LinkedBubbleTriggerCandidate["observedState"];
  observedAt?: string | undefined;
  statusRef?: string | undefined;
  statusMetadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface PlanWatchLedgerRecord {
  schemaVersion: typeof PLAN_WATCH_LEDGER_SCHEMA_VERSION;
  key: string;
  mode: PlanWatchLedgerMode;
  recordState: PlanWatchLedgerRecordState;
  invocationId: string;
  triggerEvidence: PlanWatchTriggerEvidence;
  attemptedAt: string;
  completedAt?: string | undefined;
  runnerStatus?: AgentRunnerBridgeStatus | undefined;
  runnerReasonCode?: AgentRunnerBridgeReasonCode | undefined;
  changedArtifacts?: readonly string[] | undefined;
  routeLedgerSummary?: string | undefined;
}

export interface PlanWatchLedgerData {
  schemaVersion: typeof PLAN_WATCH_LEDGER_SCHEMA_VERSION;
  records: readonly PlanWatchLedgerRecord[];
}

export class PlanWatchLedgerError extends Error {
  public constructor(
    public readonly reason:
      | "ledger_unreadable"
      | "ledger_write_failed"
      | "ledger_schema_unsupported",
    message: string
  ) {
    super(message);
    this.name = "PlanWatchLedgerError";
  }
}

export interface PlanWatchLedgerPort {
  read: () => Promise<PlanWatchLedgerData>;
  reserveRun: (record: PlanWatchLedgerRecord) => Promise<void>;
  completeRun: (record: PlanWatchLedgerRecord) => Promise<void>;
  observeDryRun: (record: PlanWatchLedgerRecord) => Promise<PlanWatchLedgerRecord>;
}
