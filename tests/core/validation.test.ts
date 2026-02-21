import { describe, expect, it } from "vitest";

import { isIsoTimestamp } from "../../src/core/validation.js";

describe("isIsoTimestamp", () => {
  it("accepts strict UTC ISO format", () => {
    expect(isIsoTimestamp("2026-02-21T12:34:56Z")).toBe(true);
    expect(isIsoTimestamp("2026-02-21T12:34:56.1Z")).toBe(true);
    expect(isIsoTimestamp("2026-02-21T12:34:56.123Z")).toBe(true);
    expect(isIsoTimestamp("2026-02-21T12:34:56.123456Z")).toBe(true);
  });

  it("rejects loose date strings", () => {
    expect(isIsoTimestamp("Tuesday")).toBe(false);
    expect(isIsoTimestamp("Feb 21 2026")).toBe(false);
    expect(isIsoTimestamp("2026")).toBe(false);
  });

  it("rejects invalid timestamp values", () => {
    expect(isIsoTimestamp("2026-02-30T12:34:56Z")).toBe(false);
  });
});
