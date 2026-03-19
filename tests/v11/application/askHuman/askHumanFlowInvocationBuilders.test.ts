import { describe, expect, it } from "vitest";

import {
  buildAskHumanFlowDependencies,
  buildAskHumanFlowInput,
  buildAskHumanRoutingInput
} from "../../../../src/v11/shared/askHuman/askHumanFlowInvocationBuilders.js";

describe("askHumanFlowInvocationBuilders", () => {
  it("builds prepareAskHumanRouting input and omits undefined optional fields", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: string) => new Error(message);

    const routingInput = buildAskHumanRoutingInput({
      question: "Need migration decision?",
      refs: undefined,
      cwd: undefined,
      now,
      createError
    });

    expect(routingInput).toEqual({
      question: "Need migration decision?",
      now,
      createError
    });
    expect("refs" in routingInput).toBe(false);
    expect("cwd" in routingInput).toBe(false);
  });

  it("builds prepareAskHumanRouting input and forwards optional fields when provided", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const createError = (message: string) => new Error(message);

    const routingInput = buildAskHumanRoutingInput({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });

    expect(routingInput).toEqual({
      question: "Need migration decision?",
      refs: ["artifact://analysis.md"],
      cwd: "/repo/worktrees/b_ask_human_01",
      now,
      createError
    });
  });

  it("builds runAskHumanFlow input without mutation", () => {
    const now = new Date("2026-02-21T12:10:00.000Z");
    const routing = {
      nowIso: now.toISOString(),
      question: "Need migration decision?"
    } as never;
    const createError = (message: string) => new Error(message);

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
