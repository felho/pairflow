import { describe, expect, it } from "vitest";

import { createScriptedActor } from "./scriptedActor.js";

describe("scripted actor (the ch-5 golden-trace engine)", () => {
  it("plays the script in order against the injected deliver seam", async () => {
    const delivered: unknown[] = [];
    const actor = createScriptedActor(["e1", "e2", "e3"]);

    const outcomes = await actor.play((envelope) => {
      delivered.push(envelope);
      return Promise.resolve(`ack:${String(envelope)}`);
    });

    expect(delivered).toEqual(["e1", "e2", "e3"]);
    expect(outcomes).toEqual(["ack:e1", "ack:e2", "ack:e3"]);
  });

  it("delivers strictly sequentially — a step sees the previous outcome committed", async () => {
    const order: string[] = [];
    const actor = createScriptedActor(["a", "b"]);

    await actor.play(async (envelope) => {
      order.push(`start:${String(envelope)}`);
      await Promise.resolve();
      order.push(`end:${String(envelope)}`);
      return null;
    });

    expect(order).toEqual(["start:a", "end:a", "start:b", "end:b"]);
  });

  it("propagates a deliver failure and stops the script", async () => {
    const delivered: unknown[] = [];
    const actor = createScriptedActor(["ok", "boom", "never"]);

    await expect(
      actor.play((envelope) => {
        delivered.push(envelope);
        if (envelope === "boom") {
          return Promise.reject(new Error("deliver failed"));
        }
        return Promise.resolve(null);
      }),
    ).rejects.toThrow("deliver failed");
    expect(delivered).toEqual(["ok", "boom"]);
  });
});
