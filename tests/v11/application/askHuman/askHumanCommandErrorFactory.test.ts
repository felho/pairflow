import { describe, expect, it } from "vitest";

import { buildAskHumanCommandErrorFactory } from "../../../../src/v11/shared/askHuman/askHumanCommandErrorFactory.js";

class SyntheticAskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticAskHumanCommandError";
  }
}

describe("askHumanCommandErrorFactory", () => {
  it("creates command errors through the provided constructor", () => {
    const createAskHumanCommandError = buildAskHumanCommandErrorFactory({
      createAskHumanCommandError: (message) =>
        new SyntheticAskHumanCommandError(message)
    });

    const created = createAskHumanCommandError("unexpected");

    expect(created).toBeInstanceOf(SyntheticAskHumanCommandError);
    expect(created.message).toBe("unexpected");
  });

  it("invokes the provided creator on every call", () => {
    const capturedMessages: string[] = [];
    const createAskHumanCommandError = buildAskHumanCommandErrorFactory({
      createAskHumanCommandError: (message) => {
        capturedMessages.push(message);
        return new SyntheticAskHumanCommandError(message);
      }
    });

    createAskHumanCommandError("first");
    createAskHumanCommandError("second");

    expect(capturedMessages).toEqual(["first", "second"]);
  });
});
