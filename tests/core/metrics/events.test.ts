import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendMetricsEvent,
  createMetricsEvent,
  MetricsEventValidationError,
  resolveMetricsShardPath
} from "../../../src/core/metrics/events.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-metrics-events-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("metrics events writer", () => {
  it("resolves monthly shard paths as YYYY/MM/events-YYYY-MM.ndjson", async () => {
    const root = await createTempDir();
    const shard = resolveMetricsShardPath({
      at: new Date("2026-02-26T10:11:12.000Z"),
      rootPath: root
    });

    expect(shard.filePath).toBe(
      join(root, "2026", "02", "events-2026-02.ndjson")
    );
    expect(shard.lockPath).toBe(`${shard.filePath}.lock`);
  });

  it("appends validated NDJSON events", async () => {
    const root = await createTempDir();
    const event = createMetricsEvent({
      repo_path: "/tmp/repo",
      bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
      bubble_id: "b_metrics_01",
      event_type: "bubble_created",
      round: null,
      actor_role: "orchestrator",
      metadata: {
        source: "test"
      },
      now: new Date("2026-02-26T10:11:12.000Z")
    });

    const appended = await appendMetricsEvent({
      event,
      rootPath: root
    });

    const raw = await readFile(appended.shardPath.filePath, "utf8");
    const lines = raw.trim().split("\n");
    expect(lines).toHaveLength(1);

    const parsed = JSON.parse(lines[0] ?? "") as Record<string, unknown>;
    expect(parsed.schema_version).toBe(1);
    expect(parsed.event_type).toBe("bubble_created");
  });

  it("uses lock-guarded append under concurrent writes", async () => {
    const root = await createTempDir();
    const now = new Date("2026-02-26T12:00:00.000Z");

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        appendMetricsEvent({
          rootPath: root,
          event: createMetricsEvent({
            repo_path: "/tmp/repo",
            bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
            bubble_id: `b_metrics_${index}`,
            event_type: "bubble_passed",
            round: 1,
            actor_role: "implementer",
            metadata: {
              index
            },
            now
          })
        })
      )
    );

    const shardPath = resolveMetricsShardPath({
      at: now,
      rootPath: root
    });
    const raw = await readFile(shardPath.filePath, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    expect(lines).toHaveLength(20);
    for (const line of lines) {
      expect(() => {
        JSON.parse(line);
      }).not.toThrow();
    }
  });

  it("rejects invalid event envelopes", () => {
    expect(() =>
      createMetricsEvent({
        repo_path: "relative/repo",
        bubble_instance_id: "",
        bubble_id: "",
        event_type: "",
        round: -1,
        actor_role: "orchestrator",
        metadata: {}
      })
    ).toThrow(MetricsEventValidationError);
  });
});
