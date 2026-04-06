import { describe, expect, it } from "vitest";

import { ensureBubbleInstanceIdForMutation } from "../../../../src/v11/infrastructure/artifact/bubble/bubbleInstanceId.js";
import { resolveBubbleFromWorkspaceCwd } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { resolveAskHumanRoutingPreparationDependencies } from "../../../../src/v11/shared/askHuman/askHumanRoutingPreparationDependencyResolution.js";

describe("askHumanRoutingPreparationDependencyResolution", () => {
  it("uses routing preparation defaults when overrides are omitted", () => {
    const resolved = resolveAskHumanRoutingPreparationDependencies({});

    expect(resolved.resolveBubble).toBe(resolveBubbleFromWorkspaceCwd);
    expect(resolved.ensureBubbleIdentity).toBe(ensureBubbleInstanceIdForMutation);
    expect(resolved.readState).toBe(readStateSnapshot);
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
