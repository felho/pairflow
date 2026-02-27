import { resolve } from "node:path";

import { type MetricsActorRole } from "../../types/metrics.js";
import { normalizeRepoPath } from "../bubble/repoResolution.js";
import {
  appendMetricsEvent,
  createMetricsEvent,
  type AppendMetricsEventResult
} from "./events.js";

export interface EmitBubbleLifecycleEventInput {
  repoPath: string;
  bubbleId: string;
  bubbleInstanceId: string;
  eventType: string;
  round: number | null;
  actorRole: MetricsActorRole;
  metadata: Record<string, unknown>;
  lockTimeoutMs?: number;
  staleLockRecoveryAfterMs?: number | null;
  now?: Date;
}

export interface EmitBubbleLifecycleEventBestEffortInput
  extends EmitBubbleLifecycleEventInput {
  reportWarning?: (message: string) => void;
}

function defaultWarningReporter(message: string): void {
  process.stderr.write(`${message}\n`);
}

const defaultBestEffortLockTimeoutMs = 150;
const defaultBestEffortStaleLockRecoveryAfterMs = 100;
// Flush threshold for dedupe keys; once reached we reset the cache and keep warning visibility.
const reportedWarningKeyFlushThreshold = 512;
const reportedWarningKeys = new Set<string>();

export function clearReportedBubbleEventWarnings(): void {
  reportedWarningKeys.clear();
}

export async function emitBubbleLifecycleEvent(
  input: EmitBubbleLifecycleEventInput
): Promise<AppendMetricsEventResult> {
  const normalizedRepoPath = await normalizeRepoPath(resolve(input.repoPath));
  return appendMetricsEvent({
    event: createMetricsEvent({
      repo_path: normalizedRepoPath,
      bubble_instance_id: input.bubbleInstanceId,
      bubble_id: input.bubbleId,
      event_type: input.eventType,
      round: input.round,
      actor_role: input.actorRole,
      metadata: input.metadata,
      ...(input.now !== undefined ? { now: input.now } : {})
    }),
    ...(input.lockTimeoutMs !== undefined
      ? { lockTimeoutMs: input.lockTimeoutMs }
      : {}),
    ...(input.staleLockRecoveryAfterMs !== undefined
      ? { staleLockRecoveryAfterMs: input.staleLockRecoveryAfterMs }
      : {})
  });
}

export async function emitBubbleLifecycleEventBestEffort(
  input: EmitBubbleLifecycleEventBestEffortInput
): Promise<void> {
  const reportWarning = input.reportWarning ?? defaultWarningReporter;
  const lockTimeoutMs = input.lockTimeoutMs ?? defaultBestEffortLockTimeoutMs;
  // Best-effort always forwards staleLockRecoveryAfterMs explicitly so this
  // layer's default (100ms) overrides appendMetricsEvent's deeper default.
  const staleLockRecoveryAfterMs =
    input.staleLockRecoveryAfterMs === undefined
      ? defaultBestEffortStaleLockRecoveryAfterMs
      : input.staleLockRecoveryAfterMs;

  try {
    await emitBubbleLifecycleEvent({
      ...input,
      lockTimeoutMs,
      staleLockRecoveryAfterMs
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Dedupe per bubble to avoid suppressing identical failures from other bubbles.
    const warningKey = `${input.bubbleId}:${input.eventType}:${reason}`;
    if (!reportedWarningKeys.has(warningKey)) {
      if (reportedWarningKeys.size >= reportedWarningKeyFlushThreshold) {
        reportedWarningKeys.clear();
      }
      reportedWarningKeys.add(warningKey);
      reportWarning(
        `Pairflow warning: failed to write metrics event ${input.eventType} for bubble ${input.bubbleId}: ${reason}`
      );
    }
  }
}
