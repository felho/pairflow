import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../core/protocol/transcriptStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { setMetaReviewerPaneBinding } from "../../../core/runtime/sessionsRegistry.js";
import {
  readStateSnapshot,
  writeStateSnapshot,
  type LoadedStateSnapshot
} from "../../../core/state/stateStore.js";
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

export interface ResolvedRecoveryContextDependencies {
  resolveBubble: typeof resolveBubbleById;
  readState: typeof readStateSnapshot;
  writeState: typeof writeStateSnapshot;
  appendEnvelope: typeof appendProtocolEnvelope;
  readTranscript: typeof readTranscriptEnvelopes;
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
  readFileFn: MetaReviewArtifactReadPort;
  writeFileFn: MetaReviewArtifactWritePort;
}

export function resolveRecoveryContextDependencies(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): ResolvedRecoveryContextDependencies {
  return {
    resolveBubble: dependencies.resolveBubbleById ?? resolveBubbleById,
    readState: dependencies.readStateSnapshot ?? readStateSnapshot,
    writeState: dependencies.writeStateSnapshot ?? writeStateSnapshot,
    appendEnvelope: dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope,
    readTranscript: dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes,
    setMetaReviewerPane:
      dependencies.setMetaReviewerPaneBinding ?? setMetaReviewerPaneBinding,
    readFileFn: requireRecoveryArtifactReadPort(dependencies),
    writeFileFn: requireRecoveryArtifactWritePort(dependencies)
  };
}

function requireRecoveryArtifactReadPort(
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies
): MetaReviewArtifactReadPort {
  if (dependencies.readFile !== undefined) {
    return dependencies.readFile;
  }
  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    "META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery artifact read capability is unavailable."
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
    "META_REVIEW_GATE_TRANSITION_INVALID: meta-review gate recovery artifact write capability is unavailable."
  );
}

export function buildDeactivateMetaReviewerPane(input: {
  setMetaReviewerPane: typeof setMetaReviewerPaneBinding;
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
