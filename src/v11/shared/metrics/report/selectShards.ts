import { access } from "node:fs/promises";
import { join } from "node:path";

import { resolveMetricsEventsRoot } from "../events.js";

export interface SelectMetricsShardsInput {
  from: Date;
  to: Date;
  rootPath?: string;
}

export interface MetricsShardSelection {
  metricsRootPath: string;
  shardPaths: string[];
}

export class MetricsReportDateRangeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MetricsReportDateRangeError";
  }
}

function assertValidDate(value: Date, label: string): void {
  if (Number.isNaN(value.getTime())) {
    throw new MetricsReportDateRangeError(`${label} date is invalid.`);
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
    throw new MetricsReportDateRangeError("from date must be <= to date.");
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

    // Only existing shards are scanned.
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
