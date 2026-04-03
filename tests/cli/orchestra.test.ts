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

  it("fails closed for removed pass alias", async () => {
    await expect(runOrchestraCli(["pass", "--help"])).rejects.toThrow(
      /LEGACY_COMMAND_REMOVED/u
    );
  });

  it("fails closed for removed ask-human alias", async () => {
    await expect(runOrchestraCli(["ask-human", "--help"])).rejects.toThrow(
      /LEGACY_COMMAND_REMOVED/u
    );
  });

  it("fails closed for removed converged alias", async () => {
    await expect(runOrchestraCli(["converged", "--help"])).rejects.toThrow(
      /LEGACY_COMMAND_REMOVED/u
    );
  });

  it("fails closed for any removed orchestra subcommand", async () => {
    await expect(runOrchestraCli(["bubble", "status"])).rejects.toThrow(
      /LEGACY_COMMAND_REMOVED/u
    );
  });
});
