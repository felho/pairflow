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

  it("supports bubble open help", async () => {
    const exitCode = await runCli(["bubble", "open", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble stop help", async () => {
    const exitCode = await runCli(["bubble", "stop", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble resume help", async () => {
    const exitCode = await runCli(["bubble", "resume", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble status help", async () => {
    const exitCode = await runCli(["bubble", "status", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble watchdog help", async () => {
    const exitCode = await runCli(["bubble", "watchdog", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble inbox help", async () => {
    const exitCode = await runCli(["bubble", "inbox", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble list help", async () => {
    const exitCode = await runCli(["bubble", "list", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble reconcile help", async () => {
    const exitCode = await runCli(["bubble", "reconcile", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble commit help", async () => {
    const exitCode = await runCli(["bubble", "commit", "--help"]);

    expect(exitCode).toBe(0);
    expect(stdoutSpy).toHaveBeenCalled();
  });

  it("supports bubble merge help", async () => {
    const exitCode = await runCli(["bubble", "merge", "--help"]);

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

  it("rejects unknown agent namespace command", async () => {
    const exitCode = await runCli(["agent", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("rejects unknown bubble subcommand", async () => {
    const exitCode = await runCli(["bubble", "unknown"]);

    expect(exitCode).toBe(1);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("prints registry-backed unknown command support list", async () => {
    const exitCode = await runCli(["unknown"]);

    expect(exitCode).toBe(1);
    const errorText = stderrSpy.mock.calls.map((call) => call[0]).join("");
    expect(errorText).toContain("bubble watchdog");
    expect(errorText).toContain("agent converged");
  });
});
