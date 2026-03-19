import {
  type PassIntent
} from "../../types/protocol.js";
import type { AgentRole } from "../../types/bubble.js";
import {
  raiseRepeatCleanDownstreamConvergedRejected,
} from "../../v11/domain/pass/repeatCleanPolicyRejection.js";
import { normalizePassCommandError } from "../../v11/shared/pass/passCommandErrorNormalization.js";
import { createPassCommandErrorRuntime } from "../../v11/shared/pass/passCommandErrorRuntime.js";
import { buildEmitPassContext } from "../../v11/shared/pass/emitPassContextBuilder.js";
import { dispatchPassFlow } from "../../v11/shared/pass/passFlowDispatch.js";
import type {
  EmitPassDependencies,
  EmitPassInput,
  EmitPassResult
} from "../../v11/application/pass/passCommandContract.js";
import {
  resolveMostRecentPreviousReviewerPassIsCleanFromMetadata as resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11
} from "../../v11/domain/pass/repeatCleanMetadata.js";

export type { EmitPassDependencies, EmitPassInput, EmitPassResult };

export class PassCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PassCommandError";
  }
}

const createPassCommandError = (message: string) => new PassCommandError(message);
const passCommandErrorRuntime = createPassCommandErrorRuntime({
  createPassCommandError,
  raiseDownstreamRejected: raiseRepeatCleanDownstreamConvergedRejected
});

// Canonical reader for repeat-clean most-recent previous reviewer PASS cleanliness.
// Deprecated key is retained for backward compatibility with existing append-only transcripts.
export function resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
  metadata: Record<string, unknown> | undefined
): boolean | undefined {
  return resolveMostRecentPreviousReviewerPassIsCleanFromMetadataV11(
    metadata
  );
}

export function inferPassIntent(activeRole: AgentRole): PassIntent {
  if (activeRole === "implementer") {
    return "review";
  }
  if (activeRole === "reviewer") {
    return "fix_request";
  }

  throw createPassCommandError(
    `Unsupported active role for pass intent inference: ${activeRole}.`
  );
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

  return dispatchPassFlow({
    ...flowContext,
    onDownstreamRejected: passCommandErrorRuntime.onDownstreamRejected
  }, dependencies);
}

export function asPassCommandError(error: unknown): never {
  throw normalizePassCommandError({
    error,
    isPassCommandError: (candidate) => candidate instanceof PassCommandError,
    createPassCommandError
  });
}
