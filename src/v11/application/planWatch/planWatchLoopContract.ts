import type {
  AgentRunnerBridgeInput,
  AgentRunnerBridgeResult,
  AgentRunnerCommandConfig
} from "./agentRunnerBridgeContract.js";
import type {
  LinkedBubbleTriggerCandidate,
  LinkedBubbleTriggerDiagnostic,
  LinkedBubbleTriggerIndexInput,
  LinkedBubbleTriggerIndexResult
} from "./linkedBubbleTriggerIndexContract.js";
import type {
  PlanWatchLedgerPort,
  PlanWatchLedgerRecord
} from "./planWatchLedgerContract.js";

export const DEFAULT_PLAN_WATCH_INTERVAL_MS = 60_000;

export type PlanWatchIterationStatus =
  | "idle"
  | "duplicate_skipped"
  | "dry_run"
  | "runner_settled_checkpoint"
  | "runner_human_checkpoint"
  | "blocked";

export type PlanWatchBlockedReasonKind =
  | "precondition_failed"
  | "ledger_unreadable"
  | "ledger_write_failed"
  | "ledger_schema_unsupported"
  | "runner_config_missing"
  | "runner_blocked_outcome"
  | "runner_execution_failed"
  | "runner_output_invalid"
  | "interrupted_attempt_exists"
  | "reservation_contention_unresolved";

export interface PlanWatchInput {
  repoPath: string;
  planPath: string;
  runnerConfig?: AgentRunnerCommandConfig | undefined;
  intervalMs?: number | undefined;
  once?: boolean | undefined;
  maxIterations?: number | undefined;
  dryRun?: boolean | undefined;
  runNow?: boolean | undefined;
  forceRun?: boolean | undefined;
  now?: Date | undefined;
  stopSignal?: AbortSignal | undefined;
  onEvent?: ((event: PlanWatchEvent) => void | Promise<void>) | undefined;
}

export interface PlanWatchDiagnostic {
  kind: "plan_watch_diagnostic";
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface PlanWatchIterationResult {
  status: PlanWatchIterationStatus;
  repoPath: string;
  planPath: string;
  scannedCandidateCount: number;
  deferredCandidateCount: number;
  diagnostics: readonly (LinkedBubbleTriggerDiagnostic | PlanWatchDiagnostic)[];
  selectedCandidate?: LinkedBubbleTriggerCandidate | undefined;
  dedupeKey?: string | undefined;
  invocationId?: string | undefined;
  ledgerRecord?: PlanWatchLedgerRecord | undefined;
  runnerResult?: AgentRunnerBridgeResult | undefined;
  blockedReasonKind?: PlanWatchBlockedReasonKind | undefined;
  onceExit: boolean;
}

export interface PlanWatchLoopResult {
  status: PlanWatchIterationStatus;
  iterations: readonly PlanWatchIterationResult[];
  stopped: boolean;
  stopReason?: "condition" | "max_iterations" | "signal" | undefined;
}

export type PlanWatchEvent =
  | {
      kind: "loop_started";
      repoPath: string;
      planPath: string;
      intervalMs: number;
      once: boolean;
    }
  | {
      kind: "candidate_selected";
      repoPath: string;
      planPath: string;
      candidate: LinkedBubbleTriggerCandidate;
      candidateIndex: number;
      candidateCount: number;
      dedupeKey: string;
    }
  | {
      kind: "runner_started";
      repoPath: string;
      planPath: string;
      candidate: LinkedBubbleTriggerCandidate;
      invocationId: string;
      dedupeKey: string;
    }
  | {
      kind: "runner_completed";
      repoPath: string;
      planPath: string;
      candidate: LinkedBubbleTriggerCandidate;
      invocationId: string;
      dedupeKey: string;
      runnerResult: AgentRunnerBridgeResult;
    }
  | {
      kind: "iteration_completed";
      iterationIndex: number;
      result: PlanWatchIterationResult;
    }
  | {
      kind: "loop_stopped";
      status: PlanWatchIterationStatus;
      iterationCount: number;
      stopReason: NonNullable<PlanWatchLoopResult["stopReason"]>;
    };

export interface PlanWatchLoopDependencies {
  resolveLinkedBubbleTriggerIndex: (
    input: LinkedBubbleTriggerIndexInput
  ) => Promise<LinkedBubbleTriggerIndexResult>;
  ledger: PlanWatchLedgerPort;
  runExecutePairflowPlanContinuation: (
    input: AgentRunnerBridgeInput,
    config: AgentRunnerCommandConfig
  ) => Promise<AgentRunnerBridgeResult>;
  now?: (() => Date) | undefined;
  sleep?: ((ms: number, signal?: AbortSignal) => Promise<void>) | undefined;
  generateInvocationId?: (() => string) | undefined;
}
