import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { orchestrateAskHumanCommand } from "../../../../src/v11/application/askHuman/askHumanCommandOrchestration.js";

class AskHumanCommandOrchestrationTestError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AskHumanCommandOrchestrationTestError";
  }
}

describe("askHumanCommandOrchestration", () => {
  it("prepares routing and runs flow with forwarded dependencies", async () => {
    const now = new Date("2026-03-19T21:30:00.000Z");
    const routing = {
      nowIso: now.toISOString(),
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"]
    } as never;
    const callOrder: string[] = [];

    const result = await orchestrateAskHumanCommand(
      {
        question: "Need migration decision?",
        refs: ["artifact://analysis.md"],
        cwd: "/repo/worktrees/b_ask_human_01",
        now,
        createError: (message: PairflowCommandErrorInput) => new AskHumanCommandOrchestrationTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async () =>
          ({
            appended: {},
            written: {}
          }) as never,
        finalizeAskHumanFlow: async () =>
          ({
            bubbleId: "b_ask_human_01",
            sequence: 3,
            envelope: {},
            state: {},
            inferredRecipient: "human"
          }) as never,
        prepareAskHumanRouting: async (input) => {
          callOrder.push("prepareAskHumanRouting");
          expect(input).toMatchObject({
            question: "Need migration decision?",
            refs: ["artifact://analysis.md"],
            cwd: "/repo/worktrees/b_ask_human_01",
            now
          });
          expect(input.createError("x")).toBeInstanceOf(
            AskHumanCommandOrchestrationTestError
          );
          return routing;
        },
        runAskHumanFlow: async (input, dependencies) => {
          callOrder.push("runAskHumanFlow");
          expect(input.now).toBe(now);
          expect(input.routing).toBe(routing);
          expect(input.createError("x")).toBeInstanceOf(
            AskHumanCommandOrchestrationTestError
          );
          expect(dependencies.executeAskHumanExecution).toBeTypeOf("function");
          expect(dependencies.finalizeAskHumanFlow).toBeTypeOf("function");
          expect(dependencies.emitDeliveryNotificationAck).toBeTypeOf("function");
          expect(dependencies.emitBubbleNotification).toBeTypeOf("function");
          return {
            bubbleId: "b_ask_human_01",
            sequence: 3,
            envelope: {
              id: "msg_20260319_001"
            },
            state: {
              state: "WAITING_HUMAN"
            },
            inferredRecipient: "human"
          } as never;
        },
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
          }) as never
      }
    );

    expect(callOrder).toEqual([
      "prepareAskHumanRouting",
      "runAskHumanFlow"
    ]);
    expect(result).toMatchObject({
      bubbleId: "b_ask_human_01",
      sequence: 3,
      inferredRecipient: "human"
    });
  });

  it("omits optional notifications when overrides are missing", async () => {
    const now = new Date("2026-03-19T21:30:00.000Z");

    await orchestrateAskHumanCommand(
      {
        question: "Need operator input",
        now,
        createError: (message: PairflowCommandErrorInput) => new AskHumanCommandOrchestrationTestError(toErrorMessage(message))
      },
      {
        executeAskHumanExecution: async () =>
          ({
            appended: {},
            written: {}
          }) as never,
        finalizeAskHumanFlow: async () =>
          ({
            bubbleId: "b_ask_human_02",
            sequence: 4,
            envelope: {},
            state: {},
            inferredRecipient: "human"
          }) as never,
        prepareAskHumanRouting: async () =>
          ({
            nowIso: now.toISOString()
          }) as never,
        runAskHumanFlow: async (_input, dependencies) => {
          expect("emitDeliveryNotificationAck" in dependencies).toBe(false);
          expect("emitBubbleNotification" in dependencies).toBe(false);
          return {
            bubbleId: "b_ask_human_02",
            sequence: 4,
            envelope: {
              id: "msg_20260319_002"
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
