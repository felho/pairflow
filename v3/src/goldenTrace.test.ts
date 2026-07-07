import { describe, expect, it } from "vitest";

import type { Outcome } from "./domain/index.js";
import { createFloor } from "./floor/index.js";
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
 * The l0b chapter trace as a golden test (packet ch4-P4): the model's
 * six-step two-round run, including the Stale step, replayed through
 * the REAL walking skeleton — scripted actor → ingress → kernel →
 * SQLite → floor. The committed-row sequence must match the model's.
 * Op ids are test literals; emit-lib-derived ids are ch-5 (CT-A3-*).
 */
function raw(opId: string, actorId: string, type: string, expectedVersion: number) {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId,
    expectedVersion,
    payload: { note: `${actorId}:${opId}` },
  };
}

describe("l0b golden trace — the walking skeleton end-to-end", () => {
  it("replays the model's six steps and matches the committed rows", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    const kernel = createKernel({
      store: handle.store,
      definitions: fixtureDefinitionStore(fixtureTemplate()),
      time: createControlledClock(1_000),
    });
    const ingress = createIngress(kernel);
    const floor = createFloor(handle.store);

    // Step 1 — START_INSTANCE(local-pair-v0, task): binding snapshot,
    // create at implement, version 1; intent derived AFTER the commit.
    const started = await kernel.startInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "ship the feature",
    });
    expect(started.version).toBe(1);
    expect(started.intent.actor).toBe("codex");
    expect(started.intent.packet).toMatchObject({
      expectedVersion: 1,
      instruction: "build it",
      availableOps: ["PASS"],
    });
    expect(started.intent.packet).not.toHaveProperty("handoff");

    // Steps 2–6, played strictly in order by the scripted actor:
    //   2. codex PASS ev1        → commit implement→review (1→2)
    //   3. claude PASS ev2       → commit review→implement (2→3), round 2
    //   4. codex PASS ev2 (OLD packet, NEW op) → Stale(3), no row
    //   5. codex PASS ev3 (refreshed)          → commit (3→4)
    //   6. claude CONVERGED ev4  → commit review→done (4→5), DONE
    const actor = createScriptedActor([
      raw("a1", "codex", "PASS", 1),
      raw("b2", "claude", "PASS", 2),
      raw("c3", "codex", "PASS", 2),
      raw("c4", "codex", "PASS", 3),
      raw("d5", "claude", "CONVERGED", 4),
    ]);
    const outcomes = (await actor.play((envelope) => ingress.submit(envelope))) as Outcome[];

    expect(outcomes.map((o) => o.kind)).toEqual([
      "committed",
      "committed",
      "stale",
      "committed",
      "committed",
    ]);
    expect(outcomes[2]).toEqual({ kind: "stale", currentVersion: 3 });

    // The dispatch loop: every non-terminal commit derives the next
    // intent from COMMITTED state; the terminal commit derives none.
    const committed = outcomes.filter(
      (o): o is Extract<Outcome, { kind: "committed" }> => o.kind === "committed",
    );
    expect(committed.map((o) => o.version)).toEqual([2, 3, 4, 5]);
    expect(committed.map((o) => o.intent?.actor ?? null)).toEqual([
      "claude",
      "codex",
      "claude",
      null,
    ]);
    expect(committed[0]?.intent?.packet).toMatchObject({
      expectedVersion: 2,
      instruction: "review it",
      availableOps: ["PASS", "CONVERGED"],
      handoff: { note: "codex:a1" },
    });

    // Committed rows only (the floor): exactly a1, b2, c4, d5 — the
    // stale attempt c3 left NOTHING.
    const detail = await floor.getInstanceDetail("inst-1");
    expect(detail?.transcript.map((entry) => [entry.seq, entry.envelope.opId])).toEqual([
      [1, "a1"],
      [2, "b2"],
      [3, "c4"],
      [4, "d5"],
    ]);
    expect(detail?.instance).toMatchObject({
      currentStep: "done",
      status: "DONE",
      version: 5,
      round: 2,
    });
    expect(await floor.listInstances()).toHaveLength(1);

    // commit ≠ deliver: intents were RETURN VALUES; the transcript holds
    // envelopes only, and no adapter exists in the wiring to deliver to.
    for (const entry of detail?.transcript ?? []) {
      expect(Object.keys(entry.envelope).sort()).toEqual([
        "actorId",
        "expectedVersion",
        "instanceId",
        "opId",
        "payload",
        "type",
      ]);
    }
    handle.close();
  });
});
