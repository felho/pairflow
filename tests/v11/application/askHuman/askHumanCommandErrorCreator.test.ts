import { describe, expect, it } from "vitest";

import { createAskHumanCommandErrorCreator } from "../../../../src/v11/shared/askHuman/askHumanCommandErrorCreator.js";

class SyntheticAskHumanCommandError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticAskHumanCommandError";
  }
}

describe("askHumanCommandErrorCreator", () => {
  it("builds an error creator that calls the provided constructor", () => {
    const createCommandError = createAskHumanCommandErrorCreator(
      (message) => new SyntheticAskHumanCommandError(message)
    );

    const created = createCommandError("unexpected");

    expect(created).toBeInstanceOf(SyntheticAskHumanCommandError);
    expect(created.message).toBe("unexpected");
  });
});
