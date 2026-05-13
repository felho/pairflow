import { ActorEmitContextError } from "../../../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitContextSnapshot
} from "../../../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
  PassActorEmitInput
} from "../../actorEmitContract.js";
import {
  type ActorEmitResult,
  emitConvergenceActorResult,
  emitHumanQuestionActorResult,
  emitMetaReviewActorResult,
  emitPassActorResult
} from "../adapters/actorProtocolEmitters.js";
import {
  type ActorRuntimeAdapterId,
  type ActorRuntimeDispatchPlan,
  assertActorRuntimeDispatchPlanPolicies
} from "../dispatch/actorRuntimeDispatchMatrix.js";
import type { EmitPassDependencies } from "../../../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../../../shared/converged/convergedCommandTypes.js";
import type { MetaReviewCommandDependencies } from "../../../../shared/metaReview/metaReviewCommandContract.js";
import type { EmitAskHumanDependencies } from "../../../askHuman/askHumanCommandContract.js";

export interface ActorProtocolDependencies {
  pass?: EmitPassDependencies;
  askHuman?: EmitAskHumanDependencies;
  convergence?: EmitConvergedDependencies;
  metaReview?: MetaReviewCommandDependencies;
}

export interface ExecuteActorRuntimeDispatchPlanInput {
  actorInput: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
  plan: ActorRuntimeDispatchPlan;
  dependencies?: ActorProtocolDependencies;
}

interface ActorRuntimeAdapterExecutionInput
  extends ExecuteActorRuntimeDispatchPlanInput {
  dependencies: ActorProtocolDependencies;
}

type ActorRuntimeAdapterExecutor = (
  input: ActorRuntimeAdapterExecutionInput
) => Promise<ActorEmitResult>;

type ActiveReviewer = NonNullable<
  ActorEmitContextSnapshot["loaded_state"]["state"]["active_agent"]
>;

function resolveActorRuntimeAdapterExecutor(
  adapterId: ActorRuntimeAdapterId
): ActorRuntimeAdapterExecutor {
  const executeAdapter = actorRuntimeAdapterExecutors[adapterId];
  if (executeAdapter === undefined) {
    throw new ActorEmitContextError({
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        `ACTOR_EMIT_CONTEXT_INVALID: unknown actor runtime adapter ${adapterId}.`,
      context: {
        route: "executeActorRuntimeDispatchPlan",
        expectedAuthority: "known_actor_runtime_adapter",
        receivedKind: adapterId
      }
    });
  }
  return executeAdapter;
}

const actorRuntimeAdapterExecutors: Readonly<
  Record<ActorRuntimeAdapterId, ActorRuntimeAdapterExecutor>
> = {
  pass_adapter: async ({
    actorInput,
    authoritativeContext,
    dependencies
  }) =>
    emitPassActorResult({
      actorInput: actorInput as PassActorEmitInput,
      authoritativeContext,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    }),
  human_question_adapter: async ({
    actorInput,
    authoritativeContext,
    dependencies
  }) =>
    emitHumanQuestionActorResult({
      actorInput: actorInput as HumanQuestionActorEmitInput,
      authoritativeContext,
      ...(dependencies.askHuman !== undefined
        ? { dependencies: dependencies.askHuman }
        : {})
    }),
  convergence_adapter: async ({
    actorInput,
    authoritativeContext,
    dependencies
  }) =>
    emitConvergenceActorResult({
      actorInput: actorInput as ConvergenceActorEmitInput,
      authoritativeContext,
      expectedReviewer:
        authoritativeContext.loaded_state.state.active_agent as ActiveReviewer,
      ...(dependencies.convergence !== undefined
        ? { dependencies: dependencies.convergence }
        : {})
    }),
  meta_review_result_adapter: async ({
    actorInput,
    authoritativeContext,
    dependencies
  }) =>
    emitMetaReviewActorResult({
      actorInput: actorInput as MetaReviewResultActorEmitInput,
      authoritativeContext,
      ...(dependencies.metaReview !== undefined
        ? { dependencies: dependencies.metaReview }
        : {})
    })
};

export async function executeActorRuntimeDispatchPlan(
  input: ExecuteActorRuntimeDispatchPlanInput
): Promise<ActorEmitResult> {
  const dependencies = input.dependencies ?? {};
  assertActorRuntimeDispatchPlanPolicies({
    plan: input.plan,
    actorInput: input.actorInput,
    authoritativeContext: input.authoritativeContext
  });

  const executeAdapter = resolveActorRuntimeAdapterExecutor(
    input.plan.route.adapter
  );
  return executeAdapter({
    ...input,
    dependencies
  });
}
