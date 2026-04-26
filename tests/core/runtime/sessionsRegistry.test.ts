import { mkdtemp, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  topologySlotPaneIndexCatalog
} from "../../../src/v11/shared/topology/topologySlotPaneProjection.js";
import * as topologySlotPaneProjection from "../../../src/v11/shared/topology/topologySlotPaneProjection.js";
import {
  claimRuntimeSession,
  readRuntimeSessionsRegistry,
  removeRuntimeSession,
  removeRuntimeSessions,
  RuntimeSessionsRegistryError,
  RuntimeSessionsRegistryLockError,
  upsertRuntimeSession,
  writeRuntimeSessionsRegistry
} from "../../../src/v11/infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { setMetaReviewerPaneBinding } from "../../../src/v11/infrastructure/channel/tmux/metaReviewerPaneBinding.js";
import { runtimePaneIndices } from "../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";

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

  it("accepts legacy runtime session records without workspace authority fields", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      sessionsPath,
      `${JSON.stringify(
        {
          b_sessions_legacy: {
            bubbleId: "b_sessions_legacy",
            repoPath: "/repo/path",
            worktreePath: "/repo/.pairflow-worktrees/b_sessions_legacy",
            tmuxSessionName: "pf-b_sessions_legacy",
            updatedAt: "2026-02-22T16:01:00.000Z"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const loaded = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(loaded.b_sessions_legacy).toEqual({
      bubbleId: "b_sessions_legacy",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_legacy",
      tmuxSessionName: "pf-b_sessions_legacy",
      updatedAt: "2026-02-22T16:01:00.000Z"
    });

    await writeRuntimeSessionsRegistry(sessionsPath, loaded);
    const persistedRaw = await readFile(sessionsPath, "utf8");
    expect(persistedRaw).not.toContain("\"workspaceKind\"");
    expect(persistedRaw).not.toContain("\"workspacePath\"");
  });

  it("roundtrips additive workspace authority fields", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_workspace_01",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_workspace_01",
      workspacePath: "/repo/.pairflow-worktrees/b_sessions_workspace_01",
      workspaceKind: "worktree",
      tmuxSessionName: "pf-b_sessions_workspace_01",
      now: new Date("2026-02-22T16:02:00.000Z")
    });

    const loaded = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(loaded.b_sessions_workspace_01?.workspacePath).toBe(
      "/repo/.pairflow-worktrees/b_sessions_workspace_01"
    );
    expect(loaded.b_sessions_workspace_01?.workspaceKind).toBe("worktree");

    const persistedRaw = await readFile(sessionsPath, "utf8");
    expect(persistedRaw).toContain("\"workspacePath\"");
    expect(persistedRaw).toContain("\"workspaceKind\": \"worktree\"");
  });

  it("rejects invalid workspace kind when reading persisted runtime sessions", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      sessionsPath,
      `${JSON.stringify(
        {
          b_sessions_invalid_workspace_kind: {
            bubbleId: "b_sessions_invalid_workspace_kind",
            repoPath: "/repo/path",
            worktreePath:
              "/repo/.pairflow-worktrees/b_sessions_invalid_workspace_kind",
            workspaceKind: "invalid",
            tmuxSessionName: "pf-b_sessions_invalid_workspace_kind",
            updatedAt: "2026-02-22T16:03:00.000Z"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await expect(
      readRuntimeSessionsRegistry(sessionsPath, {
        allowMissing: false
      })
    ).rejects.toMatchObject({
      name: "RuntimeSessionsRegistryError",
      context: {
        fieldName: "workspaceKind",
        reason: "invalid_workspace_kind"
      }
    });
  });

  it("rejects null workspace kind with dedicated diagnostic", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      sessionsPath,
      `${JSON.stringify(
        {
          b_sessions_null_workspace_kind: {
            bubbleId: "b_sessions_null_workspace_kind",
            repoPath: "/repo/path",
            worktreePath:
              "/repo/.pairflow-worktrees/b_sessions_null_workspace_kind",
            workspaceKind: null,
            tmuxSessionName: "pf-b_sessions_null_workspace_kind",
            updatedAt: "2026-02-22T16:04:00.000Z"
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await expect(
      readRuntimeSessionsRegistry(sessionsPath, {
        allowMissing: false
      })
    ).rejects.toMatchObject({
      name: "RuntimeSessionsRegistryError",
      context: {
        fieldName: "workspaceKind",
        reason: "workspace_kind_null"
      }
    });
  });

  it("tracks meta-reviewer pane binding for existing runtime sessions", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_meta_01",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_meta_01",
      tmuxSessionName: "pf-b_sessions_meta_01",
      now: new Date("2026-02-22T16:05:00.000Z")
    });

    const started = await setMetaReviewerPaneBinding({
      sessionsPath,
      bubbleId: "b_sessions_meta_01",
      active: true,
      now: new Date("2026-02-22T16:05:05.000Z")
    });
    expect(started.updated).toBe(true);
    expect(started.record?.metaReviewerPane).toEqual({
      role: "meta-reviewer",
      paneIndex: runtimePaneIndices.metaReviewer,
      active: true,
      updatedAt: "2026-02-22T16:05:05.000Z"
    });
    expect(Object.hasOwn(started.record?.metaReviewerPane ?? {}, "runId")).toBe(false);

    const stopped = await setMetaReviewerPaneBinding({
      sessionsPath,
      bubbleId: "b_sessions_meta_01",
      active: false,
      now: new Date("2026-02-22T16:05:10.000Z")
    });
    expect(stopped.updated).toBe(true);
    expect(stopped.record?.metaReviewerPane).toMatchObject({
      role: "meta-reviewer",
      paneIndex: runtimePaneIndices.metaReviewer,
      active: false
    });
  });

  it("drops deprecated metaReviewerPane.runId when reading and writing session records", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");
    await mkdir(join(root, "runtime"), { recursive: true });
    await writeFile(
      sessionsPath,
      `${JSON.stringify(
        {
          b_sessions_meta_legacy: {
            bubbleId: "b_sessions_meta_legacy",
            repoPath: "/repo/path",
            worktreePath: "/repo/.pairflow-worktrees/b_sessions_meta_legacy",
            tmuxSessionName: "pf-b_sessions_meta_legacy",
            updatedAt: "2026-02-22T16:08:00.000Z",
            metaReviewerPane: {
              role: "meta-reviewer",
              paneIndex: runtimePaneIndices.metaReviewer,
              active: true,
              runId: "legacy_run_id",
              updatedAt: "2026-02-22T16:08:00.000Z"
            }
          }
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const loaded = await readRuntimeSessionsRegistry(sessionsPath, {
      allowMissing: false
    });
    expect(loaded.b_sessions_meta_legacy?.metaReviewerPane?.active).toBe(true);
    expect(
      Object.hasOwn(loaded.b_sessions_meta_legacy?.metaReviewerPane ?? {}, "runId")
    ).toBe(false);

    await setMetaReviewerPaneBinding({
      sessionsPath,
      bubbleId: "b_sessions_meta_legacy",
      active: false,
      now: new Date("2026-02-22T16:08:10.000Z")
    });

    const persistedRaw = await readFile(sessionsPath, "utf8");
    expect(persistedRaw).not.toContain("\"runId\"");
  });

  it("returns no_runtime_session when binding meta-reviewer pane on missing bubble", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    const result = await setMetaReviewerPaneBinding({
      sessionsPath,
      bubbleId: "b_sessions_meta_missing",
      active: true,
      now: new Date("2026-02-22T16:06:00.000Z")
    });

    expect(result).toEqual({
      updated: false,
      reason: "no_runtime_session"
    });
  });

  it("returns shared_runtime_pane when meta-reviewer pane collides with status pane", async () => {
    const root = await createTempDir();
    const sessionsPath = join(root, "runtime", "sessions.json");

    await upsertRuntimeSession({
      sessionsPath,
      bubbleId: "b_sessions_meta_shared",
      repoPath: "/repo/path",
      worktreePath: "/repo/.pairflow-worktrees/b_sessions_meta_shared",
      tmuxSessionName: "pf-b_sessions_meta_shared",
      now: new Date("2026-02-22T16:07:00.000Z")
    });

    const getTopologySlotPaneIndexForRoleSpy = vi.spyOn(
      topologySlotPaneProjection,
      "getSharedTopologySlotPaneIndexForRole"
    );
    getTopologySlotPaneIndexForRoleSpy.mockImplementation((role) => {
      switch (role) {
        case "meta_reviewer":
          return topologySlotPaneIndexCatalog.status;
        case "implementer":
          return topologySlotPaneIndexCatalog.implementer;
        case "reviewer":
          return topologySlotPaneIndexCatalog.reviewer;
      }
    });
    try {
      const result = await setMetaReviewerPaneBinding({
        sessionsPath,
        bubbleId: "b_sessions_meta_shared",
        active: true,
        now: new Date("2026-02-22T16:07:05.000Z")
      });

      expect(result).toEqual({
        updated: false,
        reason: "shared_runtime_pane"
      });
    } finally {
      getTopologySlotPaneIndexForRoleSpy.mockRestore();
    }
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
