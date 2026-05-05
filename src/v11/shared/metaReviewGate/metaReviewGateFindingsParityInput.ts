import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { resolveFindingsArtifactPath } from "./metaReviewGateFindingsMetadata.js";
import {
  buildFindingsParityMetadata,
  metaReviewFindingsParityGuardReasonCode
} from "../../domain/metaReviewGate/findingsParityMetadata.js";
import {
  resolveReworkFindingsParityInputCandidate,
  type ReworkFindingsParityInputCandidate
} from "../../domain/metaReviewGate/findingsParityInput.js";
export {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode
} from "../../domain/metaReviewGate/findingsParityMetadata.js";

export interface ReworkFindingsParityInput
  extends ReworkFindingsParityInputCandidate {
  artifactPath: string;
}

export function resolveReworkFindingsParityInput(input: {
  reportJson: Record<string, unknown>;
  runResult: MetaReviewResult;
  bubbleDir: string;
  artifactsDir: string;
}):
  | { ok: true; value: ReworkFindingsParityInput }
  | { ok: false; reason: string; metadata: FindingsParityMetadata } {
  const candidate = resolveReworkFindingsParityInputCandidate({
    reportJson: input.reportJson,
    runId: input.runResult.run_id
  });
  if (!candidate.ok) {
    return candidate;
  }

  const artifactPath = resolveFindingsArtifactPath({
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir,
    artifactRef: candidate.value.artifactRef
  });
  if (artifactPath === undefined) {
    return {
      ok: false,
      reason:
        `${metaReviewFindingsParityGuardReasonCode}: findings_artifact_ref (${candidate.value.artifactRef}) must resolve under artifacts/.`,
      metadata: buildFindingsParityMetadata({
        findingsCount: candidate.value.findingsCount,
        artifactOpenTotal: null,
        artifactStatus: candidate.value.artifactStatus,
        digest: candidate.value.digest,
        metaReviewRunId: candidate.value.metaReviewRunId,
        parityStatus: "guard_failed"
      })
    };
  }

  return {
    ok: true,
    value: {
      ...candidate.value,
      artifactPath
    }
  };
}
