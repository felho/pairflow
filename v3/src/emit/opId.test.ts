import { describe, expect, it } from "vitest";

import { deriveActorEmitOpId, deriveOperatorOpId, digestPayload } from "./opId.js";

const identity = {
  instanceId: "inst-1",
  contextPacketId: "packet-7",
  opType: "submit_decision",
  payload: { verdict: "approve", note: "ok" },
};

describe("payload digest (canonical serialization)", () => {
  it("is insensitive to object key order, at any depth", () => {
    expect(digestPayload({ a: 1, b: { c: 2, d: 3 } })).toBe(
      digestPayload({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("is sensitive to values and to array order", () => {
    expect(digestPayload({ a: 1 })).not.toBe(digestPayload({ a: 2 }));
    expect(digestPayload([1, 2])).not.toBe(digestPayload([2, 1]));
  });

  it("rejects non-canonicalizable payloads instead of silently coercing", () => {
    expect(() => digestPayload({ f: () => 1 })).toThrow(/canonical/);
    expect(() => digestPayload(Number.NaN)).toThrow(/canonical/);
  });
});

describe("actor-emit family — content-addressed (ADR-004)", () => {
  it("is deterministic: a retransmission reproduces the same op_id", () => {
    const first = deriveActorEmitOpId(identity);
    const second = deriveActorEmitOpId(identity);
    expect(second.opId).toBe(first.opId);
    expect(second.payloadDigest).toBe(first.payloadDigest);
  });

  it("derives a NEW op_id from a fresh context packet (the post-Stale refresh, lib-side half)", () => {
    const before = deriveActorEmitOpId(identity);
    const after = deriveActorEmitOpId({ ...identity, contextPacketId: "packet-8" });
    expect(after.opId).not.toBe(before.opId);
    expect(after.payloadDigest).toBe(before.payloadDigest);
  });

  it("is sensitive to every identity component", () => {
    const base = deriveActorEmitOpId(identity).opId;
    expect(deriveActorEmitOpId({ ...identity, instanceId: "inst-2" }).opId).not.toBe(base);
    expect(deriveActorEmitOpId({ ...identity, opType: "emit_note" }).opId).not.toBe(base);
    expect(
      deriveActorEmitOpId({ ...identity, payload: { verdict: "reject", note: "ok" } }).opId,
    ).not.toBe(base);
  });

  it("treats key order in the payload as the same operation", () => {
    const a = deriveActorEmitOpId(identity);
    const b = deriveActorEmitOpId({
      ...identity,
      payload: { note: "ok", verdict: "approve" },
    });
    expect(b.opId).toBe(a.opId);
  });

  it("produces op_-prefixed hex ids", () => {
    expect(deriveActorEmitOpId(identity).opId).toMatch(/^op_[0-9a-f]{64}$/);
  });
});

describe("operator/CLI verb family — request-scoped nonce (ADR-004)", () => {
  it("reuses the op_id for the same nonce (retries within one invocation)", () => {
    expect(deriveOperatorOpId("nonce-1")).toBe(deriveOperatorOpId("nonce-1"));
  });

  it("mints a new op_id for a new nonce (two identical cancels are two operations)", () => {
    expect(deriveOperatorOpId("nonce-1")).not.toBe(deriveOperatorOpId("nonce-2"));
  });

  it("rejects an empty nonce", () => {
    expect(() => deriveOperatorOpId("")).toThrow(/nonce/);
  });
});

describe("family separation", () => {
  it("actor and operator derivations never share an id space", () => {
    const actor = deriveActorEmitOpId({
      instanceId: "x",
      contextPacketId: "y",
      opType: "z",
      payload: null,
    }).opId;
    // A crafted nonce equal to the actor identity's raw material must not collide.
    const operator = deriveOperatorOpId("x|y|z|null");
    expect(operator).not.toBe(actor);
    expect(operator).toMatch(/^op_[0-9a-f]{64}$/);
  });
});
