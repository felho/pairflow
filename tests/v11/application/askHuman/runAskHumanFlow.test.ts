import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { runAskHumanFlow } from "../../../../src/v11/application/askHuman/internal/mutation/runAskHumanFlow.js";

class AskHumanFlowTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanFlowTestError";
  }
}

describe("runAskHumanFlow", () => {
  it("orchestrates execution then finalization with dependency forwarding", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const callOrder: string[] = [];
    const appended = {
      envelope: {
        id: "msg_20260221_001"
      },
      sequence: 3
    } as never;
    const written = {
      state: {
        state: "WAITING_HUMAN"
      }
    } as never;

    const result = await runAskHumanFlow(
      {
        now,
        routing: {
          nowIso: now.toISOString(),
          question: "Need migration decision?",
          refs: ["artifact://analysis.md"]
        } as never,
        createError: (message: PairflowCommandErrorInput) => new AskHumanFlowTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async (input, dependencies) => {
          callOrder.push("executeAskHumanExecution");
          expect(input.now).toBe(now);
          expect(input.createError("x")).toBeInstanceOf(AskHumanFlowTestError);
          expect(dependencies?.appendProtocolEnvelope).toBeDefined();
          expect(dependencies?.writeStateSnapshot).toBeDefined();
          expect(dependencies?.applyStateTransition).toBeDefined();
          return {
            appended,
            written
          };
        },
        finalizeAskHumanFlow: async (input, dependencies) => {
          callOrder.push("finalizeAskHumanFlow");
          expect(input.appended).toBe(appended);
          expect(input.written).toBe(written);
          expect(input.now).toBe(now);
          expect(dependencies?.emitDeliveryNotificationAck).toBeDefined();
          expect(dependencies?.emitBubbleNotification).toBeDefined();
          expect(dependencies?.emitBubbleLifecycleEventBestEffort).toBeDefined();
          return {
            bubbleId: "b_ask_human_01",
            sequence: 3,
            envelope: {
              id: "msg_20260221_001"
            },
            state: {
              state: "WAITING_HUMAN"
            },
            inferredRecipient: "human"
          } as never;
        },
        appendProtocolEnvelope: async () => appended,
        writeStateSnapshot: async () => written,
        applyStateTransition: (state) => state,
        emitDeliveryNotificationAck: async () =>
          ({
            status: "accepted",
            message: "ok"
          }) as never,
        emitBubbleNotification: async () =>
          ({
            kind: "waiting-human",
            attempted: false,
            status: "rejected",
            soundPath: null,
            reason: "disabled"
          }) as never,
        emitBubbleLifecycleEventBestEffort: async () => undefined
      }
    );

    expect(callOrder).toEqual([
      "executeAskHumanExecution",
      "finalizeAskHumanFlow"
    ]);
    expect(result).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      inferredRecipient: "human",
      state: {
        state: "WAITING_HUMAN"
      }
    });
  });

  it("propagates execution failures and skips finalization", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    let finalizeCalled = false;

    await expect(
      runAskHumanFlow(
        {
          now,
          routing: {
            nowIso: now.toISOString()
          } as never,
          createError: (message: PairflowCommandErrorInput) => new AskHumanFlowTestError(toErrorMessage(message))
        },
        {
          executeAskHumanExecution: async () => {
            throw new AskHumanFlowTestError("execution failed");
          },
          finalizeAskHumanFlow: async () => {
            finalizeCalled = true;
            return {
              bubbleId: "unused",
              sequence: 0,
              envelope: {} as never,
              state: {} as never,
              inferredRecipient: "human"
            };
          }
        }
      )
    ).rejects.toMatchObject({
      name: "AskHumanFlowTestError",
      message: "execution failed"
    });

    expect(finalizeCalled).toBe(false);
  });

  it("injects default finalization dependencies when overrides are omitted", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");

    await runAskHumanFlow(
      {
        now,
        routing: {
          nowIso: now.toISOString()
        } as never,
        createError: (message: PairflowCommandErrorInput) => new AskHumanFlowTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async () =>
          ({
            appended: {
              envelope: {
                id: "msg_20260221_default_dep"
              },
              sequence: 9
            },
            written: {
              state: {
                state: "WAITING_HUMAN"
              }
            }
          }) as never,
        finalizeAskHumanFlow: async (_input, dependencies) => {
          expect(dependencies?.emitDeliveryNotificationAck).toBeDefined();
          expect(dependencies?.emitBubbleNotification).toBeDefined();
          expect(dependencies?.emitBubbleLifecycleEventBestEffort).toBeDefined();
          return {
            bubbleId: "b_ask_human_default_dep",
            sequence: 9,
            envelope: {
              id: "msg_20260221_default_dep"
            },
            state: {
              state: "WAITING_HUMAN"
            },
            inferredRecipient: "human"
          } as never;
        }
      }
    );
  });

  it("forwards empty execution dependency overrides when not provided", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");

    await runAskHumanFlow(
      {
        now,
        routing: {
          nowIso: now.toISOString()
        } as never,
        createError: (message: PairflowCommandErrorInput) => new AskHumanFlowTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async (_input, dependencies) => {
          expect(dependencies).toEqual({});
          return {
            appended: {
              envelope: {
                id: "msg_20260221_empty_exec_deps"
              },
              sequence: 10
            },
            written: {
              state: {
                state: "WAITING_HUMAN"
              }
            }
          } as never;
        },
        finalizeAskHumanFlow: async () =>
          ({
            bubbleId: "b_ask_human_empty_exec_deps",
            sequence: 10,
            envelope: {
              id: "msg_20260221_empty_exec_deps"
            },
            state: {
              state: "WAITING_HUMAN"
            },
            inferredRecipient: "human"
          }) as never
      }
    );
  });

  it("forwards resolveDeliveryMessageRef override to finalization dependencies", async () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const resolveDeliveryMessageRef = () => "transcript-ref#msg_20260221_011";

    await runAskHumanFlow(
      {
        now,
        routing: {
          nowIso: now.toISOString()
        } as never,
        createError: (message: PairflowCommandErrorInput) => new AskHumanFlowTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async () =>
          ({
            appended: {
              envelope: {
                id: "msg_20260221_011"
              },
              sequence: 11
            },
            written: {
              state: {
                state: "WAITING_HUMAN"
              }
            }
          }) as never,
        finalizeAskHumanFlow: async (_input, dependencies) => {
          expect(dependencies?.resolveDeliveryMessageRef).toBe(
            resolveDeliveryMessageRef
          );
          return {
            bubbleId: "b_ask_human_resolve_ref_override",
            sequence: 11,
            envelope: {
              id: "msg_20260221_011"
            },
            state: {
              state: "WAITING_HUMAN"
            },
            inferredRecipient: "human"
          } as never;
        },
        resolveDeliveryMessageRef
      }
    );
  });
});
