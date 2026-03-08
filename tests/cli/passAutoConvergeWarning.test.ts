import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmitPassResult } from "../../src/core/agent/pass.js";

describe("runCli auto-converge warning parity", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  beforeEach(() => {
    vi.resetModules();
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
  });

  afterEach(() => {
    vi.doUnmock("../../src/cli/commands/agent/pass.js");
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("prints delivery warning for auto-converge output when delivery is unconfirmed", async () => {
    const mockedResult = {
      bubbleId: "b_auto_01",
      sequence: 5,
      envelope: {
        id: "msg_conv_1"
      },
      state: {},
      inferredIntent: true,
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true,
      autoConverged: {
        gateRoute: "auto_rework",
        convergenceSequence: 5,
        convergenceEnvelope: {
          id: "msg_conv_1"
        },
        approvalRequestSequence: 6,
        approvalRequestEnvelope: {
          id: "msg_appr_1",
          type: "APPROVAL_DECISION"
        }
      },
      delivery: {
        delivered: false,
        reason: "delivery_unconfirmed",
        retried: true
      },
      docGateArtifactWriteFailureReason: "EISDIR: illegal operation on a directory, open '...'"
    } as unknown as EmitPassResult;
    const runPassCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/agent/pass.js", () => ({
      getPassHelpText: () => "help",
      runPassCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli(["pass", "--summary", "x"]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "AUTO-CONVERGENCE recorded for b_auto_01: msg_conv_1; auto rework dispatched: msg_appr_1 (reason=REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED)"
    );
    expect(stderr).toContain(
      "Warning: handoff delivery to active pane was not confirmed (reason: delivery_unconfirmed, retried)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_auto_01` to inspect approval state, then `pairflow bubble approve --id b_auto_01`, `pairflow bubble request-rework --id b_auto_01`, or `pairflow bubble reply --id b_auto_01` as appropriate."
    );
    expect(stderr).not.toContain("pairflow bubble resume --id b_auto_01");
    expect(stderr).toContain(
      "Warning: reviewer doc-gate artifact update failed during PASS handling"
    );
    expect(runPassCommand).toHaveBeenCalledWith(["--summary", "x"]);
  });

  it("prints resume-oriented delivery warning for normal PASS output when delivery is unconfirmed", async () => {
    const mockedResult = {
      bubbleId: "b_pass_01",
      sequence: 8,
      envelope: {
        id: "msg_pass_1",
        recipient: "reviewer"
      },
      state: {},
      inferredIntent: false,
      resultEnvelopeKind: "pass",
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false,
      delivery: {
        delivered: false,
        reason: "tmux_send_failed",
        retried: false
      }
    } as unknown as EmitPassResult;
    const runPassCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/agent/pass.js", () => ({
      getPassHelpText: () => "help",
      runPassCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli(["pass", "--summary", "y"]);

    expect(exitCode).toBe(0);
    const stdout = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    const stderr = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(stdout).toContain(
      "PASS recorded for b_pass_01: msg_pass_1 -> reviewer (reason=REPEAT_CLEAN_TRIGGER_NOT_MET)"
    );
    expect(stderr).toContain(
      "Warning: handoff delivery to active pane was not confirmed (reason: tmux_send_failed)."
    );
    expect(stderr).toContain(
      "Use `pairflow bubble status --id b_pass_01` and `pairflow bubble resume --id b_pass_01` if the next agent did not start."
    );
    expect(stderr).not.toContain("pairflow bubble approve --id b_pass_01");
    expect(runPassCommand).toHaveBeenCalledWith(["--summary", "y"]);
  });

  it("throws when auto-converge result is missing required autoConverged payload", async () => {
    const mockedResult = {
      bubbleId: "b_auto_02",
      sequence: 5,
      envelope: {
        id: "msg_conv_2"
      },
      state: {},
      inferredIntent: true,
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true
    } as unknown as EmitPassResult;
    const runPassCommand = vi.fn(async () => mockedResult);

    vi.doMock("../../src/cli/commands/agent/pass.js", () => ({
      getPassHelpText: () => "help",
      runPassCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    await expect(runCli(["pass", "--summary", "x"])).rejects.toThrow(
      "PASS command returned auto_converge transition without autoConverged payload."
    );
  });
});
