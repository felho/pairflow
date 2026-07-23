import { describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "../diag/index.js";
import type { EventEnvelope, Outcome } from "../domain/index.js";
import type { Kernel } from "../kernel/index.js";
import type { IngressDetailToken } from "../ports/diagnostics.js";
import { createRecordingDiagnosticsSink } from "../testkit/index.js";
import { createIngress } from "./ingress.js";

function ingressOf(kernel: Kernel) {
  return createIngress({ kernel, diag: noopDiagnosticsSink });
}

function capturingKernel(): { kernel: Kernel; seen: EventEnvelope[] } {
  const seen: EventEnvelope[] = [];
  const unused = () => Promise.reject(new Error("unused in ingress tests"));
  const kernel: Kernel = {
    handle: (envelope) => {
      seen.push(envelope);
      const outcome: Outcome = { kind: "committed", version: 2, intent: null };
      return Promise.resolve(outcome);
    },
    create: unused,
    start: unused,
    kickoff: unused,
    cancel: unused,
    fail: unused,
    runtimeContextReady: unused,
    runtimeContextFailed: unused,
    deliverCompletion: () => {
      /* unused in ingress tests */
    },
    settleRuntimeContextDeliveries: () => Promise.resolve([]),
  };
  return { kernel, seen };
}

const validRaw = {
  instanceId: "inst-1",
  opId: "a1",
  type: "PASS",
  actorId: "codex",
  expectedVersion: 1,
  payload: { ref: "diff" },
};

describe("ingress — valid_shape (Rejected(invalid_shape) family)", () => {
  it.each([null, 42, "envelope", [], undefined])(
    "non-object input %p → invalid_shape",
    async (raw) => {
      const { kernel } = capturingKernel();
      expect(await ingressOf(kernel).submit(raw)).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
    },
  );

  it.each(["instanceId", "opId", "type", "actorId"])(
    "missing or empty required field %s → invalid_shape",
    async (field) => {
      const { kernel } = capturingKernel();
      const ingress = ingressOf(kernel);
      const missing: Record<string, unknown> = { ...validRaw };
      delete missing[field];
      expect(await ingress.submit(missing)).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
      expect(await ingress.submit({ ...validRaw, [field]: "" })).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
      expect(await ingress.submit({ ...validRaw, [field]: 7 })).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
    },
  );

  it.each(["1", -1, 1.5, Number.NaN, null])(
    "expectedVersion present but not a non-negative integer (%p) → invalid_shape",
    async (bad) => {
      const { kernel } = capturingKernel();
      expect(await ingressOf(kernel).submit({ ...validRaw, expectedVersion: bad })).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
    },
  );

  it("expectedVersion: -0 → invalid_shape (JSON.parse('-0') CAN deliver it; stringify would flatten it)", async () => {
    const { kernel } = capturingKernel();
    const negativeZero = JSON.parse("-0") as number;
    expect(Object.is(negativeZero, -0)).toBe(true);
    expect(
      await ingressOf(kernel).submit({ ...validRaw, expectedVersion: negativeZero }),
    ).toEqual({ kind: "rejected", reason: "invalid_shape" });
  });

  it("a non-string eventId → invalid_shape", async () => {
    const { kernel } = capturingKernel();
    expect(await ingressOf(kernel).submit({ ...validRaw, eventId: 9 })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("unknown top-level keys → invalid_shape (strict, fail-closed)", async () => {
    const { kernel } = capturingKernel();
    expect(await ingressOf(kernel).submit({ ...validRaw, committedAt: 123 })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("never reaches the kernel on a shape rejection", async () => {
    const { kernel, seen } = capturingKernel();
    await ingressOf(kernel).submit(null);
    await ingressOf(kernel).submit({ ...validRaw, extra: true });
    expect(seen).toHaveLength(0);
  });
});

describe("ingress — the payload must survive the JSON round-trip (the transcript stores what ingress admitted)", () => {
  async function expectPayloadRejected(payload: unknown): Promise<void> {
    const { kernel, seen } = capturingKernel();
    expect(await ingressOf(kernel).submit({ ...validRaw, payload })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
    expect(seen).toHaveLength(0);
  }

  it("rejects undefined property values — the key would vanish in the round-trip", async () => {
    await expectPayloadRejected({ a: undefined });
    await expectPayloadRejected({ nested: { a: undefined } });
  });

  it("rejects functions, symbols, and BigInt — stringify drops or throws", async () => {
    await expectPayloadRejected({ f: () => 1 });
    await expectPayloadRejected({ [Symbol("s")]: 1, a: 2 });
    await expectPayloadRejected({ n: 1n });
  });

  it("rejects non-finite numbers — stringify silently turns them into null", async () => {
    await expectPayloadRejected(Number.NaN);
    await expectPayloadRejected({ x: Number.POSITIVE_INFINITY });
  });

  it("rejects negative zero in the payload — it would flatten to 0 in the round-trip", async () => {
    await expectPayloadRejected(-0);
    await expectPayloadRejected({ x: -0 });
  });

  it("rejects non-plain objects — Date/Map/Set would mutate or flatten", async () => {
    await expectPayloadRejected(new Date("2026-01-01T00:00:00Z"));
    await expectPayloadRejected(new Map([["a", 1]]));
  });

  it("rejects sparse arrays — a hole would become null", async () => {
    await expectPayloadRejected(new Array(1));
  });

  it("rejects an explicit payload: undefined — the key itself would vanish", async () => {
    await expectPayloadRejected(undefined);
  });

  it("accepts a deeply nested plain-JSON payload", async () => {
    const { kernel, seen } = capturingKernel();
    const payload = { refs: ["a", "b"], meta: { depth: 2, ok: true, note: null } };
    await ingressOf(kernel).submit({ ...validRaw, payload });
    expect(seen[0]?.payload).toEqual(payload);
  });
});

describe("ingress — the strict claim's full surface", () => {
  it("a symbol-keyed top-level property is an unknown key → invalid_shape", async () => {
    const { kernel } = capturingKernel();
    expect(await ingressOf(kernel).submit({ ...validRaw, [Symbol("s")]: 1 })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("a NON-ENUMERABLE unknown top-level key → invalid_shape (the finding's exact repro)", async () => {
    const { kernel } = capturingKernel();
    const raw: Record<string, unknown> = { ...validRaw };
    Object.defineProperty(raw, "committedAt", { value: 123, enumerable: false });
    expect(await ingressOf(kernel).submit(raw)).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("a payload smuggling a hidden toJSON → invalid_shape (it would rewrite the persisted value)", async () => {
    const { kernel } = capturingKernel();
    const payload: Record<string, unknown> = { a: 1 };
    Object.defineProperty(payload, "toJSON", { value: () => ({ b: 2 }), enumerable: false });
    expect(await ingressOf(kernel).submit({ ...validRaw, payload })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("a payload smuggling an array-prototype toJSON → invalid_shape (same attack, array branch)", async () => {
    const { kernel } = capturingKernel();
    const proto: unknown[] = [];
    Object.defineProperty(proto, "toJSON", { value: () => ["rewritten"], enumerable: true });
    const arr = [1];
    Object.setPrototypeOf(arr, proto);
    expect(await ingressOf(kernel).submit({ ...validRaw, payload: { refs: arr } })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("a non-plain raw envelope (class instance) → invalid_shape", async () => {
    class Env {
      instanceId = "inst-1";
      opId = "a1";
      type = "PASS";
      actorId = "codex";
      expectedVersion = 1;
    }
    const { kernel } = capturingKernel();
    expect(await ingressOf(kernel).submit(new Env())).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });
});

describe("ingress — pass-through of a valid envelope", () => {
  it("delivers a typed envelope with exactly the known fields", async () => {
    const { kernel, seen } = capturingKernel();
    const outcome = await ingressOf(kernel).submit({ ...validRaw, eventId: "evt-1" });
    expect(outcome.kind).toBe("committed");
    expect(seen).toEqual([
      {
        instanceId: "inst-1",
        opId: "a1",
        type: "PASS",
        actorId: "codex",
        expectedVersion: 1,
        eventId: "evt-1",
        payload: { ref: "diff" },
      },
    ]);
  });

  it("omits absent optional fields instead of passing undefined", async () => {
    const { kernel, seen } = capturingKernel();
    const { expectedVersion, payload, ...minimal } = validRaw;
    void expectedVersion;
    void payload;
    await ingressOf(kernel).submit(minimal);
    expect(seen[0]).toEqual({
      instanceId: "inst-1",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
    });
    expect(Object.keys(seen[0] ?? {})).not.toContain("expectedVersion");
  });
});

describe("ingress diagnostics — the six detail tokens + attribution (packet ch7-P1)", () => {
  function recordingIngress() {
    const { kernel } = capturingKernel();
    const rec = createRecordingDiagnosticsSink();
    return { ingress: createIngress({ kernel, diag: rec.sink }), rec };
  }

  const tokenLanes: readonly [IngressDetailToken, unknown][] = [
    ["not_plain_object", null],
    ["unknown_key", { ...validRaw, extra: true }],
    ["invalid_required_string", { ...validRaw, opId: "" }],
    ["invalid_expected_version", { ...validRaw, expectedVersion: -1 }],
    ["invalid_event_id", { ...validRaw, eventId: 9 }],
    ["payload_not_canonicalizable", { ...validRaw, payload: 9n }],
  ];

  it.each(tokenLanes)("token %s is driven", async (token, raw) => {
    const { ingress, rec } = recordingIngress();
    const outcome = await ingress.submit(raw);
    expect(outcome).toEqual({ kind: "rejected", reason: "invalid_shape" });
    expect(rec.events).toHaveLength(1);
    expect(rec.events[0]).toMatchObject({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: token,
    });
  });

  it("not_plain_object carries NO attribution fields", async () => {
    const { ingress, rec } = recordingIngress();
    await ingress.submit(null);
    expect(rec.events[0]).toEqual({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: "not_plain_object",
    });
  });

  it("best-effort attribution: valid string fields are carried, the invalid one is not", async () => {
    const { ingress, rec } = recordingIngress();
    await ingress.submit({ ...validRaw, opId: "" });
    expect(rec.events[0]).toEqual({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: "invalid_required_string",
      instanceId: "inst-1",
      actorId: "codex",
      type: "PASS",
    });
  });

  it("an admitted envelope emits NOTHING from ingress; exactly one event per rejected submit", async () => {
    const { ingress, rec } = recordingIngress();
    await ingress.submit(validRaw);
    expect(rec.events).toEqual([]);
    await ingress.submit({ ...validRaw, extra: 1 });
    await ingress.submit(null);
    expect(rec.events).toHaveLength(2);
  });

  it("no fingerprint on ingress events (no digest authority in ingress)", async () => {
    const { ingress, rec } = recordingIngress();
    await ingress.submit({ ...validRaw, extra: 1 });
    expect(rec.events[0]?.payloadDigest).toBeUndefined();
  });
});

// ── packet ch11-P1: the expectedRole admission surface (W2/W3/W4) ────

describe("ingress — expectedRole (packet ch11-P1)", () => {
  it("W2: a role-carrying envelope passes and the typed envelope carries it verbatim", async () => {
    const { kernel, seen } = capturingKernel();
    const outcome = await ingressOf(kernel).submit({ ...validRaw, expectedRole: "implementer" });
    expect(outcome).toEqual({ kind: "committed", version: 2, intent: null });
    expect(seen[0]?.expectedRole).toBe("implementer");
  });

  it.each([["empty string", ""], ["number", 7], ["null", null], ["object", { r: 1 }]])(
    "W3: present-but-malformed expectedRole (%s) → invalid_shape with the invalid_expected_role token",
    async (_label, value) => {
      const { kernel, seen } = capturingKernel();
      const rec = createRecordingDiagnosticsSink();
      const ingress = createIngress({ kernel, diag: rec.sink });
      expect(await ingress.submit({ ...validRaw, expectedRole: value })).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
      expect(seen).toEqual([]);
      expect(rec.events[0]).toMatchObject({
        source: "ingress",
        kind: "rejected",
        reason: "invalid_shape",
        detail: "invalid_expected_role",
      });
    },
  );

  it("W4: ABSENCE passes ingress untouched — mandatory-ness is the kernel's (missing_role), never the ingress's", async () => {
    const { kernel, seen } = capturingKernel();
    const outcome = await ingressOf(kernel).submit({ ...validRaw });
    expect(outcome).toEqual({ kind: "committed", version: 2, intent: null });
    expect(seen[0]).not.toHaveProperty("expectedRole");
  });
});

// ── The operator-intent wire family (packet ch12-p1b, I1–I4) ─────────

import type {
  CancelInput,
  CreateInput,
  KickoffInput,
  StartInput,
} from "../kernel/index.js";

interface IntentCapture {
  kernel: Kernel;
  creates: CreateInput[];
  starts: StartInput[];
  kickoffs: KickoffInput[];
  cancels: CancelInput[];
}

function intentKernel(): IntentCapture {
  const creates: CreateInput[] = [];
  const starts: StartInput[] = [];
  const kickoffs: KickoffInput[] = [];
  const cancels: CancelInput[] = [];
  const kernel: Kernel = {
    handle: () => Promise.reject(new Error("unused")),
    create: (input) => {
      creates.push(input);
      return Promise.resolve({ kind: "created", instanceId: input.instanceId, version: 1 });
    },
    start: (input) => {
      starts.push(input);
      return Promise.resolve({ kind: "accepted" });
    },
    kickoff: (input) => {
      kickoffs.push(input);
      return Promise.resolve({ kind: "duplicate" });
    },
    cancel: (input) => {
      cancels.push(input);
      return Promise.resolve({ kind: "terminated", disposition: "cancelled" });
    },
    fail: () => Promise.reject(new Error("kernel events have no ingress endpoint (C13)")),
    runtimeContextReady: () =>
      Promise.reject(new Error("kernel events have no ingress endpoint (C13)")),
    runtimeContextFailed: () =>
      Promise.reject(new Error("kernel events have no ingress endpoint (C13)")),
    deliverCompletion: () => {
      /* unused in ingress intent tests */
    },
    settleRuntimeContextDeliveries: () => Promise.resolve([]),
  };
  return { kernel, creates, starts, kickoffs, cancels };
}

const REF_WIRE = { id: "local-pair-v0", version: 1 };

describe("submitIntent — accept lanes (I1/I2): the typed intent reaches the kernel VERBATIM", () => {
  it("create: full keyset, camelCase mode maps to the DOMAIN token exactly once (C1/C13)", async () => {
    const cap = intentKernel();
    const outcome = await ingressOf(cap.kernel).submitIntent({
      intent: "create",
      instanceId: "i1",
      templateRef: REF_WIRE,
      task: "T",
      overrides: { implementer: "human" },
      runOverrides: { review: { mode: "strict" } },
      mode: "deferredKickoff",
    });
    expect(outcome).toEqual({ kind: "created", instanceId: "i1", version: 1 });
    expect(cap.creates).toEqual([
      {
        instanceId: "i1",
        templateRef: REF_WIRE,
        task: "T",
        overrides: { implementer: "human" },
        runOverrides: { review: { mode: "strict" } },
        mode: "deferred_kickoff",
      },
    ]);
  });

  it("create: minimal keyset — absent task/mode/overrides stay ABSENT (the kernel decides task_required)", async () => {
    const cap = intentKernel();
    await ingressOf(cap.kernel).submitIntent({
      intent: "create",
      instanceId: "i1",
      templateRef: REF_WIRE,
    });
    expect(cap.creates).toEqual([{ instanceId: "i1", templateRef: REF_WIRE }]);
  });

  it("start: the exact keyset is { intent, instanceId, opId } — the provider machinery is kernel-side (W2)", async () => {
    const cap = intentKernel();
    const outcome = await ingressOf(cap.kernel).submitIntent({
      intent: "start",
      instanceId: "i1",
      opId: "op-s",
    });
    expect(outcome).toEqual({ kind: "accepted" });
    expect(cap.starts).toEqual([{ instanceId: "i1", opId: "op-s" }]);
  });

  it("kickoff and cancel: exact keysets, outcomes verbatim", async () => {
    const cap = intentKernel();
    const ingress = ingressOf(cap.kernel);
    expect(
      await ingress.submitIntent({ intent: "kickoff", instanceId: "i1", opId: "op-k", task: "GO" }),
    ).toEqual({ kind: "duplicate" });
    expect(
      await ingress.submitIntent({ intent: "cancel", instanceId: "i1", opId: "op-c" }),
    ).toEqual({ kind: "terminated", disposition: "cancelled" });
    expect(cap.kickoffs).toEqual([{ instanceId: "i1", opId: "op-k", task: "GO" }]);
    expect(cap.cancels).toEqual([{ instanceId: "i1", opId: "op-c" }]);
  });
});

describe("submitIntent — refusal lanes (I3/I4): fail-closed, one token per gate block", () => {
  async function refuse(
    raw: unknown,
    detail: IngressDetailToken,
  ): Promise<void> {
    const cap = intentKernel();
    const diag = createRecordingDiagnosticsSink();
    const ingress = createIngress({ kernel: cap.kernel, diag: diag.sink });
    expect(await ingress.submitIntent(raw)).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
    // The kernel was never touched (I4: the kernel receives only typed intents).
    expect(cap.creates.length + cap.starts.length + cap.kickoffs.length + cap.cancels.length).toBe(
      0,
    );
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail,
    });
  }

  it("not a plain object / hostile prototypes → not_plain_object", async () => {
    await refuse(null, "not_plain_object");
    await refuse([], "not_plain_object");
    await refuse(Object.create({ intent: "create" }), "not_plain_object");
  });

  it("missing or non-member intent → unknown_intent", async () => {
    await refuse({ instanceId: "i1" }, "unknown_intent");
    await refuse({ intent: "reboot", instanceId: "i1" }, "unknown_intent");
  });

  it("W1: the runtimeContextFailed kernel event has NO ingress route (C13) — neither an intent nor an envelope reaches the FAILED handler", async () => {
    // The FAILED completion is an IN-PROCESS kernel event (packet ch9-p1, W1):
    // no external endpoint. This asserts BOTH ingress faces refuse it fail-closed.
    // (a) The operator-intent route: `runtimeContextFailed` is not a member of
    // INTENT_KINDS — unknown_intent (kernel events have no operator endpoint, C13).
    const cap = intentKernel();
    expect(
      await ingressOf(cap.kernel).submitIntent({
        intent: "runtimeContextFailed",
        instanceId: "i1",
        requestId: "r1",
        reason: "sys:provision_failed",
      }),
    ).toEqual({ kind: "rejected", reason: "invalid_shape" });
    // (b) The actor-envelope route: the FAILED payload's own keys (requestId,
    // reason) are unknown top-level keys — invalid_shape, never reaching the
    // kernel (the strict, fail-closed unknown-key culture). Even a
    // RUNTIME_CONTEXT_FAILED-shaped `type` cannot smuggle the payload in.
    const env = capturingKernel();
    expect(
      await ingressOf(env.kernel).submit({
        instanceId: "i1",
        opId: "op",
        type: "RUNTIME_CONTEXT_FAILED",
        actorId: "kernel",
        requestId: "r1",
        reason: "sys:provision_failed",
      }),
    ).toEqual({ kind: "rejected", reason: "invalid_shape" });
    // Neither route reached the kernel — no envelope was handled.
    expect(env.seen).toEqual([]);
  });

  it("an unknown key on ANY intent → unknown_key (per-intent keysets are exact)", async () => {
    await refuse(
      { intent: "cancel", instanceId: "i1", opId: "op", task: "smuggled" },
      "unknown_key",
    );
    await refuse(
      { intent: "start", instanceId: "i1", opId: "op", templateRef: REF_WIRE },
      "unknown_key",
    );
  });

  it("missing/empty required strings → invalid_required_string (instanceId, opId, the kickoff task)", async () => {
    await refuse({ intent: "create", templateRef: REF_WIRE }, "invalid_required_string");
    await refuse({ intent: "start", instanceId: "i1" }, "invalid_required_string");
    await refuse({ intent: "cancel", instanceId: "i1", opId: "" }, "invalid_required_string");
    await refuse(
      { intent: "kickoff", instanceId: "i1", opId: "op" },
      "invalid_required_string",
    );
    await refuse(
      { intent: "kickoff", instanceId: "i1", opId: "op", task: "" },
      "invalid_required_string",
    );
  });

  it("the create-side task is form-when-present → invalid_task (its ABSENCE is the kernel's)", async () => {
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, task: "" },
      "invalid_task",
    );
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, task: 42 },
      "invalid_task",
    );
  });

  it("templateRef: shape + the FULL version ladder (R-NUMERIC-LADDER) → invalid_template_ref", async () => {
    const cases: unknown[] = [
      "local-pair-v0@1",
      { id: "", version: 1 },
      { id: "t" },
      { id: "t", version: 1, extra: true },
      { id: "t", version: "1" },
      { id: "t", version: 0 },
      { id: "t", version: 1.5 },
      { id: "t", version: -0 },
      { id: "t", version: Number.MAX_SAFE_INTEGER + 2 },
      { id: "t", version: Number.NaN },
    ];
    for (const templateRef of cases) {
      await refuse(
        { intent: "create", instanceId: "i1", templateRef },
        "invalid_template_ref",
      );
    }
  });

  it("mode outside the two authored tokens → invalid_mode (the STORED token is NOT a wire token)", async () => {
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, mode: "deferred_kickoff" },
      "invalid_mode",
    );
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, mode: "eager" },
      "invalid_mode",
    );
  });

  it("overrides: non-map or non-string values → invalid_overrides", async () => {
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, overrides: ["x"] },
      "invalid_overrides",
    );
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, overrides: { r: "" } },
      "invalid_overrides",
    );
  });

  it("runOverrides: non-map entries and non-canonicalizable values fail CLOSED here (C7) → invalid_run_overrides", async () => {
    await refuse(
      { intent: "create", instanceId: "i1", templateRef: REF_WIRE, runOverrides: { s: "flat" } },
      "invalid_run_overrides",
    );
    await refuse(
      {
        intent: "create",
        instanceId: "i1",
        templateRef: REF_WIRE,
        runOverrides: { s: { budget: Number.POSITIVE_INFINITY } },
      },
      "invalid_run_overrides",
    );
    await refuse(
      {
        intent: "create",
        instanceId: "i1",
        templateRef: REF_WIRE,
        runOverrides: { s: { when: new Date(0) } },
      },
      "invalid_run_overrides",
    );
  });

  it("W2 (ch12-p3): the retired `runtimeContextRef` start key is now an UNKNOWN-KEY rejection", async () => {
    // The interim wire key retired with the provider machinery (C14) — a
    // `start` intent carrying it is refused by the fail-closed unknown-key lane.
    await refuse(
      { intent: "start", instanceId: "i1", opId: "op", runtimeContextRef: "/ws" },
      "unknown_key",
    );
  });
});

describe("submitIntent — hostile wire records (gate-2 aftermath, finding 1)", () => {
  it("an ACCESSOR property on the top-level record → not_plain_object (descriptor gate)", async () => {
    const cap = intentKernel();
    const hostile: Record<string, unknown> = { intent: "cancel", opId: "op" };
    Object.defineProperty(hostile, "instanceId", { get: () => "i1", enumerable: true, configurable: true });
    expect(await ingressOf(cap.kernel).submitIntent(hostile)).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
    expect(cap.cancels).toEqual([]);
  });

  it("an ACCESSOR inside templateRef → invalid_template_ref (nested descriptor gate)", async () => {
    const cap = intentKernel();
    const ref: Record<string, unknown> = { id: "local-pair-v0" };
    let reads = 0;
    Object.defineProperty(ref, "version", {
      get: () => {
        reads += 1;
        return 1;
      },
      enumerable: true,
      configurable: true,
    });
    expect(
      await ingressOf(cap.kernel).submitIntent({
        intent: "create",
        instanceId: "i1",
        templateRef: ref,
      }),
    ).toEqual({ kind: "rejected", reason: "invalid_shape" });
    expect(cap.creates).toEqual([]);
    // The descriptor gate fires BEFORE any value read — the getter never ran.
    expect(reads).toBe(0);
  });

  it("a THROWING getter never escapes as an exception — rejected fail-closed", async () => {
    const cap = intentKernel();
    const hostile: Record<string, unknown> = { intent: "start", instanceId: "i1" };
    Object.defineProperty(hostile, "opId", {
      get: () => {
        throw new Error("hostile getter");
      },
      enumerable: true,
      configurable: true,
    });
    // The descriptor gate fires BEFORE any value read — the getter never runs.
    expect(await ingressOf(cap.kernel).submitIntent(hostile)).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("a NON-ENUMERABLE unknown key still rejects (unknown_key — getOwnPropertyNames, not keys)", async () => {
    const cap = intentKernel();
    const hostile: Record<string, unknown> = { intent: "cancel", instanceId: "i1", opId: "op" };
    Object.defineProperty(hostile, "smuggled", { value: 1, enumerable: false, configurable: true, writable: true });
    expect(await ingressOf(cap.kernel).submitIntent(hostile)).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("post-dispatch caller mutation cannot reach the kernel — runOverrides and templateRef are single-read COPIES", async () => {
    const cap = intentKernel();
    const runOverrides: Record<string, Record<string, unknown>> = { review: { mode: "strict" } };
    const templateRef = { id: "local-pair-v0", version: 1 };
    await ingressOf(cap.kernel).submitIntent({
      intent: "create",
      instanceId: "i1",
      templateRef,
      task: "T",
      runOverrides,
    });
    // Mutate the caller-held objects AFTER dispatch resolved.
    runOverrides["review"]!["mode"] = "hijacked";
    (templateRef as { version: number }).version = 999;
    expect(cap.creates[0]?.runOverrides).toEqual({ review: { mode: "strict" } });
    expect(cap.creates[0]?.templateRef).toEqual({ id: "local-pair-v0", version: 1 });
  });
});
