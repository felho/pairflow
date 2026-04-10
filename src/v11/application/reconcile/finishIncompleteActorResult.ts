import type { BubbleExecutionContext } from "../../../types/bubble.js";
import {
  FinishIncompleteActorResultError,
  type FinishIncompleteActorResultDependencies,
  type FinishIncompleteActorResultInput,
  type FinishIncompleteActorResultOutput,
  type FinishIncompleteActorRouteDecision
} from "./finishIncompleteActorResultTypes.js";

function isNonArrayObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isBubbleExecutionContext(
  value: BubbleExecutionContext | null | undefined
): value is BubbleExecutionContext {
  return Boolean(
    value &&
    typeof value.active_role === "string" &&
    typeof value.awaited_output_type === "string" &&
    typeof value.handoff_id === "string" &&
    typeof value.round === "number" &&
    Number.isInteger(value.round) &&
    typeof value.started_at === "string" &&
    typeof value.deadline_at === "string" &&
    typeof value.attempt === "number" &&
    Number.isInteger(value.attempt)
  );
}

function assertExecutionContext(
  value: BubbleExecutionContext | null | undefined
): asserts value is BubbleExecutionContext {
  if (isBubbleExecutionContext(value)) {
    return;
  }
  throw new FinishIncompleteActorResultError(
    "ACTOR_RECONCILE_CONTEXT_INVALID",
    "ACTOR_RECONCILE_CONTEXT_INVALID: finishIncompleteActorResult requires an explicit BubbleExecutionContext."
  );
}

function assertCanonicalRunResult(value: unknown): void {
  if (isNonArrayObject(value)) {
    return;
  }
  throw new FinishIncompleteActorResultError(
    "ACTOR_RECONCILE_INPUT_INVALID",
    "ACTOR_RECONCILE_INPUT_INVALID: finishIncompleteActorResult requires a canonical run result object."
  );
}

function assertRouteDecision(
  value: FinishIncompleteActorRouteDecision | null | undefined
): asserts value is FinishIncompleteActorRouteDecision {
  if (
    value &&
    typeof value.appliedRoute === "string" &&
    value.appliedRoute.trim().length > 0 &&
    typeof value.mutationKind === "string" &&
    value.mutationKind.trim().length > 0 &&
    isNonArrayObject(value.canonicalRun)
  ) {
    return;
  }
  throw new FinishIncompleteActorResultError(
    "ACTOR_RECONCILE_INPUT_INVALID",
    "ACTOR_RECONCILE_INPUT_INVALID: finishIncompleteActorResult route policy returned an invalid route decision."
  );
}

function assertAppliedRouteResult(
  value: {
    bubbleId?: unknown;
    routeSequence?: unknown;
    routeEnvelope?: unknown;
    state?: unknown;
    canonicalRun?: unknown;
  } | null | undefined,
  expectedBubbleId: string
): asserts value is {
  bubbleId: string;
  routeSequence: number;
  routeEnvelope: Record<string, unknown>;
  state: Record<string, unknown>;
  canonicalRun?: Record<string, unknown>;
} {
  if (
    value &&
    typeof value.bubbleId === "string" &&
    value.bubbleId.trim().length > 0 &&
    value.bubbleId === expectedBubbleId &&
    typeof value.routeSequence === "number" &&
    Number.isInteger(value.routeSequence) &&
    value.routeSequence >= 0 &&
    isNonArrayObject(value.routeEnvelope) &&
    isNonArrayObject(value.state) &&
    (value.canonicalRun === undefined || isNonArrayObject(value.canonicalRun))
  ) {
    return;
  }
  throw new FinishIncompleteActorResultError(
    "ACTOR_RECONCILE_INPUT_INVALID",
    "ACTOR_RECONCILE_INPUT_INVALID: finishIncompleteActorResult applyRoute returned an invalid route result."
  );
}

function mergeOptionalArrays<T>(left?: T[], right?: T[]): T[] | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];
  return merged.length > 0 ? merged : undefined;
}

export async function finishIncompleteActorResult<
  CanonicalRun = unknown,
  State = unknown,
  RouteEnvelope = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  SnapshotState = unknown,
  RouteContext = unknown,
  Diagnostic extends string = string
>(
  input: FinishIncompleteActorResultInput<
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >,
  dependencies: FinishIncompleteActorResultDependencies<
    State,
    RouteEnvelope,
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  > = {}
): Promise<
  FinishIncompleteActorResultOutput<
    CanonicalRun,
    State,
    RouteEnvelope,
    AppliedRoute,
    MutationKind,
    Diagnostic
  >
> {
  assertExecutionContext(input.executionContext);
  assertCanonicalRunResult(input.runResult);
  if (typeof input.routePolicy !== "function") {
    throw new FinishIncompleteActorResultError(
      "ACTOR_RECONCILE_INPUT_INVALID",
      "ACTOR_RECONCILE_INPUT_INVALID: finishIncompleteActorResult requires a routePolicy function."
    );
  }
  if (typeof dependencies.applyRoute !== "function") {
    throw new FinishIncompleteActorResultError(
      "ACTOR_RECONCILE_INPUT_INVALID",
      "ACTOR_RECONCILE_INPUT_INVALID: finishIncompleteActorResult requires an applyRoute dependency."
    );
  }

  const refs = input.refs ?? [];
  const routeDecision = await input.routePolicy({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now,
    executionContext: input.executionContext,
    runResult: input.runResult,
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    refs,
    ...(input.callerTag !== undefined ? { callerTag: input.callerTag } : {}),
    ...(input.snapshotState !== undefined
      ? { snapshotState: input.snapshotState }
      : {})
  });
  assertRouteDecision(routeDecision);

  const applied = await dependencies.applyRoute({
    bubbleId: input.bubbleId,
    repoPath: input.repoPath,
    cwd: input.cwd,
    now: input.now,
    executionContext: input.executionContext,
    runResult: input.runResult,
    ...(input.summary !== undefined ? { summary: input.summary } : {}),
    refs,
    ...(input.callerTag !== undefined ? { callerTag: input.callerTag } : {}),
    ...(input.snapshotState !== undefined
      ? { snapshotState: input.snapshotState }
      : {}),
    routeDecision
  });
  assertAppliedRouteResult(applied, input.bubbleId);

  const warnings = mergeOptionalArrays(routeDecision.warnings, applied.warnings);
  const diagnostics = mergeOptionalArrays(
    routeDecision.diagnostics,
    applied.diagnostics
  );

  return {
    bubbleId: applied.bubbleId,
    appliedRoute: routeDecision.appliedRoute,
    routeSequence: applied.routeSequence,
    routeEnvelope: applied.routeEnvelope,
    state: applied.state,
    canonicalRun: applied.canonicalRun ?? routeDecision.canonicalRun,
    mutationKind: routeDecision.mutationKind,
    ...(warnings !== undefined ? { warnings } : {}),
    ...(diagnostics !== undefined ? { diagnostics } : {})
  };
}
