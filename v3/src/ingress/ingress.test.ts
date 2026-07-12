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
  const kernel: Kernel = {
    handle: (envelope) => {
      seen.push(envelope);
      const outcome: Outcome = { kind: "committed", version: 2, intent: null };
      return Promise.resolve(outcome);
    },
    startInstance: () => Promise.reject(new Error("unused in ingress tests")),
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
