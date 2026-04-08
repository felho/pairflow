import { createReadStream } from "node:fs";
import { createInterface, type Interface } from "node:readline";

import type {
  MetricsReportEvent,
  MetricsReportWarningCounts
} from "../../../../shared/metrics/report/types.js";
import { incrementWarningCount } from "../../../../shared/metrics/report/warnings.js";
import { parseMetricsLine } from "./readEventsParsing.js";

export interface ReadMetricsEventsInput {
  shardPaths: string[];
  from: Date;
  to: Date;
  repoPath?: string;
  onEvent: (event: MetricsReportEvent) => void;
}

export interface ReadMetricsEventsResult {
  parsedEventCount: number;
  matchedEventCount: number;
  skippedUnknownSchemaEvents: number;
  warningCounts: MetricsReportWarningCounts;
}

function isErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export async function readMetricsEvents(
  input: ReadMetricsEventsInput
): Promise<ReadMetricsEventsResult> {
  const warningCounts: MetricsReportWarningCounts = {};

  let parsedEventCount = 0;
  let matchedEventCount = 0;
  let skippedUnknownSchemaEvents = 0;

  for (const shardPath of input.shardPaths) {
    let stream: ReturnType<typeof createReadStream> | undefined;
    let lineReader: Interface | undefined;

    try {
      stream = createReadStream(shardPath, {
        encoding: "utf8"
      });
      lineReader = createInterface({
        input: stream,
        crlfDelay: Number.POSITIVE_INFINITY
      });

      for await (const rawLine of lineReader) {
        const line = rawLine.trim();
        if (line.length === 0) {
          continue;
        }

        const parsed = parseMetricsLine(line, warningCounts);
        if (parsed.kind === "unknown_schema") {
          skippedUnknownSchemaEvents += 1;
          continue;
        }
        if (parsed.kind === "invalid") {
          continue;
        }

        parsedEventCount += 1;

        if (
          parsed.event.tsMs < input.from.getTime() ||
          parsed.event.tsMs > input.to.getTime()
        ) {
          continue;
        }

        if (
          input.repoPath !== undefined &&
          parsed.event.repoPath !== input.repoPath
        ) {
          continue;
        }

        matchedEventCount += 1;
        input.onEvent(parsed.event);
      }
    } catch (error) {
      if (isErrnoCode(error, "ENOENT")) {
        incrementWarningCount(warningCounts, "event_shard_missing_during_read");
        continue;
      }
      throw error;
    } finally {
      lineReader?.close();
      stream?.destroy();
    }
  }

  return {
    parsedEventCount,
    matchedEventCount,
    skippedUnknownSchemaEvents,
    warningCounts
  };
}
