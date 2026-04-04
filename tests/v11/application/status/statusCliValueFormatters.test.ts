import { describe, expect, it } from "vitest";

import {
  formatClockTimestamp,
  formatTableTimestamp
} from "../../../../src/v11/application/status/statusCliValueFormatters.js";

describe("statusCliValueFormatters", () => {
  it("formats clock timestamps in the requested timezone instead of forcing UTC", () => {
    const value = "2026-03-08T21:29:10.000Z";

    expect(formatClockTimestamp(value, { timeZone: "UTC" })).toBe("21:29:10");
    expect(formatClockTimestamp(value, { timeZone: "Europe/Budapest" })).toBe("22:29:10");
  });

  it("formats table timestamps with local offset instead of a hard-coded Z suffix", () => {
    const winterValue = "2026-03-08T21:29:10.000Z";
    const summerValue = "2026-07-08T21:29:10.000Z";

    expect(
      formatTableTimestamp(winterValue, { timeZone: "Europe/Budapest" })
    ).toBe("03-08T22:29:10 GMT+1");
    expect(
      formatTableTimestamp(summerValue, { timeZone: "Europe/Budapest" })
    ).toBe("07-08T23:29:10 GMT+2");
  });
});
