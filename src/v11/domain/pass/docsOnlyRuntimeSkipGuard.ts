import type { AgentRole, BubbleConfig } from "../../../types/bubble.js";

const docsOnlySkipLogRefConflictReasonCode = "DOCS_ONLY_SKIP_LOG_REF_CONFLICT";
const docsOnlyRuntimeChecksSkippedMarkers = [
  "runtime checks intentionally not executed",
  "runtime checks were intentionally not executed"
];
const docsOnlyRuntimeLogRefPattern = /^\.pairflow\/evidence\/[^\s]+\.log$/u;
const docsOnlyRuntimeLogRefPatternText =
  docsOnlyRuntimeLogRefPattern.source.replaceAll("\\/", "/");

function normalizePassSummaryForMarkerScan(summary: string): string {
  return summary.toLowerCase().replace(/\s+/gu, " ").trim();
}

function hasRuntimeChecksSkippedClaim(summary: string): boolean {
  const normalized = normalizePassSummaryForMarkerScan(summary);
  return docsOnlyRuntimeChecksSkippedMarkers.some((marker) =>
    normalized.includes(marker)
  );
}

function collectRuntimeLogRefs(refs: string[]): string[] {
  return refs.filter((ref) => docsOnlyRuntimeLogRefPattern.test(ref));
}

function raiseDocsOnlyRuntimeSkipConflict(
  createError: PairflowCreateCommandError,
  message: string
): never {
  // reason_code=DOCS_ONLY_SKIP_LOG_REF_CONFLICT context=docs_only_runtime_skip_guard
  throw createError(message);
}

export function assertNoDocsOnlySkipLogRefConflict(input: {
  reviewArtifactType: BubbleConfig["review_artifact_type"];
  senderRole: AgentRole;
  summary: string;
  refs: string[];
  createError: PairflowCreateCommandError;
}): void {
  if (input.senderRole !== "implementer" || input.reviewArtifactType !== "document") {
    return;
  }
  if (!hasRuntimeChecksSkippedClaim(input.summary)) {
    return;
  }
  const conflictingRefs = collectRuntimeLogRefs(input.refs);
  if (conflictingRefs.length === 0) {
    return;
  }
  const sampledRefs = conflictingRefs.slice(0, 3).join(",");
  const sampleSuffix = `; example_refs=${sampledRefs}`;
  raiseDocsOnlyRuntimeSkipConflict(
    input.createError,
    `${docsOnlySkipLogRefConflictReasonCode}: reason_code=${docsOnlySkipLogRefConflictReasonCode}; conflicting_ref_count=${conflictingRefs.length}; ref_class=runtime_log_ref; ref_pattern=${docsOnlyRuntimeLogRefPatternText}${sampleSuffix}. Remove runtime log refs or update the summary claim.`
  );
}
