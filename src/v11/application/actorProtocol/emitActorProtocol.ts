import type {
  ActorEmitContextSnapshot
} from "../../shared/actorProtocol/actorEmitContext.js";
import type {
  ActorEmitInput
} from "../../../types/protocol.js";
import {
  assertActorEmitInputMatchesContext,
  type ActorEmitResult
} from "./actorProtocolEmitters.js";
import {
  resolveActorRuntimeDispatchPlan
} from "./actorRuntimeDispatchMatrix.js";
import {
  type ActorProtocolDependencies,
  executeActorRuntimeDispatchPlan
} from "./actorRuntimeKernel.js";

export type { ActorEmitResult } from "./actorProtocolEmitters.js";
export type { ActorProtocolDependencies } from "./actorRuntimeKernel.js";

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
