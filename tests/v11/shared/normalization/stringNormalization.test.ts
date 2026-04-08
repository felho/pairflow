import { describe, expect, it } from "vitest";

import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../../src/v11/shared/normalization/stringNormalization.js";

class SyntheticNormalizationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SyntheticNormalizationError";
  }
}

const createSyntheticNormalizationError: PairflowCreateCommandError = (input) =>
  new SyntheticNormalizationError(
    typeof input === "string" ? input : input.message
  );

describe("v11 string normalization", () => {
  it("trims, drops empties, and de-duplicates while preserving order", () => {
    expect(
      normalizeStringList([" a.md ", "", "a.md", " b.md ", "b.md"])
    ).toEqual(["a.md", "b.md"]);
  });

  it("requires non-empty strings after trimming", () => {
    expect(
      requireNonEmptyString(
        "  ready  ",
        "Summary",
        createSyntheticNormalizationError
      )
    ).toBe("ready");

    expect(() =>
      requireNonEmptyString(
        "   ",
        "Summary",
        createSyntheticNormalizationError
      )
    ).toThrow("Summary cannot be empty.");
  });
});
