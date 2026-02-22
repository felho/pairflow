import { describe, expect, it } from "vitest";

import { computeWatchdogStatus } from "../../../src/core/runtime/watchdog.js";
import type { BubbleStateSnapshot } from "../../../src/types/bubble.js";

function createState(partial: Partial<BubbleStateSnapshot>): BubbleStateSnapshot {
  return {
    bubble_id: "b_watchdog_01",
    state: "RUNNING",
    round: 1,
    active_agent: "codex",
    active_since: "2026-02-22T12:00:00.000Z",
    active_role: "implementer",
    round_role_history: [
      {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-02-22T12:00:00.000Z"
      }
    ],
    last_command_at: "2026-02-22T12:05:00.000Z",
    ...partial
  };
}

describe("computeWatchdogStatus", () => {
  it("computes countdown from last_command_at", () => {
    const status = computeWatchdogStatus(
      createState({}),
      5,
      new Date("2026-02-22T12:08:00.000Z")
    );

    expect(status.monitored).toBe(true);
    expect(status.remainingSeconds).toBe(120);
    expect(status.expired).toBe(false);
  });

  it("marks watchdog expired at deadline", () => {
    const status = computeWatchdogStatus(
      createState({}),
      5,
      new Date("2026-02-22T12:10:00.000Z")
    );

    expect(status.remainingSeconds).toBe(0);
    expect(status.expired).toBe(true);
  });

  it("falls back to active_since when last_command_at missing", () => {
    const status = computeWatchdogStatus(
      createState({ last_command_at: null }),
      5,
      new Date("2026-02-22T12:04:00.000Z")
    );

    expect(status.referenceTimestamp).toBe("2026-02-22T12:00:00.000Z");
    expect(status.remainingSeconds).toBe(60);
  });

  it("disables monitoring when active agent is absent", () => {
    const status = computeWatchdogStatus(
      createState({
        active_agent: null,
        active_role: null,
        active_since: null
      }),
      5
    );

    expect(status.monitored).toBe(false);
    expect(status.remainingSeconds).toBeNull();
  });
});
