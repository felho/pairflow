import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import { inferPassIntentFromActiveRole } from "../../../../src/v11/domain/pass/passIntentInference.js";

describe("passIntentInference", () => {
  it("maps implementer role to review intent", () => {
    expect(
      inferPassIntentFromActiveRole({
        activeRole: "implementer",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      })
    ).toBe("review");
  });

  it("maps reviewer role to fix_request intent", () => {
    expect(
      inferPassIntentFromActiveRole({
        activeRole: "reviewer",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      })
    ).toBe("fix_request");
  });

  it("throws with provided error factory for unsupported roles", () => {
    expect(() =>
      inferPassIntentFromActiveRole({
        activeRole: "meta_reviewer",
        createError: (message) => new Error(`synthetic:${toErrorMessage(message)}`)
      })
    ).toThrow("synthetic:PASS_INTENT_ACTIVE_ROLE_UNSUPPORTED:");
  });
});
