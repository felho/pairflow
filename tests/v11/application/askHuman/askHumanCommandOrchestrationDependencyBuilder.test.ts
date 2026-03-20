import { describe, expect, it } from "vitest";

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";
import { buildAskHumanCommandOrchestrationDependencies } from "../../../../src/v11/shared/askHuman/askHumanCommandOrchestrationDependencyBuilder.js";

describe("askHumanCommandOrchestrationDependencyBuilder", () => {
  it("builds default orchestration flow dependencies", () => {
    const dependencies = buildAskHumanCommandOrchestrationDependencies({});

    expect(dependencies.executeAskHumanExecution).toBe(executeAskHumanExecution);
    expect(dependencies.finalizeAskHumanFlow).toBe(finalizeAskHumanFlow);
    expect("emitTmuxDeliveryNotification" in dependencies).toBe(false);
    expect("emitBubbleNotification" in dependencies).toBe(false);
  });

  it("forwards explicit runtime notification dependencies", () => {
    const emitTmuxDeliveryNotification = (() => Promise.resolve({})) as never;
    const emitBubbleNotification = (() => Promise.resolve({})) as never;

    const dependencies = buildAskHumanCommandOrchestrationDependencies({
      emitTmuxDeliveryNotification,
      emitBubbleNotification
    });

    expect(dependencies.emitTmuxDeliveryNotification).toBe(
      emitTmuxDeliveryNotification
    );
    expect(dependencies.emitBubbleNotification).toBe(emitBubbleNotification);
  });
});
