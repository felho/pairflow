import { isRecord } from "../validation/primitives.js";
import { resolveFindingPriority } from "../../../types/findings.js";
import { resolveNonNegativeIntegerField } from "./metaReviewGateFindingsClaimParsing.js";

export interface FindingsOpenSplit {
  blockingOpenTotal: number;
  advisoryOpenTotal: number;
}

export interface MetaReviewGateAdvisoryFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

export function deriveFindingsOpenSplit(findings: unknown): FindingsOpenSplit | null {
  if (!Array.isArray(findings)) {
    return null;
  }

  let blockingOpenTotal = 0;
  let advisoryOpenTotal = 0;
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }
    const priority = resolveFindingPriority({
      priority: entry.priority,
      severity: entry.severity
    });
    if (priority === "P0" || priority === "P1") {
      blockingOpenTotal += 1;
      continue;
    }
    if (priority === "P2" || priority === "P3") {
      advisoryOpenTotal += 1;
    }
  }

  return {
    blockingOpenTotal,
    advisoryOpenTotal
  };
}

export function resolveFindingsOpenSplitFromFindings(
  findings: unknown
): {
  findings_blocking_open_total: number;
  findings_advisory_open_total: number;
} | null {
  const derived = deriveFindingsOpenSplit(findings);
  if (derived === null) {
    return null;
  }
  return {
    findings_blocking_open_total: derived.blockingOpenTotal,
    findings_advisory_open_total: derived.advisoryOpenTotal
  };
}

export function resolveFindingsOpenSplitFromReportJson(
  reportJson: Record<string, unknown>
): {
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
} {
  const derived = resolveFindingsOpenSplitFromFindings(reportJson.findings);
  const hasExplicitBlocking = Object.hasOwn(
    reportJson,
    "findings_blocking_open_total"
  );
  const hasExplicitAdvisory = Object.hasOwn(
    reportJson,
    "findings_advisory_open_total"
  );
  const explicitBlocking = resolveNonNegativeIntegerField(
    reportJson,
    "findings_blocking_open_total"
  );
  const explicitAdvisory = resolveNonNegativeIntegerField(
    reportJson,
    "findings_advisory_open_total"
  );
  const hasExplicitInvalidSplitField =
    (hasExplicitBlocking && explicitBlocking === null) ||
    (hasExplicitAdvisory && explicitAdvisory === null);
  if (hasExplicitInvalidSplitField) {
    return {
      findings_blocking_open_total: null,
      findings_advisory_open_total: null
    };
  }

  return {
    findings_blocking_open_total:
      (explicitBlocking === undefined
        ? derived?.findings_blocking_open_total
        : explicitBlocking) ?? null,
    findings_advisory_open_total:
      (explicitAdvisory === undefined
        ? derived?.findings_advisory_open_total
        : explicitAdvisory) ?? null
  };
}

export function resolveOptionalFindingRefs(
  entry: Record<string, unknown>
): string[] | undefined {
  if (!Array.isArray(entry.refs)) {
    return undefined;
  }
  const refs = entry.refs
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return refs.length > 0 ? refs : undefined;
}

export function resolveAdvisoryFindingsFromFindings(
  findings: unknown
): MetaReviewGateAdvisoryFinding[] | undefined {
  if (!Array.isArray(findings)) {
    return undefined;
  }
  if (findings.length === 0) {
    return [];
  }
  const advisoryFindings: MetaReviewGateAdvisoryFinding[] = [];
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }
    const priority = resolveFindingPriority({
      priority: entry.priority,
      severity: entry.severity
    });
    if (priority !== "P2" && priority !== "P3") {
      continue;
    }
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (title.length === 0) {
      continue;
    }
    const refs = resolveOptionalFindingRefs(entry);
    advisoryFindings.push({
      severity: priority,
      title,
      ...(refs !== undefined ? { refs } : {})
    });
  }
  return advisoryFindings.length > 0 ? advisoryFindings : undefined;
}

export function resolveAdvisoryFindingsFromReportJson(
  reportJson: Record<string, unknown> | undefined
): MetaReviewGateAdvisoryFinding[] | undefined {
  if (reportJson === undefined) {
    return undefined;
  }
  return resolveAdvisoryFindingsFromFindings(reportJson.findings);
}
