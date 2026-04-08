import { access } from "node:fs/promises";
import { join } from "node:path";

import { resolveMetricsEventsRoot } from "../../../../shared/metrics/events.js";

export interface SelectMetricsShardsInput {
  from: Date;
  to: Date;
  rootPath?: string;
}

export interface MetricsShardSelection {
  metricsRootPath: string;
  shardPaths: string[];
}

interface MetricsReportDateRangeErrorContext {
  from?: string | undefined;
  label?: string | undefined;
  reason?: string | undefined;
  to?: string | undefined;
}

interface MetricsReportDateRangeErrorOptions extends ErrorOptions {
  context?: MetricsReportDateRangeErrorContext | undefined;
}

export class MetricsReportDateRangeError extends Error {
  public readonly context: MetricsReportDateRangeErrorContext | undefined;

  public constructor(
    message: string,
    options?: MetricsReportDateRangeErrorOptions
  ) {
    super(message, options);
    this.name = "MetricsReportDateRangeError";
    this.context = options?.context;
  }
}

function toMetricsReportDateRangeError(input: {
  message: string;
  context: MetricsReportDateRangeErrorContext;
  cause?: unknown;
}): MetricsReportDateRangeError {
  return new MetricsReportDateRangeError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw toMetricsReportDateRangeError({
      message: `${label} date is invalid.`,
      context: {
        label,
        reason: "invalid_date"
      }
    });
  }
}

function formatMonth(value: number): string {
  return String(value).padStart(2, "0");
}

export async function selectMetricsShards(
  input: SelectMetricsShardsInput
): Promise<MetricsShardSelection> {
  assertValidDate(input.from, "from");
  assertValidDate(input.to, "to");
  if (input.from.getTime() > input.to.getTime()) {
    throw toMetricsReportDateRangeError({
      message: "from date must be <= to date.",
      context: {
        from: input.from.toISOString(),
        reason: "invalid_date_range",
        to: input.to.toISOString()
      }
    });
  }

  const metricsRootPath = resolveMetricsEventsRoot(input.rootPath);
  const shardPaths: string[] = [];

  let cursor = new Date(
    Date.UTC(input.from.getUTCFullYear(), input.from.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(input.to.getUTCFullYear(), input.to.getUTCMonth(), 1)
  );

  while (cursor.getTime() <= end.getTime()) {
    const year = String(cursor.getUTCFullYear());
    const month = formatMonth(cursor.getUTCMonth() + 1);
    const shardPath = join(
      metricsRootPath,
      year,
      month,
      `events-${year}-${month}.ndjson`
    );

    await access(shardPath)
      .then(() => {
        shardPaths.push(shardPath);
      })
      .catch(() => undefined);

    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  return {
    metricsRootPath,
    shardPaths
  };
}
