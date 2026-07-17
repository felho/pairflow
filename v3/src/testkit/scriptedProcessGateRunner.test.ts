import { describe, expect, it } from "vitest";

import type { ProcessResult } from "../ports/index.js";
import {
  createScriptedProcessGateRunner,
  SCRIPTED_GIT_STATUS_HASH,
  SCRIPTED_HEAD_SHA,
} from "./scriptedProcessGateRunner.js";

/**
 * `ScriptedProcessGateRunner` (packet ch11-P3a, T1): the kit contract driven
 * by self-tests — FAITHFUL QUEUED PLAYBACK (field-for-field, in order, able
 * to fail on any altered field), a record for every scripted kind, the
 * persist-before-return ordering, deterministic workspace facts, the explicit
 * exhaustion error, and the six-outcome mapping (each C29 member scriptable).
 */

const OPTS = { cwd: "/ws", stdin: "{}", timeoutMs: 1000 };

// The six-outcome mapping (T1): each C29 outcome → its scriptable ProcessResult.
const okExitZero: ProcessResult = { kind: "ok", exitCode: 0, stdout: "", logRef: "log-1", durationMs: 10 };
const okExitNonzero: ProcessResult = { kind: "ok", exitCode: 2, stdout: "", logRef: "log-2", durationMs: 11 };
const okJson: ProcessResult = { kind: "ok", exitCode: 0, stdout: '{"verdict":"allow"}', logRef: "log-3", durationMs: 8 };
const okMalformed: ProcessResult = { kind: "ok", exitCode: 0, stdout: "not-a-decision", logRef: "log-4", durationMs: 9 };
const timeout: ProcessResult = { kind: "timeout", logRef: "log-5", durationMs: 3000 };
const runnerError: ProcessResult = { kind: "runner_error", logRef: "log-6", durationMs: 5 };

describe("ScriptedProcessGateRunner — faithful queued playback (T1)", () => {
  it("returns EXACTLY the next scripted ProcessResult, in order, field-for-field", async () => {
    const script = [okExitZero, timeout, runnerError];
    const runner = createScriptedProcessGateRunner(script);
    for (const expected of script) {
      const result = await runner.run("gate.sh", OPTS);
      // toEqual fails on ANY altered/defaulted/renamed/dropped field.
      expect(result).toEqual(expected);
    }
  });

  it("every six-outcome mapping member is scriptable and returned as scripted", async () => {
    const script = [okExitZero, okExitNonzero, okJson, okMalformed, timeout, runnerError];
    const runner = createScriptedProcessGateRunner(script);
    for (const expected of script) {
      expect(await runner.run("gate.sh", OPTS)).toEqual(expected);
    }
  });

  it("a playback test able to FAIL on an altered field: the kit never defaults exitCode/stdout", async () => {
    const runner = createScriptedProcessGateRunner([okExitNonzero]);
    const result = await runner.run("gate.sh", OPTS);
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.exitCode).toBe(2); // not normalized to 0
    expect(result.stdout).toBe(""); // not defaulted
  });
});

describe("ScriptedProcessGateRunner — evidence records (R3)", () => {
  it("persists a record for EVERY scripted kind, with the kind and durationMs mirrored", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero, timeout, runnerError]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    expect(runner.records.map((r) => r.kind)).toEqual(["ok", "timeout", "runner_error"]);
    expect(runner.records.map((r) => r.durationMs)).toEqual([10, 3000, 5]);
  });

  it("exitCode is present IFF kind=ok (both directions)", async () => {
    const runner = createScriptedProcessGateRunner([okExitNonzero, timeout]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    const [okRecord, timeoutRecord] = runner.records;
    expect(okRecord).toHaveProperty("exitCode", 2);
    expect(timeoutRecord).not.toHaveProperty("exitCode");
  });

  it("mints DETERMINISTIC workspace-fact fakes on every record", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero, timeout, runnerError]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    for (const record of runner.records) {
      expect(record.headSha).toBe(SCRIPTED_HEAD_SHA);
      expect(record.gitStatusHash).toBe(SCRIPTED_GIT_STATUS_HASH);
    }
  });

  it("retains the log verbatim: an ok run's stdout is its log; a non-ok run gets a deterministic marker", async () => {
    const runner = createScriptedProcessGateRunner([okJson, timeout]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    expect(runner.records[0]?.log).toBe('{"verdict":"allow"}');
    expect(runner.records[1]?.log).toBe("scripted timeout run");
  });

  it("persist-BEFORE-return: the record is already exposed when run() resolves", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero]);
    expect(runner.records).toHaveLength(0);
    const result = await runner.run("g", OPTS);
    // If persistence happened AFTER resolve, records would still be empty here.
    expect(runner.records).toHaveLength(1);
    expect(runner.records[0]?.kind).toBe(result.kind);
  });
});

describe("ScriptedProcessGateRunner — script exhaustion (the scriptedActor idiom)", () => {
  it("an empty script throws an explicit exhaustion error on the first call", () => {
    const runner = createScriptedProcessGateRunner([]);
    expect(() => runner.run("g", OPTS)).toThrow(/exhausted/);
  });

  it("a one-entry script throws on the SECOND call (queue drained)", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero]);
    await runner.run("g", OPTS);
    expect(() => runner.run("g", OPTS)).toThrow(/exhausted/);
  });
});
