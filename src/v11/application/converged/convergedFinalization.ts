import { assessPairflowCommandPath } from "../../../core/runtime/pairflowCommand.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { type EnsureBubbleInstanceIdForMutationResult } from "../../../core/bubble/bubbleInstanceId.js";
import { type ResolvedBubbleWorkspace } from "../../../core/bubble/workspaceResolution.js";
import { type SummaryVerifierConsistencyGateDecisionRecord } from "../../../core/reviewer/summaryVerifierConsistencyGate.js";
import { type appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { type MetaReviewGateRoute } from "../metaReviewGate/metaReviewGateCommandContract.js";
import type {
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

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

function buildConvergedEventMetadata(input: {
  summary: string;
  refs: string[];
  convergenceEnvelopeId: string;
  gateResult: FinalizeConvergedFlowInput["gateResult"];
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
  blockingReasonCodes: string[];
  summaryVerifierGateDecision: SummaryVerifierConsistencyGateDecisionRecord;
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  docGateArtifactReadFailureReason?: string;
}): Record<string, unknown> {
  return {
    refs_count: input.refs.length,
    summary_length: Array.from(input.summary).length,
    convergence_envelope_id: input.convergenceEnvelopeId,
    gate_handoff_envelope_id: input.gateResult.gateEnvelope.id,
    gate_handoff_type: input.gateResult.gateEnvelope.type,
    gate_route: input.gateResult.route,
    pairflow_command_path_status: input.commandPathStatus.status,
    pairflow_command_path_local_entrypoint: input.commandPathStatus.localEntrypoint,
    ...(input.commandPathStatus.activeEntrypoint !== null
      ? {
          pairflow_command_path_active_entrypoint:
            input.commandPathStatus.activeEntrypoint
        }
      : {}),
    ...(input.commandPathStatus.reasonCode !== undefined
      ? {
          pairflow_command_path_reason_code: input.commandPathStatus.reasonCode
        }
      : {}),
    meta_review_warning_reason_codes: JSON.stringify(
      (input.gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
    ),
    meta_review_rollout_blocking_reason_codes: JSON.stringify(input.blockingReasonCodes),
    summary_verifier_gate_decision: input.summaryVerifierGateDecision.gate_decision,
    summary_verifier_gate_reason_code: input.summaryVerifierGateDecision.reason_code,
    summary_verifier_gate_claim_classes_detected:
      input.summaryVerifierGateDecision.claim_classes_detected,
    summary_verifier_gate_verifier_status:
      input.summaryVerifierGateDecision.verifier_status,
    summary_verifier_gate_matched_claim_triggers:
      JSON.stringify(input.summaryVerifierGateDecision.matched_claim_triggers),
    spec_lock_state: input.specLockState.state,
    spec_lock_open_blocker_count: input.specLockState.open_blocker_count,
    spec_lock_open_required_now_count: input.specLockState.open_required_now_count,
    round_gate_applies: input.roundGateState.applies,
    round_gate_violated: input.roundGateState.violated,
    ...(input.roundGateState.reason_code !== undefined
      ? { round_gate_reason_code: input.roundGateState.reason_code }
      : {}),
    ...(input.summaryVerifierGateDecision.verifier_origin_reason !== undefined
      ? {
          summary_verifier_gate_verifier_origin_reason:
            input.summaryVerifierGateDecision.verifier_origin_reason
        }
      : {}),
    ...(input.docGateArtifactReadFailureReason !== undefined
      ? {
          doc_gate_artifact_read_failed: true,
          doc_gate_artifact_read_failure_reason: input.docGateArtifactReadFailureReason
        }
      : {})
  };
}

function buildMetaReviewRoutedMetadata(input: {
  gateResult: FinalizeConvergedFlowInput["gateResult"];
  blockingReasonCodes: string[];
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
}): Record<string, unknown> {
  return {
    gate_route: input.gateResult.route,
    gate_handoff_type: input.gateResult.gateEnvelope.type,
    recommendation:
      input.gateResult.metaReviewRun?.recommendation ??
      input.gateResult.state.meta_review?.last_autonomous_recommendation ??
      "inconclusive",
    run_status:
      input.gateResult.metaReviewRun?.status ??
      input.gateResult.state.meta_review?.last_autonomous_status ??
      "inconclusive",
    warning_reason_codes: JSON.stringify(
      (input.gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
    ),
    blocking_reason_codes: JSON.stringify(input.blockingReasonCodes),
    pairflow_command_path_status: input.commandPathStatus.status,
    ...(input.commandPathStatus.reasonCode !== undefined
      ? {
          pairflow_command_path_reason_code: input.commandPathStatus.reasonCode
        }
      : {})
  };
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
