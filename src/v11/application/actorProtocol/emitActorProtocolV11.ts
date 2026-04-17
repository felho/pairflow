import {
  ActorEmitContextError,
  assertActorEmitContextSnapshotIntegrity,
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
  emitConvergenceActorResultV11,
  emitHumanQuestionActorResultV11,
  emitMetaReviewActorResultV11,
  emitPassActorResultV11
} from "./actorProtocolEmitters.js";
import {
  type ActorRuntimeDispatchPlan,
  assertActorRuntimeDispatchPlanPolicies,
  resolveActorRuntimeDispatchPlan,
  resolveActorRuntimeDispatchPlanByRouteId
} from "./actorRuntimeDispatchMatrix.js";
import type { EmitAskHumanV11Result } from "../askHuman/emitAskHumanV11.js";
import type { EmitConvergedV11Result } from "../converged/emitConvergedV11.js";
import type { MetaReviewSubmitResultV11 } from "../metaReview/emitMetaReviewV11.js";
import type { EmitPassV11Result } from "../pass/emitPassV11.js";
import type { EmitPassDependencies } from "../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../shared/converged/convergedCommandTypes.js";

export type ActorEmitResultV11 =
  | {
      kind: "pass";
      pass: EmitPassV11Result;
    }
  | {
      kind: "human_question";
      human_question: EmitAskHumanV11Result;
    }
  | {
      kind: "convergence";
      convergence: EmitConvergedV11Result;
    }
  | {
      kind: "meta_review_result";
      meta_review_result: MetaReviewSubmitResultV11;
    };

export interface ResolvedActorEmitInputV11 {
  input: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

export interface ActorProtocolDependencies {
  pass?: EmitPassDependencies;
  convergence?: EmitConvergedDependencies;
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

function assertNeverActorRuntimeDispatchHandler(
  handler: never
): never {
  throw new ActorEmitContextError({
    reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
    message:
      `ACTOR_EMIT_CONTEXT_INVALID: unhandled actor runtime dispatch handler ${String(handler)}.`,
    context: {
      route: "emitActorProtocolFromWorkspaceV11",
      expectedAuthority: "known_actor_runtime_dispatch_handler",
      receivedHandler: String(handler)
    }
  });
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
  const plan = resolvedInput.dispatchPlan
    ? resolveActorRuntimeDispatchPlanByRouteId({
      routeId: resolvedInput.dispatchPlan.route.id
    })
    : resolveActorRuntimeDispatchPlan({
      expectedRole: context.expected_role,
      inputKind: input.kind
    });
  if (plan.route.handler !== "implementer_wrapper") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: implementer pilot wrapper requires implementer authority."
    );
  }
  assertActorRuntimeDispatchPlanPolicies({
    plan,
    actorInput: input,
    authoritativeContext: context
  });

  if (input.kind === "pass") {
    return emitPassActorResultV11({
      actorInput: input,
      authoritativeContext: context,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    });
  }

  return emitHumanQuestionActorResultV11({
    actorInput: input,
    authoritativeContext: context
  });
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
  const plan = resolvedInput.dispatchPlan
    ? resolveActorRuntimeDispatchPlanByRouteId({
      routeId: resolvedInput.dispatchPlan.route.id
    })
    : resolveActorRuntimeDispatchPlan({
      expectedRole: context.expected_role,
      inputKind: input.kind
    });
  if (plan.route.handler !== "reviewer_wrapper") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: reviewer wrapper requires reviewer authority."
    );
  }
  assertActorRuntimeDispatchPlanPolicies({
    plan,
    actorInput: input,
    authoritativeContext: context
  });

  if (input.kind === "pass") {
    return emitPassActorResultV11({
      actorInput: input,
      authoritativeContext: context,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    });
  }

  const expectedReviewer = context.loaded_state.state.active_agent;
  if (expectedReviewer === null) {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: canonical reviewer authority requires an active reviewer agent."
    );
  }
  return emitConvergenceActorResultV11({
    actorInput: input,
    authoritativeContext: context,
    expectedReviewer,
    ...(dependencies.convergence !== undefined
      ? { dependencies: dependencies.convergence }
      : {})
  });
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
  void dependencies;
  const { input, authoritativeContext: context } = resolvedInput;
  const plan = resolvedInput.dispatchPlan
    ? resolveActorRuntimeDispatchPlanByRouteId({
      routeId: resolvedInput.dispatchPlan.route.id
    })
    : resolveActorRuntimeDispatchPlan({
      expectedRole: context.expected_role,
      inputKind: input.kind
    });
  if (plan.route.handler !== "meta_reviewer_wrapper") {
    throw new ActorEmitContextError(
      "ACTOR_EMIT_CONTEXT_INVALID",
      "ACTOR_EMIT_CONTEXT_INVALID: meta-reviewer wrapper requires meta_reviewer authority."
    );
  }
  assertActorRuntimeDispatchPlanPolicies({
    plan,
    actorInput: input,
    authoritativeContext: context
  });
  return emitMetaReviewActorResultV11({
    actorInput: input,
    authoritativeContext: context
  });
}

export const metaReviewerActorProtocolV11 = {
  emit: emitMetaReviewerActorProtocolV11
} as const;

export async function emitActorProtocolFromWorkspaceV11(
  resolvedInput: ResolvedActorEmitInputV11,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResultV11> {
  assertActorEmitContextSnapshotIntegrity(resolvedInput.authoritativeContext);
  assertActorEmitInputMatchesContext({
    actorInput: resolvedInput.input,
    authoritativeContext: resolvedInput.authoritativeContext
  });
  const plan = resolveActorRuntimeDispatchPlan({
    expectedRole: resolvedInput.authoritativeContext.expected_role,
    inputKind: resolvedInput.input.kind
  });
  const { input, authoritativeContext: context } = resolvedInput;
  switch (plan.route.handler) {
    case "implementer_wrapper":
      return implementerPilotActorProtocolV11.emit({
        input: input as PassActorEmitInput | HumanQuestionActorEmitInput,
        authoritativeContext: context,
        dispatchPlan: plan
      }, dependencies);
    case "reviewer_wrapper":
      return reviewerActorProtocolV11.emit({
        input: input as PassActorEmitInput | ConvergenceActorEmitInput,
        authoritativeContext: context,
        dispatchPlan: plan
      }, dependencies);
    case "meta_reviewer_wrapper":
      return metaReviewerActorProtocolV11.emit({
        input: input as MetaReviewResultActorEmitInput,
        authoritativeContext: context,
        dispatchPlan: plan
      }, dependencies);
    case "reviewer_human_question_fallback":
      assertActorRuntimeDispatchPlanPolicies({
        plan,
        actorInput: input,
        authoritativeContext: context
      });
      return emitHumanQuestionActorResultV11({
        actorInput: input as HumanQuestionActorEmitInput,
        authoritativeContext: context
      });
    default:
      return assertNeverActorRuntimeDispatchHandler(plan.route.handler);
  }
}
