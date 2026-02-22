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

  it("supports bubble start help", async () => {
    const exitCode = await runCli(["bubble", "start", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble status help", async () => {
    const exitCode = await runCli(["bubble", "status", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble commit help", async () => {
    const exitCode = await runCli(["bubble", "commit", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports top-level converged help", async () => {
    const exitCode = await runCli(["converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports agent converged namespace", async () => {
    const exitCode = await runCli(["agent", "converged", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble approve help", async () => {
    const exitCode = await runCli(["bubble", "approve", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble request-rework help", async () => {
    const exitCode = await runCli(["bubble", "request-rework", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });
});
