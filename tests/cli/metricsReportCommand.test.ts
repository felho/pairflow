import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getMetricsReportHelpText,
  MetricsReportCommandError,
  parseMetricsReportCommandOptions,
  runMetricsReportCommand
} from "../../src/cli/commands/metrics/report.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(path);
  return path;
}

async function writeShard(root: string, year: string, month: string, lines: string[]): Promise<void> {
  const dir = join(root, year, month);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `events-${year}-${month}.ndjson`), `${lines.join("\n")}\n`, "utf8");
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

describe("metrics report command", () => {
  it("parses required options and help", () => {
    const parsed = parseMetricsReportCommandOptions([
      "--from",
      "2026-02-01",
      "--to",
      "2026-02-28",
      "--format",
      "json"
    ]);
    if (parsed.help) {
      throw new Error("expected parsed options");
    }

    expect(parsed.format).toBe("json");
    expect(parsed.from.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(parsed.to.toISOString()).toBe("2026-02-28T23:59:59.999Z");

    const help = parseMetricsReportCommandOptions(["--help"]);
    expect(help.help).toBe(true);
    expect(getMetricsReportHelpText()).toContain("pairflow metrics report");
  });

  it("rejects invalid ranges", () => {
    expect(() =>
      parseMetricsReportCommandOptions([
        "--from",
        "2026-02-28",
        "--to",
        "2026-02-01"
      ])
    ).toThrow(MetricsReportCommandError);
  });

  it("rejects invalid calendar dates in YYYY-MM-DD input", () => {
    expect(() =>
      parseMetricsReportCommandOptions([
        "--from",
        "2026-02-30",
        "--to",
        "2026-02-28"
      ])
    ).toThrow(MetricsReportCommandError);
  });

  it("runs report in json mode with repo filter", async () => {
    const metricsRoot = await createTempDir("pairflow-cli-metrics-root-");
    const archiveRoot = await createTempDir("pairflow-cli-archive-root-");
    const repoPath = "/tmp/cli-repo";
    await writeShard(metricsRoot, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-12T00:00:00.000Z",
        schema_version: 1,
        repo_path: repoPath,
        bubble_instance_id: "bi_1",
        bubble_id: "b_1",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-12T00:10:00.000Z",
        schema_version: 1,
        repo_path: "/tmp/other-repo",
        bubble_instance_id: "bi_2",
        bubble_id: "b_2",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      })
    ]);

    const result = await runMetricsReportCommand(
      [
        "--from",
        "2026-02-01",
        "--to",
        "2026-02-28",
        "--repo",
        repoPath,
        "--format",
        "json"
      ],
      {
        metricsRootPath: metricsRoot,
        archiveRootPath: archiveRoot
      }
    );

    expect(result).not.toBeNull();
    if (result === null) {
      throw new Error("expected report output");
    }

    const parsedOutput = JSON.parse(result.output) as {
      transparency: {
        matched_event_count: number;
      };
      metrics: {
        false_convergence_count: number;
      };
    };
    expect(parsedOutput.transparency.matched_event_count).toBe(1);
    expect(parsedOutput.metrics.false_convergence_count).toBe(0);
  });

  it("resolves relative --repo paths against cwd", async () => {
    const cwd = await createTempDir("pairflow-cli-cwd-");
    const relativeRepo = "./repo-under-test";
    const repoPath = join(cwd, "repo-under-test");
    await mkdir(repoPath, { recursive: true });
    const normalizedRepoPath = await realpath(repoPath).catch(() => repoPath);

    const metricsRoot = await createTempDir("pairflow-cli-metrics-relative-");
    const archiveRoot = await createTempDir("pairflow-cli-archive-relative-");
    await writeShard(metricsRoot, "2026", "02", [
      JSON.stringify({
        ts: "2026-02-12T00:00:00.000Z",
        schema_version: 1,
        repo_path: normalizedRepoPath,
        bubble_instance_id: "bi_rel_1",
        bubble_id: "b_rel_1",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      }),
      JSON.stringify({
        ts: "2026-02-12T00:10:00.000Z",
        schema_version: 1,
        repo_path: "/tmp/other-repo",
        bubble_instance_id: "bi_rel_2",
        bubble_id: "b_rel_2",
        event_type: "bubble_created",
        round: null,
        actor_role: "orchestrator",
        metadata: {}
      })
    ]);

    const result = await runMetricsReportCommand(
      [
        "--from",
        "2026-02-01",
        "--to",
        "2026-02-28",
        "--repo",
        relativeRepo,
        "--format",
        "json"
      ],
      {
        cwd,
        metricsRootPath: metricsRoot,
        archiveRootPath: archiveRoot
      }
    );

    expect(result).not.toBeNull();
    if (result === null) {
      throw new Error("expected report output");
    }

    expect(result.report.input.repo_path).toBe(normalizedRepoPath);
    expect(result.report.transparency.matched_event_count).toBe(1);
  });

  it("wraps parseArgs unknown option errors as MetricsReportCommandError", async () => {
    await expect(
      runMetricsReportCommand([
        "--from",
        "2026-02-01",
        "--to",
        "2026-02-28",
        "--bogus"
      ])
    ).rejects.toBeInstanceOf(MetricsReportCommandError);
  });

  it("does not wrap unexpected non-domain read errors", async () => {
    const metricsRoot = await createTempDir("pairflow-cli-metrics-root-eisdir-");
    const archiveRoot = await createTempDir("pairflow-cli-archive-root-eisdir-");
    const shardPath = join(metricsRoot, "2026", "02", "events-2026-02.ndjson");
    await mkdir(shardPath, { recursive: true });

    let caught: unknown;
    try {
      await runMetricsReportCommand(
        ["--from", "2026-02-01", "--to", "2026-02-28"],
        {
          metricsRootPath: metricsRoot,
          archiveRootPath: archiveRoot
        }
      );
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).not.toBeInstanceOf(MetricsReportCommandError);
  });
});
