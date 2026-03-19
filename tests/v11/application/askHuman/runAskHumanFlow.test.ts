import { describe, expect, it } from "vitest";

import { runAskHumanFlow } from "../../../../src/v11/application/askHuman/runAskHumanFlow.js";

class AskHumanFlowTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanFlowTestError";
  }
}

describe("runAskHumanFlow", () => {
  it("orchestrates append, state transition, optional delivery signals, and metrics emission", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];
    const appendedEnvelope = {
      id: "msg_20260221_001",
      bubble_id: "b_ask_human_01",
      sender: "codex",
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: 2,
      payload: {
        question: "Need migration decision?"
      },
      refs: ["artifact://analysis.md"],
      ts: now.toISOString()
    } as never;

    const result = await runAskHumanFlow(
      {
        now,
        routing: {
          nowIso: now.toISOString(),
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"],
          resolved: {
            bubbleId: "b_ask_human_01",
            repoPath: "/repo",
            bubblePaths: {
              locksDir: "/repo/.pairflow/bubbles/b_ask_human_01/locks",
              transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_01/transcript.ndjson",
              inboxPath: "/repo/.pairflow/bubbles/b_ask_human_01/inbox.ndjson",
              statePath: "/repo/.pairflow/bubbles/b_ask_human_01/state.json",
              sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json"
            },
            bubbleConfig: {
              id: "b_ask_human_01"
            }
          } as never,
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789",
            bubbleConfig: {
              id: "b_ask_human_01"
            },
            backfilled: false
          } as never,
          loadedState: {
            state: {
              state: "RUNNING"
            },
            fingerprint: "fp_running_01"
          } as never,
          state: {
            state: "RUNNING",
            round: 2,
            active_agent: "codex",
            active_role: "implementer",
            active_since: "2026-02-21T12:00:00.000Z"
          } as never
        },
        createError: (message) => new AskHumanFlowTestError(message)
      },
      {
        appendProtocolEnvelope: async (input) => {
          callOrder.push("appendProtocolEnvelope");
          expect(input.lockPath).toBe(
            "/repo/.pairflow/bubbles/b_ask_human_01/locks/b_ask_human_01.lock"
          );
          expect(input.envelope.payload.question).toBe("Need migration decision?");
          return {
            envelope: appendedEnvelope,
            sequence: 3,
            mirrorWriteFailures: []
          };
        },
        applyStateTransition: (state, transition) => {
          callOrder.push("applyStateTransition");
          expect(state.state).toBe("RUNNING");
          expect(transition).toEqual({
            to: "WAITING_HUMAN",
            lastCommandAt: now.toISOString()
          });
          return {
            state: "WAITING_HUMAN",
            round: 2,
            active_agent: "codex",
            active_role: "implementer",
            active_since: "2026-02-21T12:00:00.000Z"
          } as never;
        },
        writeStateSnapshot: async (statePath, state, options) => {
          callOrder.push("writeStateSnapshot");
          expect(statePath).toBe("/repo/.pairflow/bubbles/b_ask_human_01/state.json");
          expect(state.state).toBe("WAITING_HUMAN");
          expect(options).toEqual({
            expectedFingerprint: "fp_running_01",
            expectedState: "RUNNING"
          });
          return {
            state: {
              state: "WAITING_HUMAN"
            },
            fingerprint: "fp_waiting_human_01"
          } as never;
        },
        resolveDeliveryMessageRef: (input) => {
          callOrder.push("resolveDeliveryMessageRef");
          expect(input.bubbleId).toBe("b_ask_human_01");
          expect(input.envelope).toBe(appendedEnvelope);
          return "transcript-ref#msg_20260221_001";
        },
        emitTmuxDeliveryNotification: async (input) => {
          callOrder.push("emitTmuxDeliveryNotification");
          expect(input.messageRef).toBe("transcript-ref#msg_20260221_001");
          return {
            delivered: true,
            message: "ok"
          };
        },
        emitBubbleNotification: async (_config, kind) => {
          callOrder.push("emitBubbleNotification");
          expect(kind).toBe("waiting-human");
          return {
            kind,
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          };
        },
        emitBubbleLifecycleEventBestEffort: async (input) => {
          callOrder.push("emitBubbleLifecycleEventBestEffort");
          expect(input.actorRole).toBe("implementer");
          expect(input.metadata).toMatchObject({
            sender: "codex",
            refs_count: 1,
            question_length: 24
          });
        }
      }
    );

    expect(callOrder).toEqual([
      "appendProtocolEnvelope",
      "applyStateTransition",
      "writeStateSnapshot",
      "resolveDeliveryMessageRef",
      "emitTmuxDeliveryNotification",
      "emitBubbleNotification",
      "emitBubbleLifecycleEventBestEffort"
    ]);
    expect(result).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      envelope: appendedEnvelope,
      state: {
        state: "WAITING_HUMAN"
      },
      inferredRecipient: "human"
    });
  });

  it("maps state write failures to canonical transcript-first recovery error", async () => {
    await expect(
      runAskHumanFlow(
        {
          now: new Date("2026-02-21T12:10:00.000Z"),
          routing: {
            nowIso: "2026-02-21T12:10:00.000Z",
            question: "Need input",
            refs: [],
            resolved: {
              bubbleId: "b_ask_human_02",
              bubblePaths: {
                locksDir: "/repo/.pairflow/bubbles/b_ask_human_02/locks",
                transcriptPath: "/repo/.pairflow/bubbles/b_ask_human_02/transcript.ndjson",
                inboxPath: "/repo/.pairflow/bubbles/b_ask_human_02/inbox.ndjson",
                statePath: "/repo/.pairflow/bubbles/b_ask_human_02/state.json",
                sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_02/runtime/sessions.json"
              }
            } as never,
            bubbleIdentity: {
              bubbleInstanceId: "bi_1234567890_abcdef0123456789"
            } as never,
            loadedState: {
              state: {
                state: "RUNNING"
              },
              fingerprint: "fp_running_02"
            } as never,
            state: {
              state: "RUNNING",
              round: 2,
              active_agent: "codex",
              active_role: "implementer",
              active_since: "2026-02-21T12:00:00.000Z"
            } as never
          },
          createError: (message) => new AskHumanFlowTestError(message)
        },
        {
          appendProtocolEnvelope: async () =>
            ({
              envelope: {
                id: "msg_20260221_777"
              },
              sequence: 3,
              mirrorWriteFailures: []
            }) as never,
          applyStateTransition: (state) => state,
          writeStateSnapshot: async () => {
            throw new Error("State fingerprint mismatch; possible concurrent update.");
          },
          resolveDeliveryMessageRef: () => "unused",
          emitTmuxDeliveryNotification: async () =>
            ({
              delivered: true,
              message: "ok"
            }) as never,
          emitBubbleNotification: async () =>
            ({
              kind: "waiting-human",
              attempted: false,
              delivered: false,
              soundPath: null,
              reason: "disabled"
            }) as never,
          emitBubbleLifecycleEventBestEffort: async () => undefined
        }
      )
    ).rejects.toMatchObject({
      name: "AskHumanFlowTestError",
      message:
        "HUMAN_QUESTION msg_20260221_777 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: State fingerprint mismatch; possible concurrent update."
    });
  });
});
