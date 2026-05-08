import { validateConvergencePolicy } from "../../../../domain/convergence/policy.js";
import {
  createReviewVerificationArtifact,
  type ReviewVerificationInputResolution,
} from "../../../../shared/reviewer/reviewVerification.js";
import type {
  WriteReviewVerificationArtifactAtomicPort
} from "../../../../ports/reviewVerificationArtifacts.js";
import type { ReadStateSnapshotPort } from "../../../../ports/stateSnapshots.js";
import { readStateSnapshot } from "../../../start/startCommandDependencyDefaults.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { BubbleStateSnapshot } from "../../../../shared/state/bubbleStateSnapshotTypes.js";
import type {
  ReviewArtifactType
} from "../../../../shared/config/bubbleConfigVocabulary.js";
import type { ProtocolEnvelope } from "../../../../../types/protocol.js";
import {
  raiseRepeatCleanAutoConvergeStateStale,
  raiseRepeatCleanPolicyGateRejected,
  raiseRepeatCleanReviewVerificationWriteFailed
} from "../../../../domain/pass/repeatCleanPolicyRejection.js";

export interface PrepareRepeatCleanAutoConvergeInput {
  round: number;
  reviewer: AgentName;
  implementer: AgentName;
  reviewArtifactType: ReviewArtifactType;
  roundRoleHistory: BubbleStateSnapshot["round_role_history"];
  transcript: ProtocolEnvelope[];
  severityGateRound: number;
  statePath: string;
  expectedStateFingerprint: string;
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  reviewVerificationArtifactPath: string;
  bubbleId: string;
  reviewerAgent: AgentName;
  generatedAt: string;
  createError: PairflowCreateCommandError;
}

export interface PrepareRepeatCleanAutoConvergeDependencies {
  validateConvergencePolicy?: typeof validateConvergencePolicy;
  readStateSnapshot?: ReadStateSnapshotPort;
  createReviewVerificationArtifact?: typeof createReviewVerificationArtifact;
  writeReviewVerificationArtifactAtomic?: WriteReviewVerificationArtifactAtomicPort;
}

export interface PrepareRepeatCleanAutoConvergeResult {
  expectedStateFingerprint: string;
}

export async function prepareRepeatCleanAutoConverge(
  input: PrepareRepeatCleanAutoConvergeInput,
  dependencies: PrepareRepeatCleanAutoConvergeDependencies = {}
): Promise<PrepareRepeatCleanAutoConvergeResult> {
  const validatePolicy =
    dependencies.validateConvergencePolicy ?? validateConvergencePolicy;
  const readState =
    dependencies.readStateSnapshot ?? readStateSnapshot;
  const createArtifact =
    dependencies.createReviewVerificationArtifact
    ?? createReviewVerificationArtifact;
  const writeArtifact =
    dependencies.writeReviewVerificationArtifactAtomic;

  const policyResult = validatePolicy({
    currentRound: input.round,
    reviewer: input.reviewer,
    implementer: input.implementer,
    reviewArtifactType: input.reviewArtifactType,
    roundRoleHistory: input.roundRoleHistory,
    transcript: input.transcript,
    severity_gate_round: input.severityGateRound
  });
  if (!policyResult.ok) {
    raiseRepeatCleanPolicyGateRejected({
      errors: policyResult.errors,
      diagnostics: policyResult.diagnostics,
      createError: input.createError
    });
  }

  const stateBeforeAutoConvergeSideEffects = await readState(input.statePath);
  if (stateBeforeAutoConvergeSideEffects.fingerprint !== input.expectedStateFingerprint) {
    raiseRepeatCleanAutoConvergeStateStale({
      createError: input.createError
    });
  }

  if (input.reviewerVerification !== undefined) {
    if (writeArtifact === undefined) {
      raiseRepeatCleanReviewVerificationWriteFailed({
        reason: "missing writeReviewVerificationArtifactAtomic dependency",
        createError: input.createError
      });
    }
    const verificationArtifact = createArtifact({
      payload: input.reviewerVerification.payload,
      inputRef: input.reviewerVerification.inputRef,
      bubbleId: input.bubbleId,
      round: input.round,
      reviewer: input.reviewerAgent,
      generatedAt: input.generatedAt
    });
    try {
      await writeArtifact(
        input.reviewVerificationArtifactPath,
        verificationArtifact
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      raiseRepeatCleanReviewVerificationWriteFailed({
        reason,
        createError: input.createError
      });
    }
  }

  return {
    expectedStateFingerprint: stateBeforeAutoConvergeSideEffects.fingerprint
  };
}
