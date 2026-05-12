import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../../../../domain/convergence/repeatCleanAutoconverge.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { Finding } from "../../../../../types/findings.js";
import type { PassIntent } from "../../../../../contracts/kernel/protocol.js";
import type { EmitConvergedResult } from "../../../converged/convergedCommandOrchestration.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../../domain/state/snapshot/buildBubbleStateSnapshot.js";
import type {
  ReviewerFindingsClaim,
  ReviewerFindingsClaimParserMetadata
} from "../../../../domain/pass/reviewerFindingsClaim.js";
import type { PassActivationProvenance } from "../../passCommandContract.js";

export interface FinalizeAutoConvergePassInput {
  now: Date;
  bubbleConfig: BubbleConfig;
  artifactsDir: string;
  taskArtifactPath: string;
  round: number;
  senderRole: "implementer" | "reviewer";
  findings: Finding[];
  createError: PairflowCreateCommandError;
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  passIntent: PassIntent;
  inferredIntent: boolean;
  senderAgent: AgentName;
  refsCount: number;
  hasFindings: boolean;
  noFindings: boolean;
  reviewerFindingsClaim?: ReviewerFindingsClaim;
  reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
  repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
  repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
  repeatCleanTrigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
  activation?: PassActivationProvenance;
  converged: EmitConvergedResult;
}

export interface FinalizeAutoConvergePassDependencies<TResult> {
  updateReviewerDocGateArtifact: (input: {
    now: Date;
    bubbleConfig: BubbleConfig;
    artifactsDir: string;
    taskArtifactPath: string;
    round: number;
    findings: Finding[];
    createError: PairflowCreateCommandError;
  }) => Promise<string | undefined>;
  emitBubbleLifecycleEventBestEffort: (input: {
    repoPath: string;
    bubbleId: string;
    bubbleInstanceId: string;
    eventType: "bubble_passed";
    round: number;
    actorRole: "implementer" | "reviewer";
    metadata: Record<string, unknown>;
    now: Date;
  }) => Promise<void>;
  buildPassLifecycleMetricMetadata: (input: {
    passIntent: PassIntent;
    inferredIntent: boolean;
    sender: AgentName;
    recipient: "human";
    recipientRole: "human";
    refsCount: number;
    hasFindings: boolean;
    noFindings: boolean;
    reviewerFindingsClaim?: ReviewerFindingsClaim;
    reviewerFindingsClaimParserMetadata?: ReviewerFindingsClaimParserMetadata;
    transitionDecision: "auto_converge";
    repeatCleanReasonCode: RepeatCleanAutoconvergeReasonCode;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    repeatCleanTrigger: boolean;
    mostRecentPreviousReviewerCleanPassEnvelope: boolean;
    findings: Finding[];
    docGateArtifactWriteFailureReason?: string;
  }) => Record<string, unknown>;
  buildAutoConvergePassResult: (input: {
    bubbleId: string;
    inferredIntent: boolean;
    activation?: PassActivationProvenance;
    repeatCleanReasonDetail: RepeatCleanAutoconvergeReasonDetail;
    convergenceSequence: number;
    convergenceEnvelope: EmitConvergedResult["convergenceEnvelope"];
    state: BubbleStateSnapshot;
    gateRoute: EmitConvergedResult["gateRoute"];
    approvalRequestSequence: number;
    approvalRequestEnvelope: EmitConvergedResult["approvalRequestEnvelope"];
    delivery?: NonNullable<EmitConvergedResult["delivery"]>;
    docGateArtifactWriteFailureReason?: string;
  }) => TResult;
}

export async function finalizeAutoConvergePass<TResult>(
  input: FinalizeAutoConvergePassInput,
  dependencies: FinalizeAutoConvergePassDependencies<TResult>
): Promise<TResult> {
  let autoConvergeDocGateArtifactWriteFailureReason: string | undefined;
  if (input.senderRole === "reviewer") {
    autoConvergeDocGateArtifactWriteFailureReason =
      await dependencies.updateReviewerDocGateArtifact({
        now: input.now,
        bubbleConfig: input.bubbleConfig,
        artifactsDir: input.artifactsDir,
        taskArtifactPath: input.taskArtifactPath,
        round: input.round,
        findings: input.findings,
        createError: input.createError
      });
  }

  await dependencies.emitBubbleLifecycleEventBestEffort({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    bubbleInstanceId: input.bubbleInstanceId,
    eventType: "bubble_passed",
    round: input.round,
    actorRole: input.senderRole,
    metadata: dependencies.buildPassLifecycleMetricMetadata({
      passIntent: input.passIntent,
      inferredIntent: input.inferredIntent,
      sender: input.senderAgent,
      recipient: "human",
      recipientRole: "human",
      refsCount: input.refsCount,
      hasFindings: input.hasFindings,
      noFindings: input.noFindings,
      ...(input.reviewerFindingsClaim !== undefined
        ? { reviewerFindingsClaim: input.reviewerFindingsClaim }
        : {}),
      ...(input.reviewerFindingsClaimParserMetadata !== undefined
        ? { reviewerFindingsClaimParserMetadata: input.reviewerFindingsClaimParserMetadata }
        : {}),
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: input.repeatCleanReasonCode,
      repeatCleanReasonDetail: input.repeatCleanReasonDetail,
      repeatCleanTrigger: input.repeatCleanTrigger,
      mostRecentPreviousReviewerCleanPassEnvelope:
        input.mostRecentPreviousReviewerCleanPassEnvelope,
      findings: input.findings,
      ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
        ? { docGateArtifactWriteFailureReason: autoConvergeDocGateArtifactWriteFailureReason }
        : {})
    }),
    now: input.now
  });

  return dependencies.buildAutoConvergePassResult({
    bubbleId: input.bubbleId,
    inferredIntent: input.inferredIntent,
    ...(input.activation !== undefined
      ? { activation: input.activation }
      : {}),
    repeatCleanReasonDetail: input.repeatCleanReasonDetail,
    convergenceSequence: input.converged.convergenceSequence,
    convergenceEnvelope: input.converged.convergenceEnvelope,
    state: buildBubbleStateSnapshotVariant(input.converged.state),
    gateRoute: input.converged.gateRoute,
    approvalRequestSequence: input.converged.approvalRequestSequence,
    approvalRequestEnvelope: input.converged.approvalRequestEnvelope,
    ...(input.converged.delivery !== undefined
      ? { delivery: input.converged.delivery }
      : {}),
    ...(autoConvergeDocGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason: autoConvergeDocGateArtifactWriteFailureReason }
      : {})
  });
}
