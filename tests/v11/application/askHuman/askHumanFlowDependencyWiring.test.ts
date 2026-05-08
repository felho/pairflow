import { describe, expect, it } from "vitest";

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/internal/delivery/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/internal/mutation/askHumanFinalization.js";
import { createAskHumanCommandOrchestrationDependencies } from "../../../../src/v11/application/askHuman/internal/delivery/askHumanFlowDependencyWiring.js";

describe("askHumanFlowDependencyWiring", () => {
  it("wires execution and finalization implementations", () => {
    const dependencies = createAskHumanCommandOrchestrationDependencies({});

    expect(dependencies.executeAskHumanExecution).toBe(executeAskHumanExecution);
    expect(dependencies.finalizeAskHumanFlow).toBe(finalizeAskHumanFlow);
  });

  it("forwards only explicitly provided runtime notification dependencies", () => {
    const emitDeliveryNotificationAck = (() => Promise.resolve({})) as never;

    const dependencies = createAskHumanCommandOrchestrationDependencies({
      emitDeliveryNotificationAck,
      emitBubbleNotification: undefined
    });

    expect(dependencies.emitDeliveryNotificationAck).toBe(
      emitDeliveryNotificationAck
    );
    expect("emitBubbleNotification" in dependencies).toBe(false);
  });
});
