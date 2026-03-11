import { join } from "node:path";

import { appendProtocolEnvelope, readTranscriptEnvelopes } from "../protocol/transcriptStore.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { validateConvergencePolicy } from "../convergence/policy.js";
import { normalizeStringList, requireNonEmptyString } from "../util/normalize.js";
import {
  resolveBubbleFromWorkspaceCwd,
  WorkspaceResolutionError
} from "../bubble/workspaceResolution.js";
import { emitBubbleNotification } from "../runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  type EmitTmuxDeliveryNotificationResult
} from "../runtime/tmuxDelivery.js";
import { assessPairflowCommandPath } from "../runtime/pairflowCommand.js";
import { ensureBubbleInstanceIdForMutation } from "../bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import { readReviewVerificationArtifactStatus } from "../reviewer/reviewVerification.js";
import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirective
} from "../reviewer/testEvidence.js";
import {
  evaluateSummaryVerifierConsistencyGate,
  resolveSummaryVerifierConsistencyGateArtifactPath,
  summaryVerifierConsistencyGateSchemaVersion,
  writeSummaryVerifierConsistencyGateArtifact
} from "../reviewer/summaryVerifierConsistencyGate.js";
import {
  isDocContractGateScopeActive,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath
} from "../gates/docContractGates.js";
import {
  applyMetaReviewGateOnConvergence,
  recoverMetaReviewGateFromSnapshot,
  toMetaReviewGateError,
  type MetaReviewGateRoute
} from "../bubble/metaReviewGate.js";
import type {
  AgentName,
  BubbleRoundGateState,
  BubbleSpecLockState,
  BubbleStateSnapshot
} from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface EmitConvergedInput {
  summary: string;
  refs?: string[];
  cwd?: string;
  now?: Date;
  expectedStateFingerprint?: string;
  expectedRound?: number;
  expectedReviewer?: AgentName;
}

export interface EmitConvergedDependencies {
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  applyMetaReviewGateOnConvergence?: typeof applyMetaReviewGateOnConvergence;
  recoverMetaReviewGateFromSnapshot?: typeof recoverMetaReviewGateFromSnapshot;
}

export interface EmitConvergedResult {
  bubbleId: string;
  convergenceSequence: number;
  convergenceEnvelope: ProtocolEnvelope;
  gateRoute: MetaReviewGateRoute;
  approvalRequestSequence: number;
  approvalRequestEnvelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  delivery?: {
    delivered: boolean;
    reason?: string;
    retried: boolean;
  };
}

export class ConvergedCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ConvergedCommandError";
  }
}

export function resolveMetaReviewRolloutBlockingReasonCodes(input: {
  gateRoute: MetaReviewGateRoute;
  metaReviewWarnings: Array<{ reason_code: string }>;
  commandPathStatus: ReturnType<typeof assessPairflowCommandPath>;
}): string[] {
  const codes = new Set<string>();

  if (input.gateRoute === "human_gate_run_failed") {
    codes.add("META_REVIEW_GATE_RUN_FAILED");
  }
  if (input.gateRoute === "human_gate_dispatch_failed") {
    codes.add("META_REVIEW_GATE_REWORK_DISPATCH_FAILED");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "stale"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_STALE");
  }
  if (
    input.commandPathStatus.profile === "self_host"
    && input.commandPathStatus.status === "unknown"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_PATH_UNRESOLVED"
  ) {
    codes.add("PAIRFLOW_COMMAND_PATH_UNRESOLVED");
  }
  if (
    input.commandPathStatus.profile === "external"
    && input.commandPathStatus.reasonCode === "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"
  ) {
    codes.add("PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE");
  }
  for (const warning of input.metaReviewWarnings) {
    if (warning.reason_code === "META_REVIEW_RUNNER_ERROR") {
      codes.add("META_REVIEW_RUNNER_ERROR");
    }
  }

  return [...codes].sort((left, right) => left.localeCompare(right));
}

function assertReviewerContext(
  state: BubbleStateSnapshot,
  configuredReviewer: AgentName
): void {
  if (state.state !== "RUNNING") {
    throw new ConvergedCommandError(
      `converged can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    throw new ConvergedCommandError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    throw new ConvergedCommandError(
      "RUNNING state is missing active agent context; cannot validate convergence."
    );
  }

  if (state.active_role !== "reviewer") {
    throw new ConvergedCommandError(
      `converged may only be invoked by the active reviewer (active role: ${state.active_role}).`
    );
  }

  if (state.active_agent !== configuredReviewer) {
    throw new ConvergedCommandError(
      `Active reviewer must be configured reviewer agent (${configuredReviewer}).`
    );
  }
}

export async function emitConvergedFromWorkspace(
  input: EmitConvergedInput,
  dependencies: EmitConvergedDependencies = {}
): Promise<EmitConvergedResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    (message) => new ConvergedCommandError(message)
  );
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleFromWorkspaceCwd(input.cwd);
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  if (
    input.expectedStateFingerprint !== undefined
    && loadedState.fingerprint !== input.expectedStateFingerprint
  ) {
    throw new ConvergedCommandError(
      "Convergence validation failed: AUTO_CONVERGE_STATE_STALE: state changed before converged transition."
    );
  }
  const state = loadedState.state;
  if (input.expectedRound !== undefined && state.round !== input.expectedRound) {
    throw new ConvergedCommandError(
      `Convergence validation failed: AUTO_CONVERGE_STATE_STALE: expected round ${input.expectedRound}, got ${state.round}.`
    );
  }
  if (
    input.expectedReviewer !== undefined
    && state.active_role === "reviewer"
    && state.active_agent !== input.expectedReviewer
  ) {
    throw new ConvergedCommandError(
      `Convergence validation failed: AUTO_CONVERGE_STATE_STALE: expected reviewer ${input.expectedReviewer}, got ${String(state.active_agent)}.`
    );
  }

  const { implementer, reviewer } = resolved.bubbleConfig.agents;
  assertReviewerContext(state, reviewer);

  const transcript = await readTranscriptEnvelopes(resolved.bubblePaths.transcriptPath, {
    allowMissing: true,
    toleratePartialFinalLine: true
  });
  const policy = validateConvergencePolicy({
    currentRound: state.round,
    reviewer,
    implementer,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    roundRoleHistory: state.round_role_history,
    transcript,
    severity_gate_round: resolved.bubbleConfig.severity_gate_round
  });
  if (!policy.ok) {
    throw new ConvergedCommandError(
      `Convergence validation failed: ${policy.errors.join(" ")}`
    );
  }

  const docGateScopeActive = isDocContractGateScopeActive({
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type
  });
  const defaultSpecLockState: BubbleSpecLockState = {
    state: "IMPLEMENTABLE" as const,
    open_blocker_count: 0,
    open_required_now_count: 0
  };
  const defaultRoundGateState: BubbleRoundGateState = {
    applies: false,
    violated: false,
    round: state.round
  };
  let gateArtifact: Awaited<ReturnType<typeof readDocContractGateArtifact>> | undefined;
  let docGateArtifactReadFailureReason: string | undefined;
  if (docGateScopeActive) {
    try {
      gateArtifact = await readDocContractGateArtifact(
        resolveDocContractGateArtifactPath(resolved.bubblePaths.artifactsDir)
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      docGateArtifactReadFailureReason = reason;
      gateArtifact = undefined;
    }
  }
  const specLockState = docGateScopeActive
    ? gateArtifact?.spec_lock_state ?? defaultSpecLockState
    : defaultSpecLockState;
  const roundGateState = docGateScopeActive
    ? gateArtifact?.round_gate_state ?? defaultRoundGateState
    : defaultRoundGateState;

  if (resolved.bubbleConfig.accuracy_critical === true) {
    const verification = await readReviewVerificationArtifactStatus(
      resolved.bubblePaths.reviewVerificationArtifactPath,
      {
        expectedRound: state.round,
        expectedReviewer: reviewer
      }
    );
    if (verification.status !== "pass") {
      throw new ConvergedCommandError(
        `Convergence validation failed: accuracy-critical review verification must be pass (current: ${verification.status}).`
      );
    }
  }

  const reviewerTestDirective = await resolveReviewerTestExecutionDirective({
    artifactPath: resolveReviewerTestEvidenceArtifactPath(resolved.bubblePaths.artifactsDir),
    worktreePath: resolved.bubblePaths.worktreePath
  }).catch(() => ({
    skip_full_rerun: false,
    reason_code: "evidence_unverifiable" as const,
    reason_detail:
      "Failed to resolve reviewer test directive due to verification runtime error.",
    verification_status: "untrusted" as const
  }));
  const summaryVerifierGateDecision = evaluateSummaryVerifierConsistencyGate({
    summary,
    reviewArtifactType: resolved.bubbleConfig.review_artifact_type,
    verifierStatus: reviewerTestDirective.verification_status,
    ...(reviewerTestDirective.verification_status === "trusted"
      ? {}
      : { verifierOriginReason: reviewerTestDirective.reason_code })
  });
  const summaryVerifierGateArtifactPath = resolveSummaryVerifierConsistencyGateArtifactPath(
    resolved.bubblePaths.artifactsDir
  );
  try {
    await writeSummaryVerifierConsistencyGateArtifact(summaryVerifierGateArtifactPath, {
      schema_version: summaryVerifierConsistencyGateSchemaVersion,
      bubble_id: resolved.bubbleId,
      round: state.round,
      evaluated_at: nowIso,
      ...summaryVerifierGateDecision
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConvergedCommandError(
      `Convergence validation failed: summary/verifier consistency gate audit write failed. Root error: ${reason}`
    );
  }
  if (summaryVerifierGateDecision.gate_decision === "block") {
    throw new ConvergedCommandError(
      `Convergence validation failed: docs-only summary/verifier consistency gate blocked approval summary (reason_code=${summaryVerifierGateDecision.reason_code}, claim_classes_detected=${summaryVerifierGateDecision.claim_classes_detected}, verifier_status=${summaryVerifierGateDecision.verifier_status}, verifier_origin_reason=${summaryVerifierGateDecision.verifier_origin_reason ?? "unknown"}).`
    );
  }

  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const convergence = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: reviewer,
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: state.round,
      payload: {
        summary
      },
      refs
    }
  });
  const applyGate =
    dependencies.applyMetaReviewGateOnConvergence ?? applyMetaReviewGateOnConvergence;
  const recoverGate =
    dependencies.recoverMetaReviewGateFromSnapshot ?? recoverMetaReviewGateFromSnapshot;
  let gateResult: Awaited<ReturnType<typeof applyMetaReviewGateOnConvergence>>;
  try {
    gateResult = await applyGate({
      bubbleId: resolved.bubbleId,
      summary,
      refs,
      repoPath: resolved.repoPath,
      cwd: resolved.bubblePaths.worktreePath,
      now
    });
  } catch (error) {
    try {
      gateResult = await recoverGate({
        bubbleId: resolved.bubbleId,
        summary,
        refs,
        repoPath: resolved.repoPath,
        cwd: resolved.bubblePaths.worktreePath,
        now
      });
    } catch {
      throw error;
    }
  }

  const emitDelivery =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitNotification =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
  const gateRef = resolveDeliveryMessageRef({
    bubbleId: resolved.bubbleId,
    sessionsPath: resolved.bubblePaths.sessionsPath,
    envelope: gateResult.gateEnvelope
  });

  const emitDeliverySafe = async (
    envelope: ProtocolEnvelope
  ): Promise<EmitTmuxDeliveryNotificationResult> =>
    emitDelivery({
      bubbleId: resolved.bubbleId,
      bubbleConfig: resolved.bubbleConfig,
      sessionsPath: resolved.bubblePaths.sessionsPath,
      envelope,
      messageRef: gateRef
    }).catch(() => ({
      delivered: false,
      message: "",
      reason: "tmux_send_failed"
    }));

  const recipientEnvelopes =
    gateResult.gateEnvelope.type === "APPROVAL_REQUEST"
      ? [
          gateResult.gateEnvelope,
          {
            ...gateResult.gateEnvelope,
            recipient: implementer
          },
          {
            ...gateResult.gateEnvelope,
            recipient: reviewer
          }
        ]
      : [gateResult.gateEnvelope];
  // Optional UX signal; never block protocol/state progression on notification failure.
  const deliveryResults = await Promise.all(
    recipientEnvelopes.map((envelope) => emitDeliverySafe(envelope))
  );

  const firstFailedDelivery = deliveryResults.find(
    (delivery) => !delivery.delivered
  );
  const convergedDelivery = firstFailedDelivery === undefined
    ? {
        delivered: true,
        retried: false
      }
    : {
        delivered: false,
        ...(firstFailedDelivery.reason !== undefined
          ? { reason: firstFailedDelivery.reason }
          : {}),
        retried: false
      };

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitNotification(resolved.bubbleConfig, "converged");

  const commandPathStatus = assessPairflowCommandPath({
    worktreePath: resolved.bubblePaths.worktreePath,
    profile: resolved.bubbleConfig.pairflow_command_profile,
    activeEntrypoint: process.argv[1]
  });
  const blockingReasonCodes = resolveMetaReviewRolloutBlockingReasonCodes({
    gateRoute: gateResult.route,
    metaReviewWarnings: gateResult.metaReviewRun?.warnings ?? [],
    commandPathStatus
  });

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_converged",
    round: state.round,
    actorRole: "reviewer",
    metadata: {
      refs_count: refs.length,
      summary_length: Array.from(summary).length,
      convergence_envelope_id: convergence.envelope.id,
      gate_handoff_envelope_id: gateResult.gateEnvelope.id,
      gate_handoff_type: gateResult.gateEnvelope.type,
      gate_route: gateResult.route,
      pairflow_command_path_status: commandPathStatus.status,
      pairflow_command_path_local_entrypoint: commandPathStatus.localEntrypoint,
      ...(commandPathStatus.activeEntrypoint !== null
        ? {
            pairflow_command_path_active_entrypoint:
              commandPathStatus.activeEntrypoint
          }
        : {}),
      ...(commandPathStatus.reasonCode !== undefined
        ? {
            pairflow_command_path_reason_code: commandPathStatus.reasonCode
          }
        : {}),
      meta_review_warning_reason_codes: JSON.stringify(
        (gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
      ),
      meta_review_rollout_blocking_reason_codes: JSON.stringify(blockingReasonCodes),
      summary_verifier_gate_decision: summaryVerifierGateDecision.gate_decision,
      summary_verifier_gate_reason_code: summaryVerifierGateDecision.reason_code,
      summary_verifier_gate_claim_classes_detected:
        summaryVerifierGateDecision.claim_classes_detected,
      summary_verifier_gate_verifier_status:
        summaryVerifierGateDecision.verifier_status,
      summary_verifier_gate_matched_claim_triggers:
        JSON.stringify(summaryVerifierGateDecision.matched_claim_triggers),
      spec_lock_state: specLockState.state,
      spec_lock_open_blocker_count: specLockState.open_blocker_count,
      spec_lock_open_required_now_count: specLockState.open_required_now_count,
      round_gate_applies: roundGateState.applies,
      round_gate_violated: roundGateState.violated,
      ...(roundGateState.reason_code !== undefined
        ? { round_gate_reason_code: roundGateState.reason_code }
        : {}),
      ...(summaryVerifierGateDecision.verifier_origin_reason !== undefined
        ? {
            summary_verifier_gate_verifier_origin_reason:
              summaryVerifierGateDecision.verifier_origin_reason
          }
        : {}),
      ...(docGateArtifactReadFailureReason !== undefined
        ? {
            doc_gate_artifact_read_failed: true,
            doc_gate_artifact_read_failure_reason: docGateArtifactReadFailureReason
          }
        : {})
    },
    now
  });

  await emitBubbleLifecycleEventBestEffort({
    repoPath: resolved.repoPath,
    bubbleId: resolved.bubbleId,
    bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_meta_review_routed",
    round: state.round,
    actorRole: "reviewer",
    metadata: {
      gate_route: gateResult.route,
      gate_handoff_type: gateResult.gateEnvelope.type,
      recommendation:
        gateResult.metaReviewRun?.recommendation ??
        gateResult.state.meta_review?.last_autonomous_recommendation ??
        "inconclusive",
      run_status:
        gateResult.metaReviewRun?.status ??
        gateResult.state.meta_review?.last_autonomous_status ??
        "inconclusive",
      warning_reason_codes: JSON.stringify(
        (gateResult.metaReviewRun?.warnings ?? []).map((warning) => warning.reason_code)
      ),
      blocking_reason_codes: JSON.stringify(blockingReasonCodes),
      pairflow_command_path_status: commandPathStatus.status,
      ...(commandPathStatus.reasonCode !== undefined
        ? {
            pairflow_command_path_reason_code: commandPathStatus.reasonCode
          }
        : {})
    },
    now
  });

  if (gateResult.route === "auto_rework") {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_auto_rework_dispatched",
      round: state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: gateResult.route,
        rework_target_present:
          (gateResult.metaReviewRun?.rework_target_message?.trim().length ?? 0) > 0,
        auto_rework_count: gateResult.state.meta_review?.auto_rework_count ?? 0,
        auto_rework_limit: gateResult.state.meta_review?.auto_rework_limit ?? 0
      },
      now
    });
  }

  if (gateResult.gateEnvelope.type === "APPROVAL_REQUEST") {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_human_gate_reached",
      round: state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: gateResult.route,
        recommendation:
          gateResult.metaReviewRun?.recommendation ??
          gateResult.state.meta_review?.last_autonomous_recommendation ??
          "inconclusive",
        blocking_reason_codes: JSON.stringify(blockingReasonCodes)
      },
      now
    });
  }

  if (blockingReasonCodes.length > 0) {
    await emitBubbleLifecycleEventBestEffort({
      repoPath: resolved.repoPath,
      bubbleId: resolved.bubbleId,
      bubbleInstanceId: bubbleIdentity.bubbleInstanceId,
      eventType: "bubble_meta_review_rollout_blocked",
      round: state.round,
      actorRole: "reviewer",
      metadata: {
        gate_route: gateResult.route,
        blocking_reason_codes: JSON.stringify(blockingReasonCodes),
        pairflow_command_path_status: commandPathStatus.status
      },
      now
    });
  }

  return {
    bubbleId: resolved.bubbleId,
    convergenceSequence: convergence.sequence,
    convergenceEnvelope: convergence.envelope,
    gateRoute: gateResult.route,
    approvalRequestSequence: gateResult.gateSequence,
    approvalRequestEnvelope: gateResult.gateEnvelope,
    state: gateResult.state,
    delivery: convergedDelivery
  };
}

export function asConvergedCommandError(error: unknown): never {
  if (error instanceof ConvergedCommandError) {
    throw error;
  }

  if (error instanceof WorkspaceResolutionError) {
    throw new ConvergedCommandError(error.message);
  }

  if (error instanceof Error && error.name === "MetaReviewGateError") {
    const gateError = toMetaReviewGateError(error);
    throw new ConvergedCommandError(gateError.message);
  }

  if (error instanceof Error) {
    throw new ConvergedCommandError(error.message);
  }

  throw error;
}
