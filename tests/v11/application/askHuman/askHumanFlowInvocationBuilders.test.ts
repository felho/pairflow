import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput
} from "../../../../src/v11/shared/askHuman/askHumanFlowInvocationBuilders.js";

describe("askHumanFlowInvocationBuilders", () => {
  it("builds runAskHumanFlow input without mutation", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const routing = {
      nowIso: now.toISOString(),
      question: "Need migration decision?"
    } as never;
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

    const input = buildAskHumanFlowInput({
      now,
      routing,
      createError
    });

    expect(input).toEqual({
      now,
      routing,
      createError
    });
  });

  it("builds dependencies and forwards only provided optional overrides", () => {
    const dependencies = buildAskHumanFlowDependencies({
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
      emitBubbleNotification: async () =>
        ({
          kind: "waiting-human",
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled"
        }) as never
    });

    expect(dependencies.executeAskHumanExecution).toBeTypeOf("function");
    expect(dependencies.finalizeAskHumanFlow).toBeTypeOf("function");
    expect(dependencies.emitBubbleNotification).toBeTypeOf("function");
    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("appendProtocolEnvelope" in dependencies).toBe(false);
    expect("writeStateSnapshot" in dependencies).toBe(false);
    expect("applyStateTransition" in dependencies).toBe(false);
  });

  it("omits optional dependency overrides when explicitly passed as undefined", () => {
    const dependencies = buildAskHumanFlowDependencies({
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
      emitTmuxDeliveryNotification: undefined,
      emitBubbleNotification: undefined
    });

    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("emitBubbleNotification" in dependencies).toBe(false);
  });
});
