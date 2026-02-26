import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import {
  ensureBubbleInstanceIdForMutation
} from "../../../src/core/bubble/bubbleInstanceId.js";
import { resolveBubbleById } from "../../../src/core/bubble/bubbleLookup.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];
const initialMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;

async function createTempDir(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createTempRepo(): Promise<string> {
  const repoPath = await createTempDir("pairflow-bubble-instance-id-");
  await initGitRepository(repoPath);
  return repoPath;
}

async function removeBubbleInstanceIdFromToml(path: string): Promise<void> {
  const current = parseBubbleConfigToml(await readFile(path, "utf8"));
  const legacy = { ...current };
  delete legacy.bubble_instance_id;
  await writeFile(path, renderBubbleConfigToml(legacy), "utf8");
}

async function readMetricsEvents(metricsRoot: string): Promise<Record<string, unknown>[]> {
  const files = [
    join(metricsRoot, "2026", "02", "events-2026-02.ndjson"),
    join(metricsRoot, "2026", "03", "events-2026-03.ndjson")
  ];
  const events: Record<string, unknown>[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return "";
      }
      throw error;
    });

    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      events.push(JSON.parse(line) as Record<string, unknown>);
    }
  }

  return events;
}

afterEach(async () => {
  if (initialMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
  } else {
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = initialMetricsRoot;
  }

  await Promise.all(
    tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe("bubble_instance_id legacy migration", () => {
  it("does not mutate on read-only lookup, then backfills on first mutating command", async () => {
    const metricsRoot = await createTempDir("pairflow-metrics-legacy-backfill-");
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;

    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_backfill_01",
      task: "Need legacy backfill"
    });

    await removeBubbleInstanceIdFromToml(bubble.paths.bubbleTomlPath);

    await resolveBubbleById({
      bubbleId: bubble.bubbleId,
      repoPath
    });

    const afterReadOnly = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    expect(afterReadOnly.bubble_instance_id).toBeUndefined();

    const now = new Date("2026-02-26T13:20:00.000Z");
    await emitAskHumanFromWorkspace({
      question: "Need product decision",
      cwd: bubble.paths.worktreePath,
      now
    });

    const afterMutating = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    expect(afterMutating.bubble_instance_id).toMatch(/^bi_[A-Za-z0-9_-]{10,}$/u);

    const events = await readMetricsEvents(metricsRoot);
    const bubbleEvents = events.filter(
      (event) => event.bubble_id === "b_backfill_01"
    );

    expect(
      bubbleEvents.some((event) => event.event_type === "bubble_instance_backfilled")
    ).toBe(true);

    const askHumanEvent = bubbleEvents.find(
      (event) => event.event_type === "bubble_asked_human"
    );
    expect(askHumanEvent).toBeDefined();
    expect(askHumanEvent).toMatchObject({
      schema_version: 1,
      bubble_id: "b_backfill_01",
      event_type: "bubble_asked_human",
      actor_role: "implementer",
      round: 1
    });
    expect(askHumanEvent).toHaveProperty("ts");
    expect(askHumanEvent).toHaveProperty("repo_path");
    expect(askHumanEvent).toHaveProperty("bubble_instance_id");
    expect(askHumanEvent).toHaveProperty("metadata");
  });

  it("is race-safe under bubble lock and backfills exactly once", async () => {
    const metricsRoot = await createTempDir("pairflow-metrics-backfill-race-");
    process.env.PAIRFLOW_METRICS_EVENTS_ROOT = metricsRoot;

    const repoPath = await createTempRepo();
    const created = await createBubble({
      id: "b_backfill_race_01",
      repoPath,
      baseBranch: "main",
      task: "Race-safe backfill",
      cwd: repoPath
    });

    await removeBubbleInstanceIdFromToml(created.paths.bubbleTomlPath);

    const resolved = await resolveBubbleById({
      bubbleId: created.bubbleId,
      repoPath
    });

    const now = new Date("2026-02-26T14:10:00.000Z");
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        ensureBubbleInstanceIdForMutation({
          bubbleId: resolved.bubbleId,
          repoPath: resolved.repoPath,
          bubblePaths: resolved.bubblePaths,
          bubbleConfig: resolved.bubbleConfig,
          now
        })
      )
    );

    const ids = new Set(results.map((result) => result.bubbleInstanceId));
    expect(ids.size).toBe(1);
    expect(results.filter((result) => result.backfilled).length).toBe(1);

    const persisted = parseBubbleConfigToml(
      await readFile(created.paths.bubbleTomlPath, "utf8")
    );
    expect(persisted.bubble_instance_id).toBe([...ids][0]);

    const events = await readMetricsEvents(metricsRoot);
    const migrationEvents = events.filter(
      (event) =>
        event.bubble_id === "b_backfill_race_01" &&
        event.event_type === "bubble_instance_backfilled"
    );
    expect(migrationEvents).toHaveLength(1);
  });
});
