import { describe, expect, it } from "vitest";

import { createFakeEgress } from "./fakeEgress.js";

describe("fake egress adapter (CHK-A2-IDEMKEY runtime witness)", () => {
  it("records every call WITH its idempotency key", async () => {
    const egress = createFakeEgress();
    await egress.send({ kind: "notify", payload: { n: 1 } }, "key-1");
    await egress.send({ kind: "notify", payload: { n: 2 } }, "key-2");

    expect(egress.calls).toHaveLength(2);
    expect(egress.calls[0]).toEqual({
      effect: { kind: "notify", payload: { n: 1 } },
      idempotencyKey: "key-1",
    });
    expect(egress.calls[1]?.idempotencyKey).toBe("key-2");
  });

  it("acks confirmed by default", async () => {
    const egress = createFakeEgress();
    await expect(egress.send({ kind: "x", payload: null }, "k")).resolves.toEqual({
      status: "confirmed",
    });
  });

  it("plays a scripted ack once, then returns to the default (IC-A2 no-ack is non-terminal, not success)", async () => {
    const egress = createFakeEgress();
    egress.scriptNextAck({ status: "no_ack" });
    await expect(egress.send({ kind: "x", payload: null }, "k1")).resolves.toEqual({
      status: "no_ack",
    });
    await expect(egress.send({ kind: "x", payload: null }, "k2")).resolves.toEqual({
      status: "confirmed",
    });
  });

  it("plays multiple scripted acks in order", async () => {
    const egress = createFakeEgress();
    egress.scriptNextAck({ status: "failed", reason: "boom" });
    egress.scriptNextAck({ status: "no_ack" });
    await expect(egress.send({ kind: "x", payload: null }, "k1")).resolves.toEqual({
      status: "failed",
      reason: "boom",
    });
    await expect(egress.send({ kind: "x", payload: null }, "k2")).resolves.toEqual({
      status: "no_ack",
    });
  });
});
