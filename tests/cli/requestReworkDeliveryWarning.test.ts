import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmitRequestReworkResult } from "../../src/v11/application/approval/approvalCommandApi.js";

describe("runCli request-rework delivery warning parity", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  beforeEach(() => {
    vi.resetModules();
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
  });

  afterEach(() => {
    vi.doUnmock("../../src/cli/commands/bubble/requestRework.js");
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("prints restart guidance when immediate rework delivery is not confirmed", async () => {
    const mockedResult = {
      mode: "immediate",
      bubbleId: "b_rework_warn_01",
      sequence: 12,
      envelope: {
        id: "msg_rework_1"
      },
      state: {},
      delivery: {
        statusDelivery: {
          status: "accepted",
          delivered: true,
          message: "status ok"
        },
        implementerDelivery: {
          status: "rejected",
          delivered: false,
          message: "implementer failed",
          reason: "delivery_unconfirmed"
        }
      }
    } as unknown as EmitRequestReworkResult;

    const runBubbleRequestReworkCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/bubble/requestRework.js", () => ({
      getBubbleRequestReworkHelpText: () => "help",
      runBubbleRequestReworkCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli(["bubble", "request-rework", "--id", "b_rework_warn_01", "--message", "x"]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "APPROVAL_DECISION recorded for b_rework_warn_01: msg_rework_1 -> rework"
    );
    expect(stderr).toContain(
      "Warning: rework delivery to implementer pane was not confirmed (reason: delivery_unconfirmed)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_rework_warn_01` and `pairflow bubble restart --id b_rework_warn_01` if the implementer did not resume."
    );
    expect(runBubbleRequestReworkCommand).toHaveBeenCalledWith([
      "--id",
      "b_rework_warn_01",
      "--message",
      "x"
    ]);
  }, 20000);
});
