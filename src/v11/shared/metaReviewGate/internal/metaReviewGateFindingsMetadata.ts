import { isAbsolute, relative, resolve } from "node:path";

export type MetaReviewGateArtifactReadFn = (
  artifactPath: string,
  encoding: "utf8"
) => Promise<string>;
export {
  buildFindingsParityMetadata,
  claimSourceInvalidReasonCode,
  claimStateRequiredReasonCode,
  metaReviewFindingsArtifactRequiredReasonCode,
  metaReviewFindingsCountMismatchReasonCode,
  metaReviewFindingsParityGuardReasonCode,
  metaReviewFindingsRunLinkMissingReasonCode,
  resolveFindingsArtifactOpenTotalFromArtifact,
  resolveFindingsArtifactStatus,
  resolveFindingsCountFromMetaReviewReportJson,
  resolveFindingsDigestSha256,
  resolveFindingsParityMetadataFromReportJson,
  resolveMetaReviewRunId,
  resolveNonNegativeIntegerField,
  resolveStructuredMetaReviewClaimFromReportJson
} from "../../../domain/metaReviewGate/findingsParityMetadata.js";

export function resolveFindingsArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  artifactRef: string;
}): string | undefined {
  if (
    !input.artifactRef.startsWith("artifacts/") ||
    input.artifactRef.includes("..") ||
    input.artifactRef.includes("\\") ||
    input.artifactRef.includes("\0")
  ) {
    return undefined;
  }
  const artifactPath = resolve(input.bubbleDir, input.artifactRef);
  const relativeToArtifacts = relative(input.artifactsDir, artifactPath);
  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    return undefined;
  }
  return artifactPath;
}
