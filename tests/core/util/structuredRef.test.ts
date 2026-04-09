import { describe, expect, it } from "vitest";

import { isLikelyStructuredRef } from "../../../src/v11/shared/reference/structuredRef.js";

describe("isLikelyStructuredRef", () => {
  it("returns true for path-like and URI-like refs that include slash", () => {
    expect(isLikelyStructuredRef("artifact://review/a.md")).toBe(true);
    expect(isLikelyStructuredRef("./notes/repro.md")).toBe(true);
    expect(isLikelyStructuredRef("/tmp/log.txt")).toBe(true);
  });

  it("returns false for non-structured tokens without slash", () => {
    expect(isLikelyStructuredRef("notes-token")).toBe(false);
    expect(isLikelyStructuredRef("P2-followup")).toBe(false);
    expect(isLikelyStructuredRef("artifact:review")).toBe(false);
  });
});
