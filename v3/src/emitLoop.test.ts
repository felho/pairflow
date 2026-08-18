import { createStaticProviderRegistry } from "./ports/index.js";
import { createScriptedProcessGateRunner } from "./testkit/index.js";
import { describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
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
import { admitTemplate } from "./definition/index.js";
import { createGateRegistry } from "./gates/index.js";

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

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
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions: fixtureDefinitionStore(admit(fixtureTemplate())),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
  return { handle, kernel, ingress, store: handle.store };
}

function emitRaw(
  opId: string,
  type: string,
  actorId: string,
  expectedVersion: number,
  payload: unknown,
  expectedRole: string,
) {
  return { instanceId: "inst-1", opId, type, actorId, expectedVersion, expectedRole, payload };
}

async function started(kernel: ReturnType<typeof wire>["kernel"]) {
  const created = await kernel.create({
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "ship it",
  });
  expect(created.kind).toBe("created");
  const startOutcome = await kernel.start({ instanceId: "inst-1", opId: "op-start" });
  expect(startOutcome.kind).toBe("activated");
  return startOutcome;
}

describe("CT-A3-RETRANS — resend-without-ack reuses the op_id → Duplicate (IC-A3)", () => {
  it("the same packet identity + payload reproduces the op_id; the kernel answers Duplicate, one row", async () => {
    const { kernel, ingress, store, handle } = wire();
    await started(kernel);

    const payload = { ref: "diff-1" };
    const first = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload,
    });
    const retransmitted = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload,
    });
    expect(retransmitted.opId).toBe(first.opId);

    // The scripted actor plays the send and the ack-less resend.
    const actor = createScriptedActor([
      emitRaw(first.opId, "PASS", "codex", 2, payload, "implementer"),
      emitRaw(retransmitted.opId, "PASS", "codex", 2, payload, "implementer"),
    ]);
    const outcomes = (await actor.play((raw) => ingress.submit(raw))) as Outcome[];
    expect(outcomes.map((o) => o.kind)).toEqual(["committed", "duplicate"]);

    // The transcript now opens with the seq-1 STARTED fact; the single
    // committed transition follows at seq 2.
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(2);
    expect(detail?.transcript[0]).toMatchObject({ entryKind: "STARTED", opId: "op-start" });
    const commit = detail?.transcript[1];
    expect(commit?.entryKind === "transition" && commit.envelope.opId).toBe(first.opId);
    handle.close();
  });
});

describe("CT-A3-EMITLIB-REFRESH — a refresh after Stale is a NEW logical op (IC-A3)", () => {
  it("stale emit → Stale(v); the fresh-packet re-emit derives a new op_id and commits; the rejection consumed nothing", async () => {
    const { kernel, ingress, store, handle } = wire();
    await started(kernel);

    // Two actors derived their emits from the SAME v2 packet (the
    // activation commit is v2; the first dispatch is expectedVersion 2).
    const winner = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload: { ref: "winner" },
    });
    const loser = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload: { ref: "loser" },
    });

    expect((await ingress.submit(emitRaw(winner.opId, "PASS", "codex", 2, { ref: "winner" }, "implementer"))).kind).toBe(
      "committed",
    );
    const stale = await ingress.submit(emitRaw(loser.opId, "PASS", "codex", 2, { ref: "loser" }, "implementer"));
    expect(stale).toEqual({ kind: "stale", currentVersion: 3 });

    // Refresh: a NEW context packet (v3) → new op_id BY CONSTRUCTION.
    const refreshed = deriveActorEmitOpId({
      instanceId: "inst-1",
      contextPacketId: "inst-1@v3",
      opType: "PASS",
      payload: { ref: "loser" },
    });
    expect(refreshed.opId).not.toBe(loser.opId);

    const committed = await ingress.submit(
      emitRaw(refreshed.opId, "PASS", "claude", 3, { ref: "loser" }, "reviewer"),
    );
    expect(committed.kind).toBe("committed");

    // The stale attempt never consumed its key: the seq-1 STARTED fact
    // then exactly the two commits.
    const detail = await store.getInstanceDetail("inst-1");
    expect(
      detail?.transcript.map((entry) =>
        entry.entryKind === "transition"
          ? entry.envelope.opId
          : entry.entryKind === "DECISION_REQUEST"
            ? entry.requestRef
            : entry.opId,
      ),
    ).toEqual(["op-start", winner.opId, refreshed.opId]);
    expect(detail?.instance.version).toBe(4);
    handle.close();
  });
});

// ── packet ch11-P1 (X4): emit identity is UNTOUCHED — expectedRole is
// context authority, never operation identity. ──

describe("X4 — derived op_ids are role-independent", () => {
  it("the same packet identity + payload derives the same op_id regardless of the role claim, and a role-differing retransmission is a duplicate", async () => {
    const { kernel, store } = wire();
    await started(kernel);
    const identity = {
      instanceId: "inst-1",
      contextPacketId: "inst-1@v2",
      opType: "PASS",
      payload: { ref: "d" },
    };
    const first = deriveActorEmitOpId(identity);
    const second = deriveActorEmitOpId(identity);
    expect(second.opId).toBe(first.opId);
    const committed = await kernel.handle(
      emitRaw(first.opId, "PASS", "codex", 2, { ref: "d" }, "implementer"),
    );
    expect(committed.kind).toBe("committed");
    // Retransmission under the SAME op_id with a DIFFERENT role claim:
    // the digest covers type+payload only → duplicate, never collision.
    const retransmitted = await kernel.handle(
      emitRaw(first.opId, "PASS", "codex", 2, { ref: "d" }, "reviewer"),
    );
    expect(retransmitted).toEqual({ kind: "duplicate" });
    // The seq-1 STARTED fact then the single committed transition.
    const detail = await store.getInstanceDetail("inst-1");
    expect(detail?.transcript).toHaveLength(2);
  });
});
