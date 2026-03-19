import { describe, expect, it } from "vitest";

import { prepareAskHumanRouting } from "../../../../src/v11/application/askHuman/askHumanRoutingPreparation.js";
import type { ResolvedBubbleWorkspace } from "../../../../src/core/bubble/workspaceResolution.js";

class AskHumanRoutingTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanRoutingTestError";
  }
}

describe("prepareAskHumanRouting", () => {
  it("builds ask-human routing context and validates RUNNING state prerequisites", async () => {
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

    const result = await prepareAskHumanRouting(
      {
        question: "  Need decision on migration strategy? ",
        refs: [" artifact://a ", "artifact://a", "artifact://b", " "],
        cwd: "/repo/worktrees/b_ask_human_01",
        now,
        createError: (message) => new AskHumanRoutingTestError(message)
      },
      {
        resolveBubbleFromWorkspaceCwd: async (cwd) => {
          callOrder.push("resolveBubbleFromWorkspaceCwd");
          expect(cwd).toBe("/repo/worktrees/b_ask_human_01");
          return resolved;
        },
        ensureBubbleInstanceIdForMutation: async (input) => {
          callOrder.push("ensureBubbleInstanceIdForMutation");
          expect(input.now).toBe(now);
          expect(input.bubbleId).toBe("b_ask_human_01");
          expect(input.bubbleConfig).toBe(resolved.bubbleConfig);
          return {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: updatedBubbleConfig,
            backfilled: false
          };
        },
        readStateSnapshot: async (statePath) => {
          callOrder.push("readStateSnapshot");
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_ask_human_01/state.json");
          return {
            state: {
              state: "RUNNING",
              round: 3,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z"
            },
            fingerprint: "fp_running_01"
          } as never;
        }
      }
    );

    expect(callOrder).toEqual([
      "resolveBubbleFromWorkspaceCwd",
      "ensureBubbleInstanceIdForMutation",
      "readStateSnapshot"
    ]);
    expect(result.nowIso).toBe("2026-02-21T12:10:00.000Z");
    expect(result.question).toBe("Need decision on migration strategy?");
    expect(result.refs).toEqual(["artifact://a", "artifact://b"]);
    expect(result.resolved.bubbleConfig).toBe(updatedBubbleConfig);
    expect(result.state.state).toBe("RUNNING");
  });

  it("throws when ask-human is invoked outside RUNNING state", async () => {
    await expect(
      prepareAskHumanRouting(
        {
          question: "Need human input",
          now: new Date("2026-02-21T12:10:00.000Z"),
          createError: (message) => new AskHumanRoutingTestError(message)
        },
        {
          resolveBubbleFromWorkspaceCwd: async () =>
            ({
              bubbleId: "b_ask_human_02",
              repoPath: "/repo",
              bubblePaths: {
                statePath: "/repo/.pairflow/bubbles/b_ask_human_02/state.json"
              },
              bubbleConfig: { id: "b_ask_human_02" }
            }) as never,
          ensureBubbleInstanceIdForMutation: async () =>
            ({
              bubbleInstanceId: "bi_1234567890_abcdef0123456789",
              bubbleConfig: { id: "b_ask_human_02" },
              backfilled: false
            }) as never,
          readStateSnapshot: async () =>
            ({
              state: {
                state: "WAITING_HUMAN",
                round: 1,
                active_agent: "codex",
                active_role: "implementer",
                active_since: "2026-02-21T12:00:00.000Z"
              },
              fingerprint: "fp_waiting_human_01"
            }) as never
        }
      )
    ).rejects.toMatchObject({
      name: "AskHumanRoutingTestError",
      message:
        "ask-human can only be used while bubble is RUNNING (current: WAITING_HUMAN)."
    });
  });
});
