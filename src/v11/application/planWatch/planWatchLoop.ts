import { resolve } from "node:path";

import {
  executePlanWatchCandidate,
  planWatchBlockedResult,
  planWatchDiagnostic
} from "./planWatchLoopExecution.js";
import {
  executePlanWatchRunNow
} from "./planWatchRunNowExecution.js";
import {
  DEFAULT_PLAN_WATCH_INTERVAL_MS,
  type PlanWatchDiagnostic,
  type PlanWatchEvent,
  type PlanWatchInput,
  type PlanWatchIterationResult,
  type PlanWatchLoopDependencies,
  type PlanWatchLoopResult
} from "./planWatchLoopContract.js";

export { DEFAULT_PLAN_WATCH_INTERVAL_MS } from "./planWatchLoopContract.js";

export async function runPlanWatchIteration(
  input: PlanWatchInput,
  dependencies: PlanWatchLoopDependencies
): Promise<PlanWatchIterationResult> {
  const normalized = normalizeInput(input);
  const now = (dependencies.now ?? (() => input.now ?? new Date()))();
  const onceExit = input.once === true;

  if (!normalized.ok) {
    return planWatchBlockedResult({
      repoPath: input.repoPath,
      planPath: input.planPath,
      onceExit,
      blockedReasonKind: "precondition_failed",
      diagnostics: [normalized.diagnostic]
    });
  }

  try {
    const indexResult = await dependencies.resolveLinkedBubbleTriggerIndex({
      repoPath: normalized.repoPath,
      planPath: normalized.planPath,
      now
    });
    if (indexResult.candidates.length === 0 && input.runNow === true) {
      return executePlanWatchRunNow({
        input,
        dependencies,
        now,
        onceExit,
        repoPath: normalized.repoPath,
        planPath: normalized.planPath,
        diagnostics: indexResult.diagnostics
      });
    }
    const candidates = indexResult.candidates;
    if (candidates.length === 0) {
      return {
        status: "idle",
        repoPath: normalized.repoPath,
        planPath: normalized.planPath,
        scannedCandidateCount: 0,
        deferredCandidateCount: 0,
        diagnostics: indexResult.diagnostics,
        onceExit
      };
    }
    let duplicateResult: PlanWatchIterationResult | undefined;
    for (const [candidateIndex, candidate] of candidates.entries()) {
      const result = await executePlanWatchCandidate({
        input,
        dependencies,
        now,
        onceExit,
        repoPath: normalized.repoPath,
        planPath: normalized.planPath,
        candidate,
        candidateCount: candidates.length,
        candidateIndex,
        diagnostics: indexResult.diagnostics
      });
      if (result.status !== "duplicate_skipped") {
        return result;
      }
      duplicateResult = result;
    }
    return duplicateResult ?? {
      status: "idle",
      repoPath: normalized.repoPath,
      planPath: normalized.planPath,
      scannedCandidateCount: 0,
      deferredCandidateCount: 0,
      diagnostics: indexResult.diagnostics,
      onceExit
    };
  } catch (error) {
    return planWatchBlockedResult({
      repoPath: normalized.repoPath,
      planPath: normalized.planPath,
      onceExit,
      blockedReasonKind: "precondition_failed",
      diagnostics: [
        planWatchDiagnostic("TRIGGER_INDEX_FAILED", "error", errorMessage(error))
      ]
    });
  }
}

export async function runPlanWatchLoop(
  input: PlanWatchInput,
  dependencies: PlanWatchLoopDependencies
): Promise<PlanWatchLoopResult> {
  const intervalMs = input.intervalMs ?? DEFAULT_PLAN_WATCH_INTERVAL_MS;
  const maxIterations = input.once === true ? 1 : input.maxIterations;
  const iterations: PlanWatchIterationResult[] = [];
  let iterationCount = 0;

  await emitPlanWatchEvent(input, {
    kind: "loop_started",
    repoPath: input.repoPath,
    planPath: input.planPath,
    intervalMs,
    once: input.once === true
  });

  while (maxIterations === undefined || iterationCount < maxIterations) {
    if (input.stopSignal?.aborted) {
      return stopLoop(input, iterations, "signal");
    }
    const result = await runPlanWatchIteration(
      planWatchIterationInput(input, iterationCount),
      dependencies
    );
    iterations.push(result);
    iterationCount += 1;
    await emitPlanWatchEvent(input, {
      kind: "iteration_completed",
      iterationIndex: iterationCount - 1,
      result
    });
    const stopReason = stopReasonFor(result, iterationCount, maxIterations);
    if (stopReason !== undefined) {
      return stopLoop(input, iterations, stopReason);
    }
    try {
      await (dependencies.sleep ?? sleep)(intervalMs, input.stopSignal);
    } catch (error) {
      if (isAbortError(error)) {
        return stopLoop(input, iterations, "signal");
      }
      throw error;
    }
  }

  return stopLoop(input, iterations, "max_iterations");
}

function planWatchIterationInput(
  input: PlanWatchInput,
  iterationCount: number
): PlanWatchInput {
  if (iterationCount === 0 || input.runNow !== true) {
    return input;
  }
  return {
    ...input,
    runNow: false,
    forceRun: false
  };
}

async function stopLoop(
  input: PlanWatchInput,
  iterations: readonly PlanWatchIterationResult[],
  stopReason: NonNullable<PlanWatchLoopResult["stopReason"]>
): Promise<PlanWatchLoopResult> {
  const result = stoppedLoopResult(iterations, stopReason);
  await emitPlanWatchEvent(input, {
    kind: "loop_stopped",
    status: result.status,
    iterationCount: iterations.length,
    stopReason
  });
  return result;
}

function stoppedLoopResult(
  iterations: readonly PlanWatchIterationResult[],
  stopReason: NonNullable<PlanWatchLoopResult["stopReason"]>
): PlanWatchLoopResult {
  return {
    status: iterations[iterations.length - 1]?.status ?? "idle",
    iterations,
    stopped: true,
    stopReason
  };
}

async function emitPlanWatchEvent(
  input: PlanWatchInput,
  event: PlanWatchEvent
): Promise<void> {
  await input.onEvent?.(event);
}

function normalizeInput(input: PlanWatchInput):
  | { ok: true; repoPath: string; planPath: string }
  | { ok: false; diagnostic: PlanWatchDiagnostic } {
  if (input.repoPath.trim().length === 0 || input.planPath.trim().length === 0) {
    return {
      ok: false,
      diagnostic: planWatchDiagnostic(
        "PLAN_WATCH_INPUT_MISSING",
        "error",
        "repoPath and planPath are required."
      )
    };
  }
  const intervalMs = input.intervalMs ?? DEFAULT_PLAN_WATCH_INTERVAL_MS;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return {
      ok: false,
      diagnostic: planWatchDiagnostic(
        "PLAN_WATCH_INTERVAL_INVALID",
        "error",
        "intervalMs must be a positive finite number."
      )
    };
  }
  return {
    ok: true,
    repoPath: resolve(input.repoPath),
    planPath: resolve(input.repoPath, input.planPath)
  };
}

function stopReasonFor(
  result: PlanWatchIterationResult,
  iterationCount: number,
  maxIterations: number | undefined
): PlanWatchLoopResult["stopReason"] {
  if (
    result.onceExit
    || result.status === "runner_human_checkpoint"
    || isTerminalBlockedResult(result)
  ) {
    return "condition";
  }
  if (maxIterations !== undefined && iterationCount >= maxIterations) {
    return "max_iterations";
  }
  return undefined;
}

function isTerminalBlockedResult(result: PlanWatchIterationResult): boolean {
  if (result.status !== "blocked") {
    return false;
  }
  return (
    result.blockedReasonKind === "precondition_failed"
    || result.blockedReasonKind === "ledger_schema_unsupported"
    || result.blockedReasonKind === "runner_config_missing"
    || result.blockedReasonKind === "runner_blocked_outcome"
    || result.blockedReasonKind === "runner_execution_failed"
    || result.blockedReasonKind === "runner_output_invalid"
    || result.blockedReasonKind === "interrupted_attempt_exists"
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }
  return new Promise((resolveSleep, reject) => {
    const cleanup = (): void => {
      signal?.removeEventListener("abort", abort);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolveSleep();
    }, ms);
    const abort = (): void => {
      clearTimeout(timer);
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function abortError(): Error {
  const error = new Error("PLAN_WATCH_ABORTED: Plan watch loop was stopped.");
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
