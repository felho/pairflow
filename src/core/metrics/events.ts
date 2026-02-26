import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { metricsActorRoles, metricsSchemaVersion, type PairflowMetricsEvent } from "../../types/metrics.js";
import { isInteger, isIsoTimestamp, isNonEmptyString, isRecord } from "../validation.js";
import { FileLockTimeoutError, withFileLock } from "../util/fileLock.js";

const defaultLockTimeoutMs = 5_000;
const metricsEventsRootEnvVar = "PAIRFLOW_METRICS_EVENTS_ROOT";

export interface ResolveMetricsShardPathInput {
  at: Date;
  rootPath?: string;
}

export interface MetricsShardPath {
  rootPath: string;
  year: string;
  month: string;
  filePath: string;
  lockPath: string;
}

export interface CreateMetricsEventInput {
  repo_path: string;
  bubble_instance_id: string;
  bubble_id: string;
  event_type: string;
  round: number | null;
  actor_role: PairflowMetricsEvent["actor_role"];
  metadata: Record<string, unknown>;
  now?: Date;
}

export interface AppendMetricsEventInput {
  event: PairflowMetricsEvent;
  rootPath?: string;
  lockTimeoutMs?: number;
}

export interface AppendMetricsEventResult {
  event: PairflowMetricsEvent;
  shardPath: MetricsShardPath;
}

export class MetricsEventStoreError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MetricsEventStoreError";
  }
}

export class MetricsEventLockError extends MetricsEventStoreError {
  public constructor(message: string) {
    super(message);
    this.name = "MetricsEventLockError";
  }
}

export class MetricsEventValidationError extends MetricsEventStoreError {
  public readonly errors: string[];

  public constructor(errors: string[]) {
    super(`Invalid metrics event: ${errors.join(" ")}`);
    this.name = "MetricsEventValidationError";
    this.errors = errors;
  }
}

function zeroPad(value: number): string {
  return value.toString().padStart(2, "0");
}

function isMetricsActorRole(value: unknown): value is PairflowMetricsEvent["actor_role"] {
  return (
    typeof value === "string" &&
    (metricsActorRoles as readonly string[]).includes(value)
  );
}

export function resolveMetricsEventsRoot(rootPath?: string): string {
  if (rootPath !== undefined) {
    return resolve(rootPath);
  }

  const fromEnv = process.env[metricsEventsRootEnvVar];
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return resolve(fromEnv);
  }

  return join(homedir(), ".pairflow", "metrics", "events");
}

export function resolveMetricsShardPath(
  input: ResolveMetricsShardPathInput
): MetricsShardPath {
  const rootPath = resolveMetricsEventsRoot(input.rootPath);
  const year = String(input.at.getUTCFullYear());
  const month = zeroPad(input.at.getUTCMonth() + 1);
  const shardDir = join(rootPath, year, month);
  const filePath = join(shardDir, `events-${year}-${month}.ndjson`);

  return {
    rootPath,
    year,
    month,
    filePath,
    lockPath: `${filePath}.lock`
  };
}

export function createMetricsEvent(
  input: CreateMetricsEventInput
): PairflowMetricsEvent {
  const now = input.now ?? new Date();
  const event: PairflowMetricsEvent = {
    ts: now.toISOString(),
    schema_version: metricsSchemaVersion,
    repo_path: resolve(input.repo_path),
    bubble_instance_id: input.bubble_instance_id,
    bubble_id: input.bubble_id,
    event_type: input.event_type,
    round: input.round,
    actor_role: input.actor_role,
    metadata: input.metadata
  };

  assertValidMetricsEvent(event);
  return event;
}

export function assertValidMetricsEvent(event: unknown): PairflowMetricsEvent {
  if (!isRecord(event)) {
    throw new MetricsEventValidationError([
      "Event payload must be an object."
    ]);
  }

  const errors: string[] = [];

  if (!isIsoTimestamp(event.ts)) {
    errors.push("ts must be an ISO-8601 UTC timestamp.");
  }

  if (event.schema_version !== metricsSchemaVersion) {
    errors.push(`schema_version must be ${metricsSchemaVersion}.`);
  }

  if (!isNonEmptyString(event.repo_path) || !isAbsolute(event.repo_path)) {
    errors.push("repo_path must be a non-empty absolute path.");
  }

  if (!isNonEmptyString(event.bubble_instance_id)) {
    errors.push("bubble_instance_id must be a non-empty string.");
  }

  if (!isNonEmptyString(event.bubble_id)) {
    errors.push("bubble_id must be a non-empty string.");
  }

  if (!isNonEmptyString(event.event_type)) {
    errors.push("event_type must be a non-empty string.");
  }

  if (
    event.round !== null &&
    (!isInteger(event.round) || event.round <= 0)
  ) {
    errors.push("round must be null or a positive integer.");
  }

  if (!isMetricsActorRole(event.actor_role)) {
    errors.push("actor_role must be one of implementer|reviewer|human|orchestrator.");
  }

  if (!isRecord(event.metadata)) {
    errors.push("metadata must be an object.");
  }

  if (errors.length > 0) {
    throw new MetricsEventValidationError(errors);
  }

  return event as unknown as PairflowMetricsEvent;
}

export async function appendMetricsEvent(
  input: AppendMetricsEventInput
): Promise<AppendMetricsEventResult> {
  const event = assertValidMetricsEvent(input.event);
  const timestamp = new Date(event.ts);
  const shardPath = resolveMetricsShardPath({
    at: timestamp,
    ...(input.rootPath !== undefined ? { rootPath: input.rootPath } : {})
  });

  try {
    await withFileLock(
      {
        lockPath: shardPath.lockPath,
        timeoutMs: input.lockTimeoutMs ?? defaultLockTimeoutMs,
        ensureParentDir: true
      },
      async () => {
        await mkdir(dirname(shardPath.filePath), { recursive: true });
        await appendFile(shardPath.filePath, `${JSON.stringify(event)}\n`, {
          encoding: "utf8"
        });
      }
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw new MetricsEventLockError(
        `Could not acquire metrics shard lock: ${shardPath.lockPath}`
      );
    }

    if (error instanceof MetricsEventStoreError) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : String(error);
    throw new MetricsEventStoreError(
      `Failed to append metrics event into ${shardPath.filePath}: ${reason}`
    );
  }

  return {
    event,
    shardPath
  };
}
