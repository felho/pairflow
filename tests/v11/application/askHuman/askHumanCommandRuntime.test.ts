import { describe, expect, it } from "vitest";

import {
  AskHumanCommandError,
  createAskHumanCommandError,
  throwAsAskHumanCommandError
} from "../../../../src/v11/shared/askHuman/askHumanCommandRuntime.js";
import { WorkspaceResolutionError } from "../../../../src/v11/infrastructure/executor/workspace/workspaceResolution.js";

describe("askHumanCommandRuntime", () => {
  it("creates AskHumanCommandError instances with stable name", () => {
    const created = createAskHumanCommandError("runtime failure");

    expect(created).toBeInstanceOf(AskHumanCommandError);
    expect(created.name).toBe("AskHumanCommandError");
    expect(created.message).toBe("runtime failure");
  });

  it("rethrows AskHumanCommandError instances as-is", () => {
    const original = new AskHumanCommandError("already normalized");

    expect(() => throwAsAskHumanCommandError(original)).toThrow(original);
  });

  it("maps external errors to AskHumanCommandError", () => {
    expect(() =>
      throwAsAskHumanCommandError(new WorkspaceResolutionError("bubble not found"))
    ).toThrowError(AskHumanCommandError);
  });
});
