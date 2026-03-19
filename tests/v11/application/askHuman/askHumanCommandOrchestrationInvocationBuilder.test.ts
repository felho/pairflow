import { describe, expect, it } from "vitest";

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";
import { buildAskHumanCommandOrchestrationInvocation } from "../../../../src/v11/shared/askHuman/askHumanCommandOrchestrationInvocationBuilder.js";

describe("askHumanCommandOrchestrationInvocationBuilder", () => {
  it("builds orchestration input from command payload", () => {
    const now = new Date("2026-03-01T10:00:00.000Z");
    const createError = (message: string) => new Error(message);

    const invocation = buildAskHumanCommandOrchestrationInvocation({
      commandInput: {
        question: "  Need escalation? ",
        refs: ["artifact://one", "artifact://two"],
        cwd: "/repo/branch",
        now
      },
      runtimeDependencies: {},
      createError
    });

    expect(invocation.orchestrationInput).toEqual({
      question: "  Need escalation? ",
      refs: ["artifact://one", "artifact://two"],
      cwd: "/repo/branch",
      now,
      createError
    });
  });

  it("wires flow dependencies and forwards optional runtime notifiers", () => {
    const emitTmuxDeliveryNotification = (() => Promise.resolve({})) as never;

    const invocation = buildAskHumanCommandOrchestrationInvocation({
      commandInput: {
        question: "Need ack?",
        now: new Date("2026-03-01T10:10:00.000Z")
      },
      runtimeDependencies: {
        emitTmuxDeliveryNotification
      },
      createError: (message: string) => new Error(message)
    });

    expect(invocation.orchestrationDependencies.executeAskHumanExecution).toBe(
      executeAskHumanExecution
    );
    expect(invocation.orchestrationDependencies.finalizeAskHumanFlow).toBe(
      finalizeAskHumanFlow
    );
    expect(
      invocation.orchestrationDependencies.emitTmuxDeliveryNotification
    ).toBe(emitTmuxDeliveryNotification);
    expect("emitBubbleNotification" in invocation.orchestrationDependencies).toBe(
      false
    );
  });
});
