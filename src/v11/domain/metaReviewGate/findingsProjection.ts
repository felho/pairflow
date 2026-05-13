import { isRecord } from "../../shared/validation/primitives.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingSeverity,
  isFindingTiming,
  type Finding
} from "../../../contracts/kernel/findings.js";

function resolveStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return normalized.length > 0 ? normalized : undefined;
}

function resolveEvidenceValue(value: unknown): string | string[] | undefined {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return resolveStringArray(value);
}

function resolveProjectedSeverity(entry: Record<string, unknown>) {
  if (isFindingSeverity(entry.severity)) {
    return entry.severity;
  }
  if (isFindingPriority(entry.priority)) {
    return entry.priority;
  }
  return undefined;
}

// This projection intentionally collapses three artifact states to "no payload findings":
// non-array findings input, empty findings array, and arrays whose entries all fail the
// displayable-finding contract. The protocol only distinguishes presence vs absence here.
export function projectDisplayableFindingsFromArtifact(
  findings: unknown
): Finding[] | undefined {
  if (!Array.isArray(findings)) {
    return undefined;
  }

  const projected: Finding[] = [];
  for (const entry of findings) {
    if (!isRecord(entry)) {
      continue;
    }

    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    if (title.length === 0) {
      continue;
    }

    const severity = resolveProjectedSeverity(entry);
    if (severity === undefined) {
      continue;
    }

    const priority = isFindingPriority(entry.priority) ? entry.priority : undefined;
    const finding: Finding = {
      title,
      severity,
      ...(priority !== undefined ? { priority } : {})
    };

    if (typeof entry.detail === "string" && entry.detail.trim().length > 0) {
      finding.detail = entry.detail;
    }
    if (typeof entry.code === "string" && entry.code.trim().length > 0) {
      finding.code = entry.code;
    }
    const refs = resolveStringArray(entry.refs);
    if (refs !== undefined) {
      finding.refs = refs;
    }
    if (isFindingTiming(entry.timing)) {
      finding.timing = entry.timing;
    }
    if (isFindingLayer(entry.layer)) {
      finding.layer = entry.layer;
    }
    const evidence = resolveEvidenceValue(entry.evidence);
    if (evidence !== undefined) {
      finding.evidence = evidence;
    }
    if (isFindingPriority(entry.effective_priority)) {
      finding.effective_priority = entry.effective_priority;
    }

    projected.push(finding);
  }

  return projected.length > 0 ? projected : undefined;
}
