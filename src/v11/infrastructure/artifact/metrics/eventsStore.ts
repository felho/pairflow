import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import {
  assertValidMetricsEvent,
  resolveMetricsShardPath
} from "../../../shared/metrics/events.js";
import type {
  AppendMetricsEventInput,
  AppendMetricsEventPort,
  AppendMetricsEventResult
} from "../../../shared/metrics/eventsStorePort.js";
import { FileLockTimeoutError, withFileLock } from "../../../../core/util/fileLock.js";

const defaultLockTimeoutMs = 5_000;
const defaultStaleLockRecoveryAfterMs = 1_000;

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

export const appendMetricsEvent: AppendMetricsEventPort = async (
  input: AppendMetricsEventInput
): Promise<AppendMetricsEventResult> => {
  const event = assertValidMetricsEvent(input.event);
  const shardPath = resolveMetricsShardPath({
    at: new Date(event.ts),
    ...(input.rootPath !== undefined ? { rootPath: input.rootPath } : {})
  });

  try {
    const staleLockRecoveryAfterMs =
      input.staleLockRecoveryAfterMs === undefined
        ? defaultStaleLockRecoveryAfterMs
        : input.staleLockRecoveryAfterMs;

    await withFileLock(
      {
        lockPath: shardPath.lockPath,
        timeoutMs: input.lockTimeoutMs ?? defaultLockTimeoutMs,
        ...(staleLockRecoveryAfterMs !== null
          ? { staleAfterMs: staleLockRecoveryAfterMs }
          : {}),
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
};
