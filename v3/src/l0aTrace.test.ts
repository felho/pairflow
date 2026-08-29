import { createStaticProviderRegistry } from "./ports/index.js";
import { createScriptedProcessGateRunner } from "./testkit/index.js";
import { describe, expect, it } from "vitest";

import { deriveEmitDigest } from "./emit/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import type { StoreHandle } from "./store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
  replayTrace,
} from "./testkit/index.js";
import type { AdmittedTemplate, WorkflowTemplate } from "./domain/index.js";
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
import type { TraceFixture, TraceSeams } from "./testkit/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";

/**
 * The l0a chapter trace as a golden test (packet ch5-P3, traces 2/20):
 * the model's two-round run WITH the 3′ redelivery, LIFTED onto the
 * L0b kernel — the lift supplies only expectedVersion (tracked from
 * the running version); the redelivery still expects Duplicate, because
 * the contract's check order puts idempotency before staleness. The
 * real-kernel harness negatives (claim dimensions 1–3 + 5) live here
 * too: the testkit boundary bans wiring a kernel inside the kit.
 */
function wire(): { seams: TraceSeams; handle: StoreHandle } {
  const handle = openStore(":memory:", createControlledClock(1_000));
  // ch11-P4: the round-2 golden rides the fixture's OWN round declaration
  // (Y2 — `fixtureTemplate()` now carries `advanceOnArrivalAt: [implement]`),
  // so the P2c staging wrapper has collapsed. ONE admitted value feeds BOTH
  // the definition store and the harness seam (T1).
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
  return {
    seams: {
      submit: (raw) => ingress.submit(raw),
      create: (input) => kernel.create(input),
      start: (input) => kernel.start(input),
      submitIntent: (raw) => ingress.submitIntent(raw),
      store: handle.store,
      template: admitted,
    },
    handle,
  };
}

/** The park's request ref under the controlled clock at 1_000 — the
 * run's FIRST minted request, so a computable literal. */
const R = "req-1000-1";

const l0aFixture: TraceFixture = {
  name: "l0a concrete trace (lifted)",
  lift: { expectedVersion: "track-running-version", expectedRole: "supply-current-step-role" },
  steps: [
    {
      kind: "start",
      instanceId: "inst-a",
      task: "converge on the second review",
      opId: "op-start",
      expect: { currentStep: "implement", version: 2 },
    },
    { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", payload: { ref: "diff-1" }, expect: { kind: "committed", version: 3 } },
    // 3′ — the same PASS re-delivered (retry, op_id=a1): Duplicate,
    // no second row. The lift hands it the CURRENT version, and the
    // duplicate check still wins (order: duplicate before stale).
    { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", payload: { ref: "diff-1" }, expect: { kind: "duplicate" } },
    { kind: "emit", opId: "b2", type: "PASS", actorId: "claude", payload: { note: "findings" }, expect: { kind: "committed", version: 4 } },
    { kind: "emit", opId: "c3", type: "PASS", actorId: "codex", expect: { kind: "committed", version: 5 } },
    // ch14-p3b: CONVERGED now PARKS at the shipped `human_approval`
    // gate — the transition row and the park's DECISION_REQUEST commit
    // together.
    { kind: "emit", opId: "d4", type: "CONVERGED", actorId: "claude", expect: { kind: "committed", version: 6 } },
    // The trace's terminal arrival is RESTATED against the new route:
    // the bound operator approves (agreeing with the shipped edge's
    // recommendation, so no override applies) and COMMIT reaches `done`.
    { kind: "submit-decision", opId: "e5", requestRef: R, verdict: "approve", by: "human", expect: { kind: "committed", version: 7 } },
    { kind: "resume-wait", opId: "f6", type: "COMMIT", expect: { kind: "committed", version: 8 } },
  ],
  finalTranscript: [
    [1, "op-start"],
    [2, "a1"],
    [3, "b2"],
    [4, "c3"],
    [5, "d4"],
    // The DECISION_REQUEST row is OP-LESS and correlates by request ref.
    [6, R],
    [7, "e5"],
    [8, "f6"],
  ],
  finalState: {
    currentStep: "done",
    round: 2,
    kernelStatus: "TERMINAL",
    terminalDisposition: "done",
    version: 8,
  },
};

function variant(patch: Partial<TraceFixture>): TraceFixture {
  return { ...l0aFixture, ...patch, name: `${l0aFixture.name} (negative)` };
}

describe("l0a golden trace on the harness", () => {
  it("replays the model's steps — four rows, Duplicate at 3′, round 2, DONE", async () => {
    const { seams, handle } = wire();
    const result = await replayTrace(l0aFixture, seams);
    expect(result.outcomes).toHaveLength(8);
    handle.close();
  });
});

describe("harness negatives against the real kernel (claim dimensions 1–3, 5)", () => {
  it("dimension 1: a wrong committed version fails red", async () => {
    const { seams, handle } = wire();
    const steps = [...l0aFixture.steps];
    steps[1] = { ...steps[1], expect: { kind: "committed", version: 4 } } as (typeof steps)[1];
    await expect(replayTrace(variant({ steps }), seams)).rejects.toThrow(/committed version/);
    handle.close();
  });

  it("dimension 1: a wrong outcome KIND fails red", async () => {
    const { seams, handle } = wire();
    const steps = [...l0aFixture.steps];
    steps[1] = { ...steps[1], expect: { kind: "stale", currentVersion: 3 } } as (typeof steps)[1];
    await expect(replayTrace(variant({ steps }), seams)).rejects.toThrow(/outcome kind/);
    handle.close();
  });

  it("dimension 2: a missing final-transcript row fails red", async () => {
    const { seams, handle } = wire();
    const truncated = variant({
      finalTranscript: [
        [1, "op-start"],
        [2, "a1"],
        [3, "b2"],
        [4, "c3"],
        [5, "d4"],
        [6, R],
        [7, "e5"],
      ],
    });
    await expect(replayTrace(truncated, seams)).rejects.toThrow(/final transcript/);
    handle.close();
  });

  it("dimension 3: a wrong final state fails red", async () => {
    const { seams, handle } = wire();
    const wrongRound = variant({
      finalState: { ...l0aFixture.finalState, round: 1 },
    });
    await expect(replayTrace(wrongRound, seams)).rejects.toThrow(/final state/);
    handle.close();
  });

  it("dimension 5: the lift cannot weaken the redelivery — expecting committed there fails red", async () => {
    const { seams, handle } = wire();
    const steps = [...l0aFixture.steps];
    steps[2] = { ...steps[2], expect: { kind: "committed", version: 4 } } as (typeof steps)[2];
    await expect(replayTrace(variant({ steps }), seams)).rejects.toThrow(/outcome kind/);
    handle.close();
  });
});
