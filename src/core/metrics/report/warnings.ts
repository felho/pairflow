import type { MetricsReportWarningCounts, MetricsReportWarningSummary } from "./types.js";

export function incrementWarningCount(
  counts: MetricsReportWarningCounts,
  code: string
): void {
  counts[code] = (counts[code] ?? 0) + 1;
}

export function mergeWarningCounts(
  ...all: MetricsReportWarningCounts[]
): MetricsReportWarningCounts {
  const merged: MetricsReportWarningCounts = {};
  for (const counts of all) {
    for (const [code, value] of Object.entries(counts)) {
      merged[code] = (merged[code] ?? 0) + value;
    }
  }
  return merged;
}

export function toWarningSummary(
  counts: MetricsReportWarningCounts
): MetricsReportWarningSummary {
  const sortedEntries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  let total = 0;
  const byCode: Record<string, number> = {};
  for (const [code, value] of sortedEntries) {
    total += value;
    byCode[code] = value;
  }

  return {
    total,
    by_code: byCode
  };
}
