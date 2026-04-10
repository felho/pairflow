import type { BubbleExecutionContext } from "../../../types/bubble.js";

export interface FinishIncompleteActorRouteDecisionPort<
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

export interface FinishIncompleteActorRoutePolicyInputPort<
  CanonicalRun = unknown,
  SnapshotState = unknown
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
}

export type FinishIncompleteActorRoutePolicyPort<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> = (
  input: FinishIncompleteActorRoutePolicyInputPort<CanonicalRun, SnapshotState>
) => Promise<
  FinishIncompleteActorRouteDecisionPort<
    CanonicalRun,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >
> | FinishIncompleteActorRouteDecisionPort<
  CanonicalRun,
  AppliedRoute,
  MutationKind,
  RouteContext,
  Diagnostic
>;

export interface FinishIncompleteActorResultInputPort<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> extends FinishIncompleteActorRoutePolicyInputPort<CanonicalRun, SnapshotState> {
  routePolicy: FinishIncompleteActorRoutePolicyPort<
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >;
}

export interface FinishIncompleteActorApplyRouteInputPort<
  CanonicalRun = unknown,
  SnapshotState = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  RouteContext = unknown,
  Diagnostic extends string = string
> extends FinishIncompleteActorRoutePolicyInputPort<CanonicalRun, SnapshotState> {
  routeDecision: FinishIncompleteActorRouteDecisionPort<
    CanonicalRun,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >;
}

export interface FinishIncompleteActorApplyRouteResultPort<
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

export interface FinishIncompleteActorResultDependenciesPort<
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
    input: FinishIncompleteActorApplyRouteInputPort<
      CanonicalRun,
      SnapshotState,
      AppliedRoute,
      MutationKind,
      RouteContext,
      Diagnostic
    >
  ) => Promise<
    FinishIncompleteActorApplyRouteResultPort<
      State,
      RouteEnvelope,
      CanonicalRun,
      Diagnostic
    >
  >;
}

export interface FinishIncompleteActorResultOutputPort<
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

export type FinishIncompleteActorResultPort = <
  CanonicalRun = unknown,
  State = unknown,
  RouteEnvelope = unknown,
  AppliedRoute extends string = string,
  MutationKind extends string = string,
  SnapshotState = unknown,
  RouteContext = unknown,
  Diagnostic extends string = string
>(
  input: FinishIncompleteActorResultInputPort<
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >,
  dependencies?: FinishIncompleteActorResultDependenciesPort<
    State,
    RouteEnvelope,
    CanonicalRun,
    SnapshotState,
    AppliedRoute,
    MutationKind,
    RouteContext,
    Diagnostic
  >
) => Promise<
  FinishIncompleteActorResultOutputPort<
    CanonicalRun,
    State,
    RouteEnvelope,
    AppliedRoute,
    MutationKind,
    Diagnostic
  >
>;
