import type { BubbleMetaReviewSnapshotState } from "../../../types/bubble.js";
import { deliveryTargetRoleMetadataKey, type FindingsParityMetadata } from "../../../types/protocol.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import { StateStoreConflictError } from "../../infrastructure/state/stateStore.js";
import {
  resolveFindingsParityMetadataForEnvelope,
  toConflictError,
  toTransitionError
} from "./metaReviewGateShared.js";
import { MetaReviewGateError, type MetaReviewGateResult } from "./metaReviewGateTypes.js";
import {
  type RecoverMetaReviewExecutionContext,
  persistRecoveryDispatchFailedHumanRoute
} from "./metaReviewGateRecoveryContext.js";
import {
  persistAutoReworkCounterAfterRecoveryDispatch,
  restoreHumanGateAfterDispatchFailure,
  transitionRecoveryToRunningForAutoRework
} from "./metaReviewGateRecoveryAutoReworkState.js";

export async function handleRecoveryAutoReworkRoute(input: {
  context: RecoverMetaReviewExecutionContext;
  snapshot: BubbleMetaReviewSnapshotState;
  summary: string;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<MetaReviewGateResult> {
  if (input.snapshot.sticky_human_gate) {
    throw new MetaReviewGateError(
      "META_REVIEW_GATE_STATE_CONFLICT",
      "META_REVIEW_GATE_STATE_CONFLICT: sticky_human_gate became true before auto rework dispatch.",
      {
        stageReasonCode: "META_REVIEW_GATE_STATE_CONFLICT"
      }
    );
  }

  const reworkMessage = input.runResultForRouting.rework_target_message;
  if (reworkMessage === null || reworkMessage.trim().length === 0) {
    return persistRecoveryDispatchFailedHumanRoute({
      context: input.context,
      summary: input.summary,
      fallbackReason:
        "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: missing rework target message for autonomous dispatch",
      loaded: input.context.loaded,
      expectedState: "RUNNING",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      rollbackStateOnAppendFailure: input.context.loaded.state
    });
  }

  const resumedWritten = await transitionRecoveryToRunningForAutoRework({
    context: input.context,
    loaded: input.context.loaded
  }).catch((error: unknown) => {
    if (error instanceof StateStoreConflictError) {
      throw toConflictError(error);
    }
    throw toTransitionError(error);
  });

  let dispatched;
  try {
    dispatched = await input.context.appendEnvelope({
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      mirrorPaths: [input.context.resolved.bubblePaths.inboxPath],
      lockPath: input.context.lockPath,
      now: input.context.now,
      envelope: {
        bubble_id: input.context.resolved.bubbleId,
        sender: "orchestrator",
        recipient: input.context.resolved.bubbleConfig.agents.implementer,
        type: "APPROVAL_DECISION",
        round: input.context.loaded.state.round,
        payload: {
          decision: "rework",
          message: reworkMessage,
          metadata: {
            [deliveryTargetRoleMetadataKey]: "implementer",
            actor: "meta-reviewer",
            actor_agent: "codex",
            recommendation: input.runResultForRouting.recommendation,
            ...(input.runResultForRouting.run_id !== undefined
              ? { run_id: input.runResultForRouting.run_id }
              : {}),
            ...resolveFindingsParityMetadataForEnvelope(input.parityMetadata)
          }
        },
        refs: input.context.refs
      }
    });
  } catch (error) {
    const appendReason = error instanceof Error ? error.message : String(error);
    const restored = await restoreHumanGateAfterDispatchFailure({
      context: input.context,
      loaded: input.context.loaded,
      resumedWritten,
      runResultForRouting: input.runResultForRouting,
      appendReason
    });
    return persistRecoveryDispatchFailedHumanRoute({
      context: input.context,
      summary: input.summary,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: append_error=${appendReason}; ${restored.restoreOutcome}`,
      loaded: restored.readyForHumanApproval,
      expectedState: "READY_FOR_HUMAN_APPROVAL",
      runResultForRouting: input.runResultForRouting,
      parityMetadata: input.parityMetadata,
      rollbackStateOnAppendFailure: restored.readyForHumanApproval.state
    });
  }

  const written = await persistAutoReworkCounterAfterRecoveryDispatch({
    context: input.context,
    snapshot: input.snapshot,
    resumedWritten,
    runResultForRouting: input.runResultForRouting
  });

  return {
    bubbleId: input.context.resolved.bubbleId,
    route: "auto_rework",
    gateSequence: dispatched.sequence,
    gateEnvelope: dispatched.envelope,
    state: written.state,
    metaReviewRun: input.runResultForRouting
  };
}
