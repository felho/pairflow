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
} from "../../../src/core/bubble/deleteBubble.js";

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
          sessionsPath: "/tmp/sessions.json",
          bubbleDir: "/tmp/bubble-dir",
          statePath: "/tmp/state.json"
        }
      }) as ReturnType<
        NonNullable<DeleteBubbleDependencies["resolveBubbleById"]>
      >;

  return {
    resolveBubbleById,
    branchExists: vi.fn(() => Promise.resolve(false)),
    runTmux: vi.fn(() => Promise.resolve({
      stdout: "",
      stderr: "no session",
      exitCode: 1
    })),
    readRuntimeSessionsRegistry: vi.fn(() => Promise.resolve({}))
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
});
