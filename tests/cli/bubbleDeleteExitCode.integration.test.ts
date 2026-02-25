import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

describe("runCli bubble delete confirmation exit code", () => {
  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation(() => true);

  afterEach(() => {
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
    vi.doUnmock("../../src/cli/commands/bubble/delete.js");
    vi.resetModules();
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("returns exit code 2 when delete requires confirmation", async () => {
    const runBubbleDeleteCommand = vi.fn(async () => ({
      bubbleId: "b_delete_cli_confirm_01",
      deleted: false,
      requiresConfirmation: true,
      artifacts: {
        worktree: {
          exists: true,
          path: "/tmp/pairflow-delete/worktree"
        },
        tmux: {
          exists: true,
          sessionName: "pairflow-b_delete_cli_confirm_01"
        },
        runtimeSession: {
          exists: true,
          sessionName: "pairflow-b_delete_cli_confirm_01"
        },
        branch: {
          exists: true,
          name: "pairflow/bubble/b_delete_cli_confirm_01"
        }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
    }));

    vi.doMock("../../src/cli/commands/bubble/delete.js", () => ({
      getBubbleDeleteHelpText: () => "pairflow bubble delete --help",
      runBubbleDeleteCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli([
      "bubble",
      "delete",
      "--id",
      "b_delete_cli_confirm_01"
    ]);

    expect(exitCode).toBe(2);
    expect(runBubbleDeleteCommand).toHaveBeenCalledWith([
      "--id",
      "b_delete_cli_confirm_01"
    ]);

    const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(output).toContain(
      "Delete confirmation required for b_delete_cli_confirm_01."
    );
    expect(output).toContain("worktree: /tmp/pairflow-delete/worktree");
    expect(output).toContain("tmux session: pairflow-b_delete_cli_confirm_01");
    expect(output).toContain("runtime session entry: present");
    expect(output).toContain("branch: pairflow/bubble/b_delete_cli_confirm_01");
    expect(output).toContain("Re-run with --force");
  });

  it("returns exit code 1 and writes stderr when delete command throws", async () => {
    const runBubbleDeleteCommand = vi.fn(async () => {
      throw new Error("delete failed");
    });

    vi.doMock("../../src/cli/commands/bubble/delete.js", () => ({
      getBubbleDeleteHelpText: () => "pairflow bubble delete --help",
      runBubbleDeleteCommand
    }));

    const { runCli } = await import("../../src/cli/index.js");
    const exitCode = await runCli([
      "bubble",
      "delete",
      "--id",
      "b_delete_cli_error_01"
    ]);

    expect(exitCode).toBe(1);
    expect(runBubbleDeleteCommand).toHaveBeenCalledWith([
      "--id",
      "b_delete_cli_error_01"
    ]);
    const errorText = stderrSpy.mock.calls.map((call) => String(call[0])).join("");
    expect(errorText).toContain("delete failed");
  });
});
