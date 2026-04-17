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

  it("enables attach for active started remote bubbles", () => {
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
        runtimeAvailability: "active"
      }
    });

    expect(availability).toEqual({
      visible: true,
      enabled: true,
      command: "pairflow bubble attach --id b-remote-123",
      hint: null
    });
  });

  it("disables attach with actionable hint for created_not_started remote list-shapes", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-created-123",
      state: "RUNNING",
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

    expect(availability.visible).toBe(true);
    expect(availability.enabled).toBe(false);
    expect(availability.command).toBe(
      "pairflow bubble attach --id b-remote-created-123"
    );
    expect(availability.hint).toContain("not started yet");
  });

  it("disables attach with fail-closed hint for unavailable started remote status", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-missing-123",
      state: "WAITING_HUMAN",
      hasRuntimeSession: false,
      runtime: {
        expected: false,
        present: false,
        stale: false
      },
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING"
      }
    });

    expect(availability.visible).toBe(true);
    expect(availability.enabled).toBe(false);
    expect(availability.command).toBe(
      "pairflow bubble attach --id b-remote-missing-123"
    );
    expect(availability.hint).toContain("fail-closed");
  });

  it("disables attach with fail-closed hint for inactive started remote status", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-inactive-123",
      state: "WAITING_HUMAN",
      hasRuntimeSession: false,
      runtime: {
        expected: false,
        present: false,
        stale: false
      },
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "inactive"
      }
    });

    expect(availability).toEqual({
      visible: true,
      enabled: false,
      command: "pairflow bubble attach --id b-remote-inactive-123",
      hint:
        "Remote runtime is unavailable. Attach stays fail-closed and will not restart it automatically."
    });
  });

  it("disables attach with start-first hint for created remote status-shapes", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-status-created-123",
      state: "RUNNING",
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
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "missing",
        runtimeAvailability: "not_started"
      }
    });

    expect(availability).toEqual({
      visible: true,
      enabled: false,
      command: "pairflow bubble attach --id b-remote-status-created-123",
      hint: "Remote bubble is not started yet. Start it first, then attach."
    });
  });

  it("disables attach with fail-closed hint for unavailable_started remote list-shapes", () => {
    const availability = getAttachAvailability({
      bubbleId: "b-remote-list-unavailable-123",
      state: "WAITING_HUMAN",
      hasRuntimeSession: false,
      runtime: {
        expected: false,
        present: false,
        stale: false
      },
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "list",
        stateSource: "unavailable_started",
        cacheStatus: "present"
      }
    });

    expect(availability).toEqual({
      visible: true,
      enabled: false,
      command: "pairflow bubble attach --id b-remote-list-unavailable-123",
      hint:
        "Remote runtime is unavailable. Attach stays fail-closed and will not restart it automatically."
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
