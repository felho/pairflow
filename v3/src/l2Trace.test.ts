import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import { createControlledClock, fixtureDefinitionStore, replayTrace } from "./testkit/index.js";
import type { TraceFixture } from "./testkit/index.js";

/**
 * The l2 chapter trace as a golden test (packet ch11-P2b, T3 — the
 * 08-l2 Runtime trace verbatim as a committed-row sequence): a gated
 * pipeline at (review, CONVERGED) blocks in round 1 (threshold
 * `round >= 2` → `round_below_min`) and allows in round 2 through BOTH
 * evaluators end-to-end (dimension 11). AT-LEVEL: `expectedRole` and
 * `expectedVersion` explicit on every emit, no lift (the l1Trace
 * precedent). The gated template is DIRECTLY CONSTRUCTED and admitted
 * through `admitTemplate` + `createGateRegistry()` — the FILE format
 * carries no `gates` key until P4 (the ch8 V8 unknown-key rejection
 * stands; T3), so this ingress-seam replay is the deepest shipped seam
 * a gated template can reach.
 */
const catalog = createGateRegistry();

const gatedTemplate: WorkflowTemplate = {
  ref: { id: "local-pair-v0", version: 1 },
  start: "implement",
  steps: {
    implement: { role: "implementer", instruction: "build it", transitions: { PASS: "review" } },
    review: {
      role: "reviewer",
      instruction: "review it",
      transitions: { PASS: "implement", CONVERGED: "done" },
      // The ordered inline pipeline: first block stops, round not burned.
      gates: {
        CONVERGED: [
          { uses: "declarative.threshold", config: { metric: "round", op: ">=", value: 2 } },
          { uses: "pairflow.previous_reviewer_verdict", config: { required: true } },
        ],
      },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
};

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, catalog);
  if (!result.ok) {
    throw new Error(`l2 trace admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const l2Fixture: TraceFixture = {
  name: "l2 golden trace (at-level: explicit roles + versions, no lift)",
  steps: [
    {
      kind: "start",
      instanceId: "inst-l2",
      task: "converge the pair",
      expect: { currentStep: "implement", version: 1 },
    },
    // 1 · codex PASS on implement (ungated) → commit → review; round 1.
    {
      kind: "emit",
      opId: "op-1",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-1" },
      expectedVersion: 1,
      expectedRole: "implementer",
      expect: { kind: "committed", version: 2 },
    },
    // 2 · claude CONVERGED on review: threshold round 1 < 2 → BLOCK.
    //     No commit, version stays 2, still review, round 1, no row.
    {
      kind: "emit",
      opId: "op-2",
      type: "CONVERGED",
      actorId: "claude",
      payload: { note: "claude:op-2" },
      expectedVersion: 2,
      expectedRole: "reviewer",
      expect: { kind: "rejected", reason: "gate_blocked" },
    },
    // 3 · claude PASS on review (pass back, ungated) → commit → implement;
    //     target = template.start ⇒ round advances to 2.
    {
      kind: "emit",
      opId: "op-3",
      type: "PASS",
      actorId: "claude",
      payload: { note: "claude:op-3" },
      expectedVersion: 2,
      expectedRole: "reviewer",
      expect: { kind: "committed", version: 3 },
    },
    // 4 · codex PASS on implement (ungated) → commit → review; round 2.
    {
      kind: "emit",
      opId: "op-4",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-4" },
      expectedVersion: 3,
      expectedRole: "implementer",
      expect: { kind: "committed", version: 4 },
    },
    // 5 · claude CONVERGED on review: threshold round 2 >= 2 allow →
    //     previous_reviewer_verdict sees the step-3 review PASS in
    //     history → allow → commit → done (terminal).
    {
      kind: "emit",
      opId: "op-5",
      type: "CONVERGED",
      actorId: "claude",
      payload: { note: "claude:op-5" },
      expectedVersion: 4,
      expectedRole: "reviewer",
      expect: { kind: "committed", version: 5 },
    },
  ],
  finalTranscript: [
    [1, "op-1"],
    [2, "op-3"],
    [3, "op-4"],
    [4, "op-5"],
  ],
  finalState: { currentStep: "done", round: 2, status: "DONE", version: 5 },
};

describe("l2 golden trace — the gate rung + both evaluators end-to-end (08-l2 Runtime)", () => {
  it("replays the model's block-then-allow sequence and matches committed rows + gate provenance", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    const kernel = createKernel({
      store: handle.store,
      definitions: fixtureDefinitionStore(admit(gatedTemplate)),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });

    // replayTrace throws on any outcome/state/transcript mismatch AND
    // runs runAllCheckers at the end (the consistency belt green).
    const result = await replayTrace(l2Fixture, {
      submit: (raw) => ingress.submit(raw),
      start: (input) => kernel.startInstance(input),
      store: handle.store,
      template: gatedTemplate,
    });

    // Supplemental (from finalDetail): the ungated rows carry [], the
    // final CONVERGED row carries EXACTLY the two allow decisions in
    // authored order — allow carries no optional fields (G4/G6).
    const rows = result.finalDetail.transcript;
    expect(rows.map((r) => r.gateDecisions)).toEqual([
      [],
      [],
      [],
      [
        { uses: "declarative.threshold", verdict: "allow" },
        { uses: "pairflow.previous_reviewer_verdict", verdict: "allow" },
      ],
    ]);

    // Supplemental (from ReplayResult.outcomes): the step-2 blocked
    // outcome's gateReason is round_below_min (a blocked step commits no
    // row — the harness ExpectedOutcome carries `reason` only, so the
    // gateReason assert reads the outcomes array).
    const blocked = result.outcomes[2] as Outcome;
    expect(blocked).toEqual({ kind: "rejected", reason: "gate_blocked", gateReason: "round_below_min" });

    handle.close();
  });
});
