import { createReadStream } from "node:fs";
import { isAbsolute } from "node:path";
import { createInterface, type Interface } from "node:readline";

import { metricsActorRoles, metricsSchemaVersion } from "../../../types/metrics.js";
import { isInteger, isIsoTimestamp, isNonEmptyString, isRecord } from "../../validation.js";
import type { MetricsReportEvent, MetricsReportWarningCounts } from "./types.js";
import { incrementWarningCount } from "./warnings.js";

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

interface ParseLineResultEvent {
  kind: "event";
  event: MetricsReportEvent;
}

interface ParseLineResultUnknownSchema {
  kind: "unknown_schema";
}

interface ParseLineResultInvalid {
  kind: "invalid";
}

type ParseLineResult =
  | ParseLineResultEvent
  | ParseLineResultUnknownSchema
  | ParseLineResultInvalid;

function isActorRole(value: unknown): value is MetricsReportEvent["actorRole"] {
  return (
    typeof value === "string" &&
    (metricsActorRoles as readonly string[]).includes(value)
  );
}

function validateReviewerPassMetadata(
  metadata: Record<string, unknown>,
  warningCounts: MetricsReportWarningCounts
): void {
  const requiredKeys = ["pass_intent", "has_findings", "no_findings", "p0", "p1", "p2", "p3"] as const;

  const hasMissing = requiredKeys.some((key) => metadata[key] === undefined);
  const hasInvalid =
    (metadata.pass_intent !== undefined && !isNonEmptyString(metadata.pass_intent)) ||
    (metadata.has_findings !== undefined && typeof metadata.has_findings !== "boolean") ||
    (metadata.no_findings !== undefined && typeof metadata.no_findings !== "boolean") ||
    (metadata.p0 !== undefined &&
      (!isInteger(metadata.p0) || metadata.p0 < 0)) ||
    (metadata.p1 !== undefined &&
      (!isInteger(metadata.p1) || metadata.p1 < 0)) ||
    (metadata.p2 !== undefined &&
      (!isInteger(metadata.p2) || metadata.p2 < 0)) ||
    (metadata.p3 !== undefined &&
      (!isInteger(metadata.p3) || metadata.p3 < 0));

  if (hasMissing || hasInvalid) {
    incrementWarningCount(
      warningCounts,
      "event_reviewer_pass_invalid_metadata"
    );
  }
}

function parseMetricsLine(
  line: string,
  warningCounts: MetricsReportWarningCounts
): ParseLineResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line) as unknown;
  } catch {
    incrementWarningCount(warningCounts, "event_invalid_json_line");
    return { kind: "invalid" };
  }

  if (!isRecord(parsed)) {
    incrementWarningCount(warningCounts, "event_invalid_envelope");
    return { kind: "invalid" };
  }

  if (!isInteger(parsed.schema_version)) {
    incrementWarningCount(warningCounts, "event_invalid_schema_version");
    return { kind: "invalid" };
  }

  if (parsed.schema_version !== metricsSchemaVersion) {
    return { kind: "unknown_schema" };
  }

  if (!isNonEmptyString(parsed.ts) || !isIsoTimestamp(parsed.ts)) {
    incrementWarningCount(warningCounts, "event_invalid_ts");
    return { kind: "invalid" };
  }
  if (!isNonEmptyString(parsed.repo_path) || !isAbsolute(parsed.repo_path)) {
    incrementWarningCount(warningCounts, "event_invalid_repo_path");
    return { kind: "invalid" };
  }
  if (!isNonEmptyString(parsed.bubble_instance_id)) {
    incrementWarningCount(warningCounts, "event_invalid_bubble_instance_id");
    return { kind: "invalid" };
  }
  if (!isNonEmptyString(parsed.bubble_id)) {
    incrementWarningCount(warningCounts, "event_invalid_bubble_id");
    return { kind: "invalid" };
  }
  if (!isNonEmptyString(parsed.event_type)) {
    incrementWarningCount(warningCounts, "event_invalid_event_type");
    return { kind: "invalid" };
  }
  if (
    parsed.round !== null &&
    parsed.round !== undefined &&
    (!isInteger(parsed.round) || parsed.round <= 0)
  ) {
    incrementWarningCount(warningCounts, "event_invalid_round");
    return { kind: "invalid" };
  }
  if (!isActorRole(parsed.actor_role)) {
    incrementWarningCount(warningCounts, "event_invalid_actor_role");
    return { kind: "invalid" };
  }
  if (!isRecord(parsed.metadata)) {
    incrementWarningCount(warningCounts, "event_invalid_metadata");
    return { kind: "invalid" };
  }

  const tsMs = new Date(parsed.ts).getTime();
  if (Number.isNaN(tsMs)) {
    incrementWarningCount(warningCounts, "event_invalid_ts");
    return { kind: "invalid" };
  }

  const event: MetricsReportEvent = {
    ts: parsed.ts,
    tsMs,
    schemaVersion: parsed.schema_version,
    repoPath: parsed.repo_path,
    bubbleInstanceId: parsed.bubble_instance_id,
    bubbleId: parsed.bubble_id,
    eventType: parsed.event_type,
    round: parsed.round ?? null,
    actorRole: parsed.actor_role,
    metadata: parsed.metadata
  };

  if (event.eventType === "bubble_passed" && event.actorRole === "reviewer") {
    validateReviewerPassMetadata(event.metadata, warningCounts);
  }

  return {
    kind: "event",
    event
  };
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

        // Count successfully parsed known-schema events across scanned shards.
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
      // Ensure handles are not left open when read fails mid-stream.
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
