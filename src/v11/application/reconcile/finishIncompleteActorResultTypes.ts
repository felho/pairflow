import type { BubbleExecutionContext } from "../../../types/bubble.js";

export type FinishIncompleteActorResultReasonCode =
  | "ACTOR_RECONCILE_CONTEXT_INVALID"
  | "ACTOR_RECONCILE_INPUT_INVALID";

export class FinishIncompleteActorResultError extends Error {
  public readonly reasonCode: FinishIncompleteActorResultReasonCode;

  public constructor(
    reasonCode: FinishIncompleteActorResultReasonCode,
    message: string
  ) {
    super(message);
    this.name = "FinishIncompleteActorResultError";
    this.reasonCode = reasonCode;
  }
}

export interface FinishIncompleteActorRouteDecision<
  CanonicalRun = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> {
  appliedRoute: AppliedRoute;
  mutationKind: MutationKind;
  canonicalRun: CanonicalRun;
  routeContext?: RouteContext;
  warnings?: string[];
  diagnostics?: Diagnostic[];
}

export type FinishIncompleteActorRoutePolicy<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> = (input: {
  bubbleId: string;
  repoPath: string | undefined;
  cwd: string | undefined;
  now: Date;
  executionContext: BubbleExecutionContext;
  runResult: CanonicalRun;
  summary?: string;
  refs: string[];
  callerTag?: string;
  snapshotState?: SnapshotState;
}) => Promise<
  FinishIncompleteActorRouteDecision<
    CanonicalRun,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >
> | FinishIncompleteActorRouteDecision<
  CanonicalRun,
  AppliedRoute,
  MutationKind,
  RouteContext,
  Diagnostic
>;

export interface FinishIncompleteActorResultInput<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> {
  bubbleId: string;
  repoPath: string | undefined;
  cwd: string | undefined;
  now: Date;
  executionContext: BubbleExecutionContext;
  runResult: CanonicalRun;
  routePolicy: FinishIncompleteActorRoutePolicy<
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >;
  summary?: string;
  refs?: string[];
  callerTag?: string;
  snapshotState?: SnapshotState;
}

export interface FinishIncompleteActorApplyRouteInput<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> {
  bubbleId: string;
  repoPath: string | undefined;
  cwd: string | undefined;
  now: Date;
  executionContext: BubbleExecutionContext;
  runResult: CanonicalRun;
  summary?: string;
  refs: string[];
  callerTag?: string;
  snapshotState?: SnapshotState;
  routeDecision: FinishIncompleteActorRouteDecision<
    CanonicalRun,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >;
}

export interface FinishIncompleteActorApplyRouteResult<
  State = unknown,
  RouteEnvelope = unknown,
  CanonicalRun = unknown,
  Diagnostic extends string = string
> {
  bubbleId: string;
  routeSequence: number;
  routeEnvelope: RouteEnvelope;
  state: State;
  canonicalRun?: CanonicalRun;
  warnings?: string[];
  diagnostics?: Diagnostic[];
}

export interface FinishIncompleteActorResultDependencies<
  State = unknown,
  RouteEnvelope = unknown,
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> {
  applyRoute?: (
    input: FinishIncompleteActorApplyRouteInput<
      CanonicalRun,
      SnapshotState,
      AppliedRoute,
      MutationKind,
      RouteContext,
      Diagnostic
    >
  ) => Promise<
    FinishIncompleteActorApplyRouteResult<
      State,
      RouteEnvelope,
      CanonicalRun,
      Diagnostic
    >
  >;
}

export interface FinishIncompleteActorResultOutput<
  CanonicalRun = unknown,
  State = unknown,
  RouteEnvelope = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  Diagnostic extends string = string
> {
  bubbleId: string;
  appliedRoute: AppliedRoute;
  routeSequence: number;
  routeEnvelope: RouteEnvelope;
  state: State;
  canonicalRun: CanonicalRun;
  mutationKind: MutationKind;
  warnings?: string[];
  diagnostics?: Diagnostic[];
}
