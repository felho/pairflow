import {
  resolveReviewerTestEvidenceArtifactPath,
  type ReviewerTestExecutionDirective
} from "../../../../shared/reviewer/testEvidence.js";
import { reviewerDeliveryDefaults } from "../../reviewerDeliveryDefaults.js";
import type { BubbleConfig } from "../../../../shared/config/bubbleConfigTypes.js";
import type { ProtocolEnvelope } from "../../../../shared/protocol/protocolEnvelopeContract.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../../../ports/reviewerTestEvidenceArtifacts.js";

export interface ResolveReviewerTestDirectiveForPassInput {
  senderRole: "implementer" | "reviewer";
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  envelope: ProtocolEnvelope;
  worktreePath: string;
  repoPath: string;
  artifactsDir: string;
  now: Date;
}

export interface ResolveReviewerTestDirectiveForPassDependencies {
  verifyImplementerTestEvidence?: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact?: WriteReviewerTestEvidenceArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
}

export async function resolveReviewerTestDirectiveForPass(
  input: ResolveReviewerTestDirectiveForPassInput,
  dependencies: ResolveReviewerTestDirectiveForPassDependencies = {}
): Promise<ReviewerTestExecutionDirective | undefined> {
  if (input.senderRole !== "implementer") {
    return undefined;
  }

  const verifyEvidence =
    dependencies.verifyImplementerTestEvidence
    ?? reviewerDeliveryDefaults.verifyImplementerTestEvidence;
  const writeEvidenceArtifact =
    dependencies.writeReviewerTestEvidenceArtifact
    ?? reviewerDeliveryDefaults.writeReviewerTestEvidenceArtifact;
  const resolveDirectiveFromArtifact =
    dependencies.resolveReviewerTestExecutionDirectiveFromArtifact
    ?? reviewerDeliveryDefaults.resolveReviewerTestExecutionDirectiveFromArtifact;

  let implementerDirective: ReviewerTestExecutionDirective | undefined;
  const evidenceArtifactPath = resolveReviewerTestEvidenceArtifactPath(
    input.artifactsDir
  );

  const evidenceArtifact = await verifyEvidence({
    bubbleId: input.bubbleId,
    bubbleConfig: input.bubbleConfig,
    envelope: input.envelope,
    worktreePath: input.worktreePath,
    repoPath: input.repoPath,
    now: input.now
  }).catch(() => undefined);

  if (evidenceArtifact !== undefined) {
    const artifactWriteSucceeded = await writeEvidenceArtifact(
      evidenceArtifactPath,
      evidenceArtifact
    )
      .then(() => true)
      .catch(() => false);
    if (artifactWriteSucceeded) {
      implementerDirective = await resolveDirectiveFromArtifact({
        artifact: evidenceArtifact,
        worktreePath: input.worktreePath,
        reviewArtifactType: input.bubbleConfig.review_artifact_type
      }).catch(() => undefined);
    }
  }

  return implementerDirective
    ?? (input.bubbleConfig.review_artifact_type === "document"
      ? {
          skip_full_rerun: true,
          reason_code: "no_trigger",
          reason_detail: "docs-only scope, runtime checks not required",
          verification_status: "trusted"
        }
      : {
          skip_full_rerun: false,
          reason_code: "evidence_unverifiable",
          reason_detail:
            "Failed to resolve reviewer test directive due to verification runtime error.",
          verification_status: "untrusted"
        });
}
