import type {
  MetricsMetaReviewRouteCounts,
  MetricsReportEvent
} from "./types.js";

export interface ReviewerFindingMetadata {
  hasFindings: boolean;
  noFindings: boolean;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

const metaReviewRouteKeys = [
  "auto_rework",
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
] as const;

export type MetaReviewRouteKey = (typeof metaReviewRouteKeys)[number];

function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

export function summarizeQuantiles(values: number[]): {
  sample_size: number;
  median: number | null;
  p90: number | null;
} {
  if (values.length === 0) {
    return {
      sample_size: 0,
      median: null,
      p90: null
    };
  }

  const sorted = [...values].sort((left, right) => left - right);
  const medianIndex = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[medianIndex - 1] ?? 0) + (sorted[medianIndex] ?? 0)) / 2
      : (sorted[medianIndex] ?? 0);
  const p90Rank = Math.max(1, Math.ceil(sorted.length * 0.9));
  const p90 = sorted[p90Rank - 1] ?? null;

  return {
    sample_size: sorted.length,
    median: roundTo(median, 2),
    p90: p90 === null ? null : roundTo(p90, 2)
  };
}

function asNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

export function parseReviewerFindingMetadata(
  metadata: Record<string, unknown>
): ReviewerFindingMetadata | null {
  if (
    typeof metadata.has_findings !== "boolean" ||
    typeof metadata.no_findings !== "boolean"
  ) {
    return null;
  }

  const p0 = asNonNegativeInteger(metadata.p0);
  const p1 = asNonNegativeInteger(metadata.p1);
  const p2 = asNonNegativeInteger(metadata.p2);
  const p3 = asNonNegativeInteger(metadata.p3);
  if (p0 === null || p1 === null || p2 === null || p3 === null) {
    return null;
  }

  return {
    hasFindings: metadata.has_findings,
    noFindings: metadata.no_findings,
    p0,
    p1,
    p2,
    p3
  };
}

export function rate(count: number, total: number): number | null {
  if (total === 0) {
    return null;
  }
  return roundTo(count / total, 4);
}

export function createEmptyMetaReviewRouteCounts(): MetricsMetaReviewRouteCounts {
  return {
    auto_rework: 0,
    human_gate_sticky_bypass: 0,
    human_gate_approve: 0,
    human_gate_budget_exhausted: 0,
    human_gate_inconclusive: 0,
    human_gate_run_failed: 0,
    human_gate_dispatch_failed: 0
  };
}

export function asMetaReviewRouteKey(value: unknown): MetaReviewRouteKey | null {
  if (typeof value !== "string") {
    return null;
  }
  return (metaReviewRouteKeys as readonly string[]).includes(value)
    ? (value as MetaReviewRouteKey)
    : null;
}

export function parseJsonStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export function incrementReasonCodeCounts(
  counts: Record<string, number>,
  codes: string[]
): void {
  for (const code of codes) {
    counts[code] = (counts[code] ?? 0) + 1;
  }
}

export function buildRoundKey(bubbleInstanceId: string, round: number): string {
  return `${bubbleInstanceId}:${String(round)}`;
}

export function isHumanInterventionEvent(event: MetricsReportEvent): boolean {
  if (event.actorRole === "human") {
    return true;
  }

  return event.eventType === "bubble_asked_human";
}
