import { describe, expect, it, vi } from "vitest";

import {
  createVerifyRemoteCloneStartAuthority
} from "../../../../src/v11/application/start/internal/remote/startCommandRemoteCloneAuthority.js";

function createVerifier(input: {
  pairflowWorktreeRoot?: string;
  readRemotePointer?: Parameters<typeof createVerifyRemoteCloneStartAuthority>[0]["readRemotePointer"];
}) {
  return createVerifyRemoteCloneStartAuthority({
    readRemotePointer: input.readRemotePointer ?? vi.fn(async () => null),
    readPairflowWorktreeRootEnv: () => input.pairflowWorktreeRoot
  });
}

describe("createVerifyRemoteCloneStartAuthority", () => {
  it("accepts a matching worktree root when source-repo remote artifacts are absent", async () => {
    const readRemotePointer = vi.fn(async () => null);
    const verify = createVerifier({
      pairflowWorktreeRoot: "/tmp/remote-workspace",
      readRemotePointer
    });

    await expect(
      verify({
        bubbleId: "b-1",
        remoteWorkspaceRoot: "/tmp/remote-workspace",
        remotePointerPath: "/repo/.pairflow/bubbles/b-1/remote.json"
      })
    ).resolves.toBeUndefined();

    expect(readRemotePointer).toHaveBeenCalledWith(
      "/repo/.pairflow/bubbles/b-1/remote.json"
    );
  });

  it("rejects when PAIRFLOW_WORKTREE_ROOT does not match the remote workspace authority", async () => {
    const verify = createVerifier({
      pairflowWorktreeRoot: "/tmp/source-repo"
    });

    await expect(
      verify({
        bubbleId: "b-1",
        remoteWorkspaceRoot: "/tmp/remote-workspace",
        remotePointerPath: "/repo/.pairflow/bubbles/b-1/remote.json"
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      context: {
        bubble_id: "b-1",
        pairflow_worktree_root: "/tmp/source-repo",
        remote_workspace_root: "/tmp/remote-workspace",
        required_env_var: "PAIRFLOW_WORKTREE_ROOT"
      }
    });
  });

  it("rejects when local source-repo remote artifacts are still present", async () => {
    const verify = createVerifier({
      pairflowWorktreeRoot: "/tmp/remote-workspace",
      readRemotePointer: vi.fn(async () => ({
        kind: "created" as const,
        host: "homelab"
      }))
    });

    await expect(
      verify({
        bubbleId: "b-1",
        remoteWorkspaceRoot: "/tmp/remote-workspace",
        remotePointerPath: "/repo/.pairflow/bubbles/b-1/remote.json"
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      context: {
        bubble_id: "b-1",
        remote_pointer_kind: "created",
        remote_pointer_path: "/repo/.pairflow/bubbles/b-1/remote.json"
      }
    });
  });

  it("wraps remote pointer read failures as remote execution context failures", async () => {
    const cause = new Error("read failed");
    const verify = createVerifier({
      pairflowWorktreeRoot: "/tmp/remote-workspace",
      readRemotePointer: vi.fn(async () => {
        throw cause;
      })
    });

    await expect(
      verify({
        bubbleId: "b-1",
        remoteWorkspaceRoot: "/tmp/remote-workspace",
        remotePointerPath: "/repo/.pairflow/bubbles/b-1/remote.json"
      })
    ).rejects.toMatchObject({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      cause,
      context: {
        bubble_id: "b-1",
        remote_pointer_path: "/repo/.pairflow/bubbles/b-1/remote.json"
      }
    });
  });
});
