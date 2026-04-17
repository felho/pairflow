import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput
} from "../../../types/protocol.js";
import {
  assertActorEmitInputMatchesContext,
  type ActorEmitResultV11
} from "./actorProtocolEmitters.js";
import {
  resolveActorRuntimeDispatchPlan
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
