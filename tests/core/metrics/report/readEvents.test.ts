import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readMetricsEvents } from "../../../../src/core/metrics/report/readEvents.js";
import type { MetricsReportEvent } from "../../../../src/core/metrics/report/types.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

async function writeShard(root: string, year: string, month: string, lines: string[]): Promise<string> {
  const dir = join(root, year, month);
  await mkdir(dir, { recursive: true });
  const shardPath = join(dir, `events-${year}-${month}.ndjson`);
  await writeFile(shardPath, `${lines.join("\n")}\n`, "utf8");
  return shardPath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("readMetricsEvents", () => {
  it("streams events, filters by range/repo, and counts parse warnings", async () => {
    const root = await createTempDir("pairflow-metrics-read-events-");
    const repoA = "/tmp/repo-a";
    const repoB = "/tmp/repo-b";
    const shardPath = await writeShard(root, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-01T10:00:00.000Z",
        schema_version: 1,
        repo_path: repoA,
        bubble_instance_id: "bi_1",
        bubble_id: "b_1",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "implementer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T10:10:00.000Z",
        schema_version: 1,
        repo_path: repoA,
        bubble_instance_id: "bi_1",
        bubble_id: "b_1",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "reviewer",
        metadata: {
          pass_intent: "fix_request",
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 0,
          p2: 1,
          p3: 0
        }
      }),
      JSON.stringify({
        ts: "2026-02-01T11:00:00.000Z",
        schema_version: 1,
        repo_path: repoB,
        bubble_instance_id: "bi_2",
        bubble_id: "b_2",
        event_type: "bubble_converged",
        round: 1,
        actor_role: "reviewer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T11:10:00.000Z",
        schema_version: 2,
        repo_path: repoA,
        bubble_instance_id: "bi_3",
        bubble_id: "b_3",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      "{\"bad\":",
      JSON.stringify({
        ts: "2026-02-01T12:00:00.000Z",
        schema_version: 1,
        repo_path: repoA,
        bubble_instance_id: "bi_4",
        bubble_id: "b_4",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "reviewer",
        metadata: {
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 0,
          p2: 1,
          p3: 0
        }
      })
    ]);

    const collected: MetricsReportEvent[] = [];
    const result = await readMetricsEvents({
      shardPaths: [shardPath],
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-02T00:00:00.000Z"),
      repoPath: repoA,
      onEvent: (event) => {
        collected.push(event);
      }
    });

    expect(result.parsedEventCount).toBe(4);
    expect(result.matchedEventCount).toBe(3);
    expect(result.skippedUnknownSchemaEvents).toBe(1);
    expect(result.warningCounts.event_invalid_json_line).toBe(1);
    expect(result.warningCounts.event_reviewer_pass_invalid_metadata).toBe(1);
    expect(collected.map((event) => event.bubbleInstanceId)).toEqual([
      "bi_1",
      "bi_1",
      "bi_4"
    ]);
  });

  it("treats missing round key as null for forward compatibility", async () => {
    const root = await createTempDir("pairflow-metrics-read-events-round-");
    const shardPath = await writeShard(root, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-01T10:00:00.000Z",
        schema_version: 1,
        repo_path: "/tmp/repo-a",
        bubble_instance_id: "bi_round_1",
        bubble_id: "b_round_1",
        event_type: "bubble_created",
        actor_role: "orchestrator",
        metadata: {}
      })
    ]);

    const collected: MetricsReportEvent[] = [];
    const result = await readMetricsEvents({
      shardPaths: [shardPath],
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-02T00:00:00.000Z"),
      onEvent: (event) => {
        collected.push(event);
      }
    });

    expect(result.parsedEventCount).toBe(1);
    expect(result.matchedEventCount).toBe(1);
    expect(result.warningCounts.event_invalid_round).toBeUndefined();
    expect(collected[0]?.round).toBeNull();
  });

  it("handles a large shard through line-by-line parsing", async () => {
    const root = await createTempDir("pairflow-metrics-read-events-large-");
    const lines: string[] = [];
    for (let index = 0; index < 5000; index += 1) {
      lines.push(
        JSON.stringify({
          ts: "2026-02-05T00:00:00.000Z",
          schema_version: 1,
          repo_path: "/tmp/repo-large",
          bubble_instance_id: `bi_${index}`,
          bubble_id: `b_${index}`,
          event_type: "bubble_created",
          round: null,
          actor_role: "orchestrator",
          metadata: {}
        })
      );
    }
    const shardPath = await writeShard(root, "2026", "02", lines);

    const result = await readMetricsEvents({
      shardPaths: [shardPath],
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-28T23:59:59.999Z"),
      onEvent: () => undefined
    });

    expect(result.parsedEventCount).toBe(5000);
    expect(result.matchedEventCount).toBe(5000);
    expect(result.skippedUnknownSchemaEvents).toBe(0);
  });

  it("continues with warning when shard disappears before read", async () => {
    const missingShardPath = join(
      tmpdir(),
      `pairflow-metrics-missing-${Date.now()}`,
      "events-2026-02.ndjson"
    );

    const result = await readMetricsEvents({
      shardPaths: [missingShardPath],
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-28T23:59:59.999Z"),
      onEvent: () => undefined
    });

    expect(result.parsedEventCount).toBe(0);
    expect(result.matchedEventCount).toBe(0);
    expect(result.warningCounts.event_shard_missing_during_read).toBe(1);
  });

  it("throws non-ENOENT stream errors while closing resources", async () => {
    const root = await createTempDir("pairflow-metrics-read-events-eisdir-");
    const shardPath = join(root, "2026", "02", "events-2026-02.ndjson");
    await mkdir(shardPath, { recursive: true });

    await expect(
      readMetricsEvents({
        shardPaths: [shardPath],
        from: new Date("2026-02-01T00:00:00.000Z"),
        to: new Date("2026-02-28T23:59:59.999Z"),
        onEvent: () => undefined
      })
    ).rejects.toBeInstanceOf(Error);
  });
});
