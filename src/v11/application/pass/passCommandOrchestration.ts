import type { AgentRole } from "../../../types/bubble.js";
import type { PassIntent } from "../../../types/protocol.js";
import { inferPassIntentFromActiveRole } from "../../domain/pass/passIntentInference.js";
import { raiseRepeatCleanDownstreamConvergedRejected } from "../../domain/pass/repeatCleanPolicyRejection.js";
import { createPassCommandError, throwAsPassCommandError } from "../../shared/pass/passCommandError.js";
import { createPassCommandErrorRuntime } from "../../shared/pass/passCommandErrorRuntime.js";
import { buildEmitPassContext } from "./emitPassContextBuilder.js";
import type {
  EmitPassDependencies,
  EmitPassInput,
  EmitPassResult
} from "./passCommandContract.js";
import { dispatchPassFlow } from "./passFlowDispatch.js";

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
    inferDefaultPassIntent: inferPassIntent
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
