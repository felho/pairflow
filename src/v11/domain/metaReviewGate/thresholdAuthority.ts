import { resolveFindingPriority, type FindingPriority } from "../../../types/findings.js";
import type { FindingsParityMetadata } from "../../../types/protocol.js";
import { isRecord } from "../../shared/validation/primitives.js";
import { buildFindingsParityMetadata } from "./findingsParityMetadata.js";
import type { FindingsOpenSplit } from "./findingsSplit.js";
export {
  REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
  REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED
} from "./thresholdAuthorityResolution.js";

const findingPriorityOrder: FindingPriority[] = ["P0", "P1", "P2", "P3"];

export function buildVerifiedThresholdParityMetadata(input: {
  findingsCount: number;
  artifactOpenTotal: number;
  artifactStatus: string;
  digest: string;
  metaReviewRunId: string;
  artifactSplit: FindingsOpenSplit | null;
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

export function resolveVerifiedThresholdOpenSplitTotals(input: {
  parityMetadata: FindingsParityMetadata | null;
  artifactSplit: FindingsOpenSplit | null;
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

export function resolveHighestOpenSeverity(
  findings: unknown
): FindingPriority | null {
  if (!Array.isArray(findings)) {
    return null;
  }

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
    const index = findingPriorityOrder.indexOf(priority);
    if (index === -1) {
      continue;
    }
    if (highestIndex === null || index < highestIndex) {
      highestIndex = index;
    }
  }

  return highestIndex === null
    ? null
    : (findingPriorityOrder[highestIndex] ?? null);
}

export function metaReviewGateThresholdIsMet(input: {
  highestOpenSeverity: FindingPriority;
  minSeverity: FindingPriority;
}): boolean {
  return (
    findingPriorityOrder.indexOf(input.highestOpenSeverity)
    <= findingPriorityOrder.indexOf(input.minSeverity)
  );
}
