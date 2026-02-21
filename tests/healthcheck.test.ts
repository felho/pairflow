import { describe, expect, it } from "vitest";

import { healthcheck } from "../src/index.js";

describe("healthcheck", () => {
  it("returns ok status", () => {
    expect(healthcheck()).toBe("pairflow:ok");
  });
});
