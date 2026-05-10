import type { AgentRunnerBridgeResult } from "../../runner/agentRunnerBridgeContract.js";
import type { LinkedBubbleTriggerDiagnostic } from "../../linkedTriggerIndex/linkedBubbleTriggerIndexContract.js";
import {
  buildCompletedPlanWatchLedgerRecord,
  buildDryRunPlanWatchRunNowLedgerRecord,
  buildReservedPlanWatchRunNowLedgerRecord,
  hasCompletedRunForKey,
  hasReservedRunForKey
} from "../../ledger/planWatchLedger.js";
import { PlanWatchLedgerError } from "../../ledger/planWatchLedgerContract.js";
import {
  buildPlanWatchRunNowDedupeKey,
  buildRunNowRunnerInput
} from "./planWatchLoopMapping.js";
import {
  planWatchBlockedResult,
  planWatchDiagnostic
} from "./planWatchLoopExecution.js";
import type {
  PlanWatchBlockedReasonKind,
  PlanWatchDiagnostic,
  PlanWatchInput,
  PlanWatchIterationResult,
  PlanWatchLoopDependencies
} from "./planWatchLoopInternalTypes.js";

interface RunNowExecutionInput {
  input: PlanWatchInput;
  dependencies: PlanWatchLoopDependencies;
  now: Date;
  onceExit: boolean;
  repoPath: string;
  planPath: string;
  diagnostics: readonly LinkedBubbleTriggerDiagnostic[];
}

interface RunNowContext extends RunNowExecutionInput {
  dedupeKey: string;
}

export async function executePlanWatchRunNow(
  input: RunNowExecutionInput
): Promise<PlanWatchIterationResult> {
  const context = {
    ...input,
    dedupeKey: buildPlanWatchRunNowDedupeKey({
      repoPath: input.repoPath,
      planPath: input.planPath,
      now: input.now,
      forceRun: input.input.forceRun === true
    })
  };
  const ledgerResult = await readRunNowLedger(context);
  if (ledgerResult !== undefined) {
    return ledgerResult;
  }

  const invocationId = (
    input.dependencies.generateInvocationId ?? defaultInvocationId
  )();
  if (input.input.dryRun === true) {
    return handleDryRunRunNow(context, invocationId);
  }
  if (!hasRunnerAuthority(input.input.runnerConfig)) {
    return runnerConfigMissingRunNowResult(context, invocationId);
  }
  return handleRunNow(context, invocationId);
}

function runnerConfigMissingRunNowResult(
  context: RunNowContext,
  invocationId: string
): PlanWatchIterationResult {
  const timestamp = context.now.toISOString();
  return planWatchBlockedResult({
    ...baseRunNowResult(context),
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

async function readRunNowLedger(
  context: RunNowContext
): Promise<PlanWatchIterationResult | undefined> {
  try {
    const ledger = await context.dependencies.ledger.read();
    if (hasCompletedRunForKey(ledger, context.dedupeKey)) {
      return duplicateRunNowSkippedResult(context);
    }
    if (hasReservedRunForKey(ledger, context.dedupeKey)) {
      return interruptedRunNowAttemptResult(context);
    }
    return undefined;
  } catch (error) {
    return runNowLedgerReadBlockedResult(context, error);
  }
}

async function handleDryRunRunNow(
  context: RunNowContext,
  invocationId: string
): Promise<PlanWatchIterationResult> {
  const record = buildDryRunPlanWatchRunNowLedgerRecord({
    key: context.dedupeKey,
    invocationId: `dry-run-${invocationId}`,
    planPath: context.planPath,
    forceRun: context.input.forceRun === true,
    attemptedAt: context.now.toISOString()
  });
  try {
    const ledgerRecord = await context.dependencies.ledger.observeDryRun(record);
    return {
      status: "dry_run",
      ...baseRunNowResult(context),
      invocationId: ledgerRecord.invocationId,
      ledgerRecord
    };
  } catch (error) {
    return blockedFromRunNowError(context, error, "ledger_write_failed", record.invocationId);
  }
}

async function handleRunNow(
  context: RunNowContext,
  invocationId: string
): Promise<PlanWatchIterationResult> {
  const reservedRecord = buildReservedPlanWatchRunNowLedgerRecord({
    key: context.dedupeKey,
    invocationId,
    planPath: context.planPath,
    forceRun: context.input.forceRun === true,
    attemptedAt: context.now.toISOString()
  });
  try {
    await context.dependencies.ledger.reserveRun(reservedRecord);
  } catch (error) {
    const contentionResult = await runNowReservationContentionResult(context, error);
    if (contentionResult !== undefined) {
      return contentionResult;
    }
    return blockedFromRunNowError(context, error, "ledger_write_failed", invocationId);
  }

  await context.input.onEvent?.({
    kind: "runner_started",
    repoPath: context.repoPath,
    planPath: context.planPath,
    invocationId,
    dedupeKey: context.dedupeKey,
    triggerReason: "operator_run_now"
  });
  const runnerResult = await context.dependencies.runExecutePairflowPlanContinuation(
    buildRunNowRunnerInput({
      repoPath: context.repoPath,
      planPath: context.planPath,
      invocationId,
      now: context.now,
      ...(context.input.stopSignal !== undefined
        ? { stopSignal: context.input.stopSignal }
        : {}),
      onArtifactFiles: async (artifactFiles) => {
        await context.input.onEvent?.({
          kind: "runner_artifact_ready",
          repoPath: context.repoPath,
          planPath: context.planPath,
          invocationId,
          dedupeKey: context.dedupeKey,
          triggerReason: "operator_run_now",
          artifactFiles
        });
      }
    }),
    context.input.runnerConfig ?? {}
  ).catch((error: unknown) => runnerThrownRunNowResult(context, invocationId, error));
  await context.input.onEvent?.({
    kind: "runner_completed",
    repoPath: context.repoPath,
    planPath: context.planPath,
    invocationId,
    dedupeKey: context.dedupeKey,
    triggerReason: "operator_run_now",
    runnerResult
  });
  const completedRecord = buildCompletedPlanWatchLedgerRecord(
    reservedRecord,
    runnerResult
  );
  return completeRunNowLedger(
    context,
    invocationId,
    reservedRecord,
    completedRecord,
    runnerResult
  );
}

async function completeRunNowLedger(
  context: RunNowContext,
  invocationId: string,
  reservedRecord: PlanWatchIterationResult["ledgerRecord"],
  completedRecord: NonNullable<PlanWatchIterationResult["ledgerRecord"]>,
  runnerResult: AgentRunnerBridgeResult
): Promise<PlanWatchIterationResult> {
  try {
    await context.dependencies.ledger.completeRun(completedRecord);
  } catch (error) {
    return blockedFromRunNowError(
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
    ...baseRunNowResult(context),
    invocationId,
    ledgerRecord: completedRecord,
    runnerResult,
    ...(status === "blocked"
      ? { blockedReasonKind: mapRunnerBlockedReason(runnerResult) }
      : {})
  };
}

function baseRunNowResult(
  context: RunNowContext
): Omit<PlanWatchIterationResult, "status"> {
  return {
    repoPath: context.repoPath,
    planPath: context.planPath,
    scannedCandidateCount: 0,
    deferredCandidateCount: 0,
    diagnostics: context.diagnostics,
    dedupeKey: context.dedupeKey,
    onceExit: context.onceExit
  };
}

function duplicateRunNowSkippedResult(context: RunNowContext): PlanWatchIterationResult {
  return {
    status: "duplicate_skipped",
    ...baseRunNowResult(context)
  };
}

function interruptedRunNowAttemptResult(context: RunNowContext): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseRunNowResult(context),
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

async function runNowReservationContentionResult(
  context: RunNowContext,
  error: unknown
): Promise<PlanWatchIterationResult | undefined> {
  if (!isRunRecordContention(error)) {
    return undefined;
  }
  try {
    const ledger = await context.dependencies.ledger.read();
    if (hasCompletedRunForKey(ledger, context.dedupeKey)) {
      return duplicateRunNowSkippedResult(context);
    }
    if (hasReservedRunForKey(ledger, context.dedupeKey)) {
      return interruptedRunNowAttemptResult(context);
    }
  } catch (readError) {
    return runNowLedgerReadBlockedResult(context, readError);
  }
  return runNowReservationContentionUnresolvedResult(context, error);
}

function runNowReservationContentionUnresolvedResult(
  context: RunNowContext,
  error: unknown
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseRunNowResult(context),
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

function blockedFromRunNowError(
  context: RunNowContext,
  error: unknown,
  fallback: PlanWatchBlockedReasonKind,
  invocationId?: string,
  ledgerRecord?: PlanWatchIterationResult["ledgerRecord"],
  runnerResult?: AgentRunnerBridgeResult
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    ...baseRunNowResult(context),
    ...(invocationId !== undefined ? { invocationId } : {}),
    ...(ledgerRecord !== undefined ? { ledgerRecord } : {}),
    ...(runnerResult !== undefined ? { runnerResult } : {}),
    blockedReasonKind: ledgerErrorReason(error, fallback),
    diagnostics: [...context.diagnostics, watchDiagnosticFromError(error)]
  });
}

function runNowLedgerReadBlockedResult(
  context: RunNowContext,
  error: unknown
): PlanWatchIterationResult {
  return planWatchBlockedResult({
    repoPath: context.repoPath,
    planPath: context.planPath,
    onceExit: context.onceExit,
    scannedCandidateCount: 0,
    deferredCandidateCount: 0,
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

function runnerThrownRunNowResult(
  context: RunNowContext,
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
  config: PlanWatchInput["runnerConfig"]
): boolean {
  return (
    (config?.backend !== undefined && config.backend.trim().length > 0)
    || (config?.command !== undefined && config.command.trim().length > 0)
  );
}
