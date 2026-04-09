import type { LoadedStateSnapshot, ReadStateSnapshotPort, WriteStateSnapshotPort } from "../ports/stateSnapshots.js";
import type { AppendProtocolEnvelopePort, ReadTranscriptEnvelopesPort } from "../ports/transcript.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";
import type { SetMetaReviewerPaneBindingPort } from "../ports/runtimeSessions.js";
import { writeRecoveredMetaReviewArtifacts } from "./metaReviewGateRunResultArtifacts.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies
} from "./metaReviewGateTypes.js";
import type {
  MetaReviewArtifactReadPort,
  MetaReviewArtifactWritePort
} from "../metaReview/metaReviewArtifactIo.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
import {
  runningExecutionContextPath,
  validateActiveMetaReviewExecutionContext
} from "../metaReview/metaReviewExecutionContext.js";
import type { BubbleExecutionContext } from "../../../types/bubble.js";
import { metaReviewGatePaneDeactivationUnavoidableReasonCode } from "./metaReviewGateShared.js";
import { SchemaValidationError } from "../validation/primitives.js";

export interface ResolvedRecoveryContextDependencies {
  resolveBubble: ResolveBubbleByIdPort;
  readState: ReadStateSnapshotPort;
  writeState: WriteStateSnapshotPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  readTranscript: ReadTranscriptEnvelopesPort;
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  readFileFn: MetaReviewArtifactReadPort;
  writeFileFn: MetaReviewArtifactWritePort;
}

export function resolveRecoveryContextDependencies(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): ResolvedRecoveryContextDependencies {
  return {
    resolveBubble: requireRecoveryCapability(
      dependencies.resolveBubbleById,
      "meta-review gate bubble resolution capability is unavailable."
    ),
    readState: requireRecoveryCapability(
      dependencies.readStateSnapshot,
      "meta-review gate state read capability is unavailable."
    ),
    writeState: requireRecoveryCapability(
      dependencies.writeStateSnapshot,
      "meta-review gate state write capability is unavailable."
    ),
    appendEnvelope: requireRecoveryCapability(
      dependencies.appendProtocolEnvelope,
      "meta-review gate transcript append capability is unavailable."
    ),
    readTranscript: requireRecoveryCapability(
      dependencies.readTranscriptEnvelopes,
      "meta-review gate transcript read capability is unavailable."
    ),
    setMetaReviewerPane: requireRecoveryCapability(
      dependencies.setMetaReviewerPaneBinding,
      "meta-review gate pane binding capability is unavailable."
    ),
    readFileFn: requireRecoveryArtifactReadPort(dependencies),
    writeFileFn: requireRecoveryArtifactWritePort(dependencies)
  };
}

function requireRecoveryCapability<T>(
  value: T | undefined,
  message: string
): T {
  if (value !== undefined) {
    return value;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: ${message}`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

function requireRecoveryArtifactReadPort(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): MetaReviewArtifactReadPort {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery artifact read capability is unavailable.",
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

function requireRecoveryArtifactWritePort(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): MetaReviewArtifactWritePort {
  if (dependencies.writeFile !== undefined) {
    return dependencies.writeFile;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery artifact write capability is unavailable.",
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

export function buildDeactivateMetaReviewerPane(input: {
  setMetaReviewerPane: SetMetaReviewerPaneBindingPort;
  sessionsPath: string;
  bubbleId: string;
  now: Date;
}): () => Promise<string | null> {
  return async (): Promise<string | null> => {
    try {
      await input.setMetaReviewerPane({
        sessionsPath: input.sessionsPath,
        bubbleId: input.bubbleId,
        active: false,
        now: input.now
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
}

export function buildFinishWithPaneDeactivation(input: {
  bubbleId: string;
  nowIso: string;
  writeFileFn: MetaReviewArtifactWritePort;
  artifactsPaths: {
    metaReviewLastJsonArtifactPath: string;
  };
  deactivateMetaReviewerPane: () => Promise<string | null>;
}): (result: MetaReviewGateResult) => Promise<MetaReviewGateResult> {
  return async (result: MetaReviewGateResult): Promise<MetaReviewGateResult> => {
    let finalizedResult = result;
    if (result.metaReviewRun !== undefined) {
      const artifactWrite = await writeRecoveredMetaReviewArtifacts({
        bubbleId: input.bubbleId,
        round: result.state.round,
        nowIso: input.nowIso,
        lifecycleState: result.state.state,
        runResult: result.metaReviewRun,
        paths: input.artifactsPaths,
        writeFileFn: input.writeFileFn
      });
      if (artifactWrite.warnings.length > 0) {
        finalizedResult = {
          ...result,
          metaReviewRun: {
            ...result.metaReviewRun,
            warnings: [
              ...result.metaReviewRun.warnings,
              ...artifactWrite.warnings
            ]
          }
        };
      }
    }
    await input.deactivateMetaReviewerPane();
    return finalizedResult;
  };
}

export async function rethrowAfterMetaReviewerPaneDeactivation(input: {
  error: unknown;
  deactivateMetaReviewerPane: () => Promise<string | null>;
  failureContext: string;
}): Promise<never> {
  const deactivationError = await input.deactivateMetaReviewerPane();
  if (deactivationError !== null) {
    const root = toMetaReviewGateError(input.error);
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_TRANSITION_INVALID",
      `META_REVIEW_GATE_TRANSITION_INVALID: ${metaReviewGatePaneDeactivationUnavoidableReasonCode}: ${input.failureContext} and pane deactivation could not be confirmed (deactivation_error=${deactivationError}). Root error: ${root.message}`,
      {
        ...root.diagnostics,
        stageReasonCode: metaReviewGatePaneDeactivationUnavoidableReasonCode
      }
    );
  }

  if (input.error instanceof SchemaValidationError) {
    throw new SchemaValidationError({
      message: `META_REVIEW_GATE_SCHEMA_VALIDATION: recovery_init=${input.failureContext}; ${input.error.message}`,
      errors: input.error.errors,
      context: {
        source: "assert_validation",
        errorCount: input.error.errors.length,
        firstErrorPath: input.error.errors[0]?.path
      }
    });
  }

  throw toMetaReviewGateError(input.error);
}

function toMissingTopLevelExecutionContextError(): MetaReviewGateError {
  return new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: context execution_context_scope=top_level; meta-review gate recovery requires a valid top-level execution_context; nested meta_review.execution_context aliases are not accepted.",
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}

export function requireRecoverableMetaReviewExecutionContext(
  loaded: LoadedStateSnapshot
): BubbleExecutionContext {
  const topLevelExecutionContext = loaded.state.execution_context ?? null;
  const executionContextResult = validateActiveMetaReviewExecutionContext(loaded.state);
  if (topLevelExecutionContext === null) {
    throw toMissingTopLevelExecutionContextError();
  }

  if (executionContextResult.ok) {
    return executionContextResult.value;
  }

  const details = executionContextResult.errors
    .map((error) => `${error.path}: ${error.message}`)
    .join("; ");
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery requires RUNNING state with a valid top-level ${runningExecutionContextPath} (${details}).`,
    {
      stageReasonCode: "META_REVIEW_GATE_TRANSITION_INVALID"
    }
  );
}
