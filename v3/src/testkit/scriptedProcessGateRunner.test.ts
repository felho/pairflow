import { describe, expect, it } from "vitest";

import type { ProcessGateEvidence, ProcessResult } from "../ports/index.js";
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
const okJsonWarn: ProcessResult = { kind: "ok", exitCode: 0, stdout: '{"verdict":"warn"}', logRef: "log-3w", durationMs: 8 };
const okJsonBlock: ProcessResult = { kind: "ok", exitCode: 0, stdout: '{"verdict":"block"}', logRef: "log-3b", durationMs: 8 };
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

describe("ScriptedProcessGateRunner — logRef resolution (product: the ref addresses its record)", () => {
  it("every returned logRef resolves to its EXACT persisted record", async () => {
    const script = [okExitZero, okJson, timeout, runnerError];
    const runner = createScriptedProcessGateRunner(script);
    for (let call = 0; call < script.length; call += 1) {
      const result = await runner.run("g", OPTS);
      // The resolved record is the SAME object exposed on `records` — the ref
      // addresses the whole record (R3), keyed by the result's logRef.
      expect(runner.resolve(result.logRef)).toBe(runner.records[call]);
    }
  });

  it("the association is persisted BEFORE run() resolves (resolvable the instant run returns)", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero]);
    const result = await runner.run("g", OPTS);
    expect(runner.resolve(result.logRef)).toBeDefined();
    expect(runner.resolve(result.logRef)?.kind).toBe("ok");
  });

  it("an UNKNOWN logRef resolves to undefined", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero]);
    await runner.run("g", OPTS);
    expect(runner.resolve("no-such-ref")).toBeUndefined();
  });
});

describe("ScriptedProcessGateRunner — R2 scalar-refinement validation (loud at play)", () => {
  // The hostile fixtures cast past the discriminated union (the type forbids
  // these shapes at compile time; the kit backstops them at runtime).
  it("rejects a fractional exitCode on an ok result", () => {
    const bad = { kind: "ok", exitCode: 1.5, stdout: "", logRef: "x", durationMs: 1 } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/integer exitCode/);
    expect(runner.records).toHaveLength(0); // nothing persisted on a violation
  });

  it("rejects a negative durationMs", () => {
    const bad = { kind: "ok", exitCode: 0, stdout: "", logRef: "x", durationMs: -1 } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/non-negative integer/);
  });

  it("rejects an empty logRef", () => {
    const bad = { kind: "ok", exitCode: 0, stdout: "", logRef: "", durationMs: 1 } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/logRef/);
  });

  it("rejects stdout on a timeout result (present IFF kind=ok, absence direction)", () => {
    const bad = { kind: "timeout", logRef: "x", durationMs: 1, stdout: "leak" } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/must NOT carry stdout/);
  });

  it("rejects an exitCode on a runner_error result", () => {
    const bad = { kind: "runner_error", logRef: "x", durationMs: 1, exitCode: 0 } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/must NOT carry exitCode/);
  });

  it("rejects a missing stdout on an ok result", () => {
    const bad = { kind: "ok", exitCode: 0, logRef: "x", durationMs: 1 } as unknown as ProcessResult;
    const runner = createScriptedProcessGateRunner([bad]);
    expect(() => runner.run("g", OPTS)).toThrow(/string stdout/);
  });
});

describe("ScriptedProcessGateRunner — exact full evidence records (R3), all three kinds", () => {
  it("the ok / timeout / runner_error records equal their WHOLE expected shape (extra-field rejection via toEqual)", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero, timeout, runnerError]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    expect(runner.records[0]).toEqual({
      log: "",
      kind: "ok",
      exitCode: 0,
      durationMs: 10,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    });
    expect(runner.records[1]).toEqual({
      log: "scripted timeout run",
      kind: "timeout",
      durationMs: 3000,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    });
    expect(runner.records[2]).toEqual({
      log: "scripted runner_error run",
      kind: "runner_error",
      durationMs: 5,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    });
  });
});

describe("ScriptedProcessGateRunner — T1 six-outcome inventory completeness", () => {
  it("the JSON path plays allow / warn / block GateDecision documents VERBATIM in stdout", async () => {
    const script = [okJson, okJsonWarn, okJsonBlock];
    const runner = createScriptedProcessGateRunner(script);
    const stdouts: string[] = [];
    for (let i = 0; i < script.length; i += 1) {
      const result = await runner.run("g", OPTS);
      if (result.kind !== "ok") throw new Error("expected ok");
      stdouts.push(result.stdout);
    }
    expect(stdouts).toEqual(['{"verdict":"allow"}', '{"verdict":"warn"}', '{"verdict":"block"}']);
    // The document is retained verbatim in the record's log too.
    expect(runner.records.map((r) => r.log)).toEqual([
      '{"verdict":"allow"}',
      '{"verdict":"warn"}',
      '{"verdict":"block"}',
    ]);
  });

  it("the runner_error record's log is the deterministic 'scripted runner_error run' form", async () => {
    const runner = createScriptedProcessGateRunner([runnerError]);
    await runner.run("g", OPTS);
    expect(runner.records[0]?.log).toBe("scripted runner_error run");
  });

  it("the exit-zero and exit-nonzero fixtures persist DISTINCT full records", async () => {
    const runner = createScriptedProcessGateRunner([okExitZero, okExitNonzero]);
    await runner.run("g", OPTS);
    await runner.run("g", OPTS);
    expect(runner.records[0]).toEqual({
      log: "",
      kind: "ok",
      exitCode: 0,
      durationMs: 10,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    });
    expect(runner.records[1]).toEqual({
      log: "",
      kind: "ok",
      exitCode: 2,
      durationMs: 11,
      headSha: SCRIPTED_HEAD_SHA,
      gitStatusHash: SCRIPTED_GIT_STATUS_HASH,
    });
    expect(runner.records[0]).not.toEqual(runner.records[1]);
  });
});

// ── R2/R3 compile-negative probes: every union direction the discriminated
// types foreclose (validated by v3:typecheck — an unused @ts-expect-error is a
// TS2578 error, so a widened union turns the build red). Each probe is
// otherwise well-typed so its ONLY error is the target field. ──────────────

// R2 — exitCode/stdout are present IFF kind="ok": the non-ok arms forbid them.
// @ts-expect-error R2: a timeout ProcessResult carries NO exitCode.
export const __probeTimeoutExitCode: ProcessResult = { kind: "timeout", exitCode: 0, logRef: "x", durationMs: 1 };
// @ts-expect-error R2: a timeout ProcessResult carries NO stdout.
export const __probeTimeoutStdout: ProcessResult = { kind: "timeout", stdout: "", logRef: "x", durationMs: 1 };
// @ts-expect-error R2: a runner_error ProcessResult carries NO exitCode.
export const __probeRunnerErrorExitCode: ProcessResult = { kind: "runner_error", exitCode: 0, logRef: "x", durationMs: 1 };
// @ts-expect-error R2: a runner_error ProcessResult carries NO stdout.
export const __probeRunnerErrorStdout: ProcessResult = { kind: "runner_error", stdout: "", logRef: "x", durationMs: 1 };
// @ts-expect-error R2: an ok ProcessResult MUST carry exitCode.
export const __probeOkMissingExitCode: ProcessResult = { kind: "ok", stdout: "", logRef: "x", durationMs: 1 };
// @ts-expect-error R2: an ok ProcessResult MUST carry stdout.
export const __probeOkMissingStdout: ProcessResult = { kind: "ok", exitCode: 0, logRef: "x", durationMs: 1 };

// R3 — the evidence record's exitCode is present IFF kind="ok". (The
// suppression directive sits on the excess-property line — that is where the
// error lands for a multi-line literal.)
export const __probeEvidenceTimeoutExitCode: ProcessGateEvidence = {
  log: "",
  kind: "timeout",
  // @ts-expect-error R3: a timeout evidence record carries NO exitCode.
  exitCode: 0,
  durationMs: 1,
  headSha: "h",
  gitStatusHash: "g",
};
export const __probeEvidenceRunnerErrorExitCode: ProcessGateEvidence = {
  log: "",
  kind: "runner_error",
  // @ts-expect-error R3: a runner_error evidence record carries NO exitCode.
  exitCode: 0,
  durationMs: 1,
  headSha: "h",
  gitStatusHash: "g",
};
// @ts-expect-error R3: an ok evidence record MUST carry exitCode.
export const __probeEvidenceOkMissingExitCode: ProcessGateEvidence = {
  log: "",
  kind: "ok",
  durationMs: 1,
  headSha: "h",
  gitStatusHash: "g",
};

describe("ScriptedProcessGateRunner — faithful call recording (packet ch11-P3b, T1)", () => {
  const R1: ProcessResult = { kind: "ok", exitCode: 0, stdout: "", logRef: "c1", durationMs: 1 };
  const R2: ProcessResult = { kind: "ok", exitCode: 0, stdout: "", logRef: "c2", durationMs: 1 };

  it("records {command, cwd, stdin, timeoutMs} per run() call, in order", async () => {
    const runner = createScriptedProcessGateRunner([R1, R2]);
    await runner.run("first", { cwd: "/ws/a", stdin: '{"n":1}', timeoutMs: 500 });
    await runner.run("second", { cwd: "/ws/b", stdin: '{"n":2}', timeoutMs: 900 });
    expect(runner.calls).toEqual([
      { command: "first", cwd: "/ws/a", stdin: '{"n":1}', timeoutMs: 500 },
      { command: "second", cwd: "/ws/b", stdin: '{"n":2}', timeoutMs: 900 },
    ]);
  });

  it("the call is recorded even when the script is exhausted (the invocation was received)", () => {
    const runner = createScriptedProcessGateRunner([]);
    expect(() => runner.run("x", { cwd: "/w", stdin: "{}", timeoutMs: 1 })).toThrow(/exhausted/);
    expect(runner.calls).toEqual([{ command: "x", cwd: "/w", stdin: "{}", timeoutMs: 1 }]);
  });

  it("playback/records stay byte-unchanged alongside recording (both surfaces live)", async () => {
    const runner = createScriptedProcessGateRunner([R1]);
    const result = await runner.run("cmd", { cwd: "/w", stdin: "{}", timeoutMs: 7 });
    expect(result).toEqual(R1);
    expect(runner.records).toHaveLength(1);
    expect(runner.calls).toHaveLength(1);
    expect(runner.resolve("c1")).toBe(runner.records[0]);
  });
});
