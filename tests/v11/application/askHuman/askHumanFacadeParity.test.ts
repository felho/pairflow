import { describe, expect, it } from "vitest";

import {
  asAskHumanCommandError,
  AskHumanCommandError,
  emitAskHumanFromWorkspace
} from "../../../../src/core/agent/askHuman.js";
import {
  asAskHumanCommandErrorV11,
  AskHumanCommandErrorV11,
  emitAskHumanFromWorkspaceV11
} from "../../../../src/v11/application/askHuman/emitAskHumanV11.js";

describe("askHuman facade parity", () => {
  it("keeps core askHuman exports aligned with v11 source-of-truth exports", () => {
    expect(emitAskHumanFromWorkspace).toBe(emitAskHumanFromWorkspaceV11);
    expect(asAskHumanCommandError).toBe(asAskHumanCommandErrorV11);
    expect(AskHumanCommandError).toBe(AskHumanCommandErrorV11);
  });
});
