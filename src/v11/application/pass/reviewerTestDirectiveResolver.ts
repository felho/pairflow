import {
  resolveReviewerTestEvidenceArtifactPath,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  type ReviewerTestExecutionDirective,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} from "../../../core/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";

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
  verifyImplementerTestEvidence?: typeof verifyImplementerTestEvidence;
  writeReviewerTestEvidenceArtifact?: typeof writeReviewerTestEvidenceArtifact;
  resolveReviewerTestExecutionDirectiveFromArtifact?:
    typeof resolveReviewerTestExecutionDirectiveFromArtifact;
}

export async function resolveReviewerTestDirectiveForPass(
  input: ResolveReviewerTestDirectiveForPassInput,
  dependencies: ResolveReviewerTestDirectiveForPassDependencies = {}
): Promise<ReviewerTestExecutionDirective | undefined> {
  if (input.senderRole !== "implementer") {
    return undefined;
  }

  const resolveDirectiveFromArtifact =
    dependencies.resolveReviewerTestExecutionDirectiveFromArtifact
    ?? resolveReviewerTestExecutionDirectiveFromArtifact;
  const verifyEvidence =
    dependencies.verifyImplementerTestEvidence
    ?? verifyImplementerTestEvidence;
  const writeEvidenceArtifact =
    dependencies.writeReviewerTestEvidenceArtifact
    ?? writeReviewerTestEvidenceArtifact;

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
