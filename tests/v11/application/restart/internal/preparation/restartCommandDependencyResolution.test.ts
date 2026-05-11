import { describe, expect, it } from "vitest";

import { resolveRestartBubbleDependencies } from "../../../../../../src/v11/application/restart/internal/preparation/restartCommandDependencyResolution.js";

describe("restartCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", () => {
    const customStartBubble = (async () =>
      ({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/repo/.pairflow/worktrees/b_restart_01"
      })) as never;
    const customPersistMarker = (async () =>
      ({
        persisted_targets: [],
        warnings: []
      })) as never;
    const resolveBubbleById = (async () =>
      ({
        bubbleId: "b_restart_01",
        repoPath: "/tmp/repo",
        bubbleConfig: {} as never,
        bubblePaths: {
          sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
          worktreePath: "/tmp/worktree"
        }
      })) as never;
    const terminateBubbleTmuxSession = (async () =>
      ({
        existed: true
      })) as never;
    const readRemotePointer = (async () => null) as never;
    const removeRuntimeSession = (async () => true) as never;

    const resolved = resolveRestartBubbleDependencies({
      resolveBubbleById,
      readRemotePointer,
      terminateBubbleTmuxSession,
      removeRuntimeSession,
      startBubble: customStartBubble,
      persistPassValidationRecoveryMarker: customPersistMarker
    });

    expect(resolved.resolveBubbleById).toBe(resolveBubbleById);
    expect(resolved.readRemotePointer).toBe(readRemotePointer);
    expect(resolved.terminateBubbleTmuxSession).toBe(terminateBubbleTmuxSession);
    expect(resolved.removeRuntimeSession).toBe(removeRuntimeSession);
    expect(resolved.startBubble).toBe(customStartBubble);
    expect(resolved.persistPassValidationRecoveryMarker).toBe(customPersistMarker);
  });
});
