import { describe, expect, it } from "vitest";

import { buildAskHumanExecutionDependencyResolutionInput } from "../../../../src/v11/application/askHuman/askHumanExecutionDependencyResolutionInputBuilder.js";

describe("askHumanExecutionDependencyResolutionInputBuilder", () => {
  it("forwards execution dependency overrides to resolution input", () => {
    const appendProtocolEnvelopeOverride = (async () => ({})) as never;
    const writeStateSnapshotOverride = (async () => ({})) as never;
    const applyStateTransitionOverride = (() => ({})) as never;

    const resolutionInput = buildAskHumanExecutionDependencyResolutionInput({
      appendProtocolEnvelope: appendProtocolEnvelopeOverride,
      writeStateSnapshot: writeStateSnapshotOverride,
      applyStateTransition: applyStateTransitionOverride
    });

    expect(resolutionInput).toEqual({
      appendProtocolEnvelope: appendProtocolEnvelopeOverride,
      writeStateSnapshot: writeStateSnapshotOverride,
      applyStateTransition: applyStateTransitionOverride
    });
  });

  it("keeps omitted dependencies undefined", () => {
    const resolutionInput = buildAskHumanExecutionDependencyResolutionInput({});

    expect(resolutionInput).toEqual({
      appendProtocolEnvelope: undefined,
      writeStateSnapshot: undefined,
      applyStateTransition: undefined
    });
  });
});
