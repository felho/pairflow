import { handleRecoveryAutoReworkRoute } from "./metaReviewGateRecoveryAutoRework.js";
import {
  assertRecoveredRunResolutionConsistency,
  initializeRecoverMetaReviewExecutionContext,
  type RecoverMetaReviewExecutionContext,
  persistRecoveryDispatchFailedHumanRoute,
  persistRecoveryResolvedHumanRoute,
  persistRecoveryRunFailedHumanRoute,
  resolveRecoveredRunResolution,
  resolveRecoveryParityRouting
} from "./metaReviewGateRecoveryContext.js";
import { requireRecoverableMetaReviewExecutionContext } from "./metaReviewGateRecoveryContextHelpers.js";
import {
  metaReviewerAgent
} from "./metaReviewGateShared.js";
import { rethrowAfterMetaReviewerPaneDeactivation } from "./metaReviewGateRecoveryContextHelpers.js";
import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../types/protocol.js";
import {
  MetaReviewGateError,
  type MetaReviewGateResult,
  type RecoverMetaReviewGateFromSnapshotDependencies,
  type RecoverMetaReviewGateFromSnapshotInput
} from "./metaReviewGateTypes.js";
import type { BubbleExecutionContext } from "../../../types/bubble.js";

const metaReviewHandoffIdMetadataKey = "meta_review_handoff_id";

function isMetaReviewKickoffEnvelope(input: {
  envelope: ProtocolEnvelope;
  round: number;
}): boolean {
  const metadata = input.envelope.payload.metadata;
  return (
    input.envelope.type === "TASK" &&
    input.envelope.sender === "orchestrator" &&
    input.envelope.recipient === metaReviewerAgent &&
    input.envelope.round === input.round &&
    metadata?.actor === "meta-review-gate" &&
    metadata?.actor_agent === "orchestrator" &&
    metadata?.lifecycle_state === "RUNNING" &&
    metadata?.[deliveryTargetRoleMetadataKey] === "meta_reviewer"
  );
}

async function resolveLatestKickoffEnvelopeForSnapshotReplay(
  context: RecoverMetaReviewExecutionContext,
  executionContext: BubbleExecutionContext
): Promise<{ envelope: MetaReviewGateResult["gateEnvelope"]; sequence: number } | null> {
  const transcript = await context.readTranscript(
    context.resolved.bubblePaths.transcriptPath,
    {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }
  );
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index]!;
    if (!isMetaReviewKickoffEnvelope({ envelope, round: executionContext.round })) {
      continue;
    }
    const handoffId = envelope.payload.metadata?.[metaReviewHandoffIdMetadataKey];
    if (
      typeof handoffId === "string" &&
      handoffId === executionContext.handoff_id
    ) {
      return {
        envelope,
        sequence: index + 1
      };
    }
  }
  return null;
}

export async function recoverMetaReviewGateFromSnapshot(
  input: RecoverMetaReviewGateFromSnapshotInput,
  dependencies: RecoverMetaReviewGateFromSnapshotDependencies = {}
): Promise<MetaReviewGateResult> {
  let context: RecoverMetaReviewExecutionContext | null = null;
  try {
    context = await initializeRecoverMetaReviewExecutionContext(
      input,
      dependencies
    );
    const executionContext = requireRecoverableMetaReviewExecutionContext(
      context.loaded
    );
    const deadlineAtMs = Date.parse(executionContext.deadline_at);
    const isBeforeDeadline =
      Number.isFinite(deadlineAtMs) &&
      context.now.getTime() < deadlineAtMs;
    const runResolution = await resolveRecoveredRunResolution({
      context,
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      ...(input.summary !== undefined ? { requestedSummary: input.summary } : {})
    });

    assertRecoveredRunResolutionConsistency({
      ...(input.runResult !== undefined ? { requestedRunResult: input.runResult } : {}),
      snapshotHasCanonicalSubmitInActiveWindow:
        runResolution.snapshotHasCanonicalSubmitInActiveWindow,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });

    if (
      input.runResult === undefined &&
      !runResolution.snapshotHasCanonicalSubmitInActiveWindow &&
      isBeforeDeadline
    ) {
      // Before canonical submit exists, recovery may only replay the persisted
      // kickoff route for the active execution window.
      const kickoff = await resolveLatestKickoffEnvelopeForSnapshotReplay(
        context,
        executionContext
      );
      if (kickoff === null) {
        throw new MetaReviewGateError(
          "META_REVIEW_GATE_TRANSITION_INVALID",
          `META_REVIEW_GATE_TRANSITION_INVALID: active meta-review recovery could not locate kickoff envelope before deadline (round=${executionContext.round}; handoff_id=${executionContext.handoff_id}).`
        );
      }
      return {
        bubbleId: context.resolved.bubbleId,
        route: "meta_review_running",
        gateSequence: kickoff.sequence,
        gateEnvelope: kickoff.envelope,
        state: context.loaded.state
      };
    }

    if (runResolution.runResult.status === "error") {
      return context.finishWithPaneDeactivation(
        await persistRecoveryRunFailedHumanRoute({
          context,
          summary: runResolution.summary,
          runResult: runResolution.runResult
        })
      );
    }

    const parityResolution = await resolveRecoveryParityRouting({
      context,
      snapshot: runResolution.snapshot,
      runResult: runResolution.runResult
    });
    if (!parityResolution.ok) {
      return context.finishWithPaneDeactivation(
        await persistRecoveryDispatchFailedHumanRoute({
          context,
          summary: runResolution.summary,
          fallbackReason:
            `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parityResolution.reason}`,
          loaded: context.loaded,
          expectedState: "RUNNING",
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    if (
      runResolution.runResult.recommendation === "rework" &&
      parityResolution.budgetAvailable
    ) {
      return context.finishWithPaneDeactivation(
        await handleRecoveryAutoReworkRoute({
          context,
          snapshot: runResolution.snapshot,
          summary: runResolution.summary,
          runResultForRouting: parityResolution.runResultForRouting,
          parityMetadata: parityResolution.parityMetadata
        })
      );
    }

    return context.finishWithPaneDeactivation(
      await persistRecoveryResolvedHumanRoute({
        context,
        summary: runResolution.summary,
        runResultForRouting: parityResolution.runResultForRouting,
        recommendation: runResolution.runResult.recommendation,
        budgetAvailable: parityResolution.budgetAvailable,
        parityMetadata: parityResolution.parityMetadata
      })
    );
  } catch (error) {
    if (context === null) {
      throw error;
    }
    return rethrowAfterMetaReviewerPaneDeactivation({
      error,
      deactivateMetaReviewerPane: context.deactivateMetaReviewerPane,
      failureContext: "recovery failed"
    });
  }
}
