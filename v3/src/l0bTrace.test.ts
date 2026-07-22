import { createStaticProviderRegistry } from "./ports/index.js";
import { createScriptedProcessGateRunner } from "./testkit/index.js";
import { describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "./diag/index.js";
import type { Activated, AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
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
      opId: "op-start",
      expect: { currentStep: "implement", version: 2 },
    },
    { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", payload: { note: "codex:a1" }, expectedVersion: 2, expect: { kind: "committed", version: 3 } },
    { kind: "emit", opId: "b2", type: "PASS", actorId: "claude", payload: { note: "claude:b2" }, expectedVersion: 3, expect: { kind: "committed", version: 4 } },
    // OLD packet, NEW op: actor-supplied stale intent → Stale(4), no row.
    { kind: "emit", opId: "c3", type: "PASS", actorId: "codex", payload: { note: "codex:c3" }, expectedVersion: 3, expect: { kind: "stale", currentVersion: 4 } },
    { kind: "emit", opId: "c4", type: "PASS", actorId: "codex", payload: { note: "codex:c4" }, expectedVersion: 4, expect: { kind: "committed", version: 5 } },
    { kind: "emit", opId: "d5", type: "CONVERGED", actorId: "claude", payload: { note: "claude:d5" }, expectedVersion: 5, expect: { kind: "committed", version: 6 } },
  ],
  finalTranscript: [
    [1, "op-start"],
    [2, "a1"],
    [3, "b2"],
    [4, "c4"],
    [5, "d5"],
  ],
  finalState: {
    currentStep: "done",
    round: 2,
    kernelStatus: "TERMINAL",
    terminalDisposition: "done",
    version: 6,
  },
};

describe("l0b golden trace — the walking skeleton end-to-end (on the harness)", () => {
  it("replays the model's six steps and matches the committed rows", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    // ch11-P4: the round-2 golden rides the fixture's OWN round declaration
    // (Y2) — the P2c staging wrapper has collapsed. ONE admitted value feeds
    // BOTH the definition store and the harness seam (T1).
    const admitted = admit(fixtureTemplate());
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    const floor = createFloor(handle.store);

    const result = await replayTrace(l0bFixture, {
      submit: (raw) => ingress.submit(raw),
      create: (input) => kernel.create(input),
      start: (input) => kernel.start(input),
      store: handle.store,
      template: admitted,
    });

    // ── Supplemental block (packet ch5-P3): everything the declarative
    // fixture does not carry, on the RETURNED outcomes + finalDetail. ──

    // START: binding snapshot, intent derived AFTER the commit.
    const started = result.outcomes[0] as Activated;
    expect(started.intent.actor).toBe("codex");
    expect(started.intent.packet).toMatchObject({
      expectedVersion: 2,
      instruction: "build it",
      availableOps: ["PASS"],
    });
    expect(started.intent.packet).not.toHaveProperty("handoff");

    // The stale outcome is EXACTLY {kind, currentVersion} — no extras.
    expect(result.outcomes[3]).toEqual({ kind: "stale", currentVersion: 4 });

    // The dispatch loop: every non-terminal commit derives the next
    // intent from COMMITTED state; the terminal commit derives none.
    const committed = result.outcomes
      .slice(1)
      .filter(
        (o): o is Extract<Outcome, { kind: "committed" }> => o.kind === "committed",
      );
    expect(committed.map((o) => o.version)).toEqual([3, 4, 5, 6]);
    expect(committed.map((o) => o.intent?.actor ?? null)).toEqual([
      "claude",
      "codex",
      "claude",
      null,
    ]);
    expect(committed[0]?.intent?.packet).toMatchObject({
      expectedVersion: 3,
      instruction: "review it",
      availableOps: ["PASS", "CONVERGED"],
      handoff: { note: "codex:a1" },
    });

    // commit ≠ deliver: intents were RETURN VALUES; the transcript holds
    // envelopes only — the shape check rides finalDetail.transcript
    // transition rows (the seq-1 STARTED fact carries no envelope).
    for (const entry of result.finalDetail.transcript) {
      if (entry.entryKind !== "transition") continue;
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
