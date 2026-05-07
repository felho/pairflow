import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as RepoConfigModule from "../../../../src/config/repoConfig.js";

vi.mock("../../../../src/config/repoConfig.js", async (importOriginal) => {
  const actual = await importOriginal<typeof RepoConfigModule>();
  return {
    ...actual,
    loadPairflowRepoConfig: vi.fn(actual.loadPairflowRepoConfig)
  };
});

import { loadPairflowRepoConfig } from "../../../../src/config/repoConfig.js";
import { createBubble } from "../../../../src/v11/application/create/createBubble.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../../../src/v11/application/status/emitStatusV11.js";
import { statusCommandDependencyDefaults } from "../../../../src/v11/defaults/status/statusCommandDependencyDefaults.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];
const initialMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-repo-defaults-runtime-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-repo-defaults-runtime-"));
  tempDirs.push(root);
  return root;
}

beforeEach(async () => {
  vi.mocked(loadPairflowRepoConfig).mockClear();
  const metricsRoot = await createTempDir();
  process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;
});

afterEach(async () => {
  vi.mocked(loadPairflowRepoConfig).mockRestore();

  if (initialMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  } else {
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = initialMetricsRoot;
  }

  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("create repo defaults runtime isolation", () => {
  it("keeps status reads anchored to materialized bubble config without loading repo config", async () => {
    const repoPath = await createTempRepo();
    await writeFile(
      join(repoPath, "pairflow.toml"),
      [
        "[defaults]",
        'base_branch = "main"',
        "watchdog_timeout_minutes = 45",
        'reviewer_context_mode = "persistent"',
        ""
      ].join("\n"),
      "utf8"
    );

    const result = await createBubble({
      id: "b_create_defaults_runtime_loader_blocked",
      repoPath,
      reviewArtifactType: "code",
      task: "Runtime loader blocked",
      cwd: repoPath
    });

    expect(loadPairflowRepoConfig).toHaveBeenCalled();
    vi.mocked(loadPairflowRepoConfig).mockImplementation(async () => {
      throw new Error("runtime must not load repo config");
    });
    await writeFile(
      join(repoPath, "pairflow.toml"),
      [
        "[defaults]",
        "watchdog_timeout_minutes = 0",
        'pairflow_command_profile = "invalid"',
        ""
      ].join("\n"),
      "utf8"
    );

    const status = await getBubbleStatus({
      bubbleId: result.bubbleId,
      cwd: repoPath,
      now: new Date("2026-02-22T14:03:00.000Z")
    }, statusCommandDependencyDefaults);

    expect(status.watchdog.timeoutMinutes).toBe(45);
    expect(status.bubbleToml).toContain('base_branch = "main"');
    expect(status.bubbleToml).toContain("watchdog_timeout_minutes = 45");
    expect(status.bubbleToml).toContain('reviewer_context_mode = "persistent"');
  });
});
