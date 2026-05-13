import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import { resolveCanonicalPendingApprovalSignal } from "../../../../shared/approval/pendingApprovalSignal.js";
export {
  resolveReviewVerificationState,
  resolveStatusGateState,
  withAccuracyCriticalVerificationGate
} from "./statusCommandGateState.js";
export type { StatusGateStateDependencies } from "./statusCommandGateState.js";
export { toStatusCommandPathView } from "../view/statusCommandPathView.js";
export type {
  BubbleStatusState,
  ResolvedBubbleStatusContext,
  StatusGateState
} from "../../../../shared/status/statusCommandTypes.js";
import type {
  BubbleStatusState,
  ResolvedBubbleStatusContext
} from "../../../../shared/status/statusCommandTypes.js";
import type { InspectedStateSnapshot } from "../../../../ports/stateSnapshots.js";
import type { ReadTranscriptEnvelopesPort } from "../../../../ports/transcript.js";

export interface StatusTranscriptDataDependencies {
  inspectStateSnapshot: (
    statePath: string
  ) => Promise<InspectedStateSnapshot>;
  readTranscriptEnvelopes: ReadTranscriptEnvelopesPort;
}

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
  resolved: ResolvedBubbleStatusContext,
  dependencies: StatusTranscriptDataDependencies
): Promise<{
  state: BubbleStatusState;
  stateValidation: InspectedStateSnapshot["stateValidation"] | null;
  transcript: ProtocolEnvelope[];
  inbox: ProtocolEnvelope[];
}> {
  const [loadedState, transcript, inbox] = await Promise.all([
    dependencies.inspectStateSnapshot(resolved.bubblePaths.statePath),
    dependencies.readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }),
    dependencies.readTranscriptEnvelopes(resolved.bubblePaths.inboxPath, {
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
