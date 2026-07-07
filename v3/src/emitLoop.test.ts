import { describe, expect, it } from "vitest";

import type { Outcome } from "./domain/index.js";
import { deriveActorEmitOpId, deriveEmitDigest } from "./emit/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedActor,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "./testkit/index.js";

/**
 * CT-A3-RETRANS + CT-A3-EMITLIB-REFRESH (packet ch5-P5): the emit-lib's
 * kernel-facing halves, against the REAL walking skeleton. The
 * context-packet identity is the caller's stable string — here
 * `<instanceId>@v<expectedVersion>`, the packet the emit was derived
 * FROM; a refresh after Stale starts from a NEW packet and derives a
 * new op_id BY CONSTRUCTION (ADR-004), while a retransmission reuses
 * the old one byte-for-byte.
 */
function wire() {
  const handle = openStore(":memory:", createControlledClock(1_000));
  const kernel = createKernel({
    store: handle.store,
    definitions: fixtureDefinitionStore(fixtureTemplate()),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
  });
  const ingress = createIngress(kernel);
  return { handle, kernel, ingress, store: handle.store };
}

function emitRaw(opId: string, type: string, actorId: string, expectedVersion: number, payload: unknown) {
  return { instanceId: "inst-1", opId, type, actorId, expectedVersion, payload };
}

async function started(kernel: ReturnType<typeof wire>["kernel"]) {
  return kernel.startInstance({
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "ship it",
  });
}

describe("CT-A3-RETRANS — resend-without-ack reuses the op_id → Duplicate (IC-A3)", () => {
  it("the same packet identity + payload reproduces the op_id; the kernel answers Duplicate, one row", async () => {
    const { kernel, ingress, store, handle } = wire();
    await started(kernel);

    const payload = { ref: "diff-1" };
    const first = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v1",
      opType: "PASS",
      payload,
    });
    const retransmitted = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v1",
      opType: "PASS",
      payload,
    });
    expect(retransmitted.opId).toBe(first.opId);

    // The scripted actor plays the send and the ack-less resend.
    const actor = createScriptedActor([
      emitRaw(first.opId, "PASS", "codex", 1, payload),
      emitRaw(retransmitted.opId, "PASS", "codex", 1, payload),
    ]);
    const outcomes = (await actor.play((raw) => ingress.submit(raw))) as Outcome[];
    expect(outcomes.map((o) => o.kind)).toEqual(["committed", "duplicate"]);

    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(1);
    expect(detail?.transcript[0]?.envelope.opId).toBe(first.opId);
    handle.close();
  });
});

describe("CT-A3-EMITLIB-REFRESH — a refresh after Stale is a NEW logical op (IC-A3)", () => {
  it("stale emit → Stale(v); the fresh-packet re-emit derives a new op_id and commits; the rejection consumed nothing", async () => {
    const { kernel, ingress, store, handle } = wire();
    await started(kernel);

    // Two actors derived their emits from the SAME v1 packet.
    const winner = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v1",
      opType: "PASS",
      payload: { ref: "winner" },
    });
    const loser = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v1",
      opType: "PASS",
      payload: { ref: "loser" },
    });

    expect((await ingress.submit(emitRaw(winner.opId, "PASS", "codex", 1, { ref: "winner" }))).kind).toBe(
      "committed",
    );
    const stale = await ingress.submit(emitRaw(loser.opId, "PASS", "codex", 1, { ref: "loser" }));
    expect(stale).toEqual({ kind: "stale", currentVersion: 2 });

    // Refresh: a NEW context packet (v2) → new op_id BY CONSTRUCTION.
    const refreshed = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload: { ref: "loser" },
    });
    expect(refreshed.opId).not.toBe(loser.opId);

    const committed = await ingress.submit(
      emitRaw(refreshed.opId, "PASS", "claude", 2, { ref: "loser" }),
    );
    expect(committed.kind).toBe("committed");

    // The stale attempt never consumed its key: exactly the two commits.
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((entry) => entry.envelope.opId)).toEqual([
      winner.opId,
      refreshed.opId,
    ]);
    expect(detail?.instance.version).toBe(3);
    handle.close();
  });
});
