import { describe, expect, it } from "vitest";

import type {
  ActivationMode,
  EffectiveProcessConfig,
  GateDecision,
  KernelStatus,
  LifecycleFactEntry,
  RuntimeContext,
  RuntimeContextRef,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WorkflowInstance,
} from "../domain/index.js";
import type {
  GateInvocation,
  GateInvocationHistoryEntry,
  GateInvocationProjection,
  ProcessResult,
} from "../ports/index.js";
import { classifyProcessResult, runnerOutcome, validateGateDecisionObject } from "./processGate.js";

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
  reason: { zero: "sys:exit_zero", nonzero: "test_failed" },
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
  it("timeout → runner_outcome(onTimeout, sys:timeout, logRef)", () => {
    expect(classifyProcessResult({ kind: "timeout", logRef: "t", durationMs: 9 }, exitCode)).toEqual({
      verdict: "block",
      reason: "sys:timeout",
      evidenceRefs: ["t"],
    });
  });

  it("runner_error → runner_outcome(onRunnerError, sys:runner_error, logRef)", () => {
    expect(
      classifyProcessResult({ kind: "runner_error", logRef: "r", durationMs: 0 }, exitCode),
    ).toEqual({ verdict: "block", reason: "sys:runner_error", evidenceRefs: ["r"] });
  });

  it("ok/exitCode zero bucket → onExit.zero verdict + reason.zero + [logRef]", () => {
    expect(classifyProcessResult(ok(0, "", "e0"), exitCode)).toEqual({
      verdict: "allow",
      reason: "sys:exit_zero",
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

  // The full bucket × verdict grid: every bucket must reach every verdict per
  // its authored `onExit` mapping, so a bucket→verdict MISMAPPING turns red
  // (full-decision equality per member — not verdict-only spot checks).
  it("ok/exitCode zero bucket → WARN when onExit.zero = warn", () => {
    const cfg: EffectiveProcessConfig = {
      ...exitCode,
      onExit: { zero: "warn", nonzero: "block" },
      reason: { zero: "flaky_ok", nonzero: "test_failed" },
    };
    expect(classifyProcessResult(ok(0, "", "z"), cfg)).toEqual({
      verdict: "warn",
      reason: "flaky_ok",
      evidenceRefs: ["z"],
    });
  });

  it("ok/exitCode zero bucket → BLOCK when onExit.zero = block", () => {
    const cfg: EffectiveProcessConfig = {
      ...exitCode,
      onExit: { zero: "block", nonzero: "allow" },
      reason: { zero: "zero_blocks", nonzero: "nonzero_ok" },
    };
    expect(classifyProcessResult(ok(0, "", "z"), cfg)).toEqual({
      verdict: "block",
      reason: "zero_blocks",
      evidenceRefs: ["z"],
    });
  });

  it("ok/exitCode nonzero bucket → ALLOW when onExit.nonzero = allow", () => {
    const cfg: EffectiveProcessConfig = {
      ...exitCode,
      onExit: { zero: "block", nonzero: "allow" },
      reason: { zero: "zero_blocks", nonzero: "nonzero_ok" },
    };
    expect(classifyProcessResult(ok(7, "", "n"), cfg)).toEqual({
      verdict: "allow",
      reason: "nonzero_ok",
      evidenceRefs: ["n"],
    });
  });

  it("the COLLIDING member: an authored reason spelling the bare fixed name (runner_error) rides classification UNCHANGED — never renamed to sys:runner_error", () => {
    const cfg: EffectiveProcessConfig = {
      ...exitCode,
      reason: { zero: "sys:exit_zero", nonzero: "runner_error" },
    };
    expect(classifyProcessResult(ok(1, "", "c"), cfg)).toEqual({
      verdict: "block",
      reason: "runner_error",
      evidenceRefs: ["c"],
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
      expect(decision.reason).toBe(bucket === "zero" ? "sys:exit_zero" : "test_failed");
      expect(decision.verdict).toBe(bucket === "zero" ? "allow" : "block");
    });
  }

  it("`-0` lands in the ZERO bucket (`-0 === 0`, not Object.is)", () => {
    const decision = classifyProcessResult(ok(-0, "", "l"), exitCode);
    // The Object.is-grade distinction lives HERE (the assert), proving which
    // bucket fired — the bucket comparison itself must NOT be Object.is.
    expect(Object.is(-0, 0)).toBe(false);
    expect(decision.verdict).toBe("allow");
    expect(decision.reason).toBe("sys:exit_zero");
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
    it(`${label} → sys:malformed_gate_decision_json (never a business block)`, () => {
      expect(classifyProcessResult(ok(0, stdout, "m"), json)).toEqual({
        verdict: "block",
        reason: "sys:malformed_gate_decision_json",
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
      reason: "sys:malformed_gate_decision_json",
      evidenceRefs: ["m"],
    });
  });

  it("own-property discipline (G8): verdict carried ONLY on the PROTOTYPE is rejected", () => {
    // `JSON.parse` always mints own properties, so a real prototype-pollution
    // object can only reach the schema validator through the direct channel.
    // Here `verdict` lives on the PROTOTYPE and only `reason` is an OWN field:
    // the own-property reads must NOT see the inherited `verdict`, so the object
    // is missing `verdict` and rejects. If an `ownGet` were regressed to a plain
    // `record[key]` (inherited) read, it would surface {verdict:"allow"} and
    // this assertion would flip — the test is red on exactly that regression.
    const polluted = Object.create({ verdict: "allow" }) as Record<string, unknown>;
    Object.defineProperty(polluted, "reason", {
      value: "r",
      enumerable: true,
      writable: true,
      configurable: true,
    });
    expect(validateGateDecisionObject(polluted)).toBeNull();
  });

  it("own-property discipline (G8): an OWN valid document still parses through the direct validator", () => {
    // The positive control — the helper itself accepts a well-formed OWN object.
    const own = { verdict: "allow", reason: "r" };
    expect(validateGateDecisionObject(own)).toEqual({ verdict: "allow", reason: "r" });
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
    expect(runnerOutcome("blockTransition", "sys:timeout", "L")).toEqual({
      verdict: "block",
      reason: "sys:timeout",
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

// ── Compile-negative probes (packet ch11-P3b, dimension 11): validated by
// v3:typecheck via TS2578 on an unused @ts-expect-error if a type ever widens.
// Exported so the unused-variable lint treats them as consumed. ─────────────

// (a) WorkflowInstance.runtimeContext is the REQUIRED discriminated state (T3/T4).
const __instanceNoRuntimeContext: Omit<WorkflowInstance, "runtimeContext"> = {
  instanceId: "i",
  templateRef: { id: "t", version: 1 },
  task: "x",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "s",
  round: 1,
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  failureReason: null,
  runOverrides: {},
  version: 1,
};

// @ts-expect-error runtimeContext is REQUIRED — a literal WITHOUT the field is rejected.
export const __probeInstanceMissingRuntimeContext: WorkflowInstance = {
  ...__instanceNoRuntimeContext,
};

export const __probeInstanceBadRuntimeContext: WorkflowInstance = {
  ...__instanceNoRuntimeContext,
  // @ts-expect-error runtimeContext is the discriminated RuntimeContext state — a bare scalar is rejected.
  runtimeContext: 5,
};

// (b) GateInvocation + the wire projection/history types carry EXACT keysets.
const __invocationBase: GateInvocation = {
  instance_id: "i",
  template_ref: { id: "t", version: 1 },
  step_id: "s",
  event_type: "E",
  expected_version: 1,
  config: {},
  projection: { round: 1, current_step: "s", event_type: "E", history: [] },
};

export const __probeInvocationExtraKey: GateInvocation = {
  ...__invocationBase,
  // @ts-expect-error GateInvocation has an EXACT keyset — an unknown key is rejected.
  surprise: 1,
};

// @ts-expect-error GateInvocation requires `step_id` — omitting a required key is rejected.
export const __probeInvocationMissingKey: GateInvocation = {
  instance_id: "i",
  template_ref: { id: "t", version: 1 },
  event_type: "E",
  expected_version: 1,
  config: {},
  projection: { round: 1, current_step: "s", event_type: "E", history: [] },
};

export const __probeHistoryEntryExtraKey: GateInvocationHistoryEntry = {
  step_id: "s",
  event_type: "E",
  role: "r",
  // @ts-expect-error the wire history-entry keyset is EXACT — an unknown key is rejected.
  extra: 1,
};

// @ts-expect-error the wire projection requires `history` — omitting a required key is rejected.
export const __probeProjectionMissingHistory: GateInvocationProjection = {
  round: 1,
  current_step: "s",
  event_type: "E",
};

// ── Compile-negative probes (packet ch12-p1a — the type family, T3/T4 + W1):
// validated by v3:typecheck via TS2578 on an unused @ts-expect-error if a
// union widens, a shape loosens, or the retired export returns. Exported so
// the unused-variable lint treats them as consumed. ─────────────────────────

// W1: the `LifecycleStatus` export is RETIRED (C24 named replacement) —
// reviving it turns this suppression into an unused-@ts-expect-error red.
// The inline import() form is deliberate: a top-level import statement
// cannot carry a per-name @ts-expect-error probe.
// @ts-expect-error LifecycleStatus no longer exists on domain/index.
export type __ProbeRetiredLifecycleStatus = import("../domain/index.js").LifecycleStatus; // eslint-disable-line @typescript-eslint/consistent-type-imports

// T3: exact unions — out-of-union tokens are compile errors.
// @ts-expect-error out-of-union kernel status token.
export const __probeBadKernelStatus: KernelStatus = "PAUSED";
// @ts-expect-error the ch-4 token spelling is NOT in the axis union (E1 maps, never aliases).
export const __probeOldRunningToken: KernelStatus = "RUNNING";
// @ts-expect-error out-of-union terminal disposition token.
export const __probeBadDisposition: TerminalDisposition = "abandoned";
// @ts-expect-error the model token is snake `deferred_kickoff` — a camelCase fork is rejected.
export const __probeBadActivationMode: ActivationMode = "deferredKickoff";
export const __probeBadWaitKind: WaitReason = {
  // @ts-expect-error the ch12 wait-kind set is exactly {kickoff_pending} (C23 additive growth).
  kind: "help_pending",
  requestedBy: "activation",
  resumeEvents: [],
};

// T4: composite shapes — wrong discriminator key / missing variant field /
// the opaque locator cannot flow to string without the X2 narrowing.
// @ts-expect-error the RuntimeContext discriminator key is `state`, not `kind`.
export const __probeWrongDiscriminatorKey: RuntimeContext = { kind: "none" };
// @ts-expect-error the `requested` variant REQUIRES requestId.
export const __probeMissingVariantField: RuntimeContext = { state: "requested" };
// @ts-expect-error the `ready` variant REQUIRES the ref field (null IS ready(∅) — absence is not).
export const __probeReadyWithoutRef: RuntimeContext = { state: "ready" };
export function __probeLocatorStaysOpaque(ref: RuntimeContextRef): string {
  // @ts-expect-error the locator is OPAQUE (unknown) — it cannot flow to string un-narrowed (X2).
  return ref.locator;
}

// T3: readonly probes — the value objects' fields cannot be written.
export function __probeReadonlyAxisFields(instance: WorkflowInstance, wait: WaitReason): void {
  // @ts-expect-error kernelStatus is readonly.
  instance.kernelStatus = "ACTIVE";
  // @ts-expect-error terminalDisposition is readonly.
  instance.terminalDisposition = null;
  // @ts-expect-error wait.resumeEvents is readonly.
  wait.resumeEvents = [];
}

// T4 (build-close aftermath fold): PER-FIELD readonly probes over the
// composite shapes — every field individually rejects assignment, so
// dropping `readonly` from any ONE field turns exactly its suppression
// into a TS2578 red. Union-variant fields are probed NARROWED (and the
// discriminant probed with its own literal), so only the readonly rule
// can be the objection — never union non-assignability masking it.
export function __probeReadonlyCompositeFields(
  ref: RuntimeContextRef,
  context: RuntimeContext,
  wait: WaitReason,
): void {
  // @ts-expect-error RuntimeContextRef.kind is readonly.
  ref.kind = "worktree";
  // @ts-expect-error RuntimeContextRef.locator is readonly.
  ref.locator = "elsewhere";
  // @ts-expect-error WaitReason.kind is readonly.
  wait.kind = "kickoff_pending";
  // @ts-expect-error WaitReason.requestedBy is readonly.
  wait.requestedBy = "activation";
  if (context.state === "none") {
    // @ts-expect-error the RuntimeContext discriminant `state` is readonly.
    context.state = "none";
  }
  if (context.state === "requested") {
    // @ts-expect-error the requested variant's `state` is readonly.
    context.state = "requested";
    // @ts-expect-error the requested variant's requestId is readonly.
    context.requestId = "r";
  }
  if (context.state === "ready") {
    // @ts-expect-error the ready variant's `state` is readonly.
    context.state = "ready";
    // @ts-expect-error the ready variant's ref is readonly.
    context.ref = null;
  }
}

// ch12-p2 (T3): the run-profile type faces, armed as compile probes.
// (a) The TRANSITION variant's issuedAgentConfig is a NON-NULL
// AgentConfig map — `null` is not assignable (this was the P1a
// "no such field" probe; the field landed at P2, so the guard now arms
// the map-not-null type).
export const __probeTransitionIssuedAgentConfigIsMap: TranscriptEntry = {
  entryKind: "transition",
  seq: 1,
  envelope: { instanceId: "i", opId: "o", type: "PASS", actorId: "a" },
  payloadDigest: "d",
  gateDecisions: [],
  committedAt: 0,
  // @ts-expect-error issuedAgentConfig is a NON-NULL AgentConfig at ch12-p2 (T3).
  issuedAgentConfig: null,
};

// (b) The FACT variant does NOT gain issuedAgentConfig — a fact entry
// carrying it is a compile error (transition-only, absent by entry
// class, C10/C12). Reviving the field on LifecycleFactEntry turns this
// suppression into a TS2578 red.
export const __probeFactEntryNoIssuedAgentConfig: LifecycleFactEntry = {
  entryKind: "STARTED",
  seq: 1,
  opId: "o",
  committedAt: 0,
  // @ts-expect-error LifecycleFactEntry has no issuedAgentConfig member (transition-only, C10/C12).
  issuedAgentConfig: {},
};

// ── ch12-p1b compile probes: the retirement sweep (W1) + the outcome
// vocabulary (V1) ─────────────────────────────────────────────────────

// W1: the `Started` type retired with the one-shot (C24 named
// replacement — `Activated` carries the continuity set). Reviving the
// export turns this suppression into a TS2578 red.
// @ts-expect-error Started no longer exists on domain/index (retired at ch12-p1b, C24).
export type __ProbeRetiredStarted = import("../domain/index.js").Started; // eslint-disable-line @typescript-eslint/consistent-type-imports

// V1: the lifecycle outcome arms are EXACT — cross-arm fields are
// excess properties, out-of-union kinds and dispositions red.
import type {
  Activated as __Activated,
  Created as __Created,
  Terminated as __Terminated,
} from "../domain/index.js";

export const __probeTerminatedExact: __Terminated = {
  kind: "terminated",
  disposition: "cancelled",
  // @ts-expect-error Terminated carries NO reason field (the rejected arm's field never crosses arms).
  reason: "cancelled",
};

export const __probeTerminatedDispositionUnion: __Terminated = {
  kind: "terminated",
  // @ts-expect-error `done` is not a Terminated disposition — done originates only from COMPLETE, never a lifecycle op.
  disposition: "done",
};

// @ts-expect-error Activated REQUIRES the full Started continuity set — instanceId is not optional.
export const __probeActivatedRequiresContinuitySet: __Activated = {
  kind: "activated",
  version: 2,
  intent: { actor: "a", packet: {} as never },
};

export const __probeCreatedExact: __Created = {
  kind: "created",
  instanceId: "i",
  version: 1,
  // @ts-expect-error Created carries no intent — genesis never dispatches (L1).
  intent: null,
};

// ── ch12-p1b gate-2 aftermath (finding 6): the G2/F3 narrowing probes —
// a NON-narrowed read of a discriminated/nullable field is a compile
// error, typecheck-armed ─────────────────────────────────────────────

import type { TranscriptEntry as __Entry, WorkflowInstance as __Instance } from "../domain/index.js";

export function __probeEntryEnvelopeNeedsNarrowing(entry: __Entry): void {
  // @ts-expect-error entry.envelope does not exist on the union — narrow on entryKind first (F3/F4).
  void entry.envelope;
  if (entry.entryKind === "transition") {
    void entry.envelope; // narrowed — legal.
  }
}

export function __probeInstanceTaskNeedsNarrowing(instance: __Instance): string {
  // @ts-expect-error instance.task is string | null — the nullable flip (G2) forces the narrow.
  const direct: string = instance.task;
  void direct;
  if (instance.task === null) {
    return "";
  }
  return instance.task; // narrowed — legal.
}

export function __probeInstanceCurrentStepNeedsNarrowing(instance: __Instance): string {
  // @ts-expect-error instance.currentStep is StepId | null (G2).
  const direct: string = instance.currentStep;
  void direct;
  return instance.currentStep ?? "";
}
