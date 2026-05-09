import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { KickoffBubbleV11Result } from "../../src/v11/application/kickoff/emitKickoffV11.js";

describe("runCli bubble kickoff delivery warning", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  beforeEach(() => {
    vi.resetModules();
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
  });

  afterEach(() => {
    vi.doUnmock("../../src/v11/application/kickoff/kickoffCliCommand.js");
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("prints resume guidance when kickoff task delivery is not confirmed", async () => {
    const mockedResult = {
      ok: true,
      bubble_id: "b_kickoff_warn_01",
      reason_code: null,
      state_changed: true,
      protocol: {
        task_envelope_appended: true
      },
      markers_before: {
        ideation_mode: true,
        ideation_task_pending: true
      },
      markers_after: {
        ideation_mode: true,
        ideation_task_pending: false
      },
      delivery: {
        status: "rejected",
        reason: "delivery_unconfirmed",
        reason_code: "DELIVERY_ACK_REJECTED",
        retried: false
      }
    } as KickoffBubbleV11Result;
    const runBubbleKickoffCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/v11/application/kickoff/kickoffCliCommand.js", () => ({
      getBubbleKickoffHelpText: () => "help",
      runBubbleKickoffCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli([
      "bubble",
      "kickoff",
      "--id",
      "b_kickoff_warn_01",
      "--task",
      "Refine task"
    ]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "KICKOFF activated for b_kickoff_warn_01: round 0 -> 1"
    );
    expect(stderr).toContain(
      "Warning: kickoff delivery to implementer pane was not confirmed (reason: delivery_unconfirmed)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_kickoff_warn_01` and `pairflow bubble restart --id b_kickoff_warn_01` if the implementer did not start."
    );
    expect(runBubbleKickoffCommand).toHaveBeenCalledTimes(1);
    const kickoffCall = runBubbleKickoffCommand.mock.calls[0];
    expect(kickoffCall?.[0]).toEqual([
      "--id",
      "b_kickoff_warn_01",
      "--task",
      "Refine task"
    ]);
    expect(kickoffCall?.[1]).toBe(process.cwd());
    expect(typeof kickoffCall?.[2]?.emitDeliveryNotificationAck).toBe("function");
  });
});
