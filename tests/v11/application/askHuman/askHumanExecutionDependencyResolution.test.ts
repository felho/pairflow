import { describe, expect, it } from "vitest";

import { applyStateTransition } from "../../../../src/v11/domain/state/machine.js";
import { resolveAskHumanExecutionDependencies } from "../../../../src/v11/application/askHuman/askHumanExecutionDependencyResolution.js";

describe("askHumanExecutionDependencyResolution", () => {
  it("uses execution defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanExecutionDependencies({});

    expect(resolved.appendEnvelope).toEqual(expect.any(Function));
    expect(resolved.writeSnapshot).toEqual(expect.any(Function));
    expect(resolved.applyTransition).toBe(applyStateTransition);
  });

  it("uses provided execution overrides", () => {
    const appendProtocolEnvelopeOverride = async () =>
      ({
        envelope: {},
        sequence: 1
      }) as never;
    const writeStateSnapshotOverride = async () =>
      ({
        state: {}
      }) as never;
    const applyStateTransitionOverride = (state: unknown) => state as never;

    const resolved = resolveAskHumanExecutionDependencies({
      appendProtocolEnvelope: appendProtocolEnvelopeOverride,
      writeStateSnapshot: writeStateSnapshotOverride,
      applyStateTransition: applyStateTransitionOverride
    });

    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelopeOverride);
    expect(resolved.writeSnapshot).toBe(writeStateSnapshotOverride);
    expect(resolved.applyTransition).toBe(applyStateTransitionOverride);
  });
});
