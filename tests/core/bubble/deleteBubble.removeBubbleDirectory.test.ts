import { afterEach, describe, expect, it, vi } from "vitest";

const rmMock = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual("node:fs/promises");
  return {
    ...(actual as Record<string, unknown>),
    rm: rmMock
  };
});

import {
  deleteBubble,
  type DeleteBubbleDependencies
} from "../../../src/v11/application/delete/deleteBubble.js";
import { deleteBubbleDependencyDefaults } from "../../../src/v11/defaults/delete/deleteBubbleDefaults.js";
import type {
  CreateArchiveSnapshotResult
} from "../../../src/v11/infrastructure/artifact/archive/archiveSnapshot.js";
import type {
  UpsertDeletedArchiveIndexEntryResult
} from "../../../src/v11/infrastructure/artifact/archive/archiveIndex.js";

function buildDependencies(): DeleteBubbleDependencies {
  const resolveBubbleById: NonNullable<DeleteBubbleDependencies["resolveBubbleById"]> =
    () =>
      Promise.resolve({
        bubbleId: "b-delete-rm-01",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
          bubble_branch: "pairflow/bubble/b-delete-rm-01"
        },
        bubblePaths: {
          bubbleTomlPath: "/tmp/bubble-dir/bubble.toml",
          locksDir: "/tmp/repo/.pairflow/locks",
          worktreePath: "/tmp/worktree",
          runtimeDir: "/tmp/runtime",
          sessionsPath: "/tmp/sessions.json",
          bubbleDir: "/tmp/bubble-dir",
          statePath: "/tmp/state.json"
        }
      }) as ReturnType<
        NonNullable<DeleteBubbleDependencies["resolveBubbleById"]>
      >;

  return {
    ...deleteBubbleDependencyDefaults,
    resolveBubbleById,
    pathExists: vi.fn(async () => false),
    branchExists: vi.fn(() => Promise.resolve(false)),
    runTmux: vi.fn(() => Promise.resolve({
      stdout: "",
      stderr: "no session",
      exitCode: 1
    })),
    readRuntimeSessionsRegistry: vi.fn(() => Promise.resolve({})),
    createArchiveSnapshot: vi.fn(async () => ({
      archivePath: "/tmp/archive/bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
      manifest: {
        schema_version: 1,
        archived_at: "2026-04-09T00:00:00.000Z",
        repo_path: "/tmp/repo",
        repo_key: "tmp-repo",
        bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
        bubble_id: "b-delete-rm-01",
        source_bubble_dir: "/tmp/bubble-dir",
        archived_files: []
      },
      reusedExisting: false
    } satisfies CreateArchiveSnapshotResult)),
    upsertDeletedArchiveIndexEntry: vi.fn(async () => ({
      indexPath: "/tmp/repo/.pairflow/archive/index.json",
      entry: {
        bubble_instance_id: "bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
        bubble_id: "b-delete-rm-01",
        repo_path: "/tmp/repo",
        repo_key: "tmp-repo",
        archive_path: "/tmp/archive/bi_00m8f7w14k_2f03e8b8e4f24d17ac12",
        status: "deleted",
        created_at: "2026-04-09T00:00:00.000Z",
        deleted_at: "2026-04-09T00:00:00.000Z",
        purged_at: null,
        updated_at: "2026-04-09T00:00:00.000Z"
      }
    } satisfies UpsertDeletedArchiveIndexEntryResult))
  };
}

afterEach(() => {
  rmMock.mockReset();
});

describe("deleteBubble default removeBubbleDirectory", () => {
  it("treats ENOENT as idempotent success", async () => {
    const error = Object.assign(new Error("not found"), {
      code: "ENOENT"
    });
    rmMock.mockRejectedValueOnce(error);

    await expect(
      deleteBubble(
        {
          bubbleId: "b-delete-rm-01",
          cwd: "/tmp/repo"
        },
        buildDependencies()
      )
    ).resolves.toMatchObject({
      deleted: true,
      requiresConfirmation: false
    });

    expect(rmMock).toHaveBeenCalledWith("/tmp/bubble-dir", {
      recursive: true
    });
    expect(rmMock).toHaveBeenCalledWith("/tmp/runtime/watchdog-health/b-delete-rm-01.json");
  });

  it("propagates non-ENOENT removal errors", async () => {
    const error = Object.assign(new Error("permission denied"), {
      code: "EPERM"
    });
    rmMock.mockRejectedValueOnce(error);

    await expect(
      deleteBubble(
        {
          bubbleId: "b-delete-rm-01",
          cwd: "/tmp/repo"
        },
        buildDependencies()
      )
    ).rejects.toThrow("permission denied");

    expect(rmMock).toHaveBeenCalledWith("/tmp/bubble-dir", {
      recursive: true
    });
  });

  it("fails closed when runtime health cleanup fails after bubble directory removal", async () => {
    const error = Object.assign(new Error("health cleanup denied"), {
      code: "EPERM"
    });
    rmMock.mockImplementationOnce(() => Promise.resolve(undefined));
    rmMock.mockImplementationOnce(() => Promise.reject(error));

    await expect(
      deleteBubble(
        {
          bubbleId: "b-delete-rm-01",
          cwd: "/tmp/repo"
        },
        buildDependencies()
      )
    ).rejects.toThrow(
      "Delete failed: bubble_id=b-delete-rm-01 bubble_instance_id=bi_00m8f7w14k_2f03e8b8e4f24d17ac12 step=remove-runtime-health reason=health cleanup denied"
    );

    expect(rmMock).toHaveBeenNthCalledWith(1, "/tmp/bubble-dir", {
      recursive: true
    });
    expect(rmMock).toHaveBeenNthCalledWith(
      2,
      "/tmp/runtime/watchdog-health/b-delete-rm-01.json"
    );
  });
});
