import type { EpochMillis, TimeSource } from "../ports/time.js";

/**
 * The IC-D named deliverable: the only TimeSource a v3 test binds
 * (CHK-D-TESTCLOCK). Gate-timeout integration deepens in ch 5.
 */
export interface ControlledClock extends TimeSource {
  advance(byMillis: number): void;
  set(to: EpochMillis): void;
}

export function createControlledClock(start: EpochMillis = 0): ControlledClock {
  let current = start;
  return {
    now: () => current,
    advance(byMillis) {
      if (byMillis < 0) {
        throw new Error("controlled clock never goes backwards");
      }
      current += byMillis;
    },
    set(to) {
      if (to < current) {
        throw new Error("controlled clock never goes backwards");
      }
      current = to;
    },
  };
}
