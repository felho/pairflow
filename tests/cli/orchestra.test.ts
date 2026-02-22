import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { getOrchestraHelpText, runOrchestraCli } from "../../src/cli/orchestra.js";

describe("runOrchestraCli", () => {
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

  afterEach(() => {
    stdoutSpy.mockClear();
    stderrSpy.mockClear();
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("shows help when no command is provided", async () => {
    const exitCode = await runOrchestraCli([]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith(`${getOrchestraHelpText()}\n`);
  });

  it("routes pass command to pairflow agent namespace", async () => {
    const exitCode = await runOrchestraCli(["pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("routes ask-human command to pairflow agent namespace", async () => {
    const exitCode = await runOrchestraCli(["ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("routes converged command to pairflow agent namespace", async () => {
    const exitCode = await runOrchestraCli(["converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("rejects unsupported commands", async () => {
    const exitCode = await runOrchestraCli(["bubble", "status"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      "Unknown orchestra command. Supported: pass, ask-human, converged\n"
    );
  });
});
