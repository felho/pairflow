import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";
import { buildAskHumanCommandOrchestrationInvocation } from "../../../../src/v11/application/askHuman/askHumanCommandOrchestrationInvocationBuilder.js";

describe("askHumanCommandOrchestrationInvocationBuilder", () => {
  it("builds orchestration input from command payload", () => {
    const now = new Date("2026-03-01T10:00:00.000Z");
    const createError = (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message));

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
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;

    const invocation = buildAskHumanCommandOrchestrationInvocation({
      commandInput: {
        question: "Need ack?",
        now: new Date("2026-03-01T10:10:00.000Z")
      },
      runtimeDependencies: {
        emitDeliveryNotificationAck
      },
      createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
    });

    expect(invocation.orchestrationDependencies.executeAskHumanExecution).toBe(
      executeAskHumanExecution
    );
    expect(invocation.orchestrationDependencies.finalizeAskHumanFlow).toBe(
      finalizeAskHumanFlow
    );
    expect(
      invocation.orchestrationDependencies.emitDeliveryNotificationAck
    ).toBe(emitDeliveryNotificationAck);
    expect("emitBubbleNotification" in invocation.orchestrationDependencies).toBe(
      false
    );
  });
});
