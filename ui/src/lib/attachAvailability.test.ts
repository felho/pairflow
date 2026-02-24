import { describe, expect, it } from "vitest";

import { getAttachAvailability } from "./attachAvailability";

describe("attachAvailability", () => {
  it("returns enabled attach when runtime-capable state has active session", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-123",
      state: "RUNNING",
      hasRuntimeSession: true,
      runtime: {
        expected: true,
        present: true,
        stale: false
      }
    });

    expect(availability).toEqual({
      visible: true,
      enabled: true,
      command: "tmux attach -t pf-b-123",
      hint: null
    });
  });

  it("returns disabled attach with hint when runtime session is missing/stale", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-123",
      state: "WAITING_HUMAN",
      hasRuntimeSession: false,
      runtime: {
        expected: true,
        present: false,
        stale: true
      }
    });

    expect(availability.visible).toBe(true);
    expect(availability.enabled).toBe(false);
    expect(availability.command).toBe("tmux attach -t pf-b-123");
    expect(availability.hint).toContain("Runtime session unavailable");
  });

  it("hides attach outside runtime-capable states", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-123",
      state: "DONE",
      hasRuntimeSession: true,
      runtime: {
        expected: false,
        present: true,
        stale: false
      }
    });

    expect(availability).toEqual({
      visible: false,
      enabled: false,
      command: "tmux attach -t pf-b-123",
      hint: null
    });
  });
});
