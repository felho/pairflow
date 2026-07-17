import { describe, expect, it } from "vitest";

import type { EffectiveProcessConfig, GateDecision } from "../domain/index.js";
import type { ProcessResult } from "../ports/index.js";
import { classifyProcessResult, runnerOutcome } from "./processGate.js";

/**
 * The classification units at the TS grain (packet ch11-P3b, M1/M2/M3/E1):
 * the kind × mode grid, the malformed inventory, the reason assignment, the
 * `-0` bucket member, and the evidence-propagation lanes.
 */

const exitCode: EffectiveProcessConfig = {
  command: "c",
  timeoutMs: 1000,
  output: { mode: "exitCode" },
  onExit: { zero: "allow", nonzero: "block" },
  onRunnerError: "blockTransition",
  onTimeout: "blockTransition",
  reason: { zero: "exit_zero", nonzero: "test_failed" },
};

const json: EffectiveProcessConfig = {
  command: "c",
  timeoutMs: 1000,
  output: { mode: "gateDecisionJson" },
  onRunnerError: "blockTransition",
  onTimeout: "blockTransition",
};

function ok(exitCode: number, stdout = "", logRef = "log"): ProcessResult {
  return { kind: "ok", exitCode, stdout, logRef, durationMs: 1 };
}

describe("classifyProcessResult — the kind × mode grid (M1)", () => {
  it("timeout → runner_outcome(onTimeout, timeout, logRef)", () => {
    expect(classifyProcessResult({ kind: "timeout", logRef: "t", durationMs: 9 }, exitCode)).toEqual({
      verdict: "block",
      reason: "timeout",
      evidenceRefs: ["t"],
    });
  });

  it("runner_error → runner_outcome(onRunnerError, runner_error, logRef)", () => {
    expect(
      classifyProcessResult({ kind: "runner_error", logRef: "r", durationMs: 0 }, exitCode),
    ).toEqual({ verdict: "block", reason: "runner_error", evidenceRefs: ["r"] });
  });

  it("ok/exitCode zero bucket → onExit.zero verdict + reason.zero + [logRef]", () => {
    expect(classifyProcessResult(ok(0, "", "e0"), exitCode)).toEqual({
      verdict: "allow",
      reason: "exit_zero",
      evidenceRefs: ["e0"],
    });
  });

  it("ok/exitCode nonzero bucket → onExit.nonzero verdict + reason.nonzero + [logRef]", () => {
    expect(classifyProcessResult(ok(1, "", "e1"), exitCode)).toEqual({
      verdict: "block",
      reason: "test_failed",
      evidenceRefs: ["e1"],
    });
  });
});

describe("classifyProcessResult — the numeric bucket boundary (M1 ladder)", () => {
  const cases: [number, string][] = [
    [0, "zero"],
    [1, "nonzero"],
    [-1, "nonzero"],
    [255, "nonzero"],
  ];
  for (const [code, bucket] of cases) {
    it(`exitCode ${String(code)} lands in the ${bucket} bucket`, () => {
      const decision = classifyProcessResult(ok(code, "", "l"), exitCode);
      expect(decision.reason).toBe(bucket === "zero" ? "exit_zero" : "test_failed");
      expect(decision.verdict).toBe(bucket === "zero" ? "allow" : "block");
    });
  }

  it("`-0` lands in the ZERO bucket (`-0 === 0`, not Object.is)", () => {
    const decision = classifyProcessResult(ok(-0, "", "l"), exitCode);
    // The Object.is-grade distinction lives HERE (the assert), proving which
    // bucket fired — the bucket comparison itself must NOT be Object.is.
    expect(Object.is(-0, 0)).toBe(false);
    expect(decision.verdict).toBe("allow");
    expect(decision.reason).toBe("exit_zero");
  });
});

describe("classifyProcessResult — the M2 malformed inventory (gateDecisionJson mode)", () => {
  const malformed: [string, string][] = [
    ["unparseable text", "not json"],
    ["trailing content", '{"verdict":"allow"} trailing'],
    ["a scalar root", "42"],
    ["a list root", "[]"],
    ["a null root", "null"],
    ["missing verdict", '{"reason":"x"}'],
    ["a non-allowlisted verdict (route)", '{"verdict":"route"}'],
    ["a non-string verdict", '{"verdict":1}'],
    ["an unknown top-level key", '{"verdict":"allow","extra":1}'],
    ["a wrong-typed reason", '{"verdict":"allow","reason":5}'],
    ["an empty reason string", '{"verdict":"allow","reason":""}'],
    ["an empty message string", '{"verdict":"allow","message":""}'],
    ["a non-list evidence_refs", '{"verdict":"allow","evidence_refs":"x"}'],
    ["an empty evidence_refs element", '{"verdict":"allow","evidence_refs":[""]}'],
    ["a non-string evidence_refs element", '{"verdict":"allow","evidence_refs":[1]}'],
  ];
  for (const [label, stdout] of malformed) {
    it(`${label} → malformed_gate_decision_json (never a business block)`, () => {
      expect(classifyProcessResult(ok(0, stdout, "m"), json)).toEqual({
        verdict: "block",
        reason: "malformed_gate_decision_json",
        evidenceRefs: ["m"],
      });
    });
  }

  it("a legal MINIMAL document ({verdict}) parses", () => {
    expect(classifyProcessResult(ok(0, '{"verdict":"warn"}', "m"), json)).toEqual({
      verdict: "warn",
      evidenceRefs: ["m"],
    });
  });

  it("a legal MAXIMAL document (every optional field) parses", () => {
    const decision = classifyProcessResult(
      ok(0, '{"verdict":"allow","reason":"r","message":"m","evidence_refs":["a"]}', "log"),
      json,
    );
    expect(decision).toEqual({
      verdict: "allow",
      reason: "r",
      message: "m",
      evidenceRefs: ["a", "log"],
    });
  });

  it("surrounding whitespace is legal (JSON.parse native strictness)", () => {
    expect(classifyProcessResult(ok(0, '   {"verdict":"allow"}  ', "m"), json)).toEqual({
      verdict: "allow",
      evidenceRefs: ["m"],
    });
  });

  it("an inherited/__proto__ member is never read as decision data (own-property G8)", () => {
    // A prototype-polluted stdout: `verdict` is only on the prototype.
    const stdout = '{"__proto__":{"verdict":"allow"}}';
    expect(classifyProcessResult(ok(0, stdout, "m"), json)).toEqual({
      verdict: "block",
      reason: "malformed_gate_decision_json",
      evidenceRefs: ["m"],
    });
  });
});

describe("evidence propagation (E1) — append-iff-absent, both directions", () => {
  it("JSON with refs → verbatim + logRef appended LAST (append direction)", () => {
    const decision = classifyProcessResult(
      ok(0, '{"verdict":"allow","evidence_refs":["a","b"]}', "log"),
      json,
    );
    expect(decision.evidenceRefs).toEqual(["a", "b", "log"]);
  });

  it("JSON with logRef ALREADY present → NOT duplicated (dedup direction)", () => {
    const decision = classifyProcessResult(
      ok(0, '{"verdict":"allow","evidence_refs":["log","a"]}', "log"),
      json,
    );
    expect(decision.evidenceRefs).toEqual(["log", "a"]);
  });

  it("JSON with ABSENT evidence_refs → [logRef]", () => {
    const decision = classifyProcessResult(ok(0, '{"verdict":"allow"}', "log"), json);
    expect(decision.evidenceRefs).toEqual(["log"]);
  });

  it("JSON with an EMPTY list → [logRef] (append on the empty list)", () => {
    const decision = classifyProcessResult(ok(0, '{"verdict":"allow","evidence_refs":[]}', "log"), json);
    expect(decision.evidenceRefs).toEqual(["log"]);
  });
});

describe("runner_outcome (M3)", () => {
  it("always blocks with the given reason + [logRef]", () => {
    expect(runnerOutcome("blockTransition", "timeout", "L")).toEqual({
      verdict: "block",
      reason: "timeout",
      evidenceRefs: ["L"],
    });
  });

  it("the disposition parameter is the blockTransition singleton (compile-negative probe)", () => {
    // @ts-expect-error — fail_instance is admission-foreclosed; the type forbids it here.
    const bad: GateDecision = runnerOutcome("failInstance", "x", "L");
    void bad;
    expect(true).toBe(true);
  });
});
