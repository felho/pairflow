import { describe, expect, it } from "vitest";

import { resolveRestartBubbleDependencies } from "../../../../src/v11/shared/restart/restartCommandDependencyResolution.js";

describe("restartCommandDependencyResolution", () => {
  it("preserves explicit dependency overrides", () => {
    const customStartBubble = (async () =>
      ({
        bubbleId: "b_restart_01",
        state: {
          state: "RUNNING"
        },
        tmuxSessionName: "pf-b_restart_01",
        worktreePath: "/tmp/repo/.pairflow/worktrees/b_restart_01"
      })) as never;
    const customPersistMarker = (async () =>
      ({
        persisted_targets: [],
        warnings: []
      })) as never;

    const resolved = resolveRestartBubbleDependencies({
      startBubble: customStartBubble,
      persistPassValidationRecoveryMarker: customPersistMarker
    });

    expect(resolved.startBubble).toBe(customStartBubble);
    expect(resolved.persistPassValidationRecoveryMarker).toBe(customPersistMarker);
  });
});
