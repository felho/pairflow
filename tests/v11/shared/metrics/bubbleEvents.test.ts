import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  clearReportedBubbleEventWarnings,
  emitBubbleLifecycleEventBestEffort
} from "../../../../src/v11/defaults/metrics/bubbleEvents.js";
import { resolveMetricsShardPath } from "../../../../src/v11/shared/metrics/events.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-bubble-metrics-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  clearReportedBubbleEventWarnings();
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("bubble metrics best-effort warnings", () => {
  it("deduplicates repeated warning keys and can be reset", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    const emit = () =>
      emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId: "b_warn_01",
        bubbleInstanceId: "",
        eventType: "bubble_passed",
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });

    await emit();
    await emit();
    expect(warnings).toHaveLength(1);

    clearReportedBubbleEventWarnings();
    await emit();
    expect(warnings).toHaveLength(2);
  });

  it("caps dedupe key memory and clears when cap is reached", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    for (let index = 0; index <= 512; index += 1) {
      await emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId: "b_warn_cap_01",
        bubbleInstanceId: "",
        eventType: `event_${index}`,
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });
    }

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_cap_01",
      bubbleInstanceId: "",
      eventType: "event_0",
      round: 1,
      actorRole: "implementer",
      metadata: {},
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    expect(warnings).toHaveLength(514);
  });

  it("deduplicates by bubble id so different bubbles still warn", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    const emitForBubble = (bubbleId: string) =>
      emitBubbleLifecycleEventBestEffort({
        repoPath: "/tmp/repo",
        bubbleId,
        bubbleInstanceId: "",
        eventType: "bubble_passed",
        round: 1,
        actorRole: "implementer",
        metadata: {},
        reportWarning: (message) => {
          warnings.push(message);
        }
      });

    await emitForBubble("b_warn_a");
    await emitForBubble("b_warn_b");

    expect(warnings).toHaveLength(2);
  });

  it("does not deduplicate distinct failure reasons for the same bubble and event", async () => {
    clearReportedBubbleEventWarnings();
    const warnings: string[] = [];

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_reason_01",
      bubbleInstanceId: "",
      eventType: "bubble_passed",
      round: 1,
      actorRole: "implementer",
      metadata: {},
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_reason_01",
      bubbleInstanceId: "bi_00m8f7w14k_2f03e8b8e4f24d98",
      eventType: "bubble_passed",
      round: 0,
      actorRole: "implementer",
      metadata: {},
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("bubble_instance_id must be a non-empty string");
    expect(warnings[1]).toContain("round must be null or a positive integer");
  });

  it("warns when recovery is disabled, then recovers after re-enabling stale lock recovery", async () => {
    clearReportedBubbleEventWarnings();
    const root = await createTempDir();
    const now = new Date("2026-02-27T09:00:00.000Z");
    const shardPath = resolveMetricsShardPath({
      at: now,
      rootPath: root
    });
    const staleTimestamp = new Date("2026-02-27T08:58:00.000Z");
    const warnings: string[] = [];

    await mkdir(dirname(shardPath.lockPath), { recursive: true });
    await writeFile(shardPath.lockPath, "", "utf8");
    await utimes(shardPath.lockPath, staleTimestamp, staleTimestamp);

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_recover_01",
      bubbleInstanceId: "bi_00m8f7w14k_2f03e8b8e4f24d99",
      eventType: "bubble_passed",
      round: 1,
      actorRole: "implementer",
      metadata: {},
      rootPath: root,
      now,
      lockTimeoutMs: 20,
      staleLockRecoveryAfterMs: null,
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Could not acquire metrics shard lock");

    await writeFile(shardPath.lockPath, "", "utf8");
    await utimes(shardPath.lockPath, staleTimestamp, staleTimestamp);

    await emitBubbleLifecycleEventBestEffort({
      repoPath: "/tmp/repo",
      bubbleId: "b_warn_recover_01",
      bubbleInstanceId: "bi_00m8f7w14k_2f03e8b8e4f24d99",
      eventType: "bubble_passed",
      round: 1,
      actorRole: "implementer",
      metadata: {},
      rootPath: root,
      now,
      // Keep enough post-recovery budget so this test validates best-effort
      // recovery behavior rather than the file-lock contract that can still
      // timeout after a successful stale-lock cleanup under heavy suite load.
      lockTimeoutMs: 80,
      staleLockRecoveryAfterMs: 20,
      reportWarning: (message) => {
        warnings.push(message);
      }
    });

    expect(warnings).toHaveLength(1);

    const lines = (await readFile(shardPath.filePath, "utf8"))
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    expect(lines).toHaveLength(1);
  });
});
