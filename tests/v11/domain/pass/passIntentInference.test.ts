import { describe, expect, it } from "vitest";

import { inferPassIntentFromActiveRole } from "../../../../src/v11/domain/pass/passIntentInference.js";

describe("passIntentInference", () => {
  it("maps implementer role to review intent", () => {
    expect(
      inferPassIntentFromActiveRole({
        activeRole: "implementer",
        createError: (message) => new Error(message)
      })
    ).toBe("review");
  });

  it("maps reviewer role to fix_request intent", () => {
    expect(
      inferPassIntentFromActiveRole({
        activeRole: "reviewer",
        createError: (message) => new Error(message)
      })
    ).toBe("fix_request");
  });

  it("throws with provided error factory for unsupported roles", () => {
    expect(() =>
      inferPassIntentFromActiveRole({
        activeRole: "meta_reviewer",
        createError: (message) => new Error(`synthetic:${message}`)
      })
    ).toThrow("synthetic:Unsupported active role for pass intent inference: meta_reviewer.");
  });
});
