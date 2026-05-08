import {
  createReviewVerificationArtifact,
  type ReviewVerificationInputResolution,
} from "../../../v11/shared/reviewer/reviewVerification.js";
import type {
  WriteReviewVerificationArtifactAtomicPort
} from "../../ports/reviewVerificationArtifacts.js";
import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import { raisePostAppendReviewVerificationWriteFailed } from "../../domain/pass/postAppendReviewVerificationWriteFailure.js";

export interface WritePostAppendReviewVerificationArtifactInput {
  reviewerVerification: ReviewVerificationInputResolution | undefined;
  bubbleId: string;
  round: number;
  reviewer: AgentName;
  generatedAt: string;
  artifactPath: string;
  envelopeId: string;
  createError: PairflowCreateCommandError;
}

export interface WritePostAppendReviewVerificationArtifactDependencies {
  createReviewVerificationArtifact?: typeof createReviewVerificationArtifact;
  writeReviewVerificationArtifactAtomic?: WriteReviewVerificationArtifactAtomicPort;
}

export async function writePostAppendReviewVerificationArtifact(
  input: WritePostAppendReviewVerificationArtifactInput,
  dependencies: WritePostAppendReviewVerificationArtifactDependencies = {}
): Promise<void> {
  if (input.reviewerVerification === undefined) {
    return;
  }

  const createArtifact =
    dependencies.createReviewVerificationArtifact
    ?? createReviewVerificationArtifact;
  const writeArtifact =
    dependencies.writeReviewVerificationArtifactAtomic;
  if (writeArtifact === undefined) {
    raisePostAppendReviewVerificationWriteFailed({
      envelopeId: input.envelopeId,
      reason: "missing writeReviewVerificationArtifactAtomic dependency",
      createError: input.createError
    });
  }

  const verificationArtifact = createArtifact({
    payload: input.reviewerVerification.payload,
    inputRef: input.reviewerVerification.inputRef,
    bubbleId: input.bubbleId,
    round: input.round,
    reviewer: input.reviewer,
    generatedAt: input.generatedAt
  });
  try {
    await writeArtifact(input.artifactPath, verificationArtifact);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    raisePostAppendReviewVerificationWriteFailed({
      envelopeId: input.envelopeId,
      reason,
      createError: input.createError
    });
  }
}
