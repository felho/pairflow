import { resolveArchiveRootPath } from "../../archive/archivePaths.js";
import { MetricsReportAggregator } from "../../../../shared/metrics/report/aggregate.js";
import type { MetricsReportInput, MetricsReportResult } from "../../../../shared/metrics/report/types.js";
import { mergeWarningCounts, toWarningSummary } from "../../../../shared/metrics/report/warnings.js";
import { readArchiveReportContext } from "./archiveContext.js";
import { readMetricsEvents } from "./readEvents.js";
import { MetricsReportDateRangeError, selectMetricsShards } from "./selectShards.js";

export { MetricsReportDateRangeError } from "./selectShards.js";

interface MetricsReportErrorContext {
  from?: string | undefined;
  label?: string | undefined;
  reason?: string | undefined;
  to?: string | undefined;
}

interface MetricsReportErrorOptions extends ErrorOptions {
  context?: MetricsReportErrorContext | undefined;
}

export class MetricsReportError extends Error {
  public readonly context: MetricsReportErrorContext | undefined;

  public constructor(message: string, options?: MetricsReportErrorOptions) {
    super(message, options);
    this.name = "MetricsReportError";
    this.context = options?.context;
  }
}

function toMetricsReportError(input: {
  message: string;
  context: MetricsReportErrorContext;
  cause?: unknown;
}): MetricsReportError {
  return new MetricsReportError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw toMetricsReportError({
      message: `${label} date is invalid.`,
      context: {
        label,
        reason: "invalid_date"
      }
    });
  }
}

export async function generateMetricsReport(
  input: MetricsReportInput
): Promise<MetricsReportResult> {
  assertValidDate(input.from, "from");
  assertValidDate(input.to, "to");
  if (input.from.getTime() > input.to.getTime()) {
    throw toMetricsReportError({
      message: "from date must be <= to date.",
      context: {
        from: input.from.toISOString(),
        reason: "invalid_date_range",
        to: input.to.toISOString()
      }
    });
  }

  const shardSelection = await selectMetricsShards({
    from: input.from,
    to: input.to,
    ...(input.metricsRootPath !== undefined
      ? { rootPath: input.metricsRootPath }
      : {})
  }).catch((error: unknown) => {
    if (error instanceof MetricsReportDateRangeError) {
      throw toMetricsReportError({
        message: error.message,
        context: {
          from: input.from.toISOString(),
          reason: "select_shards_date_range_error",
          to: input.to.toISOString()
        },
        cause: error
      });
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
