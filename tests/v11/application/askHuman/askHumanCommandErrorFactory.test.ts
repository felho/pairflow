import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

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
      createAskHumanCommandError: (message: PairflowCommandErrorInput) => new SyntheticAskHumanCommandError(toErrorMessage(message))
    });

    const created = createAskHumanCommandError("unexpected");

    expect(created).toBeInstanceOf(SyntheticAskHumanCommandError);
    expect(created.message).toBe("unexpected");
  });

  it("invokes the provided creator on every call", () => {
    const capturedMessages: string[] = [];
    const createAskHumanCommandError = buildAskHumanCommandErrorFactory({
      createAskHumanCommandError: (message) => {
        capturedMessages.push(toErrorMessage(message));
        return new SyntheticAskHumanCommandError(toErrorMessage(message));
      }
    });

    createAskHumanCommandError("first");
    createAskHumanCommandError("second");

    expect(capturedMessages).toEqual(["first", "second"]);
  });
});
