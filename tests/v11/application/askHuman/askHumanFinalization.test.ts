import { describe, expect, it } from "vitest";

import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";

describe("finalizeAskHumanFlow", () => {
  it("emits delivery/notification/metrics and builds ask-human command result", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];
    const appendedEnvelope = {
      id: "msg_20260221_001"
    } as never;

    const result = await finalizeAskHumanFlow(
      {
        now,
        routing: {
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"],
          resolved: {
            bubbleId: "b_ask_human_01",
            repoPath: "/repo",
            bubblePaths: {
              sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_01/runtime/sessions.json"
            },
            bubbleConfig: {
              id: "b_ask_human_01"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456789"
          },
          state: {
            round: 2,
            active_agent: "codex",
            active_role: "implementer"
          },
          activation: {
            handoff_id: "implementer:b_ask_human_01:round:2:attempt:1",
            execution_id: "exec_b_ask_human_01_round2",
            expected_role: "implementer",
            expected_round: 2,
            expected_state_fingerprint: "fp_ask_human_01"
          }
        } as never,
        appended: {
          envelope: appendedEnvelope,
          sequence: 3
        } as never,
        written: {
          state: {
            state: "WAITING_HUMAN"
          }
        } as never
      },
      {
        resolveDeliveryMessageRef: (input) => {
          callOrder.push("resolveDeliveryMessageRef");
          expect(input.envelope).toBe(appendedEnvelope);
          return "transcript-ref#msg_20260221_001";
        },
        emitDeliveryNotificationAck: async (input) => {
          callOrder.push("emitDeliveryNotificationAck");
          expect(input.messageRef).toBe("transcript-ref#msg_20260221_001");
          return {
            status: "accepted",
            message: "ok",
            sessionName: "pf_bubble",
            targetPaneIndex: 1
          };
        },
        emitBubbleNotification: async (_config, kind) => {
          callOrder.push("emitBubbleNotification");
          expect(kind).toBe("waiting-human");
          return {
            kind,
            attempted: false,
            status: "rejected",
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
          expect(input.now).toBe(now);
        }
      }
    );

    expect(callOrder).toEqual([
      "resolveDeliveryMessageRef",
      "emitBubbleNotification",
      "emitDeliveryNotificationAck",
      "emitBubbleLifecycleEventBestEffort"
    ]);
    expect(result).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      envelope: appendedEnvelope,
      state: {
        state: "WAITING_HUMAN"
      },
      inferredRecipient: "human",
      activation: {
        handoff_id: "implementer:b_ask_human_01:round:2:attempt:1",
        execution_id: "exec_b_ask_human_01_round2",
        expected_role: "implementer",
        expected_round: 2,
        expected_state_fingerprint: "fp_ask_human_01"
      },
      delivery: {
        status: "accepted",
        message: "ok"
      }
    });
  });

  it("surfaces the command_failed sentinel at finalization level when delivery notification throws", async () => {
    const result = await finalizeAskHumanFlow(
      {
        now: new Date("2026-02-21T12:20:00.000Z"),
        routing: {
          question: "Need fallback decision?",
          refs: [],
          resolved: {
            bubbleId: "b_ask_human_02",
            repoPath: "/repo",
            bubblePaths: {
              sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_02/runtime/sessions.json"
            },
            bubbleConfig: {
              id: "b_ask_human_02"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456790"
          },
          state: {
            round: 2,
            active_agent: "codex",
            active_role: "implementer"
          },
          activation: {
            handoff_id: "implementer:b_ask_human_02:round:2:attempt:1",
            execution_id: "exec_b_ask_human_02_round2",
            expected_role: "implementer",
            expected_round: 2,
            expected_state_fingerprint: "fp_ask_human_02"
          }
        } as never,
        appended: {
          envelope: {
            id: "msg_20260221_002"
          } as never,
          sequence: 4
        } as never,
        written: {
          state: {
            state: "WAITING_HUMAN"
          }
        } as never
      },
      {
        resolveDeliveryMessageRef: () => "transcript-ref#msg_20260221_002",
        emitDeliveryNotificationAck: async () => {
          throw new Error("tmux boom");
        },
        emitBubbleNotification: async () => ({
          kind: "waiting-human",
          attempted: false,
          status: "rejected",
          soundPath: null,
          reason: "disabled"
        }),
        emitBubbleLifecycleEventBestEffort: async () => undefined
      }
    );

    expect(result.delivery).toEqual({
      status: "rejected",
      message: "delivery notification failed: tmux boom",
      reason: "command_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
    expect(result.activation).toEqual({
      handoff_id: "implementer:b_ask_human_02:round:2:attempt:1",
      execution_id: "exec_b_ask_human_02_round2",
      expected_role: "implementer",
      expected_round: 2,
      expected_state_fingerprint: "fp_ask_human_02"
    });
  });

  it("returns after tmux delivery resolves even if the UX-only bubble notification is still pending", async () => {
    let resolveBubbleNotification: (() => void) | undefined;
    let bubbleNotificationSettled = false;
    let deliveryResolve:
      | ((value: {
          status: "accepted";
          message: string;
          sessionName: string;
          targetPaneIndex: number;
        }) => void)
      | undefined;

    const bubbleNotificationPromise = new Promise<void>((resolvePromise) => {
      resolveBubbleNotification = () => {
        bubbleNotificationSettled = true;
        resolvePromise();
      };
    });
    const deliveryPromise = new Promise<{
      status: "accepted";
      message: string;
      sessionName: string;
      targetPaneIndex: number;
    }>((resolvePromise) => {
      deliveryResolve = resolvePromise;
    });

    const resultPromise = finalizeAskHumanFlow(
      {
        now: new Date("2026-02-21T12:30:00.000Z"),
        routing: {
          question: "Need release timing?",
          refs: [],
          resolved: {
            bubbleId: "b_ask_human_03",
            repoPath: "/repo",
            bubblePaths: {
              sessionsPath: "/repo/.pairflow/bubbles/b_ask_human_03/runtime/sessions.json"
            },
            bubbleConfig: {
              id: "b_ask_human_03"
            }
          },
          bubbleIdentity: {
            bubbleInstanceId: "bi_1234567890_abcdef0123456791"
          },
          state: {
            round: 2,
            active_agent: "codex",
            active_role: "implementer"
          }
        } as never,
        appended: {
          envelope: {
            id: "msg_20260221_003"
          } as never,
          sequence: 5
        } as never,
        written: {
          state: {
            state: "WAITING_HUMAN"
          }
        } as never
      },
      {
        resolveDeliveryMessageRef: () => "transcript-ref#msg_20260221_003",
        emitDeliveryNotificationAck: async () => deliveryPromise,
        emitBubbleNotification: async () => {
          await bubbleNotificationPromise;
          return {
            kind: "waiting-human",
            attempted: false,
            delivered: false,
            soundPath: null,
            reason: "disabled"
          };
        },
        emitBubbleLifecycleEventBestEffort: async () => undefined
      }
    );

    deliveryResolve?.({
      status: "accepted",
      message: "ok",
      sessionName: "pf_bubble",
      targetPaneIndex: 1
    });

    const result = await resultPromise;
    expect(result.delivery).toEqual({
      status: "accepted",
      message: "ok"
    });
    expect("activation" in result).toBe(false);
    expect(bubbleNotificationSettled).toBe(false);

    resolveBubbleNotification?.();
    await bubbleNotificationPromise;
  });
});
