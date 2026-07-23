import { describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type {
  AdmittedTemplate,
  Outcome,
  RuntimeContextRef,
  TransitionEntry,
  WorkflowTemplate,
} from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import type { ProcessResult } from "./ports/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  createScriptedRuntimeContextProvider,
  fixtureDefinitionStore,
} from "./testkit/index.js";

/**
 * The l2a chapter trace as a golden test (packet ch11-P3b, T3; re-based at
 * ch12-p3, W4). The 09-l2a Runtime trace: a process gate at (implement, PASS)
 * — a clean run, a failing test, and a runner error audited distinctly. The
 * interim `runtimeContextRef` seam RETIRED (W1): the template now declares a
 * worktree SPEC and the workspace is PROVISIONED — create → start (provision,
 * Accepted, requested(r1)) → RUNTIME_CONTEXT_READY (ready(ref), activate) →
 * the gated emits. The process gate runs in the PROVISIONED workspace (the
 * ref's locator = the runner cwd). Driven manually (the provisioned path is
 * not the context-free replayTrace start leg).
 */
const catalog = createGateRegistry();
const WORKTREE_SPEC = { kind: "worktree", provider: "pairflow.worktree" } as const;
const WORKSPACE = "/ws/l2a-inst";
const READY_REF: RuntimeContextRef = { kind: "worktree", locator: WORKSPACE };

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
  // ch12-p3: a provisionable worktree spec (the retired "required" string).
  runtimeContext: WORKTREE_SPEC,
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

describe("l2a golden trace — the HANDLE process branch end-to-end (09-l2a Runtime)", () => {
  it("provisions the workspace, then replays clean/test-failure/runner-error with DISTINCT reasons", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    const admitted = admit(gatedTemplate);
    const runner = createScriptedProcessGateRunner(script);
    const provider = createScriptedRuntimeContextProvider();
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({ "pairflow.worktree": provider }),
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted),
      time: createControlledClock(1_000),
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates: catalog,
      processRunner: runner,
    });
    provider.bindCompletionSink((i, r, completion) => kernel.deliverCompletion(i, r, completion));
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });

    // create (immediate) → start (provision, Accepted, requested) → READY.
    await kernel.create({
      instanceId: "inst-l2a",
      templateRef: admitted.ref,
      task: "run the gated pair",
      mode: "immediate",
    });
    const started = await kernel.start({ instanceId: "inst-l2a", opId: "op-start" });
    expect(started).toEqual({ kind: "accepted" });
    expect(provider.provisionCalls).toHaveLength(1);
    const requestId = provider.provisionCalls[0]?.requestId ?? "";
    const preReady = await handle.store.loadInstance("inst-l2a");
    expect(preReady?.kernelStatus).toBe("CREATED");
    expect(preReady?.runtimeContext).toEqual({ state: "requested", requestId });

    const ready = await kernel.runtimeContextReady("inst-l2a", requestId, READY_REF);
    expect(ready.kind).toBe("activated");
    const active = await handle.store.loadInstance("inst-l2a");
    expect(active?.kernelStatus).toBe("ACTIVE");
    expect(active?.currentStep).toBe("implement");
    expect(active?.runtimeContext).toEqual({ state: "ready", ref: READY_REF });
    // v1 create, v2 requested, v3 ready+activate.
    expect(active?.version).toBe(3);

    // The gated emits — versions shifted +1 by the provisioning commit.
    const emit = (
      opId: string,
      actorId: string,
      expectedVersion: number,
      expectedRole: string,
      note: string,
    ): Promise<Outcome> =>
      ingress.submit({
        instanceId: "inst-l2a",
        opId,
        type: "PASS",
        actorId,
        expectedVersion,
        expectedRole,
        payload: { note },
      });

    // 1 · codex PASS on implement: pnpm test → exit 0 → allow → v4 → review.
    const op1 = await emit("op-1", "codex", 3, "implementer", "codex:op-1");
    expect(op1.kind).toBe("committed");
    if (op1.kind === "committed") expect(op1.version).toBe(4);
    // 2 · claude PASS on review (ungated) → v5 → implement (round advances to 2).
    const op2 = await emit("op-2", "claude", 4, "reviewer", "claude:op-2");
    expect(op2.kind).toBe("committed");
    // 3 · codex PASS on implement (round 2): exit 1 → block(test_failed).
    const op3 = await emit("op-3", "codex", 5, "implementer", "codex:op-3");
    // 4 · codex PASS on implement: runner error → block(sys:runner_error), distinct.
    const op4 = await emit("op-4", "codex", 5, "implementer", "codex:op-4");

    // The runner ran ONCE per process-gated emit (op-1, op-3, op-4); op-2 is
    // ungated. Each ran in the PROVISIONED workspace.
    expect(runner.calls).toHaveLength(3);
    for (const call of runner.calls) {
      expect(call.cwd).toBe(WORKSPACE);
      expect(call.command).toBe("pnpm test");
      expect(call.timeoutMs).toBe(600_000);
    }

    const detail = await handle.store.getInstanceDetail("inst-l2a");
    if (detail === null) throw new Error("l2a: detail vanished");
    const rows = detail.transcript.filter(
      (r): r is TransitionEntry => r.entryKind === "transition",
    );
    expect(rows.map((r) => r.gateDecisions)).toEqual([
      [{ uses: "external.process", verdict: "allow", reason: "sys:exit_zero", evidenceRefs: ["ev-pass"] }],
      [],
    ]);

    expect(op3).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "external.process",
      gateReason: "test_failed",
      evidenceRefs: ["ev-fail"],
    });
    expect(op4).toEqual({
      kind: "rejected",
      reason: "gate_blocked",
      gate: "external.process",
      gateReason: "sys:runner_error",
      evidenceRefs: ["ev-error"],
    });

    for (const ref of ["ev-pass", "ev-fail", "ev-error"]) {
      expect(runner.resolve(ref)).toBeDefined();
    }

    // Final state: implement, round 2, ACTIVE, v5.
    expect(active).toBeDefined();
    const final = await handle.store.loadInstance("inst-l2a");
    expect(final?.currentStep).toBe("implement");
    expect(final?.round).toBe(2);
    expect(final?.version).toBe(5);

    handle.close();
  });
});
