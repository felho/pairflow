import { describe, expect, it } from "vitest";

import { createHash } from "node:crypto";

import {
  canonicalize,
  deriveActorEmitOpId,
  deriveEmitDigest,
  deriveOperatorOpId,
  digestPayload,
  isCanonicalizable,
} from "./opId.js";

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

  it("rejects negative zero — JSON.stringify flattens -0 to 0, so {x:-0} would collide with {x:0}", () => {
    expect(JSON.stringify(-0)).toBe("0"); // the flattening this guards against
    expect(() => digestPayload(-0)).toThrow(/canonical/);
    expect(() => digestPayload({ x: -0 })).toThrow(/canonical/);
    expect(() => digestPayload([1, -0])).toThrow(/canonical/);
    expect(digestPayload({ x: 0 })).toBe(digestPayload({ x: 0 }));
    expect(isCanonicalizable(-0)).toBe(false);
  });

  it("dimension sweep: every other finite double round-trips exactly", () => {
    for (const n of [1e21, 5e-324, 0.1, Number.MAX_SAFE_INTEGER + 3, -1.5]) {
      expect(JSON.parse(JSON.stringify(n))).toBe(n);
      expect(digestPayload(n)).toBe(digestPayload(n));
    }
  });

  it("dimension sweep: lone surrogates are SAFE — well-formed stringify escapes them to ASCII", () => {
    const lone = "\ud800";
    expect(JSON.parse(JSON.stringify(lone))).toBe(lone);
    expect(digestPayload(lone)).toBe(digestPayload(lone));
    expect(digestPayload(lone)).not.toBe(digestPayload("\ud801"));
  });

  it("dimension sweep: circular payloads reject loudly (never a coerced partial value)", () => {
    const cyc: Record<string, unknown> = { a: 1 };
    cyc["self"] = cyc;
    expect(() => digestPayload(cyc)).toThrow();
    expect(isCanonicalizable(cyc)).toBe(false);
  });

  it("rejects undefined property values — {} and {a: undefined} must not collide silently", () => {
    expect(() => digestPayload({ a: undefined })).toThrow(/canonical/);
    expect(() => digestPayload({ nested: { a: undefined } })).toThrow(/canonical/);
  });

  it("rejects non-plain objects (Date/Map/Set/class instances would flatten to {})", () => {
    expect(() => digestPayload(new Date("2026-01-01T00:00:00Z"))).toThrow(/canonical/);
    expect(() => digestPayload(new Map([["a", 1]]))).toThrow(/canonical/);
    expect(() => digestPayload(new Set([1]))).toThrow(/canonical/);
    class Payload {
      value = 1;
    }
    expect(() => digestPayload(new Payload())).toThrow(/canonical/);
  });

  it("rejects symbol keys (Object.entries would silently drop them)", () => {
    expect(() => digestPayload({ [Symbol("s")]: 1, a: 2 })).toThrow(/canonical/);
  });

  it("accepts null-prototype objects as plain data", () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare["a"] = 1;
    expect(digestPayload(bare)).toBe(digestPayload({ a: 1 }));
  });

  it("rejects sparse arrays — a hole is not a value", () => {
    expect(() => digestPayload(new Array(1))).toThrow(/canonical/);
    const holey = new Array<number>(2);
    holey[0] = 1;
    expect(() => digestPayload(holey)).toThrow(/canonical/);
    expect(() => digestPayload({ nested: new Array(1) })).toThrow(/canonical/);
  });

  it("rejects arrays carrying extra own properties — [1] with .extra must not digest like [1]", () => {
    expect(() => digestPayload(Object.assign([1], { extra: "x" }))).toThrow(/canonical/);
    expect(() => digestPayload(Object.assign([1], { [Symbol("s")]: 1 }))).toThrow(/canonical/);
  });

  it("rejects non-enumerable own properties — JSON.stringify drops them while the object carries them", () => {
    const hidden = { a: 1 };
    Object.defineProperty(hidden, "hidden", { value: 2, enumerable: false });
    expect(() => digestPayload(hidden)).toThrow(/canonical/);
    expect(() => digestPayload({ nested: hidden })).toThrow(/canonical/);
  });

  it("rejects a hidden toJSON — it would REWRITE the persisted value behind the digest's back", () => {
    const trojan: Record<string, unknown> = { a: 1 };
    Object.defineProperty(trojan, "toJSON", {
      value: () => ({ b: 2 }),
      enumerable: false,
    });
    expect(JSON.stringify(trojan)).toBe('{"b":2}'); // the attack this guards against
    expect(() => digestPayload(trojan)).toThrow(/canonical/);
  });

  it("rejects accessor properties — a re-invoked getter cannot be pinned", () => {
    expect(() =>
      digestPayload({
        get x() {
          return 1;
        },
      }),
    ).toThrow(/canonical/);
    const arr = [1];
    Object.defineProperty(arr, 0, { get: () => 1, enumerable: true });
    expect(() => digestPayload(arr)).toThrow(/canonical/);
  });

  it("rejects arrays with a non-standard prototype — an array-proto toJSON rewrites the persisted value", () => {
    const proto: unknown[] = [];
    Object.defineProperty(proto, "toJSON", {
      value: () => ["rewritten"],
      enumerable: true,
    });
    const arr = [1];
    Object.setPrototypeOf(arr, proto);
    expect(JSON.stringify(arr)).toBe('["rewritten"]'); // the attack this guards against
    expect(() => digestPayload(arr)).toThrow(/canonical/);
    expect(() => digestPayload({ nested: arr })).toThrow(/canonical/);
    expect(isCanonicalizable(arr)).toBe(false);
  });

  it("rejects a null-prototype array — only standard arrays are pinnable", () => {
    const arr = Object.setPrototypeOf([1], null) as unknown;
    expect(() => digestPayload(arr)).toThrow(/canonical/);
  });

  it("requires indices to be OWN properties — an inherited index must not fill a hole", () => {
    const proto: unknown[] = [9];
    const arr = new Array<number>(1);
    Object.setPrototypeOf(arr, proto);
    // 0 in arr is true (inherited), but the own array has a hole.
    expect(() => digestPayload(arr)).toThrow(/canonical/);
  });

  it("still accepts a non-enumerable ARRAY INDEX — stringify reads indices regardless of enumerability", () => {
    const arr: unknown[] = [];
    Object.defineProperty(arr, 0, { value: 7, enumerable: false });
    expect(JSON.stringify(arr)).toBe("[7]");
    expect(digestPayload(arr)).toBe(digestPayload([7]));
  });

  it("still accepts dense plain arrays", () => {
    expect(digestPayload([1, 2, 3])).toBe(digestPayload([1, 2, 3]));
    expect(digestPayload([])).toBe(digestPayload([]));
  });
});

describe("isCanonicalizable — the ingress admission predicate", () => {
  it("accepts exactly what the canonicalizer accepts", () => {
    expect(isCanonicalizable({ a: 1, b: [true, "x", null], c: { d: 2 } })).toBe(true);
    expect(isCanonicalizable(null)).toBe(true);
    expect(isCanonicalizable([])).toBe(true);
  });

  it("rejects everything the canonicalizer throws on", () => {
    expect(isCanonicalizable({ a: undefined })).toBe(false);
    expect(isCanonicalizable({ f: () => 1 })).toBe(false);
    expect(isCanonicalizable(Number.NaN)).toBe(false);
    expect(isCanonicalizable(new Date("2026-01-01T00:00:00Z"))).toBe(false);
    expect(isCanonicalizable(new Array(1))).toBe(false);
    expect(isCanonicalizable(undefined)).toBe(false);
    const trojan: Record<string, unknown> = { a: 1 };
    Object.defineProperty(trojan, "toJSON", { value: () => ({ b: 2 }), enumerable: false });
    expect(isCanonicalizable(trojan)).toBe(false);
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

describe("deriveEmitDigest — the transcript/collision digest (packet ch5-P4, ADR-008)", () => {
  it("is deterministic and key-order-insensitive", () => {
    expect(deriveEmitDigest({ type: "PASS", payload: { a: 1, b: 2 } })).toBe(
      deriveEmitDigest({ type: "PASS", payload: { b: 2, a: 1 } }),
    );
  });

  it("is TYPE-inclusive — same payload under a different type digests differently", () => {
    expect(deriveEmitDigest({ type: "PASS", payload: { x: 1 } })).not.toBe(
      deriveEmitDigest({ type: "CONVERGED", payload: { x: 1 } }),
    );
  });

  it("absence is arity: absent payload ≠ null payload, absent == absent", () => {
    const absent = deriveEmitDigest({ type: "PASS" });
    expect(absent).not.toBe(deriveEmitDigest({ type: "PASS", payload: null }));
    expect(absent).toBe(deriveEmitDigest({ type: "PASS" }));
  });

  it("the string \"null\" payload is distinct from the null payload (canonical string rule)", () => {
    expect(deriveEmitDigest({ type: "PASS", payload: "null" })).not.toBe(
      deriveEmitDigest({ type: "PASS", payload: null }),
    );
  });

  it("is payload-sensitive", () => {
    expect(deriveEmitDigest({ type: "PASS", payload: { x: 1 } })).not.toBe(
      deriveEmitDigest({ type: "PASS", payload: { x: 2 } }),
    );
  });

  it("never shares a digest space with the payload-only op_id component", () => {
    const payload = { x: 1 };
    expect(deriveEmitDigest({ type: "PASS", payload })).not.toBe(digestPayload(payload));
  });

  it("throws loudly on a non-canonicalizable payload (the ingress regression guard)", () => {
    expect(() => deriveEmitDigest({ type: "PASS", payload: undefined })).toThrow(
      /not canonicalizable|undefined/,
    );
    expect(() => deriveEmitDigest({ type: "PASS", payload: -0 })).toThrow(/negative zero/);
  });
});

// packet ch9-p3b, H2: the newly-public `canonicalize` export — the ONE
// canonicalization authority the actor adapter materializes packet.json with.
describe("canonicalize (the public serializer export, H2)", () => {
  it("sorts object keys recursively (the handoff's stable byte form)", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ z: { y: 1, x: 2 }, a: 3 })).toBe('{"a":3,"z":{"x":2,"y":1}}');
  });

  it("byte-equality with the digest path's material (digestPayload = sha256 of these bytes)", () => {
    for (const payload of [
      { verdict: "approve", note: "ok" },
      { nested: { b: [1, 2], a: "x" } },
      "a string",
      42,
      [true, false, null],
    ]) {
      const bytes = canonicalize(payload);
      const viaCanonicalize = createHash("sha256").update(bytes, "utf8").digest("hex");
      expect(viaCanonicalize).toBe(digestPayload(payload));
    }
  });

  it("throws on a non-canonicalizable value (the shared admissibility predicate's basis)", () => {
    expect(() => canonicalize({ x: undefined })).toThrow(/not canonicalizable/);
    expect(() => canonicalize(() => 1)).toThrow(/not canonicalizable/);
  });
});
