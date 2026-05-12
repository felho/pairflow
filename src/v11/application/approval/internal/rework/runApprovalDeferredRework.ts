import type { QueueDeferredReworkIntentResult } from "./reworkIntentQueue.js";
import type { ResolvedApprovalCommandDependencies } from "../command/approvalCommandDependencies.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { persistDomainStateViaMutationBoundary } from "../../../../shared/mutation/mutationBoundaryIO.js";

export async function persistDeferredReworkIntentState(input: {
  queued: QueueDeferredReworkIntentResult;
  loadedFingerprint: string;
  statePath: string;
  writeStateSnapshot: ResolvedApprovalCommandDependencies["writeStateSnapshot"];
  createError: PairflowCreateCommandError;
}): Promise<Awaited<ReturnType<ResolvedApprovalCommandDependencies["writeStateSnapshot"]>>> {
  try {
    // queued.state is still persisted-shape (deriveQueuedDeferredReworkIntentState
    // is a later batch). Wrap into the variant before crossing the
    // domain-variant write port.
    return await persistDomainStateViaMutationBoundary({
      write: input.writeStateSnapshot,
      statePath: input.statePath,
      state: buildBubbleStateSnapshotVariant(input.queued.state),
      options: {
        expectedFingerprint: input.loadedFingerprint,
        expectedState: "WAITING_HUMAN"
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw input.createError({
      reasonCode: "DEFERRED_REWORK_STATE_PERSIST_FAILED",
      message:
        `Deferred rework intent ${input.queued.intent.intent_id} was queued in-memory but state update failed.`,
      context: {
        command_name: "approval",
        intent_id: input.queued.intent.intent_id
      },
      cause: reason
    });
  }
}

export async function emitDeferredReworkIntentLifecycleEvents(input: {
  dependencies: Pick<ResolvedApprovalCommandDependencies, "emitBubbleLifecycleEventBestEffort">;
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  round: number;
  stateAtRequest: string;
  refsCount: number;
  message: string;
  now: Date;
  queued: QueueDeferredReworkIntentResult;
}): Promise<void> {
  await input.dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType: "rework_intent_queued",
    round: input.round,
    actorRole: "human",
    metadata: {
      intent_id: input.queued.intent.intent_id,
      requested_by: input.queued.intent.requested_by,
      requested_at: input.queued.intent.requested_at,
      state_at_request: input.stateAtRequest,
      refs_count: input.refsCount,
      message_length: Array.from(input.message).length
    },
    now: input.now
  });

  if (input.queued.supersededIntentId === undefined) {
    return;
  }

  await input.dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType: "rework_intent_superseded",
    round: input.round,
    actorRole: "human",
    metadata: {
      intent_id: input.queued.supersededIntentId,
      superseded_by_intent_id: input.queued.intent.intent_id,
      requested_by: input.queued.intent.requested_by,
      requested_at: input.queued.intent.requested_at,
      state_at_request: input.stateAtRequest
    },
    now: input.now
  });
}
