import { describe, expect, it } from "vitest";

import type { GateConfigFinding } from "../ports/index.js";
import { processRegistration } from "./process.js";

/**
 * `external.process` (packet ch11-P3a, V1–V4): the validate-and-normalize
 * body driven directly at the registration grain. Every V2 lane a–s (minus
 * r/s — the resolution positive direction and the C19 cross-rule live at the
 * admission grain, in admit.test.ts) is driven by name and ABLE TO FAIL on
 * its row's meaning; each coded lane asserts its `code`, each uncoded lane
 * asserts code-ABSENCE. Defaults, the mode×keyset iff symmetry, the numeric
 * ladder, own-property hostility, the o/p no-double rule, and accumulation +
 * local suppression follow.
 */

function validate(raw: unknown) {
  return processRegistration.validateAndNormalizeConfig(raw);
}

function fail(raw: unknown): readonly GateConfigFinding[] {
  const result = validate(raw);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected validation to fail");
  }
  return result.findings;
}

function effective(raw: unknown): Record<string, unknown> {
  const result = validate(raw);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected validation to succeed");
  }
  return result.effective as Record<string, unknown>;
}

/** A minimal valid exitCode-mode config (all mandatory + mode-required keys). */
const validExitCode = {
  command: "run.sh",
  timeoutMs: 5000,
  output: { mode: "exitCode" },
  onExit: { zero: "allow", nonzero: "block" },
};
/** A minimal valid gateDecisionJson-mode config (onExit illegal here). */
const validJson = {
  command: "run.sh",
  timeoutMs: 5000,
  output: { mode: "gateDecisionJson" },
};

const INVALID = "invalid_process_gate_config";
const NOT_SUPPORTED = "gate_config_not_supported";

describe("external.process — the V2 lane inventory (a–q), by name with code assertions", () => {
  it("lane a: config missing where required → ONE uncoded finding at the config path", () => {
    const findings = fail(undefined);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane b: config not a map → ONE uncoded container-precondition finding, no key cascade", () => {
    const findings = fail(42);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane c: unknown top-level key → uncoded finding at the key path", () => {
    const findings = fail({ ...validExitCode, bogus: 1 });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("bogus");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane d: command missing → CODED invalid_process_gate_config at command", () => {
    const findings = fail({ timeoutMs: 5000, output: { mode: "exitCode" }, onExit: { zero: "allow", nonzero: "block" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("command");
    expect(findings[0]?.code).toBe(INVALID);
  });

  it("lane d: command empty string → CODED", () => {
    expect(fail({ ...validExitCode, command: "" })[0]).toMatchObject({ path: "command", code: INVALID });
  });

  it("lane d: command non-string → CODED", () => {
    expect(fail({ ...validExitCode, command: 5 })[0]).toMatchObject({ path: "command", code: INVALID });
  });

  it("lane e: timeoutMs missing → CODED at timeoutMs", () => {
    const findings = fail({ command: "run.sh", output: { mode: "exitCode" }, onExit: { zero: "allow", nonzero: "block" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "timeoutMs", code: INVALID });
  });

  it("lane f: output not a map → uncoded container precondition; dependents (g/h/onExit) suppressed", () => {
    const findings = fail({ ...validExitCode, output: 42 });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("output");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane g: output unknown inner key → uncoded at output.<key>", () => {
    const findings = fail({ ...validExitCode, output: { mode: "exitCode", extra: 1 } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("output.extra");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane h: output.mode not in allowlist → CODED at output.mode", () => {
    const findings = fail({ ...validExitCode, output: { mode: "nope" } });
    expect(findings.some((f) => f.path === "output.mode" && f.code === INVALID)).toBe(true);
  });

  it("lane h: output.mode non-string (number) → CODED", () => {
    const findings = fail({ ...validExitCode, output: { mode: 5 } });
    expect(findings.some((f) => f.path === "output.mode" && f.code === INVALID)).toBe(true);
  });

  it("lane i: onExit missing in exitCode mode → CODED at onExit", () => {
    const findings = fail({ command: "run.sh", timeoutMs: 5000, output: { mode: "exitCode" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit", code: INVALID });
  });

  it("lane i: onExit missing in the DEFAULTED exitCode form (no output key) → CODED", () => {
    const findings = fail({ command: "run.sh", timeoutMs: 5000 });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit", code: INVALID });
  });

  it("lane j: onExit not a map → uncoded container precondition; k/l/m suppressed", () => {
    const findings = fail({ ...validExitCode, onExit: 42 });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("onExit");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane k: an onExit bucket missing → CODED at onExit.<bucket>", () => {
    const findings = fail({ ...validExitCode, onExit: { zero: "allow" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit.nonzero", code: INVALID });
  });

  it("lane l: an onExit bucket value outside the verdict allowlist (route) → CODED", () => {
    const findings = fail({ ...validExitCode, onExit: { zero: "route", nonzero: "block" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit.zero", code: INVALID });
  });

  it("lane m: onExit surplus key → uncoded at onExit.<key>", () => {
    const findings = fail({ ...validExitCode, onExit: { zero: "allow", nonzero: "block", extra: 1 } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("onExit.extra");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane n: onExit present in gateDecisionJson mode → uncoded (unconsumed config)", () => {
    const findings = fail({ ...validJson, onExit: { zero: "allow", nonzero: "block" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("onExit");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane o: a failInstance disposition → CODED gate_config_not_supported (the DISTINCT lane)", () => {
    const findings = fail({ ...validExitCode, onRunnerError: "failInstance" });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onRunnerError", code: NOT_SUPPORTED });
  });

  it("lane p: any other non-blockTransition disposition → CODED invalid_process_gate_config", () => {
    const findings = fail({ ...validExitCode, onTimeout: "warn" });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onTimeout", code: INVALID });
  });

  it("lane q: reason non-map → uncoded container precondition; sub-lanes suppressed", () => {
    const findings = fail({ ...validExitCode, reason: 42 });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane q: reason unknown key → uncoded at reason.<key>", () => {
    const findings = fail({ ...validExitCode, reason: { bad: "x" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason.bad");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane q: a reason token failing ^[a-z][a-z0-9_]*$ → uncoded at reason.<bucket>", () => {
    const findings = fail({ ...validExitCode, reason: { zero: "Bad Token" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason.zero");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane q COLON member: an authored token spelling a sys:-prefixed form (colon-bearing) → uncoded grammar finding at reason.<bucket> (ADR-018: the authored grammar cannot express ':')", () => {
    const findings = fail({ ...validExitCode, reason: { zero: "sys:exit_zero" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason.zero");
    expect(findings[0]?.message).toBe("reason.zero must match ^[a-z][a-z0-9_]*$");
    expect(findings[0]).not.toHaveProperty("code");
  });
});

describe("external.process — the o/p no-double rule (V2 lanes o/p, the operative authority note)", () => {
  it("failInstance yields EXACTLY ONE finding (gate_config_not_supported), never the o+p double", () => {
    const findings = fail({ ...validExitCode, onRunnerError: "failInstance" });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.code).toBe(NOT_SUPPORTED);
    expect(findings.some((f) => f.code === INVALID)).toBe(false);
  });
});

describe("external.process — defaults materialization (V1), both directions", () => {
  it("output.mode: absent → materialized exitCode; authored → carried", () => {
    expect(effective({ command: "c", timeoutMs: 1, onExit: { zero: "allow", nonzero: "block" } }).output).toEqual({ mode: "exitCode" });
    expect(effective(validJson).output).toEqual({ mode: "gateDecisionJson" });
  });

  it("onRunnerError/onTimeout: absent → blockTransition; authored blockTransition → carried", () => {
    const def = effective(validExitCode);
    expect(def.onRunnerError).toBe("blockTransition");
    expect(def.onTimeout).toBe("blockTransition");
    const auth = effective({ ...validExitCode, onRunnerError: "blockTransition", onTimeout: "blockTransition" });
    expect(auth.onRunnerError).toBe("blockTransition");
    expect(auth.onTimeout).toBe("blockTransition");
  });

  it("exitCode-mode reason: absent → COMPLETE authored-or-default; partial authored → completed per bucket; full → carried", () => {
    expect(effective(validExitCode).reason).toEqual({ zero: "sys:exit_zero", nonzero: "sys:exit_nonzero" });
    expect(effective({ ...validExitCode, reason: { zero: "custom_ok" } }).reason).toEqual({
      zero: "custom_ok",
      nonzero: "sys:exit_nonzero",
    });
    expect(effective({ ...validExitCode, reason: { zero: "a", nonzero: "b" } }).reason).toEqual({ zero: "a", nonzero: "b" });
  });

  it("the full effective exitCode config materializes every default once", () => {
    expect(effective(validExitCode)).toEqual({
      command: "run.sh",
      timeoutMs: 5000,
      output: { mode: "exitCode" },
      onExit: { zero: "allow", nonzero: "block" },
      onRunnerError: "blockTransition",
      onTimeout: "blockTransition",
      reason: { zero: "sys:exit_zero", nonzero: "sys:exit_nonzero" },
    });
  });
});

describe("external.process — the mode×keyset iff symmetry (V1, both directions)", () => {
  it("onExit present IFF exitCode mode: present in the exitCode effective, ABSENT in the json effective", () => {
    expect(effective(validExitCode)).toHaveProperty("onExit");
    expect(effective(validJson)).not.toHaveProperty("onExit");
  });

  it("json-mode reason present IFF authored, carried VERBATIM — a PARTIAL map stays partial", () => {
    expect(effective(validJson)).not.toHaveProperty("reason");
    expect(effective({ ...validJson, reason: { zero: "seen" } }).reason).toEqual({ zero: "seen" });
    expect(effective({ ...validJson, reason: { nonzero: "seen_nz" } }).reason).toEqual({ nonzero: "seen_nz" });
    expect(effective({ ...validJson, reason: { zero: "a", nonzero: "b" } }).reason).toEqual({ zero: "a", nonzero: "b" });
  });
});

describe("external.process — the timeoutMs numeric ladder (V3, dimension 4)", () => {
  it("valid: 1 (the min) and a large safe integer ADMIT with the value preserved (Object.is)", () => {
    expect(Object.is(effective({ ...validExitCode, timeoutMs: 1 }).timeoutMs, 1)).toBe(true);
    const big = Number.MAX_SAFE_INTEGER;
    expect(Object.is(effective({ ...validExitCode, timeoutMs: big }).timeoutMs, big)).toBe(true);
  });

  it.each([
    ["zero", 0],
    ["negative", -1],
    ["non-integer", 1.5],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
    ["non-number string", "5"],
    ["boolean", true],
  ])("rejects timeoutMs = %s → CODED at timeoutMs", (_label, value) => {
    const findings = fail({ ...validExitCode, timeoutMs: value });
    expect(findings.some((f) => f.path === "timeoutMs" && f.code === INVALID)).toBe(true);
  });

  it("rejects a boxed Number (typeof object, not number)", () => {
    const boxed = new Number(5);
    expect(fail({ ...validExitCode, timeoutMs: boxed }).some((f) => f.path === "timeoutMs")).toBe(true);
  });

  it("rejects -0 as its own ladder member (fails the >= 1 bound) — Object.is distinguishes it from +0", () => {
    // Guard: -0 is the fixture (Object.is-grade), not a masked +0.
    expect(Object.is(-0, 0)).toBe(false);
    const findings = fail({ ...validExitCode, timeoutMs: -0 });
    expect(findings.some((f) => f.path === "timeoutMs" && f.code === INVALID)).toBe(true);
  });
});

describe("external.process — own-property hostility (dimension 2 / G8)", () => {
  it("an INHERITED command/timeoutMs (via prototype) is never read as config — the own reads see them absent", () => {
    const proto = { command: "sneaky", timeoutMs: 5, output: { mode: "exitCode" }, onExit: { zero: "allow", nonzero: "block" } };
    const hostile = Object.create(proto) as object; // no OWN keys
    const findings = fail(hostile);
    // command + timeoutMs are read as ABSENT (own-only) → their coded lanes fire.
    expect(findings.some((f) => f.path === "command" && f.code === INVALID)).toBe(true);
    expect(findings.some((f) => f.path === "timeoutMs" && f.code === INVALID)).toBe(true);
  });

  it("an inherited onExit member is not read either (own bucket read sees it missing)", () => {
    const proto = { zero: "allow", nonzero: "block" };
    const onExit = Object.create(proto) as object;
    const findings = fail({ ...validExitCode, onExit });
    // Both buckets read absent → two coded bucket-missing findings.
    expect(findings.filter((f) => f.code === INVALID && f.path.startsWith("onExit.")).length).toBe(2);
  });
});

describe("external.process — accumulation + LOCAL suppression (dimension 9)", () => {
  it("a multi-fault config reports its FULL lane set (command + timeoutMs + output.mode)", () => {
    const findings = fail({ output: { mode: "nope" }, onExit: { zero: "allow", nonzero: "block" } });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["command", "output.mode", "timeoutMs"]);
    expect(findings.every((f) => f.code === INVALID)).toBe(true);
  });

  it("a broken output container suppresses ONLY its own dependents (still reports sibling faults)", () => {
    // output non-map suppresses g/h/onExit; command still fires (sibling).
    const findings = fail({ timeoutMs: 5, output: 42 });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["command", "output"]);
  });

  it("a broken reason container suppresses its sub-lanes but not siblings", () => {
    const findings = fail({ ...validJson, command: "", reason: 99 });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["command", "reason"]);
  });
});

describe("external.process — V1 JSON-mode effective-config FULL-ROW equality (whole object toEqual)", () => {
  /** The gateDecisionJson base row (no onExit, no reason) every case shares —
   * a dropped command/timeoutMs/output/disposition here turns the row red. */
  const jsonBase = {
    command: "run.sh",
    timeoutMs: 5000,
    output: { mode: "gateDecisionJson" },
    onRunnerError: "blockTransition",
    onTimeout: "blockTransition",
  };

  it("reason ABSENT → the whole row carries no reason", () => {
    expect(effective(validJson)).toEqual(jsonBase);
  });

  it("reason authored EMPTY {} → stays {} (verbatim carry, the whole row)", () => {
    expect(effective({ ...validJson, reason: {} })).toEqual({ ...jsonBase, reason: {} });
  });

  it("reason partial {zero} → carried verbatim (no nonzero default in JSON mode)", () => {
    expect(effective({ ...validJson, reason: { zero: "seen" } })).toEqual({
      ...jsonBase,
      reason: { zero: "seen" },
    });
  });

  it("reason partial {nonzero} → carried verbatim (no zero default in JSON mode)", () => {
    expect(effective({ ...validJson, reason: { nonzero: "seen_nz" } })).toEqual({
      ...jsonBase,
      reason: { nonzero: "seen_nz" },
    });
  });

  it("reason FULL → carried verbatim (the whole row)", () => {
    expect(effective({ ...validJson, reason: { zero: "a", nonzero: "b" } })).toEqual({
      ...jsonBase,
      reason: { zero: "a", nonzero: "b" },
    });
  });

  it("exitCode-mode partial {nonzero}: the ZERO bucket DEFAULTS inside the authored map (whole row)", () => {
    expect(effective({ ...validExitCode, reason: { nonzero: "custom_nz" } })).toEqual({
      command: "run.sh",
      timeoutMs: 5000,
      output: { mode: "exitCode" },
      onExit: { zero: "allow", nonzero: "block" },
      onRunnerError: "blockTransition",
      onTimeout: "blockTransition",
      reason: { zero: "sys:exit_zero", nonzero: "custom_nz" },
    });
  });

  it("the COLLIDING member: an authored bare fixed name (runner_error) is LEGAL (colon-free grammar) and carried VERBATIM — never renamed to its sys: sibling", () => {
    expect(effective({ ...validExitCode, reason: { nonzero: "runner_error" } }).reason).toEqual({
      zero: "sys:exit_zero",
      nonzero: "runner_error",
    });
  });
});

describe("external.process — V2 member-by-member symmetry (the grouped members' missing halves)", () => {
  it("lane k: the ZERO bucket missing (the nonzero-missing sibling already covered) → CODED at onExit.zero", () => {
    const findings = fail({ ...validExitCode, onExit: { nonzero: "block" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit.zero", code: INVALID });
  });

  it("lane l: an invalid NONZERO bucket value → CODED at onExit.nonzero", () => {
    const findings = fail({ ...validExitCode, onExit: { zero: "allow", nonzero: "bogus" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onExit.nonzero", code: INVALID });
  });

  it("lane l positive: `warn` is ACCEPTED as a bucket verdict (both buckets warn ADMIT)", () => {
    expect(effective({ ...validExitCode, onExit: { zero: "warn", nonzero: "warn" } }).onExit).toEqual({
      zero: "warn",
      nonzero: "warn",
    });
  });

  it("lane o: onTimeout = failInstance (the onRunnerError sibling already covered) → CODED gate_config_not_supported", () => {
    const findings = fail({ ...validExitCode, onTimeout: "failInstance" });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onTimeout", code: NOT_SUPPORTED });
  });

  it("lane p: an invalid onRunnerError (the onTimeout sibling already covered) → CODED invalid_process_gate_config", () => {
    const findings = fail({ ...validExitCode, onRunnerError: "retry" });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: "onRunnerError", code: INVALID });
  });

  it("lane q: an invalid token on the NONZERO entry → uncoded at reason.nonzero", () => {
    const findings = fail({ ...validExitCode, reason: { nonzero: "Bad Token" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason.nonzero");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane q: a token with a legal start but an illegal trailing char (`ok-token`) → uncoded at reason.<bucket>", () => {
    const findings = fail({ ...validExitCode, reason: { zero: "ok-token" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.path).toBe("reason.zero");
    expect(findings[0]).not.toHaveProperty("code");
  });

  it("lane j LOCAL suppression: a broken onExit container WITH a sibling fault → the sibling STILL reports", () => {
    // onExit non-map suppresses k/l/m; the command sibling still fires — proving
    // suppression is LOCAL to the broken container.
    const findings = fail({ command: "", timeoutMs: 5000, output: { mode: "exitCode" }, onExit: 42 });
    const paths = findings.map((f) => f.path).sort();
    expect(paths).toEqual(["command", "onExit"]);
    expect(findings.find((f) => f.path === "onExit")).not.toHaveProperty("code");
    expect(findings.find((f) => f.path === "command")?.code).toBe(INVALID);
  });
});

describe("external.process — own-property hostility extended (__proto__/inherited across members, G8)", () => {
  it("an inherited output.mode is not read as config — the own read sees mode absent (defaults exitCode)", () => {
    const output = Object.create({ mode: "gateDecisionJson" }) as object; // inherited mode
    // mode read as absent → defaults to exitCode → onExit becomes REQUIRED and,
    // being absent here, fires lane i. The inherited gateDecisionJson never wins.
    const findings = fail({ command: "c", timeoutMs: 5, output });
    expect(findings.some((f) => f.path === "onExit" && f.code === INVALID)).toBe(true);
  });

  it("an inherited disposition (onTimeout via prototype) is never read — the own read sees it absent (defaults blockTransition)", () => {
    const raw = Object.create({ onTimeout: "failInstance" }) as Record<string, unknown>;
    Object.assign(raw, validExitCode);
    // The inherited failInstance would be lane o if read; own-only read ignores
    // it, so onTimeout defaults to blockTransition and the config ADMITS.
    expect(effective(raw).onTimeout).toBe("blockTransition");
  });

  it("an inherited reason entry is never read — the own read sees the bucket absent", () => {
    const reason = Object.create({ zero: "Bad Token" }) as object; // inherited invalid token
    // The inherited (invalid) token is never read; the own reason map is empty,
    // so exitCode-mode defaults BOTH buckets and the config ADMITS.
    expect(effective({ ...validExitCode, reason }).reason).toEqual({ zero: "sys:exit_zero", nonzero: "sys:exit_nonzero" });
  });
});

describe("external.process — V3 descriptor rung: an accessor (getter) timeoutMs must not bypass the ladder", () => {
  it("a getter-defined timeoutMs returning a non-integer is READ and REJECTED (own enumerable data semantics)", () => {
    const raw: Record<string, unknown> = { ...validExitCode };
    Object.defineProperty(raw, "timeoutMs", { get: () => 1.5, enumerable: true, configurable: true });
    // The own read invokes the getter; its 1.5 return still runs the numeric
    // ladder — the accessor does not smuggle a value past validation.
    const findings = fail(raw);
    expect(findings.some((f) => f.path === "timeoutMs" && f.code === INVALID)).toBe(true);
  });

  it("a getter-defined timeoutMs returning a valid integer ADMITS with that value", () => {
    const raw: Record<string, unknown> = { ...validExitCode };
    Object.defineProperty(raw, "timeoutMs", { get: () => 42, enumerable: true, configurable: true });
    expect(effective(raw).timeoutMs).toBe(42);
  });
});
