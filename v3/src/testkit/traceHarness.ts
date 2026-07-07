import type {
  ActorId,
  EventType,
  InstanceId,
  LifecycleStatus,
  OpId,
  Outcome,
  RejectionName,
  Started,
  StepId,
  TemplateRef,
  WorkflowTemplate,
} from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";
import { runAllCheckers } from "./storeCheckers.js";

/**
 * The chapter-trace golden harness (packet ch5-P3; plan §5.2). KIT
 * infrastructure that NEVER imports kernel/, store/, or ingress/ —
 * the wired seams arrive as parameters, typed over domain/ + ports/
 * only: tests, not the kit, drive the kernel (ADR-005, realized
 * structurally). Assertion failures THROW with step context; the
 * harness is vitest-agnostic.
 */

/** Port-local mirror of the kernel's start input (structural match). */
export interface HarnessStartInput {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task: string;
}

export interface TraceSeams {
  /** The wired ingress entry — createIngress(kernel).submit. */
  readonly submit: (raw: unknown) => Promise<Outcome>;
  /** startInstance, bound to the kernel under test. */
  readonly start: (input: HarnessStartInput) => Promise<Started>;
  /** The REAL store the kernel commits into (floor-read side). */
  readonly store: StorePort;
  readonly template: WorkflowTemplate;
}

export type ExpectedOutcome =
  | { readonly kind: "committed"; readonly version: number }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | { readonly kind: "rejected"; readonly reason: RejectionName };

export type TraceStep =
  | {
      readonly kind: "start";
      readonly instanceId: InstanceId;
      readonly task: string;
      readonly expect: { readonly currentStep: StepId; readonly version: 1 };
    }
  | {
      readonly kind: "emit";
      readonly opId: OpId;
      readonly type: EventType;
      readonly actorId: ActorId;
      readonly payload?: unknown;
      /** Explicit number, or omitted ⇒ supplied by the lift. */
      readonly expectedVersion?: number;
      readonly expect: ExpectedOutcome;
    };

export interface TraceFixture {
  readonly name: string;
  /** Level-lifting declaration — ABSENT for at-level traces (l0b). */
  readonly lift?: { readonly expectedVersion: "track-running-version" };
  readonly steps: readonly TraceStep[];
  /** [seq, opId] — full-sequence equality. */
  readonly finalTranscript: readonly (readonly [number, string])[];
  readonly finalState: {
    readonly currentStep: StepId;
    readonly round: number;
    readonly status: LifecycleStatus;
    readonly version: number;
  };
}

export interface ReplayResult {
  /** One entry per fixture step, the ACTUAL outcome/Started value. */
  readonly outcomes: readonly (Outcome | Started)[];
  /**
   * The final store read the harness itself asserted against —
   * returned so supplemental blocks assert transcript-side shapes
   * without a second read.
   */
  readonly finalDetail: InstanceDetail;
}

function fail(label: string, expected: unknown, got: unknown): never {
  throw new Error(
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`,
  );
}

function assertOutcome(label: string, expect: ExpectedOutcome, outcome: Outcome): void {
  if (outcome.kind !== expect.kind) {
    fail(`${label} (outcome kind)`, expect.kind, outcome.kind);
  }
  if (expect.kind === "committed" && outcome.kind === "committed") {
    if (outcome.version !== expect.version) {
      fail(`${label} (committed version)`, expect.version, outcome.version);
    }
  }
  if (expect.kind === "stale" && outcome.kind === "stale") {
    if (outcome.currentVersion !== expect.currentVersion) {
      fail(`${label} (stale currentVersion)`, expect.currentVersion, outcome.currentVersion);
    }
  }
  if (expect.kind === "rejected" && outcome.kind === "rejected") {
    if (outcome.reason !== expect.reason) {
      fail(`${label} (rejection reason)`, expect.reason, outcome.reason);
    }
  }
}

export async function replayTrace(
  fixture: TraceFixture,
  seams: TraceSeams,
): Promise<ReplayResult> {
  const outcomes: (Outcome | Started)[] = [];
  let instanceId: InstanceId | null = null;
  let runningVersion = 0;

  for (const [index, step] of fixture.steps.entries()) {
    const label = `${fixture.name} · step ${String(index + 1)}`;
    if (step.kind === "start") {
      const started = await seams.start({
        instanceId: step.instanceId,
        templateRef: seams.template.ref,
        task: step.task,
      });
      outcomes.push(started);
      if (started.version !== step.expect.version) {
        fail(`${label} (start version)`, step.expect.version, started.version);
      }
      const created = await seams.store.loadInstance(step.instanceId);
      if (created === null || created.currentStep !== step.expect.currentStep) {
        fail(`${label} (start currentStep)`, step.expect.currentStep, created?.currentStep);
      }
      instanceId = step.instanceId;
      runningVersion = started.version;
      continue;
    }
    if (instanceId === null) {
      throw new Error(`${label}: emit before start`);
    }
    let expectedVersion = step.expectedVersion;
    if (expectedVersion === undefined) {
      if (fixture.lift?.expectedVersion !== "track-running-version") {
        // Fail-closed: an at-level trace carries explicit versions; the
        // lift may only ADD what the current kernel level mandates.
        throw new Error(
          `${label}: no expectedVersion and no lift declaration — lift-less traces carry explicit versions`,
        );
      }
      expectedVersion = runningVersion;
    }
    const raw: Record<string, unknown> = {
      instanceId,
      opId: step.opId,
      type: step.type,
      actorId: step.actorId,
      expectedVersion,
      ...(step.payload !== undefined ? { payload: step.payload } : {}),
    };
    const outcome = await seams.submit(raw);
    outcomes.push(outcome);
    assertOutcome(label, step.expect, outcome);
    if (outcome.kind === "committed") {
      runningVersion = outcome.version;
    }
  }

  if (instanceId === null) {
    throw new Error(`${fixture.name}: fixture has no start step`);
  }
  const finalDetail = await seams.store.getInstanceDetail(instanceId);
  if (finalDetail === null) {
    throw new Error(`${fixture.name}: final read found no instance '${instanceId}'`);
  }

  const rows = finalDetail.transcript.map(
    (entry) => [entry.seq, entry.envelope.opId] as const,
  );
  const expectedRows = fixture.finalTranscript;
  const rowsMatch =
    rows.length === expectedRows.length &&
    rows.every(
      (row, i) => row[0] === expectedRows[i]?.[0] && row[1] === expectedRows[i]?.[1],
    );
  if (!rowsMatch) {
    fail(`${fixture.name} (final transcript)`, expectedRows, rows);
  }

  const { currentStep, round, status, version } = finalDetail.instance;
  const actualState = { currentStep, round, status, version };
  const expectedState = fixture.finalState;
  if (
    actualState.currentStep !== expectedState.currentStep ||
    actualState.round !== expectedState.round ||
    actualState.status !== expectedState.status ||
    actualState.version !== expectedState.version
  ) {
    fail(`${fixture.name} (final state)`, expectedState, actualState);
  }

  const violations = runAllCheckers(finalDetail, seams.template);
  if (violations.length > 0) {
    throw new Error(
      `${fixture.name}: post-condition checkers rejected the replay:\n${violations.join("\n")}`,
    );
  }

  return { outcomes, finalDetail };
}
