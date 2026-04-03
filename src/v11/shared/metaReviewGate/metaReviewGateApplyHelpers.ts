import type { appendProtocolEnvelope, AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import { buildMetaReviewSubmitCommandTemplate } from "../../../core/runtime/metaReviewSubmitGuidance.js";
import {
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import {
  deliveryTargetRoleMetadataKey
} from "../../../types/protocol.js";
export { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
export {
  stageMetaReviewRunningState,
  throwMetaReviewRunningStageFailure
} from "./metaReviewGateStateStaging.js";
import {
  buildHumanGateSummary,
  metaReviewerAgent,
  persistHumanGateRoute
} from "./metaReviewGateShared.js";
import type {
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";

export async function appendMetaReviewKickoffEnvelope(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  handoffId: string;
  refs: string[];
}): Promise<AppendProtocolEnvelopeResult> {
  const kickoffSummary = [
    `Meta-review gate opened for bubble ${input.bubbleId} round ${input.round}.`,
    "Submit result through structured CLI:",
    `${buildMetaReviewSubmitCommandTemplate({ bubbleId: input.bubbleId, round: input.round })}.`
  ].join(" ");

  return input.appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: metaReviewerAgent,
      type: "TASK",
      round: input.round,
      payload: {
        summary: kickoffSummary,
        metadata: {
          [deliveryTargetRoleMetadataKey]: "meta_reviewer",
          actor: "meta-review-gate",
          actor_agent: "orchestrator",
          lifecycle_state: "RUNNING",
          meta_review_handoff_id: input.handoffId
        }
      },
      refs: input.refs
    }
  });
}

export async function persistMetaReviewRunFailedRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  convergenceSummary: string;
  fallbackReason: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.statePath,
    transcriptPath: input.transcriptPath,
    inboxPath: input.inboxPath,
    lockPath: input.lockPath,
    now: input.now,
    nowIso: input.nowIso,
    bubbleId: input.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.convergenceSummary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    fallbackRecommendation: "inconclusive",
    targetState: "READY_FOR_HUMAN_APPROVAL",
    stickyHumanGate: false
  });
}
