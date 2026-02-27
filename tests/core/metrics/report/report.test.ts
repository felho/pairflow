import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { generateMetricsReport } from "../../../../src/core/metrics/report/report.js";

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

async function sha256(path: string): Promise<string> {
  const raw = await readFile(path);
  return createHash("sha256").update(raw).digest("hex");
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

describe("generateMetricsReport", () => {
  it("computes deterministic baseline metrics on fixture dataset", async () => {
    const metricsRoot = await createTempDir("pairflow-metrics-report-events-");
    const archiveRoot = await createTempDir("pairflow-metrics-report-archive-");
    const repoPath = "/tmp/repo-under-test";

    const shardPath = await writeShard(metricsRoot, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-01T09:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T09:30:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_asked_human",
        round: 1,
        actor_role: "implementer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T10:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "implementer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T10:10:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "reviewer",
        metadata: {
          pass_intent: "fix_request",
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 0,
          p2: 2,
          p3: 0
        }
      }),
      JSON.stringify({
        ts: "2026-02-01T10:20:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_passed",
        round: 2,
        actor_role: "implementer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T10:50:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_converged",
        round: 2,
        actor_role: "reviewer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T11:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_rework_requested",
        round: 2,
        actor_role: "human",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T11:10:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_a",
        bubble_id: "b_a",
        event_type: "bubble_passed",
        round: 2,
        actor_role: "reviewer",
        metadata: {
          pass_intent: "fix_request",
          has_findings: true,
          no_findings: false,
          p0: 0,
          p1: 1,
          p2: 0,
          p3: 0
        }
      }),
      JSON.stringify({
        ts: "2026-02-01T12:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_b",
        bubble_id: "b_b",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T12:05:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_b",
        bubble_id: "b_b",
        event_type: "bubble_passed",
        round: 1,
        actor_role: "implementer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T12:35:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_b",
        bubble_id: "b_b",
        event_type: "bubble_converged",
        round: 1,
        actor_role: "reviewer",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T13:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_c",
        bubble_id: "b_c",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-01T14:00:00.000Z",
        schema_version: 2,
        repo_path: repoPath,
        bubble_instance_id: "bi_legacy",
        bubble_id: "b_legacy",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      })
    ]);

    const archiveIndexPath = join(archiveRoot, "index.json");
    await writeFile(
      archiveIndexPath,
      `${JSON.stringify(
        {
          schema_version: 1,
          entries: [
            {
              bubble_instance_id: "bi_a",
              bubble_id: "b_a",
              repo_path: repoPath,
              repo_key: "repo_a",
              archive_path: "/tmp/archive/a",
              status: "deleted",
              created_at: "2026-02-01T09:00:00.000Z",
              deleted_at: "2026-02-01T11:00:00.000Z",
              purged_at: null
            },
            {
              bubble_instance_id: "bi_b",
              bubble_id: "b_b",
              repo_path: repoPath,
              repo_key: "repo_b",
              archive_path: "/tmp/archive/b",
              status: "purged",
              created_at: "2026-02-01T12:00:00.000Z",
              deleted_at: "2026-02-01T12:40:00.000Z",
              purged_at: "2026-02-01T13:00:00.000Z",
              updated_at: "2026-02-01T13:00:00.000Z"
            },
            {
              bubble_instance_id: "bi_b",
              bubble_id: "b_b_dup",
              repo_path: repoPath,
              repo_key: "repo_b_dup",
              archive_path: "/tmp/archive/b2",
              status: "active",
              created_at: "2026-02-01T12:00:00.000Z",
              deleted_at: null,
              purged_at: null,
              updated_at: "2026-02-01T13:10:00.000Z"
            }
          ]
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const beforeShardHash = await sha256(shardPath);
    const beforeIndexHash = await sha256(archiveIndexPath);
    const beforeShardStat = await stat(shardPath);
    const beforeIndexStat = await stat(archiveIndexPath);

    const report = await generateMetricsReport({
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-02T00:00:00.000Z"),
      metricsRootPath: metricsRoot,
      archiveRootPath: archiveRoot
    });

    expect(report.transparency.scanned_shard_count).toBe(1);
    expect(report.transparency.parsed_event_count).toBe(12);
    expect(report.transparency.matched_event_count).toBe(12);
    expect(report.transparency.skipped_unknown_schema_events).toBe(1);

    expect(report.metrics.rounds_to_converge).toEqual({
      sample_size: 2,
      median: 1.5,
      p90: 2
    });
    expect(report.metrics.review_cycle_time_minutes).toEqual({
      sample_size: 3,
      median: 30,
      p90: 30
    });
    expect(report.metrics.rounds_with_only_p2_p3).toEqual({
      count: 1,
      total: 2,
      rate: 0.5
    });
    expect(report.metrics.human_intervention_rate).toEqual({
      count: 1,
      total: 3,
      rate: 0.3333
    });
    expect(report.metrics.false_convergence_count).toBe(1);
    expect(report.metrics.escaped_p1_after_converged).toBe(1);

    expect(report.archive_context.available).toBe(true);
    expect(report.archive_context.considered_entries).toBe(3);
    expect(report.archive_context.status_counts).toEqual({
      active: 1,
      deleted: 1,
      purged: 1
    });
    expect(report.archive_context.missing_updated_at_count).toBe(1);

    expect(report.warnings.by_code.archive_index_entry_missing_updated_at).toBe(1);
    expect(report.warnings.by_code.archive_index_duplicate_bubble_instance_id).toBe(
      1
    );

    const afterShardHash = await sha256(shardPath);
    const afterIndexHash = await sha256(archiveIndexPath);
    const afterShardStat = await stat(shardPath);
    const afterIndexStat = await stat(archiveIndexPath);

    expect(afterShardHash).toBe(beforeShardHash);
    expect(afterIndexHash).toBe(beforeIndexHash);
    expect(afterShardStat.mtimeMs).toBe(beforeShardStat.mtimeMs);
    expect(afterIndexStat.mtimeMs).toBe(beforeIndexStat.mtimeMs);
  });

  it("degrades gracefully when archive index is missing", async () => {
    const metricsRoot = await createTempDir("pairflow-metrics-report-events-");
    const archiveRoot = await createTempDir("pairflow-metrics-report-archive-empty-");
    await writeShard(metricsRoot, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-03T00:00:00.000Z",
        schema_version: 1,
        repo_path: "/tmp/repo",
        bubble_instance_id: "bi_1",
        bubble_id: "b_1",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      })
    ]);

    const report = await generateMetricsReport({
      from: new Date("2026-02-01T00:00:00.000Z"),
      to: new Date("2026-02-28T23:59:59.999Z"),
      metricsRootPath: metricsRoot,
      archiveRootPath: archiveRoot
    });

    expect(report.archive_context.available).toBe(false);
    expect(report.warnings.by_code.archive_index_missing).toBe(1);
  });
});
