import { describe, expect, it } from "vitest";

import {
  incrementWarningCount,
  mergeWarningCounts,
  toWarningSummary
} from "../../../../src/core/metrics/report/warnings.js";

describe("metrics report warnings", () => {
  it("sorts warning keys alphabetically in summary output", () => {
    const summary = toWarningSummary({
      zebra_warning: 2,
      alpha_warning: 1,
      middle_warning: 3
    });

    expect(Object.keys(summary.by_code)).toEqual([
      "alpha_warning",
      "middle_warning",
      "zebra_warning"
    ]);
    expect(summary.total).toBe(6);
  });

  it("supports warning count increment and merge helpers", () => {
    const left: Record<string, number> = {};
    incrementWarningCount(left, "a");
    incrementWarningCount(left, "a");
    incrementWarningCount(left, "b");

    const merged = mergeWarningCounts(left, {
      b: 5,
      c: 1
    });
    expect(merged).toEqual({
      a: 2,
      b: 6,
      c: 1
    });
  });
});
