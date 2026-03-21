import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveCanonicalPendingApprovalSignal } from "../../../core/bubble/pendingApprovalSignal.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
export {
  resolveReviewVerificationState,
  resolveStatusGateState,
  withAccuracyCriticalVerificationGate
} from "./statusCommandGateState.js";
export { toStatusCommandPathView } from "./statusCommandPathView.js";
export type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "./statusCommandTypes.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext
} from "./statusCommandTypes.js";

export function countPendingHumanQuestions(envelopes: ProtocolEnvelope[]): number {
  let pending = 0;
  for (const envelope of envelopes) {
    if (envelope.type === "HUMAN_QUESTION") {
      pending += 1;
      continue;
    }
    if (envelope.type === "HUMAN_REPLY") {
      // Defensive clamp: inbox events are append-only in normal flow, but if logs
      // are edited/reordered manually we still keep pending count non-negative.
      pending = Math.max(0, pending - 1);
    }
  }
  return pending;
}

export function resolvePendingApprovalCount(
  resolved: ResolvedBubbleStatusContext,
  state: BubbleStatusState,
  inbox: ProtocolEnvelope[]
): number {
  return resolveCanonicalPendingApprovalSignal({
    bubbleId: resolved.bubbleId,
    state: state.state,
    round: state.round,
    metaReview: state.meta_review,
    envelopes: inbox
  }) === undefined
    ? 0
    : 1;
}

export async function readStatusTranscriptData(
  resolved: ResolvedBubbleStatusContext
): Promise<{
  state: BubbleStatusState;
  transcript: ProtocolEnvelope[];
  inbox: ProtocolEnvelope[];
}> {
  const [{ state }, transcript, inbox] = await Promise.all([
    readStateSnapshot(resolved.bubblePaths.statePath),
    readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }),
    readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    })
  ]);
  return { state, transcript, inbox };
}
