import {
  ActorEmitContextError,
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
  PassActorEmitInput
} from "../../../types/protocol.js";
import {
  assertActorEmitInputMatchesContext,
  type ActorEmitResultV11
} from "./actorProtocolEmitters.js";
import {
  type ActorRuntimeDispatchHandler,
  type ActorRuntimeDispatchPlan,
  resolveActorRuntimeDispatchPlan,
  resolveActorRuntimeDispatchPlanByRouteId
} from "./actorRuntimeDispatchMatrix.js";
import {
  type ActorProtocolDependencies,
  executeActorRuntimeDispatchPlan
} from "./actorRuntimeKernel.js";

export type { ActorEmitResultV11 } from "./actorProtocolEmitters.js";
export type { ActorProtocolDependencies } from "./actorRuntimeKernel.js";

export interface ResolvedActorEmitInputV11 {
  input: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

interface ResolvedImplementerPilotActorEmitInputV11 {
  input: PassActorEmitInput | HumanQuestionActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dispatchPlan?: ActorRuntimeDispatchPlan;
}

interface ResolvedReviewerActorEmitInputV11 {
  input: PassActorEmitInput | ConvergenceActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dispatchPlan?: ActorRuntimeDispatchPlan;
}

interface ResolvedMetaReviewerActorEmitInputV11 {
  input: MetaReviewResultActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  dispatchPlan?: ActorRuntimeDispatchPlan;
}

function resolveCanonicalWrapperDispatchPlan(input: {
  dispatchPlan?: ActorRuntimeDispatchPlan;
  authoritativeContext: ActorEmitContextSnapshot;
  actorInput: ActorEmitInput;
  expectedHandler: ActorRuntimeDispatchHandler;
  mismatchMessage: string;
}): ActorRuntimeDispatchPlan {
  const plan = input.dispatchPlan
    ? resolveActorRuntimeDispatchPlanByRouteId({
      routeId: input.dispatchPlan.route.id
    })
    : resolveActorRuntimeDispatchPlan({
      expectedRole: input.authoritativeContext.expected_role,
      inputKind: input.actorInput.kind
    });

  if (plan.route.handler !== input.expectedHandler) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      input.mismatchMessage
    );
  }

  return plan;
}

export async function emitImplementerPilotActorProtocolV11(
  resolvedInput: ResolvedImplementerPilotActorEmitInputV11
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "human_question" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  const plan = resolveCanonicalWrapperDispatchPlan({
    authoritativeContext: context,
    actorInput: input,
    expectedHandler: "implementer_wrapper",
    mismatchMessage:
      "ACTOR_EMIT_CONTEXT_INVALID: implementer pilot wrapper requires implementer authority.",
    ...(resolvedInput.dispatchPlan !== undefined
      ? { dispatchPlan: resolvedInput.dispatchPlan }
      : {})
  });
  return executeActorRuntimeDispatchPlan({
    actorInput: input,
    authoritativeContext: context,
    plan,
    dependencies
  }) as Promise<Extract<
    ActorEmitResultV11,
    { kind: "pass" } | { kind: "human_question" }
  >>;
}

export const implementerPilotActorProtocolV11 = {
  emit: emitImplementerPilotActorProtocolV11
} as const;

export async function emitReviewerActorProtocolV11(
  resolvedInput: ResolvedReviewerActorEmitInputV11
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "pass" } | { kind: "convergence" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  const plan = resolveCanonicalWrapperDispatchPlan({
    authoritativeContext: context,
    actorInput: input,
    expectedHandler: "reviewer_wrapper",
    mismatchMessage:
      "ACTOR_EMIT_CONTEXT_INVALID: reviewer wrapper requires reviewer authority.",
    ...(resolvedInput.dispatchPlan !== undefined
      ? { dispatchPlan: resolvedInput.dispatchPlan }
      : {})
  });
  return executeActorRuntimeDispatchPlan({
    actorInput: input,
    authoritativeContext: context,
    plan,
    dependencies
  }) as Promise<Extract<
    ActorEmitResultV11,
    { kind: "pass" } | { kind: "convergence" }
  >>;
}

export const reviewerActorProtocolV11 = {
  emit: emitReviewerActorProtocolV11
} as const;

export async function emitMetaReviewerActorProtocolV11(
  resolvedInput: ResolvedMetaReviewerActorEmitInputV11
  ,
  dependencies: ActorProtocolDependencies = {}
): Promise<Extract<
  ActorEmitResultV11,
  { kind: "meta_review_result" }
>> {
  const { input, authoritativeContext: context } = resolvedInput;
  const plan = resolveCanonicalWrapperDispatchPlan({
    authoritativeContext: context,
    actorInput: input,
    expectedHandler: "meta_reviewer_wrapper",
    mismatchMessage:
      "ACTOR_EMIT_CONTEXT_INVALID: meta-reviewer wrapper requires meta_reviewer authority.",
    ...(resolvedInput.dispatchPlan !== undefined
      ? { dispatchPlan: resolvedInput.dispatchPlan }
      : {})
  });
  return executeActorRuntimeDispatchPlan({
    actorInput: input,
    authoritativeContext: context,
    plan,
    dependencies
  }) as Promise<Extract<
    ActorEmitResultV11,
    { kind: "meta_review_result" }
  >>;
}

export const metaReviewerActorProtocolV11 = {
  emit: emitMetaReviewerActorProtocolV11
} as const;

export async function emitActorProtocolFromWorkspaceV11(
  resolvedInput: ResolvedActorEmitInputV11,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResultV11> {
  assertActorEmitInputMatchesContext({
    actorInput: resolvedInput.input,
    authoritativeContext: resolvedInput.authoritativeContext
  });
  const plan = resolveActorRuntimeDispatchPlan({
    expectedRole: resolvedInput.authoritativeContext.expected_role,
    inputKind: resolvedInput.input.kind
  });
  return executeActorRuntimeDispatchPlan({
    actorInput: resolvedInput.input,
    authoritativeContext: resolvedInput.authoritativeContext,
    plan,
    dependencies
  });
}
