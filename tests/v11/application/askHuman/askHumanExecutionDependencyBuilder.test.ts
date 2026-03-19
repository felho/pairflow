import { describe, expect, it } from "vitest";

import {
  buildAskHumanExecutionDependencies
} from "../../../../src/v11/shared/askHuman/askHumanExecutionDependencyBuilder.js";

describe("askHumanExecutionDependencyBuilder", () => {
  it("forwards only explicitly provided execution overrides", () => {
    const dependencies = buildAskHumanExecutionDependencies({
      appendProtocolEnvelope: async () =>
        ({
          envelope: {},
          sequence: 1
        }) as never,
      applyStateTransition: (state) => state
    });

    expect(dependencies.appendProtocolEnvelope).toBeTypeOf("function");
    expect(dependencies.applyStateTransition).toBeTypeOf("function");
    expect("writeStateSnapshot" in dependencies).toBe(false);
  });
});
