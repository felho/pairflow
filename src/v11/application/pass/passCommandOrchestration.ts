import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type { PassIntent } from "../../../contracts/kernel/protocol.js";
import { inferPassIntentFromActiveRole } from "../../domain/pass/passIntentInference.js";
import { raiseRepeatCleanDownstreamConvergedRejected } from "../../domain/pass/repeatCleanPolicyRejection.js";
import { createPassCommandError, throwAsPassCommandError } from "./internal/normalPass/passCommandError.js";
import { createPassCommandErrorRuntime } from "./internal/normalPass/passCommandErrorRuntime.js";
import { buildEmitPassContext } from "./internal/reviewerDelivery/emitPassContextBuilder.js";
import type {
  EmitPassDependencies,
  EmitPassInput,
  EmitPassResult
} from "./passCommandContract.js";
import { dispatchPassFlow } from "./internal/normalPass/passFlowDispatch.js";

const passCommandErrorRuntime = createPassCommandErrorRuntime({
  createPassCommandError,
  raiseDownstreamRejected: raiseRepeatCleanDownstreamConvergedRejected
});

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  return inferPassIntentFromActiveRole({
    activeRole,
    createError: createPassCommandError
  });
}

export async function emitPassFromWorkspace(
  input: EmitPassInput,
  dependencies: EmitPassDependencies = {}
): Promise<EmitPassResult> {
  const flowContext = await buildEmitPassContext({
    commandInput: input,
    createError: passCommandErrorRuntime.createError,
    inferDefaultPassIntent: inferPassIntent,
    workspaceContextDependencies: {
      ...(dependencies.resolveBubbleFromWorkspaceCwd !== undefined
        ? {
            resolveBubbleFromWorkspaceCwd:
              dependencies.resolveBubbleFromWorkspaceCwd
          }
        : {}),
      ...(dependencies.ensureBubbleInstanceIdForMutation !== undefined
        ? {
            ensureBubbleInstanceIdForMutation:
              dependencies.ensureBubbleInstanceIdForMutation
          }
        : {}),
      ...(dependencies.readStateSnapshot !== undefined
        ? { readStateSnapshot: dependencies.readStateSnapshot }
        : {}),
      ...(dependencies.resolveIdeationMetadata !== undefined
        ? { resolveIdeationMetadata: dependencies.resolveIdeationMetadata }
        : {}),
      ...(dependencies.resolvePassHandoff !== undefined
        ? { resolvePassHandoff: dependencies.resolvePassHandoff }
        : {})
    }
  });

  return dispatchPassFlow(
    {
      ...flowContext,
      onDownstreamRejected: passCommandErrorRuntime.onDownstreamRejected
    },
    dependencies
  );
}

export function asPassCommandError(error: unknown): never {
  return throwAsPassCommandError(error);
}

export { PassCommandError } from "./internal/normalPass/passCommandError.js";
export type {
  EmitPassDependencies,
  EmitPassInput,
  EmitPassResult
} from "./passCommandContract.js";
