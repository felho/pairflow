import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

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
      (message: PairflowCommandErrorInput) => new SyntheticAskHumanCommandError(toErrorMessage(message))
    );

    const created = createCommandError("unexpected");

    expect(created).toBeInstanceOf(SyntheticAskHumanCommandError);
    expect(created.message).toBe("unexpected");
  });
});
