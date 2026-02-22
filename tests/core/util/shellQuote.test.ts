import { describe, expect, it } from "vitest";

import { shellQuote } from "../../../src/core/util/shellQuote.js";

describe("shellQuote", () => {
  it("wraps plain values in single quotes", () => {
    expect(shellQuote("hello")).toBe("'hello'");
  });

  it("escapes embedded single quotes using POSIX-safe pattern", () => {
    expect(shellQuote("a'b")).toBe("'a'\\''b'");
  });

  it("supports empty string", () => {
    expect(shellQuote("")).toBe("''");
  });
});
