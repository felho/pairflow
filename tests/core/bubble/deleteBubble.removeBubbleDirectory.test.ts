import { afterEach, describe, expect, it, vi } from "vitest";

const rmMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rm: rmMock
  };
});

import {
  deleteBubble,
  type DeleteBubbleDependencies
} from "../../../src/core/bubble/deleteBubble.js";

function buildDependencies(): DeleteBubbleDependencies {
  const resolveBubbleById: NonNullable<DeleteBubbleDependencies["resolveBubbleById"]> =
    async () =>
      ({
        bubbleId: "b-delete-rm-01",
        repoPath: "/tmp/repo",
        bubbleConfig: {
          bubble_branch: "pairflow/bubble/b-delete-rm-01"
        },
        bubblePaths: {
          worktreePath: "/tmp/worktree",
          sessionsPath: "/tmp/sessions.json",
          bubbleDir: "/tmp/bubble-dir",
          statePath: "/tmp/state.json"
        }
      }) as Awaited<
        ReturnType<
          NonNullable<DeleteBubbleDependencies["resolveBubbleById"]>
        >
      >;

  return {
    resolveBubbleById,
    branchExists: vi.fn(async () => false),
    runTmux: vi.fn(async () => ({
      stdout: "",
      stderr: "no session",
      exitCode: 1
    })),
    readRuntimeSessionsRegistry: vi.fn(async () => ({}))
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
