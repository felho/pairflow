import { describe, expect, it } from "vitest";

import { shellQuote } from "../../../../../src/v11/shared/foundation/shellQuote.js";

describe("v11 shellQuote", () => {
  it("wraps plain values in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("escapes embedded single quotes using the POSIX-safe pattern", () => {
    expect(shellQuote("a'b")).toBe("'a'\\''b'");
  });
});
