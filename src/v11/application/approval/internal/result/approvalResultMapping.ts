import type { applyStateTransition } from "../../../../domain/state/machine.js";
import { clearLiveMetaReviewSnapshot } from "../../../../shared/metaReview/metaReviewSnapshot.js";
import {
  resolveRuntimeAlignedNextRoundContinuation
} from "../../../../domain/state/roundContinuation.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type {
  BubbleReworkIntentRecord
} from "../../../../domain/state/rework/reworkIntentTypes.js";
import type {
  EmitApprovalDecisionImmediateResult,
  EmitRequestReworkImmediateResult,
  EmitRequestReworkQueuedResult
} from "../../approvalCommandContract.js";

export interface ResolveApprovalNextStateInput {
  state: PersistedBubbleStateSnapshot;
  decision: "approve" | "rework";
  nowIso: string;
  implementer: AgentName;
  reviewer: AgentName;
  watchdogTimeoutMinutes: number;
  applyStateTransition: typeof applyStateTransition;
}

export function resolveApprovalNextState(
  input: ResolveApprovalNextStateInput
): PersistedBubbleStateSnapshot {
  if (input.decision === "approve") {
    return input.applyStateTransition(input.state, {
      to: "APPROVED_FOR_COMMIT",
      lastCommandAt: input.nowIso
    });
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
  const resumed = input.applyStateTransition(input.state, {
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
  return {
    ...resumed,
    meta_review: clearLiveMetaReviewSnapshot(resumed.meta_review)
  };
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
  state: PersistedBubbleStateSnapshot;
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
