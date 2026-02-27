import { resolveArchiveRootPath } from "../../archive/archivePaths.js";
import { MetricsReportAggregator } from "./aggregate.js";
import { readArchiveReportContext } from "./archiveContext.js";
import { readMetricsEvents } from "./readEvents.js";
import { MetricsReportDateRangeError, selectMetricsShards } from "./selectShards.js";
import type { MetricsReportInput, MetricsReportResult } from "./types.js";
import { mergeWarningCounts, toWarningSummary } from "./warnings.js";

export class MetricsReportError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MetricsReportError";
  }
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new MetricsReportError(`${label} date is invalid.`);
  }
}

export async function generateMetricsReport(
  input: MetricsReportInput
): Promise<MetricsReportResult> {
  assertValidDate(input.from, "from");
  assertValidDate(input.to, "to");
  if (input.from.getTime() > input.to.getTime()) {
    throw new MetricsReportError("from date must be <= to date.");
  }

  const shardSelection = await selectMetricsShards({
    from: input.from,
    to: input.to,
    ...(input.metricsRootPath !== undefined
      ? { rootPath: input.metricsRootPath }
      : {})
  }).catch((error: unknown) => {
    if (error instanceof MetricsReportDateRangeError) {
      throw new MetricsReportError(error.message);
    }
    throw error;
  });

  const aggregator = new MetricsReportAggregator();
  const readEventsResult = await readMetricsEvents({
    shardPaths: shardSelection.shardPaths,
    from: input.from,
    to: input.to,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    onEvent: (event) => {
      aggregator.observe(event);
    }
  });

  const archiveRootPath = resolveArchiveRootPath(input.archiveRootPath);
  const archiveContextResult = await readArchiveReportContext({
    archiveRootPath,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {})
  });

  const warningCounts = mergeWarningCounts(
    readEventsResult.warningCounts,
    archiveContextResult.warningCounts
  );

  return {
    input: {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      repo_path: input.repoPath ?? null,
      metrics_root_path: shardSelection.metricsRootPath,
      archive_root_path: archiveRootPath
    },
    transparency: {
      scanned_shard_count: shardSelection.shardPaths.length,
      scanned_shards: shardSelection.shardPaths,
      parsed_event_count: readEventsResult.parsedEventCount,
      matched_event_count: readEventsResult.matchedEventCount,
      skipped_unknown_schema_events: readEventsResult.skippedUnknownSchemaEvents
    },
    metrics: aggregator.finalize(),
    archive_context: archiveContextResult.context,
    warnings: toWarningSummary(warningCounts)
  };
}
