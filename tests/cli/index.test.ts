import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../../src/cli/index.js";

describe("runCli", () => {
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

  it("supports top-level pass help", async () => {
    const exitCode = await runCli(["pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent pass namespace", async () => {
    const exitCode = await runCli(["agent", "pass", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports top-level ask-human help", async () => {
    const exitCode = await runCli(["ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent ask-human namespace", async () => {
    const exitCode = await runCli(["agent", "ask-human", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble reply help", async () => {
    const exitCode = await runCli(["bubble", "reply", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
