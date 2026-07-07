import { describe, expect, it } from "vitest";

import { createScriptedGateRunner, createScriptedProcessRunner } from "./fixtures.js";

describe("deterministic gate fixture", () => {
  it("plays scripted verdicts in order and records the specs it saw", async () => {
    const runner = createScriptedGateRunner([
      { outcome: "pass" },
      { outcome: "fail", reason: "lint" },
    ]);

    await expect(runner.run({ gate: "g1" })).resolves.toEqual({ outcome: "pass" });
    await expect(runner.run({ gate: "g2" })).resolves.toEqual({
      outcome: "fail",
      reason: "lint",
    });
    expect(runner.runs).toEqual([{ gate: "g1" }, { gate: "g2" }]);
  });

  it("fails loudly when the script is exhausted — never an implicit verdict", async () => {
    const runner = createScriptedGateRunner([{ outcome: "pass" }]);
    await runner.run("g1");
    await expect(runner.run("g2")).rejects.toThrow(/exhausted/);
  });
});

describe("deterministic process fixture", () => {
  it("plays scripted results in order and records the specs it saw", async () => {
    const runner = createScriptedProcessRunner([
      { exitCode: 0, output: "ok" },
      { exitCode: 1, output: "err" },
    ]);

    await expect(runner.run("p1")).resolves.toEqual({ exitCode: 0, output: "ok" });
    await expect(runner.run("p2")).resolves.toEqual({ exitCode: 1, output: "err" });
    expect(runner.runs).toEqual(["p1", "p2"]);
  });

  it("fails loudly when the script is exhausted", async () => {
    const runner = createScriptedProcessRunner([]);
    await expect(runner.run("p1")).rejects.toThrow(/exhausted/);
  });
});
