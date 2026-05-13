import type { AgentRunnerBridgeResult } from "../../../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import type {
  LinkedBubbleTriggerCandidate,
  LinkedBubbleTriggerDiagnostic
} from "../../linkedTriggerIndex/linkedBubbleTriggerIndexContract.js";
import {
  buildCompletedPlanWatchLedgerRecord,
  buildDryRunPlanWatchLedgerRecord,
  buildReservedPlanWatchLedgerRecord,
  hasCompletedRunForKey,
  hasReservedRunForKey
} from "../../ledger/planWatchLedger.js";
import { PlanWatchLedgerError } from "../../ledger/planWatchLedgerContract.js";
import {
  buildPlanWatchDedupeKey,
  buildRunnerInput
} from "./planWatchLoopMapping.js";
import type {
  PlanWatchBlockedReasonKind,
  PlanWatchDiagnostic,
  PlanWatchInput,
  PlanWatchIterationResult,
  PlanWatchLoopDependencies
} from "./planWatchLoopInternalTypes.js";

interface CandidateExecutionInput {
  input: PlanWatchInput;
  dependencies: PlanWatchLoopDependencies;
  now: Date;
  onceExit: boolean;
  repoPath: string;
  planPath: string;
  candidate: LinkedBubbleTriggerCandidate;
  candidateCount: number;
  candidateIndex?: number | undefined;
  diagnostics: readonly LinkedBubbleTriggerDiagnostic[];
}

interface CandidateContext extends CandidateExecutionInput {
  dedupeKey: string;
  deferredCandidateCount: number;
}

export async function executePlanWatchCandidate(
  input: CandidateExecutionInput
): Promise<PlanWatchIterationResult> {
  const context = {
    ...input,
    dedupeKey: buildPlanWatchDedupeKey(input),
    deferredCandidateCount: Math.max(
      0,
      input.candidateCount - (input.candidateIndex ?? 0) - 1
    )
  };
  await input.input.onEvent?.({
    kind: "candidate_selected",
    repoPath: input.repoPath,
    planPath: input.planPath,
    candidate: input.candidate,
    candidateIndex: input.candidateIndex ?? 0,
    candidateCount: input.candidateCount,
    dedupeKey: context.dedupeKey
  });
  const ledgerResult = await readCandidateLedger(context);
  if (ledgerResult !== undefined) {
    return ledgerResult;
  }

  if (input.input.dryRun === true) {
    const invocationId = (
      input.dependencies.generateInvocationId ?? defaultInvocationId
    )();
    return handleDryRunCandidate(context, invocationId);
  }
  const invocationId = (
    input.dependencies.generateInvocationId ?? defaultInvocationId
  )();
  if (!hasRunnerAuthority(input.input.runnerConfig)) {
    return runnerConfigMissingResult(context, invocationId);
  }
  return handleRunCandidate(context, invocationId);
}

function runnerConfigMissingResult(
  context: CandidateContext,
  invocationId: string
): PlanWatchIterationResult {
  const timestamp = context.now.toISOString();
  return planWatchBlockedResult({
    ...baseCandidateResult(context),
    invocationId,
    runnerResult: {
      status: "blocked",
      invocationId,
      startedAt: timestamp,
      completedAt: timestamp,
      reasonCode: "PLAN_WATCH_RUNNER_CONFIG_MISSING",
      command: null,
      failureStage: "precondition"
    },
    blockedReasonKind: "runner_config_missing",
    diagnostics: [
      ...context.diagnostics,
      planWatchDiagnostic(
        "PLAN_WATCH_RUNNER_CONFIG_MISSING",
        "error",
        "Missing [plan_watch.runner] backend config for non-dry-run plan watch invocation."
      )
    ]
  });
}

export function planWatchBlockedResult(input: {
  repoPath: string;
  planPath: string;
  onceExit: boolean;
  blockedReasonKind: PlanWatchBlockedReasonKind;
  diagnostics: readonly PlanWatchIterationResult["diagnostics"][number][];
  selectedCandidate?: LinkedBubbleTriggerCandidate | undefined;
  dedupeKey?: string | undefined;
  invocationId?: string | undefined;
  ledgerRecord?: PlanWatchIterationResult["ledgerRecord"];
  runnerResult?: AgentRunnerBridgeResult | undefined;
  scannedCandidateCount?: number | undefined;
  deferredCandidateCount?: number | undefined;
}): PlanWatchIterationResult {
  return {
    status: "blocked",
    repoPath: input.repoPath,
    planPath: input.planPath,
    scannedCandidateCount: input.scannedCandidateCount ?? 0,
    deferredCandidateCount: input.deferredCandidateCount ?? 0,
    diagnostics: input.diagnostics,
    ...(input.selectedCandidate !== undefined
      ? { selectedCandidate: input.selectedCandidate }
      : {}),
    ...(input.dedupeKey !== undefined ? { dedupeKey: input.dedupeKey } : {}),
    ...(input.invocationId !== undefined ? { invocationId: input.invocationId } : {}),
    ...(input.ledgerRecord !== undefined ? { ledgerRecord: input.ledgerRecord } : {}),
    ...(input.runnerResult !== undefined ? { runnerResult: input.runnerResult } : {}),
    blockedReasonKind: input.blockedReasonKind,
    onceExit: input.onceExit
  };
}

export function planWatchDiagnostic(
  code: string,
  severity: PlanWatchDiagnostic["severity"],
  message: string
): PlanWatchDiagnostic {
  return {
    kind: "plan_watch_diagnostic",
    code,
    severity,
    message
  };
}

async function readCandidateLedger(
  context: CandidateContext
): Promise<PlanWatchIterationResult | undefined> {
  try {
    const ledger = await context.dependencies.ledger.read();
    if (hasCompletedRunForKey(ledger, context.dedupeKey)) {
      return duplicateSkippedResult(context);
    }
    if (hasReservedRunForKey(ledger, context.dedupeKey)) {
      return interruptedAttemptResult(context);
    }
    return undefined;
  } catch (error) {
    return ledgerReadBlockedResult(context, error);
  }
}

async function handleDryRunCandidate(
  context: CandidateContext,
  invocationId: string
): Promise<PlanWatchIterationResult> {
  const record = buildDryRunPlanWatchLedgerRecord({
    key: context.dedupeKey,
    invocationId: `dry-run-${invocationId}`,
    candidate: context.candidate,
    attemptedAt: context.now.toISOString()
  });
  try {
    const ledgerRecord = await context.dependencies.ledger.observeDryRun(record);
    return {
      status: "dry_run",
      ...baseCandidateResult(context),
      invocationId: ledgerRecord.invocationId,
      ledgerRecord
    };
  } catch (error) {
    return blockedFromError(context, error, "ledger_write_failed", record.invocationId);
  }
}

async function handleRunCandidate(
  context: CandidateContext,
  invocationId: string
): Promise<PlanWatchIterationResult> {
  const reservedRecord = buildReservedPlanWatchLedgerRecord({
    key: context.dedupeKey,
    invocationId,
    candidate: context.candidate,
    attemptedAt: context.now.toISOString()
  });
  try {
    await context.dependencies.ledger.reserveRun(reservedRecord);
  } catch (error) {
    const contentionResult = await reservationContentionResult(context, error);
    if (contentionResult !== undefined) {
      return contentionResult;
    }
    return blockedFromError(context, error, "ledger_write_failed", invocationId);
  }

  await context.input.onEvent?.({
    kind: "runner_started",
    repoPath: context.repoPath,
    planPath: context.planPath,
    candidate: context.candidate,
    triggerReason: "linked_bubble_approval_ready",
    invocationId,
    dedupeKey: context.dedupeKey
  });
  const runnerResult = await context.dependencies.runExecutePairflowPlanContinuation(
    buildRunnerInput({
      ...context,
      invocationId,
      ...(context.input.stopSignal !== undefined
        ? { stopSignal: context.input.stopSignal }
        : {}),
      onArtifactFiles: async (artifactFiles) => {
        await context.input.onEvent?.({
          kind: "runner_artifact_ready",
          repoPath: context.repoPath,
          planPath: context.planPath,
          candidate: context.candidate,
          triggerReason: "linked_bubble_approval_ready",
          invocationId,
          dedupeKey: context.dedupeKey,
          artifactFiles
        });
      }
    }),
    context.input.runnerConfig ?? {}
  ).catch((error: unknown) => runnerThrownResult(context, invocationId, error));
  await context.input.onEvent?.({
    kind: "runner_completed",
    repoPath: context.repoPath,
    planPath: context.planPath,
    candidate: context.candidate,
    triggerReason: "linked_bubble_approval_ready",
    invocationId,
    dedupeKey: context.dedupeKey,
    runnerResult
  });
  const completedRecord = buildCompletedPlanWatchLedgerRecord(
    reservedRecord,
    runnerResult
  );
  return completeRunLedger(context, invocationId, reservedRecord, completedRecord, runnerResult);
}

async function completeRunLedger(
  context: CandidateContext,
  invocationId: string,
  reservedRecord: PlanWatchIterationResult["ledgerRecord"],
  completedRecord: NonNullable<PlanWatchIterationResult["ledgerRecord"]>,
  runnerResult: AgentRunnerBridgeResult
): Promise<PlanWatchIterationResult> {
  try {
    await context.dependencies.ledger.completeRun(completedRecord);
  } catch (error) {
    return blockedFromError(
      context,
      error,
      "ledger_write_failed",
      invocationId,
      reservedRecord,
      runnerResult
    );
  }
  const status = mapRunnerStatus(runnerResult);
  return {
    status,
    ...baseCandidateResult(context),
    invocationId,
    ledgerRecord: completedRecord,
    runnerResult,
    ...(status === "blocked"
      ? { blockedReasonKind: mapRunnerBlockedReason(runnerResult) }
      : {})
  };
}

function baseCandidateResult(
  context: CandidateContext
): Omit<PlanWatchIterationResult, "status"> {
  return {
    repoPath: context.repoPath,
    planPath: context.planPath,
    scannedCandidateCount: context.candidateCount,
    deferredCandidateCount: context.deferredCandidateCount,
    diagnostics: context.diagnostics,
    selectedCandidate: context.candidate,
    dedupeKey: context.dedupeKey,
    onceExit: context.onceExit
  };
}

function duplicateSkippedResult(context: CandidateContext): PlanWatchIterationResult {
  return {
    status: "duplicate_skipped",
    ...baseCandidateResult(context)
  };
}

function interruptedAttemptResult(context: CandidateContext): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseCandidateResult(context),
    blockedReasonKind: "interrupted_attempt_exists",
    diagnostics: [
      ...context.diagnostics,
      planWatchDiagnostic(
        "INTERRUPTED_ATTEMPT_EXISTS",
        "error",
        `A reserved plan watch attempt already exists for ${context.dedupeKey}.`
      )
    ]
  });
}

async function reservationContentionResult(
  context: CandidateContext,
  error: unknown
): Promise<PlanWatchIterationResult | undefined> {
  if (!isRunRecordContention(error)) {
    return undefined;
  }
  try {
    const ledger = await context.dependencies.ledger.read();
    if (hasCompletedRunForKey(ledger, context.dedupeKey)) {
      return duplicateSkippedResult(context);
    }
    if (hasReservedRunForKey(ledger, context.dedupeKey)) {
      return interruptedAttemptResult(context);
    }
  } catch (readError) {
    return ledgerReadBlockedResult(context, readError);
  }
  return reservationContentionUnresolvedResult(context, error);
}

function reservationContentionUnresolvedResult(
  context: CandidateContext,
  error: unknown
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseCandidateResult(context),
    blockedReasonKind: "reservation_contention_unresolved",
    diagnostics: [
      ...context.diagnostics,
      watchDiagnosticFromError(error),
      planWatchDiagnostic(
        "RESERVATION_CONTENTION_UNRESOLVED",
        "warning",
        `A run reservation contention was reported for ${context.dedupeKey}, but the ledger re-read did not expose the winning record.`
      )
    ]
  });
}

function blockedFromError(
  context: CandidateContext,
  error: unknown,
  fallback: PlanWatchBlockedReasonKind,
  invocationId?: string,
  ledgerRecord?: PlanWatchIterationResult["ledgerRecord"],
  runnerResult?: AgentRunnerBridgeResult
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseCandidateResult(context),
    ...(invocationId !== undefined ? { invocationId } : {}),
    ...(ledgerRecord !== undefined ? { ledgerRecord } : {}),
    ...(runnerResult !== undefined ? { runnerResult } : {}),
    blockedReasonKind: ledgerErrorReason(error, fallback),
    diagnostics: [...context.diagnostics, watchDiagnosticFromError(error)]
  });
}

function ledgerReadBlockedResult(
  context: CandidateContext,
  error: unknown
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    repoPath: context.repoPath,
    planPath: context.planPath,
    onceExit: context.onceExit,
    scannedCandidateCount: context.candidateCount,
    deferredCandidateCount: context.deferredCandidateCount,
    blockedReasonKind: ledgerErrorReason(error, "ledger_unreadable"),
    diagnostics: [...context.diagnostics, watchDiagnosticFromError(error)]
  });
}

function mapRunnerStatus(
  result: AgentRunnerBridgeResult
): PlanWatchIterationResult["status"] {
  if (result.status === "settled_checkpoint") {
    return "runner_settled_checkpoint";
  }
  if (result.status === "human_checkpoint") {
    return "runner_human_checkpoint";
  }
  return "blocked";
}

function mapRunnerBlockedReason(
  result: AgentRunnerBridgeResult
): PlanWatchBlockedReasonKind {
  if (result.reasonCode === "PLAN_WATCH_RUNNER_CONFIG_MISSING") {
    return "runner_config_missing";
  }
  if (result.failureStage === "output") {
    return "runner_output_invalid";
  }
  if (
    result.failureStage === "spawn"
    || result.failureStage === "timeout"
    || result.failureStage === "exit"
    || result.failureStage === "abort"
  ) {
    return "runner_execution_failed";
  }
  return "runner_blocked_outcome";
}

function runnerThrownResult(
  context: CandidateContext,
  invocationId: string,
  error: unknown
): AgentRunnerBridgeResult {
  const timestamp = context.now.toISOString();
  return {
    status: "blocked",
    invocationId,
    startedAt: timestamp,
    completedAt: timestamp,
    reasonCode: "AGENT_RUNNER_SPAWN_FAILED",
    command: null,
    failureStage: "spawn",
    stderr: errorMessage(error)
  };
}

function ledgerErrorReason(
  error: unknown,
  fallback: PlanWatchBlockedReasonKind
): PlanWatchBlockedReasonKind {
  if (error instanceof PlanWatchLedgerError) {
    return error.reason;
  }
  return fallback;
}

function isRunRecordContention(error: unknown): boolean {
  return (
    error instanceof PlanWatchLedgerError
    && error.reason === "ledger_write_failed"
    && error.message.includes("PLAN_WATCH_RUN_RECORD_CONTENTION")
  );
}

function watchDiagnosticFromError(error: unknown): PlanWatchDiagnostic {
  if (error instanceof PlanWatchLedgerError) {
    return planWatchDiagnostic(error.reason.toUpperCase(), "error", error.message);
  }
  return planWatchDiagnostic("PLAN_WATCH_ERROR", "error", errorMessage(error));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultInvocationId(): string {
  return `plan-watch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasRunnerAuthority(
  config: CandidateContext["input"]["runnerConfig"]
): boolean {
  return (
    (config?.backend !== undefined && config.backend.trim().length > 0)
    || (config?.command !== undefined && config.command.trim().length > 0)
  );
}
