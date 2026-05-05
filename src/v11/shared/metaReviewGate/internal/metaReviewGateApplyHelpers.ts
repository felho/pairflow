import type {
  AppendProtocolEnvelopePort,
  AppendProtocolEnvelopeResult
} from "../../ports/transcript.js";
import type { AgentName } from "../../../../types/bubble.js";
import { buildMetaReviewSubmitCommandTemplate } from "../../metaReview/metaReviewSubmitGuidance.js";
import {
  type LoadedStateSnapshot,
  type WriteStateSnapshotPort
} from "../../ports/stateSnapshots.js";
import {
  deliveryTargetRoleMetadataKey
} from "../../../../types/protocol.js";
export {
  stageMetaReviewRunningState,
  throwMetaReviewRunningStageFailure
} from "./metaReviewGateStateStaging.js";
import {
  buildHumanGateSummary,
  persistHumanGateRoute
} from "./metaReviewGateShared.js";
import type { MetaReviewGateResult } from "../metaReviewGateTypes.js";

export async function appendMetaReviewKickoffEnvelope(input: {
  appendEnvelope: AppendProtocolEnvelopePort;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  handoffId: string;
  metaReviewerAgent: AgentName;
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
      recipient: input.metaReviewerAgent,
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
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  metaReviewerAgent: AgentName;
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
    metaReviewerAgent: input.metaReviewerAgent,
    loaded: input.loaded,
    expectedState: "RUNNING",
    route: "human_gate_run_failed",
    fallbackRecommendation: "inconclusive",
    targetState: "READY_FOR_HUMAN_APPROVAL",
    stickyHumanGate: false
  });
}
