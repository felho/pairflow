import { statusCommandDependencyDefaults } from "./statusCommandDependencyDefaults.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import { resolveCanonicalPendingApprovalSignal } from "../approval/pendingApprovalSignal.js";
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
  _resolved: ResolvedBubbleStatusContext,
  state: BubbleStatusState,
  inbox: ProtocolEnvelope[]
): number {
  return resolveCanonicalPendingApprovalSignal({
    round: state.round,
    envelopes: inbox
  }) === undefined
    ? 0
    : 1;
}

export async function readStatusTranscriptData(
  resolved: ResolvedBubbleStatusContext
): Promise<{
  state: BubbleStatusState;
  stateValidation:
    | Awaited<
        ReturnType<typeof statusCommandDependencyDefaults.inspectStateSnapshot>
      >["stateValidation"]
    | null;
  transcript: ProtocolEnvelope[];
  inbox: ProtocolEnvelope[];
}> {
  const [loadedState, transcript, inbox] = await Promise.all([
    statusCommandDependencyDefaults.inspectStateSnapshot(resolved.bubblePaths.statePath),
    statusCommandDependencyDefaults.readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }),
    statusCommandDependencyDefaults.readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    })
  ]);
  return {
    state: loadedState.state,
    stateValidation: loadedState.stateValidation,
    transcript,
    inbox
  };
}
