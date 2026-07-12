import { describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, Started, WorkflowTemplate } from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createFloor } from "./floor/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
  replayTrace,
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
import type { TraceFixture } from "./testkit/index.js";

/**
 * The l0b chapter trace as a golden test (packet ch4-P4; refactored
 * onto the ch5-P3 harness — trace ownership unchanged): the model's
 * six-step two-round run, including the Stale step, replayed through
 * the REAL walking skeleton. The fixture carries the declarative
 * expectations; the SUPPLEMENTAL block below keeps every assertion the
 * pre-harness test made — intent actor / ContextPacket fields /
 * handoff on the returned outcomes, the commit ≠ deliver envelope
 * shape on finalDetail.transcript. Nothing lost in the refactor.
 * Op ids are test literals; emit-lib-derived ids are ch-5 (CT-A3-*).
 */
const l0bFixture: TraceFixture = {
  name: "l0b golden trace (at-level, no lift)",
  lift: { expectedRole: "supply-current-step-role" },
  steps: [
    {
      kind: "start",
      instanceId: "inst-1",
      task: "ship the feature",
      expect: { currentStep: "implement", version: 1 },
    },
    { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", payload: { note: "codex:a1" }, expectedVersion: 1, expect: { kind: "committed", version: 2 } },
    { kind: "emit", opId: "b2", type: "PASS", actorId: "claude", payload: { note: "claude:b2" }, expectedVersion: 2, expect: { kind: "committed", version: 3 } },
    // OLD packet, NEW op: actor-supplied stale intent → Stale(3), no row.
    { kind: "emit", opId: "c3", type: "PASS", actorId: "codex", payload: { note: "codex:c3" }, expectedVersion: 2, expect: { kind: "stale", currentVersion: 3 } },
    { kind: "emit", opId: "c4", type: "PASS", actorId: "codex", payload: { note: "codex:c4" }, expectedVersion: 3, expect: { kind: "committed", version: 4 } },
    { kind: "emit", opId: "d5", type: "CONVERGED", actorId: "claude", payload: { note: "claude:d5" }, expectedVersion: 4, expect: { kind: "committed", version: 5 } },
  ],
  finalTranscript: [
    [1, "a1"],
    [2, "b2"],
    [3, "c4"],
    [4, "d5"],
  ],
  finalState: { currentStep: "done", round: 2, status: "DONE", version: 5 },
};

describe("l0b golden trace — the walking skeleton end-to-end (on the harness)", () => {
  it("replays the model's six steps and matches the committed rows", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    const kernel = createKernel({
      store: handle.store,
      definitions: fixtureDefinitionStore(admit(fixtureTemplate())),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    const floor = createFloor(handle.store);

    const result = await replayTrace(l0bFixture, {
      submit: (raw) => ingress.submit(raw),
      start: (input) => kernel.startInstance(input),
      store: handle.store,
      template: fixtureTemplate(),
    });

    // ── Supplemental block (packet ch5-P3): everything the declarative
    // fixture does not carry, on the RETURNED outcomes + finalDetail. ──

    // START: binding snapshot, intent derived AFTER the commit.
    const started = result.outcomes[0] as Started;
    expect(started.intent.actor).toBe("codex");
    expect(started.intent.packet).toMatchObject({
      expectedVersion: 1,
      instruction: "build it",
      availableOps: ["PASS"],
    });
    expect(started.intent.packet).not.toHaveProperty("handoff");

    // The stale outcome is EXACTLY {kind, currentVersion} — no extras.
    expect(result.outcomes[3]).toEqual({ kind: "stale", currentVersion: 3 });

    // The dispatch loop: every non-terminal commit derives the next
    // intent from COMMITTED state; the terminal commit derives none.
    const committed = result.outcomes
      .slice(1)
      .filter(
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

    // commit ≠ deliver: intents were RETURN VALUES; the transcript holds
    // envelopes only — the shape check rides finalDetail.transcript.
    for (const entry of result.finalDetail.transcript) {
      expect(Object.keys(entry.envelope).sort()).toEqual([
        "actorId",
        "expectedRole",
        "expectedVersion",
        "instanceId",
        "opId",
        "payload",
        "type",
      ]);
    }

    // The floor surface still answers (the pre-harness test's read).
    expect(await floor.listInstances()).toHaveLength(1);
    handle.close();
  });
});
