import { describe, expect, it } from "vitest";

import { buildAskHumanCommandOrchestrationDependencyResolutionInput } from "../../../../src/v11/shared/askHuman/askHumanCommandOrchestrationDependencyResolutionInputBuilder.js";

describe("askHumanCommandOrchestrationDependencyResolutionInputBuilder", () => {
  it("forwards orchestration dependency overrides to resolution input", () => {
    const prepareAskHumanRoutingOverride = (async () => ({})) as never;
    const runAskHumanFlowOverride = (async () => ({})) as never;

    const resolvedInput =
      buildAskHumanCommandOrchestrationDependencyResolutionInput({
        executeAskHumanExecution: (async () => ({})) as never,
        finalizeAskHumanFlow: (async () => ({})) as never,
        prepareAskHumanRouting: prepareAskHumanRoutingOverride,
        runAskHumanFlow: runAskHumanFlowOverride
      });

    expect(resolvedInput).toEqual({
      prepareAskHumanRouting: prepareAskHumanRoutingOverride,
      runAskHumanFlow: runAskHumanFlowOverride
    });
  });

  it("keeps omitted overrides undefined", () => {
    const resolvedInput =
      buildAskHumanCommandOrchestrationDependencyResolutionInput({
        executeAskHumanExecution: (async () => ({})) as never,
        finalizeAskHumanFlow: (async () => ({})) as never
      });

    expect(resolvedInput).toEqual({
      prepareAskHumanRouting: undefined,
      runAskHumanFlow: undefined
    });
  });
});
