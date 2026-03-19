import { describe, expect, it } from "vitest";

import { prepareAskHumanRouting } from "../../../../src/v11/application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../../../src/v11/application/askHuman/runAskHumanFlow.js";
import { createAskHumanCommandFlowDefaults } from "../../../../src/v11/shared/askHuman/askHumanCommandFlowDefaults.js";

describe("askHumanCommandFlowDefaults", () => {
  it("returns default routing and flow orchestration implementations", () => {
    const defaults = createAskHumanCommandFlowDefaults();

    expect(defaults.prepareAskHumanRouting).toBe(prepareAskHumanRouting);
    expect(defaults.runAskHumanFlow).toBe(runAskHumanFlow);
  });
});
