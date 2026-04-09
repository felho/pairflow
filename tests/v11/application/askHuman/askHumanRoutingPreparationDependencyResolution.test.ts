import { describe, expect, it } from "vitest";

import { resolveAskHumanRoutingPreparationDependencies } from "../../../../src/v11/application/askHuman/askHumanRoutingPreparationDependencyResolution.js";

describe("askHumanRoutingPreparationDependencyResolution", () => {
  it("uses routing preparation defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanRoutingPreparationDependencies({});

    expect(resolved.resolveBubble).toEqual(expect.any(Function));
    expect(resolved.ensureBubbleIdentity).toEqual(expect.any(Function));
    expect(resolved.readState).toEqual(expect.any(Function));
  });

  it("uses provided routing preparation overrides", () => {
    const resolveBubbleOverride = async () => ({}) as never;
    const ensureBubbleIdentityOverride = async () => ({}) as never;
    const readStateOverride = async () => ({}) as never;

    const resolved = resolveAskHumanRoutingPreparationDependencies({
      resolveBubbleFromWorkspaceCwd: resolveBubbleOverride,
      ensureBubbleInstanceIdForMutation: ensureBubbleIdentityOverride,
      readStateSnapshot: readStateOverride
    });

    expect(resolved.resolveBubble).toBe(resolveBubbleOverride);
    expect(resolved.ensureBubbleIdentity).toBe(ensureBubbleIdentityOverride);
    expect(resolved.readState).toBe(readStateOverride);
  });
});
