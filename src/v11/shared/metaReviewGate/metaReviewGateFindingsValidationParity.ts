import type { readFile } from "node:fs/promises";

import { resolveLegacySummaryFindingsClaimState } from "../../../v11/domain/convergence/policy.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import { type FindingsParityMetadata } from "../../../types/protocol.js";
import {
  buildFindingsParityMetadata,
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";

function failStructuredMetaReviewPositiveClaim(
  reason: string,
  metadata: FindingsParityMetadata | null = null
): { ok: false; reason: string; metadata: FindingsParityMetadata | null } {
  return { ok: false, reason, metadata };
}

export async function validateStructuredMetaReviewPositiveClaimReworkPath(input: {
  runResult: MetaReviewResult;
  reportJson: Record<string, unknown>;
  bubbleDir: string;
  artifactsDir: string;
  readFileFn: typeof readFile;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | { ok: true; diagnostics: string[]; metadata: FindingsParityMetadata | null }
  | { ok: false; reason: string; metadata: FindingsParityMetadata | null }
> {
  const parityInput = resolveReworkFindingsParityInput({
    reportJson: input.reportJson,
    runResult: input.runResult,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir
  });
  if (!parityInput.ok) {
    return failStructuredMetaReviewPositiveClaim(
      parityInput.reason,
      parityInput.metadata
    );
  }

  const artifactParity = await validateFindingsArtifactParity({
    artifactPath: parityInput.value.artifactPath,
    findingsCount: parityInput.value.findingsCount,
    digest: parityInput.value.digest,
    artifactStatus: parityInput.value.artifactStatus,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    readFileFn: input.readFileFn,
    ...(input.sleepForRetryMs !== undefined
      ? { sleepForRetryMs: input.sleepForRetryMs }
      : {})
  });
  if (!artifactParity.ok) {
    return failStructuredMetaReviewPositiveClaim(
      artifactParity.reason,
      artifactParity.metadata
    );
  }

  const parserState = resolveLegacySummaryFindingsClaimState(
    input.runResult.summary ?? undefined
  );
  const diagnostics = parserState === "open_findings"
    ? []
    : [
        `CLAIM_PARSER_DIVERGENCE_DIAGNOSTIC: parser_state=${parserState} structured_state=open_findings structured_source=meta_review_artifact`
      ];

  return {
    ok: true,
    diagnostics,
    metadata: buildFindingsParityMetadata({
      findingsCount: parityInput.value.findingsCount,
      artifactOpenTotal: artifactParity.artifactOpenTotal,
      artifactStatus: parityInput.value.artifactStatus,
      digest: parityInput.value.digest,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      parityStatus: "ok"
    })
  };
}
