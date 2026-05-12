import type { applyStateTransition } from "../../../../domain/state/machine.js";
import { clearLiveMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../../../domain/state/roundContinuation.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import { toPersistedSnapshot } from "../../../../domain/state/snapshot/projection.js";
import type {
  BubbleReworkIntentRecord
} from "../../../../domain/state/rework/reworkIntentTypes.js";
import type {
  EmitApprovalDecisionImmediateResult,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkQueuedResult
} from "../../approvalCommandContract.js";

export interface ResolveApprovalNextStateInput {
  state: BubbleStateSnapshot;
  decision: "approve" | "rework";
  nowIso: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  applyStateTransition: typeof applyStateTransition;
}

export function resolveApprovalNextState(
  input: ResolveApprovalNextStateInput
): BubbleStateSnapshot {
  // applyStateTransition is still persisted-shape (later batch). Project
  // at the boundary and rebuild the variant from the output.
  const persistedState = toPersistedSnapshot(input.state);
  if (input.decision === "approve") {
    return buildBubbleStateSnapshotVariant(
      input.applyStateTransition(persistedState, {
        to: "APPROVED_FOR_COMMIT",
        lastCommandAt: input.nowIso
      })
    );
  }

  const continuation = resolveRuntimeAlignedNextRoundContinuation({
    bubbleId: input.state.bubble_id,
    currentRound: input.state.round,
    roundRoleHistory: input.state.round_role_history,
    implementer: input.implementer,
    reviewer: input.reviewer,
    nowIso: input.nowIso,
    watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
  });
  const resumed = input.applyStateTransition(persistedState, {
    to: "RUNNING",
    round: continuation.nextRound,
    activeAgent: continuation.activeAgent,
    activeRole: continuation.activeRole,
    executionContext: continuation.executionContext,
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso,
    ...(continuation.appendRoundRoleEntry !== undefined
      ? { appendRoundRoleEntry: continuation.appendRoundRoleEntry }
      : {})
  });
  return buildBubbleStateSnapshotVariant({
    ...resumed,
    meta_review: clearLiveMetaReviewSnapshot(resumed.meta_review)
  });
}

export function mapImmediateReworkResult(
  immediate: EmitApprovalDecisionImmediateResult
): EmitRequestReworkImmediateResult {
  return {
    ...immediate,
    mode: "immediate"
  };
}

export function mapQueuedReworkResult(input: {
  bubbleId: string;
  state: BubbleStateSnapshot;
  intent: BubbleReworkIntentRecord;
  supersededIntentId?: string | undefined;
}): EmitRequestReworkQueuedResult {
  return {
    mode: "queued",
    bubbleId: input.bubbleId,
    intentId: input.intent.intent_id,
    ...(input.supersededIntentId !== undefined
      ? { supersededIntentId: input.supersededIntentId }
      : {}),
    state: input.state
  };
}
