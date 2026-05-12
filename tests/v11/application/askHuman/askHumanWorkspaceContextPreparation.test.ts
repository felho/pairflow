import { describe, expect, it } from "vitest";

import { prepareAskHumanWorkspaceContext } from "../../../../src/v11/application/askHuman/internal/delivery/askHumanWorkspaceContextPreparation.js";
import type {
  AskHumanLoadedStateSnapshot as LoadedStateSnapshot,
  AskHumanResolvedBubbleWorkspace as ResolvedBubbleWorkspace
} from "../../../../src/v11/application/askHuman/internal/delivery/askHumanRoutingContextContract.js";
import { buildBubbleStateSnapshotVariant } from "../../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";

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
      state: buildBubbleStateSnapshotVariant({
        bubble_id: "b_ask_human_01",
        state: "RUNNING",
        round: 3,
        active_agent: "codex",
        active_role: "implementer",
        active_since: "2026-02-21T12:00:00.000Z",
        round_role_history: [],
        last_command_at: "2026-02-21T12:00:00.000Z"
      }),
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

  it("reuses authoritative actor context without re-reading workspace state", async () => {
    let resolveBubbleCalls = 0;
    let readStateCalls = 0;

    const loadedState: LoadedStateSnapshot = {
      state: buildBubbleStateSnapshotVariant({
        bubble_id: "b_ask_human_02",
        state: "RUNNING",
        round: 4,
        active_agent: "claude",
        active_role: "reviewer",
        active_since: "2026-02-21T12:00:00.000Z",
        execution_context: {
          handoff_id: "reviewer:b_ask_human_02:round:4:attempt:1",
          execution_id: "exec_ask_human_02_round4",
          round: 4,
          active_role: "reviewer"
        } as never,
        round_role_history: [],
        last_command_at: "2026-02-21T12:00:00.000Z"
      }),
      fingerprint: "fp_running_02"
    };

    const result = await prepareAskHumanWorkspaceContext({
      now: new Date("2026-02-21T12:20:00.000Z"),
      authoritativeContext: {
        repo: "/repo",
        bubble_id: "b_ask_human_02",
        handoff_id: "reviewer:b_ask_human_02:round:4:attempt:1",
        execution_id: "exec_ask_human_02_round4",
        expected_role: "reviewer",
        expected_round: 4,
        expected_state_fingerprint: "fp_running_02",
        worktree_path: "/repo/worktrees/b_ask_human_02",
        resolved: {
          bubbleId: "b_ask_human_02",
          repoPath: "/repo",
          bubblePaths: {
            statePath: "/repo/.pairflow/bubbles/b_ask_human_02/state.json",
            worktreePath: "/repo/worktrees/b_ask_human_02"
          },
          bubbleConfig: { id: "b_ask_human_02" }
        } as never,
        loaded_state: loadedState,
        execution_context: {
          handoff_id: "reviewer:b_ask_human_02:round:4:attempt:1",
          execution_id: "exec_ask_human_02_round4",
          round: 4,
          active_role: "reviewer"
        } as never
      },
      dependencies: {
        resolveBubble: async () => {
          resolveBubbleCalls += 1;
          throw new Error("resolveBubble should not run");
        },
        ensureBubbleIdentity: async () => ({
          bubbleInstanceId: "bi_1234567890_abcdef0123456789",
          bubbleConfig: { id: "b_ask_human_02" },
          backfilled: false
        }) as never,
        readState: async () => {
          readStateCalls += 1;
          throw new Error("readState should not run");
        }
      }
    });

    expect(resolveBubbleCalls).toBe(0);
    expect(readStateCalls).toBe(0);
    // Workspace prep projects authoritativeContext.loaded_state (persisted-shape per
    // the actor-emit-context contract — cross-batch boundary) into the variant
    // AskHumanLoadedStateSnapshot. Identity is no longer preserved; deep equality
    // verifies the projection produced the same observable shape.
    expect(result.loadedState).toEqual(loadedState);
    expect(result.resolved.cwd).toBe("/repo/worktrees/b_ask_human_02");
  });

  it("rejects incoherent authoritative context snapshots before any workspace fallback", async () => {
    let resolveBubbleCalls = 0;
    let readStateCalls = 0;

    await expect(
      prepareAskHumanWorkspaceContext({
        now: new Date("2026-02-21T12:21:00.000Z"),
        authoritativeContext: {
          repo: "/repo",
          bubble_id: "b_ask_human_03",
          handoff_id: "reviewer:b_ask_human_03:round:4:attempt:1",
          execution_id: "exec_ask_human_03_round4",
          expected_role: "reviewer",
          expected_round: 4,
          expected_state_fingerprint: "fp_running_03",
          worktree_path: "/repo/worktrees/b_ask_human_03",
          resolved: {
            bubbleId: "b_ask_human_03",
            repoPath: "/repo-other",
            bubblePaths: {
              statePath: "/repo/.pairflow/bubbles/b_ask_human_03/state.json",
              worktreePath: "/repo/worktrees/b_ask_human_03"
            },
            bubbleConfig: { id: "b_ask_human_03" }
          } as never,
          loaded_state: {
            state: {
              bubble_id: "b_ask_human_03",
              state: "RUNNING",
              round: 4,
              active_agent: "claude",
              active_role: "reviewer",
              active_since: "2026-02-21T12:00:00.000Z",
              execution_context: {
                handoff_id: "reviewer:b_ask_human_03:round:4:attempt:1",
                execution_id: "exec_ask_human_03_round4",
                round: 4,
                active_role: "reviewer"
              } as never,
              round_role_history: [],
              last_command_at: "2026-02-21T12:00:00.000Z"
            },
            fingerprint: "fp_running_03"
          } as never,
          execution_context: {
            handoff_id: "reviewer:b_ask_human_03:round:4:attempt:1",
            execution_id: "exec_ask_human_03_round4",
            round: 4,
            active_role: "reviewer"
          } as never
        },
        dependencies: {
          resolveBubble: async () => {
            resolveBubbleCalls += 1;
            throw new Error("resolveBubble should not run");
          },
          ensureBubbleIdentity: async () => {
            throw new Error("ensureBubbleIdentity should not run");
          },
          readState: async () => {
            readStateCalls += 1;
            throw new Error("readState should not run");
          }
        }
      })
    ).rejects.toMatchObject({
      name: "ActorEmitContextError",
      reasonCode: "ACTOR_EMIT_CONTEXT_INVALID",
      message:
        "Canonical actor emit repo mismatch: expected /repo, resolved /repo-other."
    });

    expect(resolveBubbleCalls).toBe(0);
    expect(readStateCalls).toBe(0);
  });
});
