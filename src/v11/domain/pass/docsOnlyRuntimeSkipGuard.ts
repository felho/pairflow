import type { AgentRole } from "../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleConfig
} from "../../shared/config/bubbleConfigTypes.js";

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
  input: {
    createError: PairflowCreateCommandError;
    conflictingRefs: string[];
  }
): never {
  const sampledRefs = input.conflictingRefs.slice(0, 3).join(",");
  throw input.createError({
    reasonCode: docsOnlySkipLogRefConflictReasonCode,
    message:
      "Runtime-check skip claim conflicts with runtime log refs. Remove runtime log refs or update the summary claim.",
    context: {
      guard: "docs_only_runtime_skip_guard",
      conflicting_ref_count: input.conflictingRefs.length,
      ref_class: "runtime_log_ref",
      ref_pattern: docsOnlyRuntimeLogRefPatternText,
      example_refs: sampledRefs
    }
  });
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
  raiseDocsOnlyRuntimeSkipConflict({
    createError: input.createError,
    conflictingRefs
  });
}
