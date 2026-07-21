import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import type { ProcessResult } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
  replayTrace,
} from "./testkit/index.js";
import type { TraceFixture } from "./testkit/index.js";

/**
 * The l2a chapter trace as a golden test (packet ch11-P3b, T3 — the 09-l2a
 * Runtime trace: "an implementer PASS gated by the repo's test command: a
 * clean run, a failing test, and a runner error audited distinctly from a
 * test failure"). A process gate at (implement, PASS), a `runtimeContext:
 * "required"` template started with the kit-injected ready ref, replayed
 * through the ingress seam; the scripted runner returns [ok/exit0, ok/exit1,
 * runner_error]. The "(a later round)" is realized by the review→implement
 * pass-back (round 2 on arrival at implement). AT-LEVEL (explicit roles +
 * versions). As of ch11-P4 the FILE channel carries the
 * `gates`/`runtimeContext` keys too; this trace keeps its DIRECT-constructed
 * admitted template deliberately — the authoring form this golden fixes over
 * the ingress seam.
 */
const catalog = createGateRegistry();
const READY_REF = "/ws/l2a-inst";

const gatedTemplate: WorkflowTemplate = {
  ref: { id: "local-pair-v0", version: 1 },
  start: "implement",
  steps: {
    implement: {
      role: "implementer",
      instruction: "build it",
      transitions: { PASS: "review" },
      gates: {
        PASS: [
          {
            uses: "external.process",
            config: {
              command: "pnpm test",
              timeoutMs: 600_000,
              onExit: { zero: "allow", nonzero: "block" },
              reason: { nonzero: "test_failed" },
            },
          },
        ],
      },
    },
    review: {
      role: "reviewer",
      instruction: "review it",
      transitions: { PASS: "implement", CONVERGED: "done" },
    },
  },
  terminal: ["done"],
  roles: { implementer: { defaultActor: "codex" }, reviewer: { defaultActor: "claude" } },
  runtimeContext: "required",
  // The round advances on the pass-back to implement — so the second PASS on
  // implement runs in "a later round" (the model's exhibited step 2/3).
  round: { advanceOnArrivalAt: ["implement"] },
};

function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, catalog);
  if (!result.ok) {
    throw new Error(`l2a trace admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const script: ProcessResult[] = [
  { kind: "ok", exitCode: 0, stdout: "", logRef: "ev-pass", durationMs: 40 },
  { kind: "ok", exitCode: 1, stdout: "", logRef: "ev-fail", durationMs: 55 },
  { kind: "runner_error", logRef: "ev-error", durationMs: 0 },
];

const l2aFixture: TraceFixture = {
  name: "l2a golden trace (at-level: explicit roles + versions, no lift)",
  steps: [
    {
      kind: "start",
      instanceId: "inst-l2a",
      task: "run the gated pair",
      runtimeContextRef: READY_REF,
      expect: { currentStep: "implement", version: 1 },
    },
    // 1 · codex PASS on implement: pnpm test → exit 0 → allow → commit → review.
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
    // 2 · claude PASS on review (pass back, ungated) → commit → implement;
    //     target = template.start ⇒ round advances to 2 ("a later round").
    {
      kind: "emit",
      opId: "op-2",
      type: "PASS",
      actorId: "claude",
      payload: { note: "claude:op-2" },
      expectedVersion: 2,
      expectedRole: "reviewer",
      expect: { kind: "committed", version: 3 },
    },
    // 3 · codex PASS on implement (round 2): pnpm test → exit 1 (a test
    //     failed) → block → Rejected(gate_blocked(test_failed)); no commit.
    {
      kind: "emit",
      opId: "op-3",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-3" },
      expectedVersion: 3,
      expectedRole: "implementer",
      expect: { kind: "rejected", reason: "gate_blocked" },
    },
    // 4 · codex PASS on implement: the runner fails (spawn failed) →
    //     runner_error → block → Rejected(gate_blocked(runner_error)) —
    //     audited DISTINCTLY from test_failed.
    {
      kind: "emit",
      opId: "op-4",
      type: "PASS",
      actorId: "codex",
      payload: { note: "codex:op-4" },
      expectedVersion: 3,
      expectedRole: "implementer",
      expect: { kind: "rejected", reason: "gate_blocked" },
    },
  ],
  finalTranscript: [
    [1, "op-1"],
    [2, "op-2"],
  ],
  finalState: {
    currentStep: "implement",
    round: 2,
    kernelStatus: "ACTIVE",
    terminalDisposition: null,
    version: 3,
  },
};

describe("l2a golden trace — the HANDLE process branch end-to-end (09-l2a Runtime)", () => {
  it("replays clean-run / test-failure / runner-error with DISTINCT reasons and resolving refs", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    const admitted = admit(gatedTemplate);
    const runner = createScriptedProcessGateRunner(script);
    const kernel = createKernel({
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
      processRunner: runner,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });

    const result = await replayTrace(l2aFixture, {
      submit: (raw) => ingress.submit(raw),
      start: (input) => kernel.startInstance(input),
      store: handle.store,
      template: admitted,
      // The store-visible evidence half resolves through the kit runner (T2).
      resolveEvidence: (ref) => runner.resolve(ref),
    });

    // The runner ran ONCE per process-gated emit (op-1, op-3, op-4); op-2 is
    // ungated. Each ran in the injected workspace.
    expect(runner.calls).toHaveLength(3);
    for (const call of runner.calls) {
      expect(call.cwd).toBe(READY_REF);
      expect(call.command).toBe("pnpm test");
      expect(call.timeoutMs).toBe(600_000);
    }

    // The committed op-1 entry retains the allow decision with reason exit_zero
    // (the zero-bucket default) and its evidence ref.
    const rows = result.finalDetail.transcript;
    expect(rows.map((r) => r.gateDecisions)).toEqual([
      [{ uses: "external.process", verdict: "allow", reason: "exit_zero", evidenceRefs: ["ev-pass"] }],
      [],
    ]);

    // The two blocks carry DISTINCT reasons + their evidence refs (audited
    // distinctly), returned on the Rejected outcomes.
    const blockedFail = result.outcomes[3] as Outcome;
    const blockedError = result.outcomes[4] as Outcome;
    expect(blockedFail).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "external.process",
      gateReason: "test_failed",
      evidenceRefs: ["ev-fail"],
    });
    expect(blockedError).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "external.process",
      gateReason: "runner_error",
      evidenceRefs: ["ev-error"],
    });

    // Every returned ref resolves through the kit runner's substrate.
    for (const ref of ["ev-pass", "ev-fail", "ev-error"]) {
      expect(runner.resolve(ref)).toBeDefined();
    }

    handle.close();
  });
});
