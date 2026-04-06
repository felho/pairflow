import { describe, expect, it } from "vitest";

import { isLikelyStructuredRef } from "../../../../src/v11/shared/reference/structuredRef.js";

describe("v11 structuredRef", () => {
  it("returns true for slash-delimited refs", () => {
    expect(isLikelyStructuredRef("artifact://review/a.md")).toBe(true);
    expect(isLikelyStructuredRef("./notes/repro.md")).toBe(true);
  });

  it("returns false for plain tokens", () => {
    expect(isLikelyStructuredRef("notes-token")).toBe(false);
    expect(isLikelyStructuredRef("artifact:review")).toBe(false);
  });
});
