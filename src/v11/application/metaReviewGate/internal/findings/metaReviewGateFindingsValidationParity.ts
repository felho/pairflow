import type { MetaReviewResult } from "../../../../shared/metaReview/metaReviewTypes.js";
import type { Finding } from "../../../../../contracts/kernel/findings.js";
import { type FindingsParityMetadata } from "../../../../shared/metaReviewGate/findingsParityMetadataContract.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import {
  resolveReworkFindingsParityInput,
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";
import {
  buildVerifiedReworkFindingsParityValidation
} from "../../../../domain/metaReviewGate/findingsValidationParity.js";

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
  readFileFn: MetaReviewGateArtifactReadFn;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}): Promise<
  | {
      ok: true;
      diagnostics: string[];
      metadata: FindingsParityMetadata;
      findingsForPayload?: Finding[];
    }
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

  return buildVerifiedReworkFindingsParityValidation({
    summary: input.runResult.summary ?? undefined,
    findings: artifactParity.artifact.findings,
    findingsCount: parityInput.value.findingsCount,
    artifactOpenTotal: artifactParity.artifactOpenTotal,
    artifactStatus: parityInput.value.artifactStatus,
    digest: parityInput.value.digest,
    metaReviewRunId: parityInput.value.metaReviewRunId
  });
}
