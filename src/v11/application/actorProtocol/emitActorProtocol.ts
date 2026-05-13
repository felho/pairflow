import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput
} from "./actorEmitContract.js";
import {
  assertActorEmitInputMatchesContext,
  type ActorEmitResult
} from "./internal/adapters/actorProtocolEmitters.js";
import {
  resolveActorRuntimeDispatchPlan
} from "./internal/dispatch/actorRuntimeDispatchMatrix.js";
import {
  type ActorProtocolDependencies,
  executeActorRuntimeDispatchPlan
} from "./internal/kernel/actorRuntimeKernel.js";

export type { ActorEmitResult } from "./internal/adapters/actorProtocolEmitters.js";
export type { ActorProtocolDependencies } from "./internal/kernel/actorRuntimeKernel.js";

export interface ResolvedActorEmitInput {
  input: ActorEmitInput;
  authoritativeContext: ActorEmitContextSnapshot;
}

export async function emitActorProtocolFromWorkspace(
  resolvedInput: ResolvedActorEmitInput,
  dependencies: ActorProtocolDependencies = {}
): Promise<ActorEmitResult> {
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
