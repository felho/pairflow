import { describe, expect, it } from "vitest";

import type { EventEnvelope, Outcome, Started, WorkflowInstance } from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";
import { fixtureTemplate } from "./templateFixture.js";
import { replayTrace } from "./traceHarness.js";
import type { TraceFixture, TraceSeams } from "./traceHarness.js";

/**
 * Harness negatives that need NO kernel (packet ch5-P3): fake seams
 * only, so this file honors the testkit boundary (never imports
 * kernel/ or store/). The real-kernel negatives (dimensions 1–3 + 5)
 * live in src/l0aTrace.test.ts — the testkit lint bans wiring a real
 * kernel here, and that ban is the point (ADR-005).
 */
const template = fixtureTemplate();

function envelope(opId: string, type: string): EventEnvelope {
  return { instanceId: "i1", opId, type, actorId: "codex", expectedVersion: 1 };
}

function fakeStore(detail: InstanceDetail, created: WorkflowInstance): StorePort {
  return {
    loadInstance: () => Promise.resolve(created),
    hasOp: () => Promise.reject(new Error("unused")),
    createInstance: () => Promise.reject(new Error("unused")),
    commitTransition: () => Promise.reject(new Error("unused")),
    listInstances: () => Promise.reject(new Error("unused")),
    getInstanceDetail: () => Promise.resolve(detail),
  };
}

function fakeSeams(detail: InstanceDetail, committedVersions: readonly number[]): TraceSeams {
  const created: WorkflowInstance = { ...detail.instance, currentStep: "implement" };
  const started: Started = {
    kind: "started",
    instanceId: detail.instance.instanceId,
    version: 1,
    intent: {
      actor: "codex",
      packet: {
        instanceId: detail.instance.instanceId,
        expectedVersion: 1,
        task: detail.instance.task,
        instruction: "build it",
        availableOps: ["PASS"],
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
    start: () => Promise.resolve(started),
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
        status: "DONE",
        version: 3,
      },
      transcript: [
        { seq: 1, envelope: envelope("a1", "PASS"), committedAt: 1_001 },
        { seq: 3, envelope: envelope("b2", "CONVERGED"), committedAt: 1_002 },
      ],
    };
    const fixture: TraceFixture = {
      name: "corrupt-detail probe",
      steps: [
        {
          kind: "start",
          instanceId: "i1",
          task: "corrupt fixture",
          expect: { currentStep: "implement", version: 1 },
        },
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expectedVersion: 1, expect: { kind: "committed", version: 2 } },
        { kind: "emit", opId: "b2", type: "CONVERGED", actorId: "claude", expectedVersion: 2, expect: { kind: "committed", version: 3 } },
      ],
      finalTranscript: [
        [1, "a1"],
        [3, "b2"],
      ],
      finalState: { currentStep: "done", round: 1, status: "DONE", version: 3 },
    };
    await expect(replayTrace(fixture, fakeSeams(corrupt, [2, 3]))).rejects.toThrow(
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
        status: "RUNNING",
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
          expect: { currentStep: "implement", version: 1 },
        },
        { kind: "emit", opId: "a1", type: "PASS", actorId: "codex", expect: { kind: "committed", version: 2 } },
      ],
      finalTranscript: [[1, "a1"]],
      finalState: { currentStep: "review", round: 1, status: "RUNNING", version: 2 },
    };
    await expect(replayTrace(fixture, fakeSeams(irrelevant, [2]))).rejects.toThrow(
      /no expectedVersion and no lift/,
    );
  });
});
