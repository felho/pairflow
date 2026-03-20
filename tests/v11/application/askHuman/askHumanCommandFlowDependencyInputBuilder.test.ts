import { describe, expect, it } from "vitest";

import { buildAskHumanFlowDependenciesInputFromCommandOrchestration } from "../../../../src/v11/shared/askHuman/askHumanCommandFlowDependencyInputBuilder.js";

describe("askHumanCommandFlowDependencyInputBuilder", () => {
  it("maps orchestration dependencies into flow dependency input", () => {
    const executeAskHumanExecution = (async () => ({})) as never;
    const finalizeAskHumanFlow = (async () => ({})) as never;
    const emitTmuxDeliveryNotification = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const flowDependencyInput =
      buildAskHumanFlowDependenciesInputFromCommandOrchestration({
        executeAskHumanExecution,
        finalizeAskHumanFlow,
        emitTmuxDeliveryNotification,
        emitBubbleNotification
      });

    expect(flowDependencyInput).toEqual({
      executeAskHumanExecution,
      finalizeAskHumanFlow,
      emitTmuxDeliveryNotification,
      emitBubbleNotification
    });
  });

  it("keeps omitted optional notification dependencies undefined", () => {
    const executeAskHumanExecution = (async () => ({})) as never;
    const finalizeAskHumanFlow = (async () => ({})) as never;

    const flowDependencyInput =
      buildAskHumanFlowDependenciesInputFromCommandOrchestration({
        executeAskHumanExecution,
        finalizeAskHumanFlow
      });

    expect(flowDependencyInput).toEqual({
      executeAskHumanExecution,
      finalizeAskHumanFlow,
      emitTmuxDeliveryNotification: undefined,
      emitBubbleNotification: undefined
    });
  });
});
