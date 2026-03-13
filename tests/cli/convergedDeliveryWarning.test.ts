import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmitConvergedResult } from "../../src/core/agent/converged.js";

describe("runCli converged delivery warning parity", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  beforeEach(() => {
    vi.resetModules();
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
  });

  afterEach(() => {
    vi.doUnmock("../../src/cli/commands/agent/converged.js");
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("prints resume guidance when auto-rework delivery is not confirmed", async () => {
    const mockedResult = {
      bubbleId: "b_conv_warn_01",
      convergenceSequence: 10,
      convergenceEnvelope: {
        id: "msg_conv_1"
      },
      gateRoute: "auto_rework",
      approvalRequestSequence: 11,
      approvalRequestEnvelope: {
        id: "msg_appr_1",
        type: "APPROVAL_DECISION"
      },
      state: {},
      delivery: {
        delivered: false,
        reason: "delivery_unconfirmed",
        retried: true
      }
    } as unknown as EmitConvergedResult;

    const runConvergedCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/agent/converged.js", () => ({
      getConvergedHelpText: () => "help",
      runConvergedCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli(["converged", "--summary", "x"]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "CONVERGENCE recorded for b_conv_warn_01: msg_conv_1; auto rework dispatched: msg_appr_1"
    );
    expect(stderr).toContain(
      "Warning: handoff delivery to active pane was not confirmed (reason: delivery_unconfirmed, retried)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_conv_warn_01` and `pairflow bubble resume --id b_conv_warn_01` if the implementer did not start after auto rework dispatch."
    );
    expect(runConvergedCommand).toHaveBeenCalledWith(["--summary", "x"]);
  });

  it("prints approval-path guidance when human-gate delivery is not confirmed", async () => {
    const mockedResult = {
      bubbleId: "b_conv_warn_02",
      convergenceSequence: 20,
      convergenceEnvelope: {
        id: "msg_conv_2"
      },
      gateRoute: "human_gate_approve",
      approvalRequestSequence: 21,
      approvalRequestEnvelope: {
        id: "msg_appr_2",
        type: "APPROVAL_REQUEST"
      },
      state: {},
      delivery: {
        delivered: false,
        reason: "partial_delivery_failed",
        retried: false
      }
    } as unknown as EmitConvergedResult;

    const runConvergedCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/agent/converged.js", () => ({
      getConvergedHelpText: () => "help",
      runConvergedCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli(["converged", "--summary", "y"]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "CONVERGENCE recorded for b_conv_warn_02: msg_conv_2; human gate requested: msg_appr_2"
    );
    expect(stderr).toContain(
      "Warning: handoff delivery to active pane was not confirmed (reason: partial_delivery_failed)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_conv_warn_02` to inspect approval state, then `pairflow bubble approve --id b_conv_warn_02`, `pairflow bubble request-rework --id b_conv_warn_02`, or `pairflow bubble reply --id b_conv_warn_02` as appropriate."
    );
    expect(runConvergedCommand).toHaveBeenCalledWith(["--summary", "y"]);
  });
});
