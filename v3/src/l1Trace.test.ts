import { createStaticProviderRegistry } from "./ports/index.js";
import { createScriptedProcessGateRunner } from "./testkit/index.js";
import { describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "./diag/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
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
import type { TraceFixture } from "./testkit/index.js";

/**
 * The l1 chapter trace as a golden test (packet ch11-P1, T1/T4 — the
 * 07-l1 Runtime trace verbatim as an executable expectation): the
 * happy path plus a wrong-role emit rejected BEFORE any state change.
 * AT-LEVEL: `expectedRole` explicit on every emit, no lift. The
 * harness asserts full-instance equality after the rejected step
 * (A11 as trace-level execution); `runAllCheckers` green at the end
 * is the consistency belt, never the equality proof.
 */
/** The park's request ref under the controlled clock at 1_000 — the
 * run's FIRST minted request, so a computable literal. */
const R = "req-1000-1";

const l1Fixture: TraceFixture = {
  name: "l1 golden trace (at-level: explicit roles, no lift)",
  steps: [
    {
      kind: "start",
      instanceId: "inst-l1",
      task: "ship the feature",
      opId: "op-start",
      expect: { currentStep: "implement", version: 2 },
    },
    // 1 · codex emits PASS on implement: role implementer = implement.role ✓
    //     · PASS is a transition ✓ · capability allows ✓ → commit → review
    {
      kind: "emit",
      opId: "op-1",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-1" },
      expectedVersion: 2,
      expectedRole: "implementer",
      expect: { kind: "committed", version: 3 },
    },
    // 2 · a stray emit on review claims implementer: review.role is
    //     reviewer → Rejected(role_not_authorized); no append, v stays 3.
    {
      kind: "emit",
      opId: "op-2",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-2" },
      expectedVersion: 3,
      expectedRole: "implementer",
      expect: { kind: "rejected", reason: "role_not_authorized" },
    },
    // 3 · claude emits CONVERGED as reviewer → commit review → the
    //     shipped `human_approval` gate (ch14-p3b): the run PARKS rather
    //     than terminating, and the park's DECISION_REQUEST rides the
    //     same commit.
    {
      kind: "emit",
      opId: "op-3",
      type: "CONVERGED",
      actorId: "claude",
      payload: { note: "claude:op-3" },
      expectedVersion: 3,
      expectedRole: "reviewer",
      expect: { kind: "committed", version: 4 },
    },
    // 4 · the bound operator approves — the verdict AGREES with the
    //     shipped edge's recommendation, so no override applies — and
    //     the run parks at the `commit_pending` wait.
    {
      kind: "submit-decision",
      opId: "op-4",
      expectedVersion: 4,
      requestRef: R,
      verdict: "approve",
      by: "human",
      expect: { kind: "committed", version: 5 },
    },
    // 5 · COMMIT resumes the bare wait → done. The trace's terminal
    //     arrival is RESTATED here, never dropped.
    {
      kind: "resume-wait",
      opId: "op-5",
      expectedVersion: 5,
      type: "COMMIT",
      expect: { kind: "committed", version: 6 },
    },
  ],
  finalTranscript: [
    [1, "op-start"],
    [2, "op-1"],
    [3, "op-3"],
    // The DECISION_REQUEST row is OP-LESS and correlates by request ref.
    [4, R],
    [5, "op-4"],
    [6, "op-5"],
  ],
  finalState: {
    currentStep: "done",
    round: 1,
    kernelStatus: "TERMINAL",
    terminalDisposition: "done",
    version: 6,
  },
};

describe("l1 golden trace — role authority end-to-end (07-l1 Runtime)", () => {
  it("replays the model's three steps and matches the committed rows", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    // ch11-P2c T1: the seam narrowed to AdmittedTemplate — the l1 golden
    // is declaration-absent (round stays 1), so ONE admitted value (no
    // round declaration) feeds BOTH the definition store and the seam.
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

    const result = await replayTrace(l1Fixture, {
      submit: (raw) => ingress.submit(raw),
      create: (input) => kernel.create(input),
      start: (input) => kernel.start(input),
      submitIntent: (raw) => ingress.submitIntent(raw),
      store: handle.store,
      template: admitted,
    });

    // Supplemental: the terminal commit returns NO dispatch intent, and
    // the dispatched packets carry the role to echo (K1 — the l1
    // dispatch_intent delta).
    const startOutcome = result.outcomes[0];
    expect(startOutcome).toMatchObject({
      kind: "activated",
      intent: { actor: "codex", packet: { role: "implementer", expectedVersion: 2 } },
    });
    const firstCommit = result.outcomes[1];
    expect(firstCommit).toMatchObject({
      kind: "committed",
      version: 3,
      intent: { actor: "claude", packet: { role: "reviewer", expectedVersion: 3 } },
    });
    // The CONVERGED commit no longer terminates: it returns the ASK, so
    // the role echo the terminal-commit assertion used to carry moves to
    // the RESUME commit, which is where the run now reaches `done`.
    const parkCommit = result.outcomes[3];
    expect(parkCommit).toMatchObject({
      kind: "committed",
      version: 4,
      intent: { operator: "human", question: "The reviewer has converged. Decide how this run continues." },
    });
    const decisionCommit = result.outcomes[4];
    expect(decisionCommit).toMatchObject({ kind: "committed", version: 5, intent: null });
    const terminalCommit = result.outcomes[5];
    expect(terminalCommit).toMatchObject({ kind: "committed", version: 6, intent: null });
  });
});
