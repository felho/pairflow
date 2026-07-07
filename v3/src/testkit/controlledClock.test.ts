import { describe, expect, it } from "vitest";

import { createControlledClock } from "./controlledClock.js";

describe("controlled clock (IC-D named deliverable)", () => {
  it("starts at the given instant and only moves when advanced", () => {
    const clock = createControlledClock(1_000);
    expect(clock.now()).toBe(1_000);
    expect(clock.now()).toBe(1_000);
    clock.advance(250);
    expect(clock.now()).toBe(1_250);
  });

  it("defaults to epoch zero", () => {
    expect(createControlledClock().now()).toBe(0);
  });

  it("can be set to an absolute future instant", () => {
    const clock = createControlledClock(100);
    clock.set(500);
    expect(clock.now()).toBe(500);
  });

  it("never goes backwards", () => {
    const clock = createControlledClock(100);
    expect(() => clock.advance(-1)).toThrow(/backwards/);
    expect(() => clock.set(99)).toThrow(/backwards/);
    expect(clock.now()).toBe(100);
  });
});
