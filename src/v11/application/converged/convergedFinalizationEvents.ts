import { type assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { type emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import {
  buildConvergedEventMetadata,
  buildMetaReviewRoutedMetadata
} from "./convergedFinalizationMetadata.js";
import type {
  FinalizeConvergedFlowInput,
  FinalizeConvergedFlowResult
} from "./convergedFinalizationTypes.js";

function resolveAdvisoryFindingsOpenTotal(
  convergenceEnvelope: FinalizeConvergedFlowInput["convergence"]["envelope"]
): number {
  const payload =
    typeof convergenceEnvelope.payload === "object" &&
    convergenceEnvelope.payload !== null
      ? convergenceEnvelope.payload
      : null;
  if (payload === null) {
    return 0;
  }

  const metadata = payload.metadata;
  let metadataCount: number | null = null;
  if (typeof metadata === "object" && metadata !== null) {
    const candidate = (metadata as Record<string, unknown>).advisory_findings_open_total;
    if (typeof candidate === "number") {
      metadataCount = candidate;
    }
  }
  if (
    metadataCount !== null &&
    Number.isInteger(metadataCount) &&
    metadataCount >= 0
  ) {
    return metadataCount;
  }

  return 0;
}

async function emitConvergedAndRoutedEvents(input: {
  flow: FinalizeConvergedFlowInput;
  emitLifecycle: typeof emitBubbleLifecycleEventBestEffort;
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  blockingReasonCodes: string[];
}): Promise<void> {
  const advisoryFindingsOpenTotal = resolveAdvisoryFindingsOpenTotal(
    input.flow.convergence.envelope
  );

  await input.emitLifecycle({
    repoPath: input.flow.resolved.repoPath,
    bubbleId: input.flow.resolved.bubbleId,
    bubbleInstanceId: input.flow.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_converged",
    round: input.flow.state.round,
    actorRole: "reviewer",
    metadata: buildConvergedEventMetadata({
      summary: input.flow.summary,
      refs: input.flow.refs,
      advisoryFindingsOpenTotal,
      convergenceEnvelopeId: input.flow.convergence.envelope.id,
      gateResult: input.flow.gateResult,
      commandPathStatus: input.commandPathStatus,
      blockingReasonCodes: input.blockingReasonCodes,
      summaryVerifierGateDecision: input.flow.summaryVerifierGateDecision,
      specLockState: input.flow.specLockState,
      roundGateState: input.flow.roundGateState,
      ...(input.flow.docGateArtifactReadFailureReason !== undefined
        ? { docGateArtifactReadFailureReason: input.flow.docGateArtifactReadFailureReason }
        : {})
    }),
    now: input.flow.now
  });

  await input.emitLifecycle({
    repoPath: input.flow.resolved.repoPath,
    bubbleId: input.flow.resolved.bubbleId,
    bubbleInstanceId: input.flow.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_meta_review_routed",
    round: input.flow.state.round,
    actorRole: "reviewer",
    metadata: buildMetaReviewRoutedMetadata({
      advisoryFindingsOpenTotal,
      gateResult: input.flow.gateResult,
      blockingReasonCodes: input.blockingReasonCodes,
      commandPathStatus: input.commandPathStatus
    }),
    now: input.flow.now
  });
}

async function emitOptionalMetaReviewEvents(input: {
  flow: FinalizeConvergedFlowInput;
  emitLifecycle: typeof emitBubbleLifecycleEventBestEffort;
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  blockingReasonCodes: string[];
}): Promise<void> {
  if (input.flow.gateResult.route === "auto_rework") {
    await input.emitLifecycle({
      repoPath: input.flow.resolved.repoPath,
      bubbleId: input.flow.resolved.bubbleId,
      bubbleInstanceId: input.flow.bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_auto_rework_dispatched",
      round: input.flow.state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: input.flow.gateResult.route,
        rework_target_present:
          (input.flow.gateResult.metaReviewRun?.rework_target_message?.trim().length ?? 0) > 0,
        auto_rework_count: input.flow.gateResult.state.meta_review?.auto_rework_count ?? 0,
        auto_rework_limit: input.flow.gateResult.state.meta_review?.auto_rework_limit ?? 0
      },
      now: input.flow.now
    });
  }

  if (input.flow.gateResult.gateEnvelope.type === "APPROVAL_REQUEST") {
    await input.emitLifecycle({
      repoPath: input.flow.resolved.repoPath,
      bubbleId: input.flow.resolved.bubbleId,
      bubbleInstanceId: input.flow.bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_human_gate_reached",
      round: input.flow.state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: input.flow.gateResult.route,
        recommendation:
          input.flow.gateResult.metaReviewRun?.recommendation ??
          input.flow.gateResult.state.meta_review?.last_autonomous_recommendation ??
          "inconclusive",
        blocking_reason_codes: JSON.stringify(input.blockingReasonCodes)
      },
      now: input.flow.now
    });
  }

  if (input.blockingReasonCodes.length > 0) {
    await input.emitLifecycle({
      repoPath: input.flow.resolved.repoPath,
      bubbleId: input.flow.resolved.bubbleId,
      bubbleInstanceId: input.flow.bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_rollout_blocked",
      round: input.flow.state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: input.flow.gateResult.route,
        blocking_reason_codes: JSON.stringify(input.blockingReasonCodes),
        pairflow_command_path_status: input.commandPathStatus.status
      },
      now: input.flow.now
    });
  }
}

export async function emitConvergedFinalizationEvents(input: {
  flow: FinalizeConvergedFlowInput;
  emitLifecycle: typeof emitBubbleLifecycleEventBestEffort;
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  blockingReasonCodes: string[];
}): Promise<void> {
  await emitConvergedAndRoutedEvents(input);
  await emitOptionalMetaReviewEvents(input);
}

export function buildFinalizeConvergedFlowResult(
  flow: FinalizeConvergedFlowInput
): FinalizeConvergedFlowResult {
  return {
    bubbleId: flow.resolved.bubbleId,
    convergenceSequence: flow.convergence.sequence,
    convergenceEnvelope: flow.convergence.envelope,
    gateRoute: flow.gateResult.route,
    approvalRequestSequence: flow.gateResult.gateSequence,
    approvalRequestEnvelope: flow.gateResult.gateEnvelope,
    state: flow.gateResult.state,
    ...(flow.delivery !== undefined
      ? { delivery: flow.delivery }
      : {})
  };
}
