import { describe, expect, it } from "vitest";

import { admitTemplate } from "../definition/index.js";
import type {
  Activated,
  AdmittedTemplate,
  Created,
  EventEnvelope,
  LifecycleFactEntry,
  Outcome,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { GateCatalog, ProcessGateEvidence } from "../ports/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";
import { fixtureTemplate } from "./templateFixture.js";
import { replayTrace, TraceMismatchError } from "./traceHarness.js";
import type { TraceFixture, TraceSeams } from "./traceHarness.js";

/**
 * Harness negatives that need NO kernel (packet ch5-P3): fake seams
 * only, so this file honors the testkit boundary (never imports
 * kernel/ or store/). The real-kernel negatives (dimensions 1–3 + 5)
 * live in src/l0aTrace.test.ts — the testkit lint bans wiring a real
 * kernel here, and that ban is the point (ADR-005).
 */

/**
 * ch11-P2c T1: the seam narrows to AdmittedTemplate, so admit the
 * fixture through an INLINE never-resolving stub catalog (the G1 eslint
 * ban covers src/testkit/** — no gates/ import; GateCatalog is a
 * type-only import). The fixture is gate-free, so admission is vacuous —
 * all-false flags, its round-1 histories stay green.
 */
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, { resolve: () => null } satisfies GateCatalog);
  if (!result.ok) {
    throw new Error(`traceHarness fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const template = admit(fixtureTemplate());

function envelope(opId: string, type: string): EventEnvelope {
  return { instanceId: "i1", opId, type, actorId: "codex", expectedVersion: 1 };
}

/** W3 (packet ch12-p1b): the activation's STARTED fact — seq 1, the
 * op_id consumption record of the START intent. */
function startedFact(opId: string, committedAt = 1_000): LifecycleFactEntry {
  return { entryKind: "STARTED", seq: 1, opId, committedAt };
}

function fakeStore(detail: InstanceDetail, created: WorkflowInstance): StorePort {
  return {
    loadInstance: () => Promise.resolve(created),
    findOp: () => Promise.reject(new Error("unused")),
    createInstance: () => Promise.reject(new Error("unused")),
    commitTransition: () => Promise.reject(new Error("unused")),
    commitLifecycle: () => Promise.reject(new Error("unused")),
    listInstances: () => Promise.reject(new Error("unused")),
    getInstanceDetail: () => Promise.resolve(detail),
    getTimeline: () => Promise.reject(new Error("unused")),
  };
}

function fakeSeams(detail: InstanceDetail, committedVersions: readonly number[]): TraceSeams {
  const created: WorkflowInstance = { ...detail.instance, currentStep: "implement" };
  // W3 (packet ch12-p1b): the CREATE→START composition — CREATE mints
  // genesis (v1), START activates (v2) and returns the first dispatch.
  const createdOutcome: Created = {
    kind: "created",
    instanceId: detail.instance.instanceId,
    version: 1,
  };
  const activated: Activated = {
    kind: "activated",
    instanceId: detail.instance.instanceId,
    version: 2,
    intent: {
      actor: "codex",
      packet: {
        instanceId: detail.instance.instanceId,
        expectedVersion: 1,
        task: detail.instance.task ?? "t",
        role: "implementer",
        instruction: "build it",
        availableOps: ["PASS"],
        effectiveAgentConfig: {},
        contextBlocks: [],
        runtimeContext: "none",
      },
    },
  };
  const queue = [...committedVersions];
  return {
    submit: () => {
      const version = queue.shift();
      if (version === undefined) {
        return Promise.reject(new Error("fake submit queue exhausted"));
      }
      const outcome: Outcome = { kind: "committed", version, intent: null };
      return Promise.resolve(outcome);
    },
    create: () => Promise.resolve(createdOutcome),
    start: () => Promise.resolve(activated),
    store: fakeStore(detail, created),
    template,
  };
}

describe("trace harness — fake-seam negatives (packet ch5-P3)", () => {
  it("dimension 4: a corrupt final detail behind clean outcomes fails the replay — the checkers are ENFORCED, not just present", async () => {
    // seq gap 1→3; everything the fixture DECLARES matches, so only the
    // post-condition checkers can catch it.
    const corrupt: InstanceDetail = {
      instance: {
        instanceId: "i1",
        templateRef: template.ref,
        task: "corrupt fixture",
        binding: { implementer: "codex", reviewer: "claude" },
        currentStep: "done",
        round: 1,
        kernelStatus: "TERMINAL",
        terminalDisposition: "done",
        activationMode: "immediate",
        wait: null,
        runtimeContext: { state: "ready", ref: null },
        failureReason: null,
        runOverrides: {},
        version: 4,
      },
      // W3: STARTED fact at seq 1; the seq gap now rides the transitions
      // (2→4, missing 3) so only the post-condition checkers catch it.
      transcript: [
        startedFact("s1"),
        { entryKind: "transition", seq: 2, envelope: envelope("a1", "PASS"), payloadDigest: "d-a1", gateDecisions: [], issuedAgentConfig: {}, committedAt: 1_001 },
        { entryKind: "transition", seq: 4, envelope: envelope("b2", "CONVERGED"), payloadDigest: "d-b2", gateDecisions: [], issuedAgentConfig: {}, committedAt: 1_002 },
      ],
    };
    const fixture: TraceFixture = {
      name: "corrupt-detail probe",
      steps: [
        {
          kind: "start",
          instanceId: "i1",
          task: "corrupt fixture",
          opId: "s1",
          expect: { currentStep: "implement", version: 2 },
        },
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expectedVersion: 2, expect: { kind: "committed", version: 3 } },
        { kind: "emit", opId: "b2", type: "CONVERGED", actorId: "claude", expectedVersion: 3, expect: { kind: "committed", version: 4 } },
      ],
      finalTranscript: [
        [1, "s1"],
        [2, "a1"],
        [4, "b2"],
      ],
      finalState: {
        currentStep: "done",
        round: 1,
        kernelStatus: "TERMINAL",
        terminalDisposition: "done",
        version: 4,
      },
    };
    await expect(replayTrace(fixture, fakeSeams(corrupt, [3, 4]))).rejects.toThrow(
      /post-condition checkers rejected/,
    );
  });

  it("fail-closed: a lift-less emit step without an explicit expectedVersion throws", async () => {
    const irrelevant: InstanceDetail = {
      instance: {
        instanceId: "i1",
        templateRef: template.ref,
        task: "t",
        binding: { implementer: "codex", reviewer: "claude" },
        currentStep: "implement",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        activationMode: "immediate",
        wait: null,
        runtimeContext: { state: "ready", ref: null },
        failureReason: null,
        runOverrides: {},
        version: 1,
      },
      transcript: [],
    };
    const fixture: TraceFixture = {
      name: "lift-less without version",
      steps: [
        {
          kind: "start",
          instanceId: "i1",
          task: "t",
          opId: "s1",
          expect: { currentStep: "implement", version: 2 },
        },
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expect: { kind: "committed", version: 2 } },
      ],
      finalTranscript: [[1, "a1"]],
      finalState: {
        currentStep: "review",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        version: 2,
      },
    };
    await expect(replayTrace(fixture, fakeSeams(irrelevant, [2]))).rejects.toThrow(
      /no expectedVersion and no lift/,
    );
  });
});

describe("trace harness — the typed mismatch contract (packet ch6-P4b)", () => {
  const detail: InstanceDetail = {
    instance: {
      instanceId: "i1",
      templateRef: template.ref,
      task: "t",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "review",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: null,
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 2,
    },
    transcript: [
      { entryKind: "transition", seq: 1, envelope: envelope("a1", "PASS"), payloadDigest: "d-a1", gateDecisions: [], issuedAgentConfig: {}, committedAt: 1_001 },
    ],
  };

  it("an outcome mismatch throws TraceMismatchError with lane + stepIndex (TYPE-discriminated, not message text)", async () => {
    const fixture: TraceFixture = {
      name: "outcome mismatch probe",
      steps: [
        {
          kind: "start",
          instanceId: "i1",
          task: "t",
          opId: "s1",
          expect: { currentStep: "implement", version: 2 },
        },
        // The fake seam commits version 3; the fixture demands 4.
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expectedVersion: 2, expect: { kind: "committed", version: 4 } },
      ],
      finalTranscript: [[1, "a1"]],
      finalState: {
        currentStep: "review",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        version: 2,
      },
    };
    const failure = await replayTrace(fixture, fakeSeams(detail, [3])).then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(TraceMismatchError);
    if (failure instanceof TraceMismatchError) {
      expect(failure.lane).toBe("outcome");
      expect(failure.stepIndex).toBe(1);
      expect(failure.expected).toBe(4);
      expect(failure.actual).toBe(3);
    }
  });

  it("a wiring/fixture problem stays a PLAIN Error (emit before start)", async () => {
    const fixture: TraceFixture = {
      name: "wiring probe",
      steps: [
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expectedVersion: 1, expect: { kind: "committed", version: 2 } },
      ],
      finalTranscript: [],
      finalState: {
        currentStep: "implement",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        version: 1,
      },
    };
    const failure = await replayTrace(fixture, fakeSeams(detail, [2])).then(
      () => null,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toBeInstanceOf(TraceMismatchError);
  });
});

describe("trace harness — ch11-P3b evidence seam (ch12-p3: the runtimeContextRef passthrough retired)", () => {
  it("threads the evidence seam to runAllCheckers: a committed ref FAILS with no seam, resolves clean with one", async () => {
    const fakeRecord: ProcessGateEvidence = {
      log: "ok",
      kind: "ok",
      exitCode: 0,
      durationMs: 1,
      headSha: "h",
      gitStatusHash: "g",
    };
    const detailWithRef: InstanceDetail = {
      instance: {
        instanceId: "i1",
        templateRef: template.ref,
        task: "t",
        binding: { implementer: "codex", reviewer: "claude" },
        currentStep: "review",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        activationMode: "immediate",
        wait: null,
        runtimeContext: { state: "ready", ref: { kind: "worktree", locator: "/ws/ready" } },
        failureReason: null,
        runOverrides: {},
        version: 3,
      },
      transcript: [
        startedFact("s1"),
        {
          entryKind: "transition",
          seq: 2,
          envelope: envelope("a1", "PASS"),
          payloadDigest: "d-a1",
          gateDecisions: [{ uses: "external.process", verdict: "allow", evidenceRefs: ["ev-1"] }],
          issuedAgentConfig: {},
          committedAt: 1_001,
        },
      ],
    };
    const fixture: TraceFixture = {
      name: "evidence seam probe",
      steps: [
        {
          kind: "start",
          instanceId: "i1",
          task: "t",
          opId: "s1",
          expect: { currentStep: "implement", version: 2 },
        },
        {
          kind: "emit",
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expect: { kind: "committed", version: 3 },
        },
      ],
      finalTranscript: [
        [1, "s1"],
        [2, "a1"],
      ],
      finalState: {
        currentStep: "review",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        version: 3,
      },
    };
    // No seam → the store-visible evidence half is fail-closed → checker fails.
    await expect(replayTrace(fixture, fakeSeams(detailWithRef, [3]))).rejects.toThrow(
      /post-condition checkers rejected/,
    );
    // A resolving seam → clean.
    const seams: TraceSeams = {
      ...fakeSeams(detailWithRef, [3]),
      resolveEvidence: (ref) => (ref === "ev-1" ? fakeRecord : undefined),
    };
    const result = await replayTrace(fixture, seams);
    expect(result.finalDetail.transcript).toHaveLength(2);
  });
});
