import { describe, expect, it } from "vitest";

import { prepareAskHumanWorkspaceContext } from "../../../../src/v11/shared/askHuman/askHumanWorkspaceContextPreparation.js";
import type { ResolvedBubbleWorkspace } from "../../../../src/core/bubble/workspaceResolution.js";
import type { LoadedStateSnapshot } from "../../../../src/core/state/stateStore.js";

describe("prepareAskHumanWorkspaceContext", () => {
  it("resolves bubble context, updates config from identity, and loads state", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];

    const resolved = {
      bubbleId: "b_ask_human_01",
      repoPath: "/repo",
      bubblePaths: {
        statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json"
      },
      bubbleConfig: { id: "b_ask_human_01" }
    } as ResolvedBubbleWorkspace;

    const updatedBubbleConfig = {
      id: "b_ask_human_01",
      bubble_instance_id: "bi_1234567890_abcdef0123456789"
    } as never;

    const loadedState: LoadedStateSnapshot = {
      state: {
        bubble_id: "b_ask_human_01",
        state: "RUNNING",
        round: 3,
        active_agent: "codex",
        active_role: "implementer",
        active_since: "2026-02-21T12:00:00.000Z",
        round_role_history: [],
        last_command_at: "2026-02-21T12:00:00.000Z"
      },
      fingerprint: "fp_running_01"
    };

    const result = await prepareAskHumanWorkspaceContext({
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      dependencies: {
        resolveBubble: async (cwd) => {
          callOrder.push("resolveBubble");
          expect(cwd).toBe("/repo/worktrees/b_ask_human_01");
          return resolved;
        },
        ensureBubbleIdentity: async (input) => {
          callOrder.push("ensureBubbleIdentity");
          expect(input.now).toBe(now);
          expect(input.bubbleId).toBe("b_ask_human_01");
          expect(input.bubbleConfig).toBe(resolved.bubbleConfig);
          return {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: updatedBubbleConfig,
            backfilled: false
          };
        },
        readState: async (statePath) => {
          callOrder.push("readState");
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_ask_human_01/state.json");
          return loadedState;
        }
      }
    });

    expect(callOrder).toEqual([
      "resolveBubble",
      "ensureBubbleIdentity",
      "readState"
    ]);
    expect(result.resolved).toBe(resolved);
    expect(result.resolved.bubbleConfig).toBe(updatedBubbleConfig);
    expect(result.bubbleIdentity.bubbleConfig).toBe(updatedBubbleConfig);
    expect(result.loadedState).toBe(loadedState);
    expect(result.state).toBe(loadedState.state);
  });
});
