import { isRecord } from "../validation/primitives.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import {
  resolveFindingsParityMetadataFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
import {
  resolveReworkFindingsParityInput
} from "./metaReviewGateFindingsParityInput.js";
import {
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";
import {
  buildVerifiedThresholdParityMetadata,
  resolveHighestOpenSeverity,
  resolveVerifiedThresholdOpenSplitTotals
} from "../../domain/metaReviewGate/thresholdAuthority.js";
import {
  buildThresholdAuthorityIncomplete,
  buildThresholdAuthorityUnresolved,
  prefixThresholdAuthorityDiagnostic,
  REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
  type MetaReviewGateThresholdAuthorityResolution
} from "../../domain/metaReviewGate/thresholdAuthorityResolution.js";
export {
  REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
  REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED
} from "../../domain/metaReviewGate/thresholdAuthorityResolution.js";
export {
  metaReviewGateThresholdIsMet
} from "../../domain/metaReviewGate/thresholdAuthority.js";
export type {
  MetaReviewGateThresholdAuthorityResolution
} from "../../domain/metaReviewGate/thresholdAuthorityResolution.js";

export interface ResolveMetaReviewGateThresholdAuthorityInput {
  runResult: MetaReviewResult;
  bubbleDir: string;
  artifactsDir: string;
  readFileFn: (
    artifactPath: string,
    encoding: "utf8"
  ) => Promise<string>;
  sleepForRetryMs?: (delayMs: number) => Promise<void>;
}

export async function resolveMetaReviewGateThresholdAuthority(
  input: ResolveMetaReviewGateThresholdAuthorityInput
): Promise<MetaReviewGateThresholdAuthorityResolution> {
  const reportJson = input.runResult.report_json;
  const parityMetadata = resolveFindingsParityMetadataFromReportJson(reportJson);
  const artifactRef =
    typeof reportJson?.findings_artifact_ref === "string"
      ? reportJson.findings_artifact_ref.trim()
      : null;
  const metaReviewRunId = parityMetadata?.meta_review_run_id ?? null;

  if (!isRecord(reportJson)) {
    return buildThresholdAuthorityUnresolved({
      parityMetadata,
      diagnostics: [
        prefixThresholdAuthorityDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          "report_json is required for threshold authority resolution."
        )
      ],
      artifactRef,
      metaReviewRunId,
      findingsBlockingOpenTotal: parityMetadata?.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal: parityMetadata?.findings_advisory_open_total ?? null
    });
  }

  const parityInput = resolveReworkFindingsParityInput({
    reportJson,
    runResult: input.runResult,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir
  });
  if (!parityInput.ok) {
    return buildThresholdAuthorityUnresolved({
      parityMetadata: parityInput.metadata,
      diagnostics: [
        prefixThresholdAuthorityDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          parityInput.reason
        )
      ],
      artifactRef,
      metaReviewRunId,
      findingsBlockingOpenTotal:
        parityInput.metadata.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal:
        parityInput.metadata.findings_advisory_open_total ?? null
    });
  }

  const parity = await validateFindingsArtifactParity({
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
  if (!parity.ok) {
    return buildThresholdAuthorityUnresolved({
      parityMetadata: parity.metadata,
      diagnostics: [
        prefixThresholdAuthorityDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          parity.reason
        )
      ],
      artifactRef,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      findingsBlockingOpenTotal: parity.metadata.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal: parity.metadata.findings_advisory_open_total ?? null
    });
  }

  const artifactParsed = parity.artifact;
  const artifactSplit = parity.split;
  const verifiedParityMetadata = buildVerifiedThresholdParityMetadata({
    findingsCount: parityInput.value.findingsCount,
    artifactOpenTotal: parity.artifactOpenTotal,
    artifactStatus: parityInput.value.artifactStatus,
    digest: parityInput.value.digest,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    artifactSplit
  });
  const verifiedOpenSplit = resolveVerifiedThresholdOpenSplitTotals({
    parityMetadata: verifiedParityMetadata,
    artifactSplit
  });
  const highestOpenSeverity = resolveHighestOpenSeverity(artifactParsed.findings);
  if (highestOpenSeverity === null) {
    return buildThresholdAuthorityIncomplete({
      parityMetadata: verifiedParityMetadata,
      artifactRef,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      findingsBlockingOpenTotal: verifiedOpenSplit.blocking,
      findingsAdvisoryOpenTotal: verifiedOpenSplit.advisory
    });
  }

  return {
    status: "resolved",
    parityMetadata: verifiedParityMetadata,
    diagnostics: [],
    highestOpenSeverity,
    artifactRef: parityInput.value.artifactRef,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    findingsBlockingOpenTotal: verifiedOpenSplit.blocking,
    findingsAdvisoryOpenTotal: verifiedOpenSplit.advisory
  };
}
