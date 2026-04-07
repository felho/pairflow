import type { ReviewVerificationInputResolution } from "../../../v11/shared/reviewer/reviewVerification.js";
import type { BubbleConfig, BubbleStateSnapshot } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import type { ResolvedPassHandoff } from "../../domain/pass/handoff.js";
import type { LoadedStateSnapshot } from "../../shared/ports/stateSnapshots.js";
import type { evaluateReviewerGateWarnings } from "../../../v11/shared/gates/docContractGates.js";

export interface PersistNormalPassPostAppendInput {
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  bubbleId: string;
  handoff: Pick<
    ResolvedPassHandoff,
    "nextRound" | "senderAgent" | "envelopeRound" | "recipientAgent" | "recipientRole" | "appendRoundRoleEntry"
  >;
  generatedAt: string;
  reviewVerificationArtifactPath: string;
  mappedEnvelopeId: string;
  statePath: string;
  state: BubbleStateSnapshot;
  expectedFingerprint: string;
  appendEnvelopeId: string;
  docGateScopeActive: boolean;
  now: Date;
  bubbleConfig: BubbleConfig;
  artifactsDir: string;
  taskArtifactPath: string;
  hasFindings: boolean;
  findings: Finding[];
  reviewerGateEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
  createError: PairflowCreateCommandError;
}

export interface PersistNormalPassPostAppendDependencies {
  writePostAppendReviewVerificationArtifact: (input: {
    reviewerVerification: ReviewVerificationInputResolution | undefined;
    bubbleId: string;
    round: number;
    reviewer: ResolvedPassHandoff["senderAgent"];
    generatedAt: string;
    artifactPath: string;
    envelopeId: string;
    createError: PairflowCreateCommandError;
  }) => Promise<void>;
  writePostAppendPassState: (input: {
    statePath: string;
    state: BubbleStateSnapshot;
    handoff: Pick<
      ResolvedPassHandoff,
      "nextRound" | "recipientAgent" | "recipientRole" | "appendRoundRoleEntry"
    >;
    nowIso: string;
    watchdogTimeoutMinutes: number;
    expectedFingerprint: string;
    envelopeId: string;
    createError: PairflowCreateCommandError;
  }) => Promise<LoadedStateSnapshot>;
  updateReviewerDocGateArtifact: (input: {
    now: Date;
    bubbleConfig: BubbleConfig;
    artifactsDir: string;
    taskArtifactPath: string;
    round: number;
    findings: Finding[];
    reviewerEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
    createError: PairflowCreateCommandError;
  }) => Promise<string | undefined>;
}

export interface PersistNormalPassPostAppendResult {
  written: LoadedStateSnapshot;
  docGateArtifactWriteFailureReason?: string;
}

export async function persistNormalPassPostAppend(
  input: PersistNormalPassPostAppendInput,
  dependencies: PersistNormalPassPostAppendDependencies
): Promise<PersistNormalPassPostAppendResult> {
  await dependencies.writePostAppendReviewVerificationArtifact({
    reviewerVerification: input.reviewerVerification,
    bubbleId: input.bubbleId,
    round: input.handoff.nextRound,
    reviewer: input.handoff.senderAgent,
    generatedAt: input.generatedAt,
    artifactPath: input.reviewVerificationArtifactPath,
    envelopeId: input.mappedEnvelopeId,
    createError: input.createError
  });

  const written = await dependencies.writePostAppendPassState({
    statePath: input.statePath,
    state: input.state,
    handoff: input.handoff,
    nowIso: input.generatedAt,
    watchdogTimeoutMinutes: input.bubbleConfig.watchdog_timeout_minutes,
    expectedFingerprint: input.expectedFingerprint,
    envelopeId: input.appendEnvelopeId,
    createError: input.createError
  });

  let docGateArtifactWriteFailureReason: string | undefined;
  if (input.docGateScopeActive) {
    docGateArtifactWriteFailureReason =
      await dependencies.updateReviewerDocGateArtifact({
        now: input.now,
        bubbleConfig: input.bubbleConfig,
        artifactsDir: input.artifactsDir,
        taskArtifactPath: input.taskArtifactPath,
        round: input.handoff.envelopeRound,
        findings: input.hasFindings ? input.findings : [],
        ...(input.reviewerGateEvaluation !== undefined
          ? { reviewerEvaluation: input.reviewerGateEvaluation }
          : {}),
        createError: input.createError
      });
  }

  return {
    written,
    ...(docGateArtifactWriteFailureReason !== undefined
      ? { docGateArtifactWriteFailureReason }
      : {})
  };
}
