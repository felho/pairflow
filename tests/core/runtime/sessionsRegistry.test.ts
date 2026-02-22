import { mkdtemp, mkdir, open, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  claimRuntimeSession,
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  removeRuntimeSessions,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError,
  upsertRuntimeSession
} from "../../../src/core/runtime/sessionsRegistry.js";

const tempDirs: string[] = [];

async function createTempDir(prefix = "pairflow-sessions-registry-"): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("sessionsRegistry", () => {
  it("atomically claims session ownership only when missing", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    const first = await claimRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_claim",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_claim",
      tmuxSessionName: "pf-b_sessions_claim",
      now: new Date("2026-02-22T16:00:00.000Z")
    });
    expect(first.claimed).toBe(true);
    expect(first.record.tmuxSessionName).toBe("pf-b_sessions_claim");

    const second = await claimRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_claim",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_claim",
      tmuxSessionName: "pf-b_sessions_claim_new",
      now: new Date("2026-02-22T16:00:05.000Z")
    });
    expect(second.claimed).toBe(false);
    expect(second.record.tmuxSessionName).toBe("pf-b_sessions_claim");
  });

  it("allows only one winner across concurrent ownership claims", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        claimRuntimeSession({
          sessionsPath,
          bubbleId: "b_sessions_race",
          repoPath: "/repo/path",
          worktreePath: "/repo/.pairflow-worktrees/b_sessions_race",
          tmuxSessionName: `pf-b_sessions_race-${index}`,
          now: new Date(`2026-02-22T16:00:0${index}.000Z`)
        })
      )
    );

    const winners = attempts.filter((result) => result.claimed);
    expect(winners).toHaveLength(1);

    const registry = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    const persisted = registry.b_sessions_race;
    expect(persisted).toBeDefined();
    expect(attempts.every((attempt) => attempt.record.tmuxSessionName === persisted?.tmuxSessionName)).toBe(
      true
    );
  });

  it("upserts and removes runtime sessions with persisted JSON state", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    const upserted = await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_01",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_01",
      tmuxSessionName: "pf-b_sessions_01",
      now: new Date("2026-02-22T16:00:00.000Z")
    });

    expect(upserted.updatedAt).toBe("2026-02-22T16:00:00.000Z");

    const loaded = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(loaded.b_sessions_01?.tmuxSessionName).toBe("pf-b_sessions_01");
    expect(loaded.b_sessions_01?.bubbleId).toBe("b_sessions_01");

    const removed = await removeRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_01"
    });
    expect(removed).toBe(true);

    const afterRemove = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(afterRemove).toEqual({});
  });

  it("fails on invalid sessions JSON content", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(sessionsPath, "{not-json\n", "utf8");

    await expect(
      readRuntimeSessionsRegistry(sessionsPath, { allowMissing: false })
    ).rejects.toBeInstanceOf(RuntimeSessionsRegistryError);
  });

  it("maps lock contention timeout to RuntimeSessionsRegistryLockError", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    const lockPath = `${sessionsPath}.lock`;
    const handle = await open(lockPath, "wx");

    await expect(
      upsertRuntimeSession({
        sessionsPath,
        bubbleId: "b_sessions_02",
        repoPath: "/repo/path",
        worktreePath: "/repo/.pairflow-worktrees/b_sessions_02",
        tmuxSessionName: "pf-b_sessions_02",
        lockTimeoutMs: 10
      })
    ).rejects.toBeInstanceOf(RuntimeSessionsRegistryLockError);

    await handle.close();
  });

  it("removes multiple sessions in one batch with dedupe and missing tracking", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_10",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_10",
      tmuxSessionName: "pf-b_sessions_10",
      now: new Date("2026-02-22T16:10:00.000Z")
    });
    await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_11",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_11",
      tmuxSessionName: "pf-b_sessions_11",
      now: new Date("2026-02-22T16:10:01.000Z")
    });

    const result = await removeRuntimeSessions({
      sessionsPath,
      bubbleIds: ["b_sessions_10", "b_sessions_10", "b_missing", "b_sessions_11"]
    });

    expect(result.removedBubbleIds.sort()).toEqual(["b_sessions_10", "b_sessions_11"]);
    expect(result.missingBubbleIds).toEqual(["b_missing"]);

    const registry = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(registry).toEqual({});
  });
});
