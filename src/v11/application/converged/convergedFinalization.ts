import { assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { type EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import { type ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import { type SummaryVerifierConsistencyGateDecisionRecord } from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import { type appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { type MetaReviewGateRoute } from "../../shared/metaReviewGate/metaReviewGateCommandContract.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import {
  buildConvergedEventMetadata,
  buildMetaReviewRoutedMetadata
} from "./convergedFinalizationMetadata.js";

type ConvergedDelivery = {
  delivered: boolean;
  reason?: string;
  retried: boolean;
};

export interface FinalizeConvergedFlowInput {
  resolved: ResolvedBubbleWorkspace;
  bubbleIdentity: EnsureBubbleInstanceIdForMutationResult;
  state: BubbleStateSnapshot;
  summary: string;
  refs: string[];
  now: Date;
  convergence: Awaited<ReturnType<typeof appendProtocolEnvelope>>;
  gateResult: {
    route: MetaReviewGateRoute;
    gateSequence: number;
    gateEnvelope: ProtocolEnvelope;
    state: BubbleStateSnapshot;
    metaReviewRun?: {
      status: string;
      recommendation: string;
      warnings?: Array<{ reason_code: string }>;
      rework_target_message?: string | null;
    };
  };
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
  delivery?: ConvergedDelivery;
}

export interface FinalizeConvergedFlowDependencies {
  assessPairflowCommandPath?: typeof assessPairflowCommandPath;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
  resolveMetaReviewRolloutBlockingReasonCodes: (input: {
    gateRoute: MetaReviewGateRoute;
    metaReviewWarnings: Array<{ reason_code: string }>;
    commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  }) => string[];
  activeEntrypoint?: string;
}

export interface FinalizeConvergedFlowResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: ConvergedDelivery;
}

async function emitConvergedAndRoutedEvents(input: {
  flow: FinalizeConvergedFlowInput;
  emitLifecycle: typeof emitBubbleLifecycleEventBestEffort;
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  blockingReasonCodes: string[];
}): Promise<void> {
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

export async function finalizeConvergedFlow(
  input: FinalizeConvergedFlowInput,
  dependencies: FinalizeConvergedFlowDependencies
): Promise<FinalizeConvergedFlowResult> {
  const assessCommandPath =
    dependencies.assessPairflowCommandPath ?? assessPairflowCommandPath;
  const emitLifecycle =
    dependencies.emitBubbleLifecycleEventBestEffort ?? emitBubbleLifecycleEventBestEffort;
  const activeEntrypoint = dependencies.activeEntrypoint ?? process.argv[1];

  const commandPathStatus = assessCommandPath({
    worktreePath: input.resolved.bubblePaths.worktreePath,
    profile: input.resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint
  });
  const blockingReasonCodes = dependencies.resolveMetaReviewRolloutBlockingReasonCodes({
    gateRoute: input.gateResult.route,
    metaReviewWarnings: input.gateResult.metaReviewRun?.warnings ?? [],
    commandPathStatus
  });
  await emitConvergedAndRoutedEvents({
    flow: input,
    emitLifecycle,
    commandPathStatus,
    blockingReasonCodes
  });
  await emitOptionalMetaReviewEvents({
    flow: input,
    emitLifecycle,
    commandPathStatus,
    blockingReasonCodes
  });

  return {
    bubbleId: input.resolved.bubbleId,
    convergenceSequence: input.convergence.sequence,
    convergenceEnvelope: input.convergence.envelope,
    gateRoute: input.gateResult.route,
    approvalRequestSequence: input.gateResult.gateSequence,
    approvalRequestEnvelope: input.gateResult.gateEnvelope,
    state: input.gateResult.state,
    ...(input.delivery !== undefined
      ? { delivery: input.delivery }
      : {})
  };
}
