import { ActorEmitContextError } from "../../shared/actorProtocol/actorEmitContext.js";
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
  type ActorEmitResultV11,
  emitConvergenceActorResultV11,
  emitHumanQuestionActorResultV11,
  emitMetaReviewActorResultV11,
  emitPassActorResultV11
} from "./actorProtocolEmitters.js";
import {
  type ActorRuntimeAdapterId,
  type ActorRuntimeDispatchPlan,
  assertActorRuntimeDispatchPlanPolicies
} from "./actorRuntimeDispatchMatrix.js";
import type { EmitPassDependencies } from "../pass/passCommandContract.js";
import type { EmitConvergedDependencies } from "../../shared/converged/convergedCommandTypes.js";

export interface ActorProtocolDependencies {
  pass?: EmitPassDependencies;
  convergence?: EmitConvergedDependencies;
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
) => Promise<ActorEmitResultV11>;

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
    emitPassActorResultV11({
      actorInput: actorInput as PassActorEmitInput,
      authoritativeContext,
      ...(dependencies.pass !== undefined
        ? { dependencies: dependencies.pass }
        : {})
    }),
  human_question_adapter: async ({
    actorInput,
    authoritativeContext
  }) =>
    emitHumanQuestionActorResultV11({
      actorInput: actorInput as HumanQuestionActorEmitInput,
      authoritativeContext
    }),
  convergence_adapter: async ({
    actorInput,
    authoritativeContext,
    dependencies
  }) =>
    emitConvergenceActorResultV11({
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
    authoritativeContext
  }) =>
    emitMetaReviewActorResultV11({
      actorInput: actorInput as MetaReviewResultActorEmitInput,
      authoritativeContext
    })
};

export async function executeActorRuntimeDispatchPlan(
  input: ExecuteActorRuntimeDispatchPlanInput
): Promise<ActorEmitResultV11> {
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
