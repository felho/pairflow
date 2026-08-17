import { describe, expect, it } from "vitest";

import type { InstanceDetail } from "../ports/store.js";

import { canonicalize, replayDigest } from "./replayDigest.js";

/**
 * The instrument's own selftest. It ships in the same commit as the
 * hook because a measuring instrument whose fixtures run later is a
 * baseline nobody checked — and the receipt for this commit reads the
 * runner's per-file summary (passed > 0, skipped = 0), never an exit
 * code, so every case here must actually execute.
 *
 * What is proven: STABILITY (the same detail digests the same),
 * SENSITIVITY (any field that moves moves the digest), GRAIN
 * SEPARATION (the two halves are independent), and REFUSAL (a value
 * the form cannot represent throws instead of being dropped).
 */

const detail = (instance: unknown, transcript: readonly unknown[]): InstanceDetail =>
  ({ instance, transcript }) as unknown as InstanceDetail;

describe("canonicalize", () => {
  it("is independent of key insertion order", () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
    expect(canonicalize({ outer: { x: 1, y: 2 } })).toBe(canonicalize({ outer: { y: 2, x: 1 } }));
  });

  it("does NOT alias an absent key onto a key set to undefined", () => {
    // the aliasing class, at the digest's own grain: these are
    // different shapes and a digest that equates them greens on a
    // change between them
    expect(canonicalize({ a: undefined })).not.toBe(canonicalize({}));
  });

  it("does NOT alias across types", () => {
    expect(canonicalize("1")).not.toBe(canonicalize(1));
    expect(canonicalize(null)).not.toBe(canonicalize(undefined));
    expect(canonicalize(0)).not.toBe(canonicalize(false));
    expect(canonicalize([])).not.toBe(canonicalize({}));
    expect(canonicalize(-0)).not.toBe(canonicalize(0));
  });

  it("preserves array ORDER, because seq order is the claim", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });

  it("REFUSES what it cannot represent instead of dropping it", () => {
    expect(() => canonicalize(Number.NaN)).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(Number.POSITIVE_INFINITY)).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(() => 1)).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(10n)).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(Symbol("s"))).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(new Date(0))).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize(new Map())).toThrow(/cannot be canonicalized/);
    expect(() => canonicalize({ [Symbol("k")]: 1 })).toThrow(/cannot be canonicalized/);
  });

  it("REFUSES a cycle rather than looping or truncating", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalize(cyclic)).toThrow(/cycle/);
  });

  it("does not leave a sibling wrongly marked as a cycle", () => {
    const shared = { s: 1 };
    expect(() => canonicalize({ left: shared, right: shared })).not.toThrow();
  });
});

describe("replayDigest", () => {
  const base = detail({ id: "i1", version: 3 }, [{ seq: 1, kind: "transition" }]);

  it("is STABLE across equal details built independently", () => {
    const other = detail({ version: 3, id: "i1" }, [{ kind: "transition", seq: 1 }]);
    expect(replayDigest(other)).toStrictEqual(replayDigest(base));
  });

  it("moves the TRANSCRIPT grain when a committed row changes", () => {
    const moved = detail({ id: "i1", version: 3 }, [{ seq: 1, kind: "fact" }]);
    expect(replayDigest(moved).transcript).not.toBe(replayDigest(base).transcript);
  });

  it("moves the TRANSCRIPT grain when a row is added", () => {
    const grown = detail({ id: "i1", version: 3 }, [
      { seq: 1, kind: "transition" },
      { seq: 2, kind: "transition" },
    ]);
    expect(replayDigest(grown).transcript).not.toBe(replayDigest(base).transcript);
  });

  it("moves the INSTANCE grain when the instance record changes", () => {
    const bumped = detail({ id: "i1", version: 4 }, [{ seq: 1, kind: "transition" }]);
    expect(replayDigest(bumped).instance).not.toBe(replayDigest(base).instance);
  });

  it("keeps the two grains INDEPENDENT — neither carries the other", () => {
    const instanceOnly = detail({ id: "i1", version: 4 }, [{ seq: 1, kind: "transition" }]);
    const transcriptOnly = detail({ id: "i1", version: 3 }, [{ seq: 1, kind: "fact" }]);
    expect(instanceOnly).toBeDefined();
    expect(replayDigest(instanceOnly).transcript).toBe(replayDigest(base).transcript);
    expect(replayDigest(transcriptOnly).instance).toBe(replayDigest(base).instance);
  });

  it("yields a sha256-shaped hex digest at both grains", () => {
    const pair = replayDigest(base);
    expect(pair.transcript).toMatch(/^[0-9a-f]{64}$/);
    expect(pair.instance).toMatch(/^[0-9a-f]{64}$/);
    expect(pair.transcript).not.toBe(pair.instance);
  });
});
