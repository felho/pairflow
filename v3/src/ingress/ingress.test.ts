import { describe, expect, it } from "vitest";

import type { EventEnvelope, Outcome } from "../domain/index.js";
import type { Kernel } from "../kernel/index.js";
import { createIngress } from "./ingress.js";

function capturingKernel(): { kernel: Kernel; seen: EventEnvelope[] } {
  const seen: EventEnvelope[] = [];
  const kernel: Kernel = {
    handle: (envelope) => {
      seen.push(envelope);
      const outcome: Outcome = { kind: "committed", version: 2, intent: null };
      return Promise.resolve(outcome);
    },
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
      expect(await createIngress(kernel).submit(raw)).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
    },
  );

  it.each(["instanceId", "opId", "type", "actorId"])(
    "missing or empty required field %s → invalid_shape",
    async (field) => {
      const { kernel } = capturingKernel();
      const ingress = createIngress(kernel);
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
      expect(await createIngress(kernel).submit({ ...validRaw, expectedVersion: bad })).toEqual({
        kind: "rejected",
        reason: "invalid_shape",
      });
    },
  );

  it("a non-string eventId → invalid_shape", async () => {
    const { kernel } = capturingKernel();
    expect(await createIngress(kernel).submit({ ...validRaw, eventId: 9 })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("unknown top-level keys → invalid_shape (strict, fail-closed)", async () => {
    const { kernel } = capturingKernel();
    expect(await createIngress(kernel).submit({ ...validRaw, committedAt: 123 })).toEqual({
      kind: "rejected",
      reason: "invalid_shape",
    });
  });

  it("never reaches the kernel on a shape rejection", async () => {
    const { kernel, seen } = capturingKernel();
    await createIngress(kernel).submit(null);
    await createIngress(kernel).submit({ ...validRaw, extra: true });
    expect(seen).toHaveLength(0);
  });
});

describe("ingress — pass-through of a valid envelope", () => {
  it("delivers a typed envelope with exactly the known fields", async () => {
    const { kernel, seen } = capturingKernel();
    const outcome = await createIngress(kernel).submit({ ...validRaw, eventId: "evt-1" });
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
    await createIngress(kernel).submit(minimal);
    expect(seen[0]).toEqual({
      instanceId: "inst-1",
      opId: "a1",
      type: "PASS",
      actorId: "codex",
    });
    expect(Object.keys(seen[0] ?? {})).not.toContain("expectedVersion");
  });
});
