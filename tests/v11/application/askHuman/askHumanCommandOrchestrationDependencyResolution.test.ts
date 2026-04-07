import { describe, expect, it } from "vitest";

import { prepareAskHumanRouting } from "../../../../src/v11/application/askHuman/askHumanRoutingPreparation.js";
import { runAskHumanFlow } from "../../../../src/v11/application/askHuman/runAskHumanFlow.js";
import { resolveAskHumanCommandOrchestrationDependencies } from "../../../../src/v11/application/askHuman/askHumanCommandOrchestrationDependencyResolution.js";

describe("askHumanCommandOrchestrationDependencyResolution", () => {
  it("uses default implementations when overrides are omitted", () => {
    const resolved = resolveAskHumanCommandOrchestrationDependencies({});

    expect(resolved.prepareAskHumanRouting).toBe(prepareAskHumanRouting);
    expect(resolved.runAskHumanFlow).toBe(runAskHumanFlow);
  });

  it("uses provided overrides when available", () => {
    const prepareAskHumanRoutingOverride = (async () => ({})) as never;
    const runAskHumanFlowOverride = (async () => ({})) as never;

    const resolved = resolveAskHumanCommandOrchestrationDependencies({
      prepareAskHumanRouting: prepareAskHumanRoutingOverride,
      runAskHumanFlow: runAskHumanFlowOverride
    });

    expect(resolved.prepareAskHumanRouting).toBe(
      prepareAskHumanRoutingOverride
    );
    expect(resolved.runAskHumanFlow).toBe(runAskHumanFlowOverride);
  });
});
