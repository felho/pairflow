import { describe, expect, it } from "vitest";

import { runAskHumanFlow } from "../../../../src/v11/application/askHuman/runAskHumanFlow.js";

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
        createError: (message) => new AskHumanFlowTestError(message)
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
          expect(dependencies?.emitTmuxDeliveryNotification).toBeDefined();
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
          createError: (message) => new AskHumanFlowTestError(message)
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
        createError: (message) => new AskHumanFlowTestError(message)
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
          expect(dependencies?.emitTmuxDeliveryNotification).toBeDefined();
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
});
