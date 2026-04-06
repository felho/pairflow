import { describe, expect, it } from "vitest";

import { appendProtocolEnvelope } from "../../../../src/core/protocol/transcriptStore.js";
import { writeStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { applyStateTransition } from "../../../../src/v11/domain/state/machine.js";
import { resolveAskHumanExecutionDependencies } from "../../../../src/v11/shared/askHuman/askHumanExecutionDependencyResolution.js";

describe("askHumanExecutionDependencyResolution", () => {
  it("uses execution defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanExecutionDependencies({});

    expect(resolved.appendEnvelope).toBe(appendProtocolEnvelope);
    expect(resolved.writeSnapshot).toBe(writeStateSnapshot);
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
