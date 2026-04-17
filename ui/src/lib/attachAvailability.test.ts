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

  it("keeps attach enabled and shows auto-restart hint when runtime session is missing/stale", () => {
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
    expect(availability.enabled).toBe(true);
    expect(availability.command).toBe("tmux attach -t pf-b-123");
    expect(availability.hint).toContain("restart runtime automatically");
  });

  it("hides attach for remote bubbles even in runtime-capable states", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-123",
      state: "READY_FOR_HUMAN_APPROVAL",
      hasRuntimeSession: false,
      runtime: {
        expected: false,
        present: false,
        stale: true
      },
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "missing",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING"
      }
    });

    expect(availability).toEqual({
      visible: false,
      enabled: false,
      command: "tmux attach -t pf-b-remote-123",
      hint: null
    });
  });

  it("hides attach for created_not_started remote list-shapes", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-created-123",
      state: "CREATED",
      hasRuntimeSession: false,
      runtime: {
        expected: false,
        present: false,
        stale: false
      },
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "created",
        viewKind: "list",
        stateSource: "created_not_started",
        cacheStatus: "missing"
      }
    });

    expect(availability).toEqual({
      visible: false,
      enabled: false,
      command: "tmux attach -t pf-b-remote-created-123",
      hint: null
    });
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
