import { describe, expect, it } from "vitest";

import { executeAskHumanExecution } from "../../../../src/v11/application/askHuman/askHumanExecution.js";
import { finalizeAskHumanFlow } from "../../../../src/v11/application/askHuman/askHumanFinalization.js";
import { createAskHumanFlowStepDependencies } from "../../../../src/v11/application/askHuman/askHumanFlowStepDependencyWiring.js";

describe("askHumanFlowStepDependencyWiring", () => {
  it("wires flow step implementations", () => {
    const dependencies = createAskHumanFlowStepDependencies();

    expect(dependencies.executeAskHumanExecution).toBe(executeAskHumanExecution);
    expect(dependencies.finalizeAskHumanFlow).toBe(finalizeAskHumanFlow);
  });
});
