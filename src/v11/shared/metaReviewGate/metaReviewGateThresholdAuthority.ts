import { resolveFindingPriority, type FindingPriority } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { isRecord } from "../validation/primitives.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import {
  resolveFindingsParityMetadataFromReportJson
} from "./metaReviewGateFindingsMetadata.js";
import {
  buildFindingsParityMetadata,
  resolveReworkFindingsParityInput
} from "./metaReviewGateFindingsParityInput.js";
import {
  validateFindingsArtifactParity
} from "./metaReviewGateFindingsParityHelpers.js";

export const REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED =
  "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED" as const;
export const REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE =
  "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE" as const;

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

export type MetaReviewGateThresholdAuthorityResolution =
  | {
      status: "resolved";
      parityMetadata: FindingsParityMetadata | null;
      diagnostics: string[];
      highestOpenSeverity: FindingPriority;
      artifactRef: string;
      metaReviewRunId: string;
      findingsBlockingOpenTotal: number | null;
      findingsAdvisoryOpenTotal: number | null;
    }
  | {
      status: "unresolved" | "incomplete";
      parityMetadata: FindingsParityMetadata | null;
      diagnostics: string[];
      highestOpenSeverity: null;
      artifactRef: string | null;
      metaReviewRunId: string | null;
      findingsBlockingOpenTotal: number | null;
      findingsAdvisoryOpenTotal: number | null;
    };

function prefixDiagnostic(reasonCode: string, detail: string): string {
  return `${reasonCode}: ${detail}`;
}

function buildVerifiedParityMetadata(input: {
  findingsCount: number;
  artifactOpenTotal: number;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
  artifactSplit:
    | {
        blockingOpenTotal: number;
        advisoryOpenTotal: number;
      }
    | null;
}): FindingsParityMetadata {
  return {
    ...buildFindingsParityMetadata({
      findingsCount: input.findingsCount,
      artifactOpenTotal: input.artifactOpenTotal,
      artifactStatus: input.artifactStatus,
      digest: input.digest,
      metaReviewRunId: input.metaReviewRunId,
      parityStatus: "ok"
    }),
    findings_blocking_open_total:
      input.artifactSplit?.blockingOpenTotal ?? null,
    findings_advisory_open_total:
      input.artifactSplit?.advisoryOpenTotal ?? null
  };
}

function resolveVerifiedOpenSplitTotals(input: {
  parityMetadata: FindingsParityMetadata | null;
  artifactSplit:
    | {
        blockingOpenTotal: number;
        advisoryOpenTotal: number;
      }
    | null;
}): {
  blocking: number | null;
  advisory: number | null;
} {
  return {
    blocking:
      input.artifactSplit?.blockingOpenTotal
      ?? input.parityMetadata?.findings_blocking_open_total
      ?? null,
    advisory:
      input.artifactSplit?.advisoryOpenTotal
      ?? input.parityMetadata?.findings_advisory_open_total
      ?? null
  };
}

function resolveHighestOpenSeverity(findings: unknown): FindingPriority | null {
  if (!Array.isArray(findings)) {
    return null;
  }

  const severityOrder: FindingPriority[] = ["P0", "P1", "P2", "P3"];
  let highestIndex: number | null = null;

  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }
    const priority = resolveFindingPriority({
      priority: entry.priority,
      severity: entry.severity
    });
    if (priority === undefined) {
      continue;
    }
    const index = severityOrder.indexOf(priority);
    if (index === -1) {
      continue;
    }
    if (highestIndex === null || index < highestIndex) {
      highestIndex = index;
    }
  }

  return highestIndex === null ? null : (severityOrder[highestIndex] ?? null);
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
    return {
      status: "unresolved",
      parityMetadata,
      diagnostics: [
        prefixDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          "report_json is required for threshold authority resolution."
        )
      ],
      highestOpenSeverity: null,
      artifactRef,
      metaReviewRunId,
      findingsBlockingOpenTotal: parityMetadata?.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal: parityMetadata?.findings_advisory_open_total ?? null
    };
  }

  const parityInput = resolveReworkFindingsParityInput({
    reportJson,
    runResult: input.runResult,
    bubbleDir: input.bubbleDir,
    artifactsDir: input.artifactsDir
  });
  if (!parityInput.ok) {
    return {
      status: "unresolved",
      parityMetadata: parityInput.metadata,
      diagnostics: [
        prefixDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          parityInput.reason
        )
      ],
      highestOpenSeverity: null,
      artifactRef,
      metaReviewRunId,
      findingsBlockingOpenTotal:
        parityInput.metadata.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal:
        parityInput.metadata.findings_advisory_open_total ?? null
    };
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
    return {
      status: "unresolved",
      parityMetadata: parity.metadata,
      diagnostics: [
        prefixDiagnostic(
          REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
          parity.reason
        )
      ],
      highestOpenSeverity: null,
      artifactRef,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      findingsBlockingOpenTotal: parity.metadata.findings_blocking_open_total ?? null,
      findingsAdvisoryOpenTotal: parity.metadata.findings_advisory_open_total ?? null
    };
  }

  const artifactParsed = parity.artifact;
  const artifactSplit = parity.split;
  const verifiedParityMetadata = buildVerifiedParityMetadata({
    findingsCount: parityInput.value.findingsCount,
    artifactOpenTotal: parity.artifactOpenTotal,
    artifactStatus: parityInput.value.artifactStatus,
    digest: parityInput.value.digest,
    metaReviewRunId: parityInput.value.metaReviewRunId,
    artifactSplit
  });
  const verifiedOpenSplit = resolveVerifiedOpenSplitTotals({
    parityMetadata: verifiedParityMetadata,
    artifactSplit
  });
  const highestOpenSeverity = resolveHighestOpenSeverity(artifactParsed.findings);
  if (highestOpenSeverity === null) {
    return {
      status: "incomplete",
      parityMetadata: verifiedParityMetadata,
      diagnostics: [
        prefixDiagnostic(
          REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
          "findings artifact does not expose a resolvable open severity."
        )
      ],
      highestOpenSeverity: null,
      artifactRef,
      metaReviewRunId: parityInput.value.metaReviewRunId,
      findingsBlockingOpenTotal: verifiedOpenSplit.blocking,
      findingsAdvisoryOpenTotal: verifiedOpenSplit.advisory
    };
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
