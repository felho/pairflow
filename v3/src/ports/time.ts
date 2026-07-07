import type { EpochMillis } from "../domain/time.js";

export type { EpochMillis };

/**
 * IC-D: the kernel never reads the clock directly; every timestamp and
 * every time bound flows through this injected source. Production binds
 * the wall clock; tests bind the testkit controlled clock (CHK-D-TESTCLOCK).
 */
export interface TimeSource {
  now(): EpochMillis;
}
