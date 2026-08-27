import type {
  ActorId,
  AdmittedTemplate,
  CreateOutcome,
  EventType,
  InstanceId,
  KernelStatus,
  OpId,
  Outcome,
  RejectionName,
  StartOutcome,
  StepId,
  TemplateRef,
  TerminalDisposition,
} from "../domain/index.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import type { IntentOutcome } from "../ingress/ingress.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";

import { replayDigest } from "./replayDigest.js";
import { runAllCheckers } from "./storeCheckers.js";
import type { EvidenceResolveSeam } from "./storeCheckers.js";

/**
 * The chapter-trace golden harness (packet ch5-P3; plan §5.2). KIT
 * infrastructure that NEVER imports kernel/, store/, or ingress/ —
 * the wired seams arrive as parameters, typed over domain/ + ports/
 * only: tests, not the kit, drive the kernel (ADR-005, realized
 * structurally). Assertion failures THROW with step context; the
 * harness is vitest-agnostic.
 */

/** Port-local mirrors of the kernel's lifecycle inputs (structural
 * match — packet ch12-p1b W3: the one-shot's HarnessStartInput retired
 * with it; the start seam is the CREATE→START composition). */
export interface HarnessCreateInput {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task?: string;
}

export interface HarnessStartOpInput {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
}

export interface TraceSeams {
  /** The wired ingress entry — the ingress submit bound to the kernel under test. */
  readonly submit: (raw: unknown) => Promise<Outcome>;
  /** kernel.create, bound to the kernel under test. */
  readonly create: (input: HarnessCreateInput) => Promise<CreateOutcome>;
  /** kernel.start, bound to the kernel under test. */
  readonly start: (input: HarnessStartOpInput) => Promise<StartOutcome>;
  /**
   * Q13 (packet ch14-p2b): the INGRESS's `submitIntent`, NOT the
   * kernel's two handlers — and the seam choice is the decision.
   * Driving the kernel directly would leave the wire keysets (Q9)
   * unexercised by the chapter's one end-to-end proof, and the `l3`
   * trace is exactly where the ingress→kernel→store→floor path is
   * proven as a path.
   *
   * OPTIONAL, on the `resolveEvidence` precedent directly above: every
   * pre-`l3` trace carries no operator step and wires no such seam, so a
   * REQUIRED member would force five files this packet's mutation
   * boundary does not contain. A fixture that USES an operator step
   * without the seam fails loudly at the step rather than silently — the
   * absence is a wiring error, never a skip.
   */
  readonly submitIntent?: (raw: unknown) => Promise<IntentOutcome>;
  /** The REAL store the kernel commits into (floor-read side). */
  readonly store: StorePort;
  /**
   * T1 (packet ch11-P2c): NARROWED to `AdmittedTemplate` — the checker
   * (`checkRoundReconstruction`) consumes the admission-normalized
   * `advancesRound` flags, and a raw template would reconstruct round 1
   * against a stored 2 silently. Compile-enforcing the admitted form (the
   * C20 letter) is what a per-call-site discipline would leave to review.
   */
  readonly template: AdmittedTemplate;
  /**
   * T2 (packet ch11-P3b): the OPTIONAL evidence-resolve seam threaded to
   * `runAllCheckers` — structurally the kit runner's `resolve`. Absent for
   * every pre-l2a trace (they carry no evidence refs and stay clean).
   */
  readonly resolveEvidence?: EvidenceResolveSeam;
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
      /** W3 (packet ch12-p1b): the START intent's op_id — fixture-declared,
       * deterministic; the STARTED fact appears as [1, opId]. */
      readonly opId: OpId;
      /** Genesis is v1; the activation commit is v2 (W3's arithmetic). */
      readonly expect: { readonly currentStep: StepId; readonly version: 2 };
    }
  | {
      readonly kind: "emit";
      readonly opId: OpId;
      readonly type: EventType;
      readonly actorId: ActorId;
      readonly payload?: unknown;
      /** Explicit number, or omitted ⇒ supplied by the lift. */
      readonly expectedVersion?: number;
      /**
       * Explicit role claim, or omitted ⇒ supplied by the role lift
       * when declared (ch11-P1 T3: explicit wins over the lift);
       * omitted WITHOUT a lift the envelope carries no role — a
       * legitimate missing_role probe.
       */
      readonly expectedRole?: string;
      readonly expect: ExpectedOutcome;
    }
  // Q13: the two OPERATOR-INTENT step kinds, each carrying its own wire
  // fields and its OWN typed `expect`. A generic "any intent" step was
  // REFUSED: its `expect` could not be typed per intent and every
  // fixture would carry an untyped bag.
  | {
      readonly kind: "submit-decision";
      readonly opId: OpId;
      readonly requestRef: string;
      readonly verdict: string;
      readonly override?: boolean;
      readonly payload?: unknown;
      readonly by?: string;
      /** Explicit number, or omitted ⇒ supplied by the lift. */
      readonly expectedVersion?: number;
      readonly expect: ExpectedOutcome;
    }
  | {
      readonly kind: "resume-wait";
      readonly opId: OpId;
      readonly type: EventType;
      readonly expectedVersion?: number;
      readonly expect: ExpectedOutcome;
    };

export interface TraceFixture {
  readonly name: string;
  /**
   * Level-lifting declaration — ABSENT for at-level traces. The role
   * axis (ch11-P1 T2) stamps the CURRENT step's role onto emits that
   * carry none, so sub-L1 traces stay green above their level.
   */
  readonly lift?: {
    readonly expectedVersion?: "track-running-version";
    readonly expectedRole?: "supply-current-step-role";
  };
  readonly steps: readonly TraceStep[];
  /** [seq, opId] — full-sequence equality. */
  readonly finalTranscript: readonly (readonly [number, string])[];
  /**
   * W2 (packet ch12-p1a): the fixture shape is the harness's mirror of
   * the instance shape — the ch-4 `status` key re-based onto the axis
   * pair under E1's map (RUNNING → ACTIVE + null; DONE → TERMINAL +
   * "done").
   */
  readonly finalState: {
    readonly currentStep: StepId;
    readonly round: number;
    readonly kernelStatus: KernelStatus;
    readonly terminalDisposition: TerminalDisposition | null;
    readonly version: number;
  };
}

export interface ReplayResult {
  /** One entry per fixture step, the ACTUAL outcome value (a start
   * step contributes its START-leg outcome; the CREATE leg is
   * interior — the W2 bridge culture). */
  readonly outcomes: readonly (Outcome | CreateOutcome | StartOutcome | IntentOutcome)[];
  /**
   * The final store read the harness itself asserted against —
   * returned so supplemental blocks assert transcript-side shapes
   * without a second read.
   */
  readonly finalDetail: InstanceDetail;
}

export type TraceMismatchLane = "outcome" | "state" | "transcript" | "checker";

/**
 * The ASSERTION lanes throw this typed error (packet ch6-P4b): the
 * trace did not hold — outcome/state/transcript expectation or a
 * post-condition checker. Wiring/fixture problems (emit before start,
 * lift-less version, vanished instance) stay plain Errors: consumers
 * (the dev CLI's replay verb) discriminate mismatch from internal on
 * the TYPE, never on message text.
 */
export class TraceMismatchError extends Error {
  readonly lane: TraceMismatchLane;
  readonly stepIndex?: number;
  readonly expected?: unknown;
  readonly actual?: unknown;

  constructor(
    lane: TraceMismatchLane,
    message: string,
    context: { stepIndex?: number; expected?: unknown; actual?: unknown } = {},
  ) {
    super(message);
    this.name = "TraceMismatchError";
    this.lane = lane;
    if (context.stepIndex !== undefined) {
      this.stepIndex = context.stepIndex;
    }
    this.expected = context.expected;
    this.actual = context.actual;
  }
}

function fail(
  lane: TraceMismatchLane,
  stepIndex: number | undefined,
  label: string,
  expected: unknown,
  got: unknown,
): never {
  throw new TraceMismatchError(
    lane,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`,
    { ...(stepIndex !== undefined ? { stepIndex } : {}), expected, actual: got },
  );
}

function assertOutcome(
  label: string,
  stepIndex: number,
  expect: ExpectedOutcome,
  // Q13: the comparison is over the OUTCOME SHAPE the harness knows —
  // `kind`, `version`, `currentVersion`, `reason` — which the two
  // operator unions share with the actor one. The per-step OUTPUT
  // assertions (the Ask's fields, the two `none` answers, the dispatch)
  // are the FIXTURE FILE's against the replay's returned outcomes, not
  // this comparison's.
  outcome: Outcome | IntentOutcome,
): void {
  if (outcome.kind !== expect.kind) {
    fail("outcome", stepIndex, `${label} (outcome kind)`, expect.kind, outcome.kind);
  }
  if (expect.kind === "committed" && outcome.kind === "committed") {
    if (outcome.version !== expect.version) {
      fail("outcome", stepIndex, `${label} (committed version)`, expect.version, outcome.version);
    }
  }
  if (expect.kind === "stale" && outcome.kind === "stale") {
    if (outcome.currentVersion !== expect.currentVersion) {
      fail(
        "outcome",
        stepIndex,
        `${label} (stale currentVersion)`,
        expect.currentVersion,
        outcome.currentVersion,
      );
    }
  }
  if (expect.kind === "rejected" && outcome.kind === "rejected") {
    if (outcome.reason !== expect.reason) {
      fail("outcome", stepIndex, `${label} (rejection reason)`, expect.reason, outcome.reason);
    }
  }
}

/**
 * K17's digest sink (packet ch14-p2a). OPT-IN by environment: absent
 * variable ⇒ absent behaviour, so every existing run is untouched.
 *
 * WHAT THE RECORDED PAIR EVIDENCES, scoped: the replayed behaviour of a
 * named trace at THIS tree. Comparing two such records across an edit
 * is the gate's (b) half. It is NOT provenance — the gate-time
 * recomputation leg that would have bound a number to the ref it cites
 * is dropped (it collides with the add-only instrument-landing
 * confinement), so a reader must take exactly the equality and no more.
 */
function recordReplayDigest(name: string, detail: InstanceDetail): void {
  const target = process.env["V3_TRACE_DIGESTS"];
  if (target === undefined || target === "") return;
  // An EMPTY file is the ordinary starting state (a caller that
  // pre-created the path), not a corrupt one — reading it as `{}` keeps
  // the sink total rather than making the first trace throw.
  const raw = existsSync(target) ? readFileSync(target, "utf8").trim() : "";
  const existing = raw === "" ? {} : (JSON.parse(raw) as Record<string, unknown>);
  existing[name] = replayDigest(detail);
  writeFileSync(target, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
}

export async function replayTrace(
  fixture: TraceFixture,
  seams: TraceSeams,
): Promise<ReplayResult> {
  const outcomes: (Outcome | CreateOutcome | StartOutcome | IntentOutcome)[] = [];
  let instanceId: InstanceId | null = null;
  let runningVersion = 0;

  for (const [index, step] of fixture.steps.entries()) {
    const label = `${fixture.name} · step ${String(index + 1)}`;
    if (step.kind === "start") {
      // W3 (packet ch12-p1b): the CREATE→START composition — the
      // one-shot is retired (C24); the CREATE leg is interior, the
      // START leg's outcome is the step's outcome (the W2 culture).
      const created = await seams.create({
        instanceId: step.instanceId,
        templateRef: seams.template.ref,
        task: step.task,
      });
      if (created.kind !== "created") {
        throw new Error(`${label}: create leg returned '${created.kind}' (fixture wiring)`);
      }
      const startOutcome = await seams.start({
        instanceId: step.instanceId,
        opId: step.opId,
      });
      outcomes.push(startOutcome);
      if (startOutcome.kind !== "activated") {
        throw new Error(`${label}: start leg returned '${startOutcome.kind}' (fixture wiring)`);
      }
      if (startOutcome.version !== step.expect.version) {
        fail(
          "outcome",
          index,
          `${label} (start version)`,
          step.expect.version,
          startOutcome.version,
        );
      }
      const startedInstance = await seams.store.loadInstance(step.instanceId);
      if (startedInstance === null || startedInstance.currentStep !== step.expect.currentStep) {
        fail(
          "outcome",
          index,
          `${label} (start currentStep)`,
          step.expect.currentStep,
          startedInstance?.currentStep,
        );
      }
      instanceId = step.instanceId;
      runningVersion = startOutcome.version;
      continue;
    }
    if (instanceId === null) {
      throw new Error(`${label}: emit before start`);
    }
    if (step.kind === "submit-decision" || step.kind === "resume-wait") {
      // The two operator intents ride the SAME version lift and the SAME
      // pre-snapshot no-state-change rule as an emit — a rejected
      // operator intent must leave the instance byte-identical, which is
      // Leg B's step 3 in the golden trace.
      let intentVersion = step.expectedVersion;
      if (intentVersion === undefined) {
        if (fixture.lift?.expectedVersion !== "track-running-version") {
          throw new Error(
            `${label}: no expectedVersion and no lift declaration — lift-less traces carry explicit versions`,
          );
        }
        intentVersion = runningVersion;
      }
      const beforeIntent = await seams.store.loadInstance(instanceId);
      const rawIntent: Record<string, unknown> =
        step.kind === "submit-decision"
          ? {
              intent: "submit-decision",
              instanceId,
              opId: step.opId,
              expectedVersion: intentVersion,
              requestRef: step.requestRef,
              verdict: step.verdict,
              ...(step.override !== undefined ? { override: step.override } : {}),
              ...("payload" in step ? { payload: step.payload } : {}),
              ...(step.by !== undefined ? { by: step.by } : {}),
            }
          : {
              intent: "resume-wait",
              instanceId,
              opId: step.opId,
              expectedVersion: intentVersion,
              type: step.type,
            };
      if (seams.submitIntent === undefined) {
        throw new Error(
          `${label}: fixture drives a '${step.kind}' step but the seams wire no submitIntent (fixture wiring)`,
        );
      }
      const intentOutcome = await seams.submitIntent(rawIntent);
      outcomes.push(intentOutcome);
      assertOutcome(label, index, step.expect, intentOutcome);
      if (intentOutcome.kind === "committed") {
        runningVersion = intentOutcome.version;
      } else {
        const afterIntent = await seams.store.loadInstance(instanceId);
        if (JSON.stringify(afterIntent) !== JSON.stringify(beforeIntent)) {
          fail("state", index, `${label} (no-state-change: full instance)`, beforeIntent, afterIntent);
        }
      }
      continue;
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
    // The role lift (ch11-P1 T2): stamp the CURRENT step's role onto
    // emits carrying none. Explicit values win (T3); absence without
    // a lift stays absent — a missing_role probe is trace-expressible.
    let expectedRole = step.expectedRole;
    if (expectedRole === undefined && fixture.lift?.expectedRole === "supply-current-step-role") {
      const current = await seams.store.loadInstance(instanceId);
      if (current === null) {
        throw new Error(`${label}: instance vanished before the role lift`);
      }
      if (current.currentStep === null) {
        throw new Error(`${label}: role lift on a pre-activation (null) position`);
      }
      const role = seams.template.steps[current.currentStep]?.role;
      if (role === undefined) {
        throw new Error(`${label}: role lift on a terminal current step`);
      }
      expectedRole = role;
    }
    // A11 pre-snapshot (ch11-P1 T4): full-instance equality on every
    // non-committed outcome — the checkers are a consistency belt,
    // never the equality proof.
    const before = await seams.store.loadInstance(instanceId);
    const raw: Record<string, unknown> = {
      instanceId,
      opId: step.opId,
      type: step.type,
      actorId: step.actorId,
      expectedVersion,
      ...(expectedRole !== undefined ? { expectedRole } : {}),
      ...(step.payload !== undefined ? { payload: step.payload } : {}),
    };
    const outcome = await seams.submit(raw);
    outcomes.push(outcome);
    assertOutcome(label, index, step.expect, outcome);
    if (outcome.kind === "committed") {
      runningVersion = outcome.version;
    } else {
      const after = await seams.store.loadInstance(instanceId);
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        fail("state", index, `${label} (no-state-change: full instance)`, before, after);
      }
    }
  }

  if (instanceId === null) {
    throw new Error(`${fixture.name}: fixture has no start step`);
  }
  const finalDetail = await seams.store.getInstanceDetail(instanceId);
  if (finalDetail === null) {
    throw new Error(`${fixture.name}: final read found no instance '${instanceId}'`);
  }

  // K17 (packet ch14-p2a) — the BEHAVIOUR half's measurement point,
  // OPT-IN and inert unless asked for. The digest is taken here rather
  // than inside each trace file because the fixtures are file-local:
  // this is the one seam every golden trace already passes through.
  //
  // It writes nothing and computes nothing unless `V3_TRACE_DIGESTS`
  // names a file, so the default path is byte-unchanged.
  recordReplayDigest(fixture.name, finalDetail);

  // [seq, opId] per class (C12): a transition's op id rides its
  // envelope, a fact's rides the row itself — and K12 (ch14-p2a): the
  // DECISION_REQUEST class has NO op id at all, so it contributes its
  // correlation handle instead. The pair stays total over the union
  // rather than dropping the row, because a fixture's expected
  // transcript must still see every committed row in seq order.
  const rows = finalDetail.transcript.map((entry) => {
    if (entry.entryKind === "DECISION_REQUEST") {
      return [entry.seq, entry.requestRef] as const;
    }
    return [
      entry.seq,
      entry.entryKind === "transition" ? entry.envelope.opId : entry.opId,
    ] as const;
  });
  const expectedRows = fixture.finalTranscript;
  const rowsMatch =
    rows.length === expectedRows.length &&
    rows.every(
      (row, i) => row[0] === expectedRows[i]?.[0] && row[1] === expectedRows[i]?.[1],
    );
  if (!rowsMatch) {
    fail("transcript", undefined, `${fixture.name} (final transcript)`, expectedRows, rows);
  }

  const { currentStep, round, kernelStatus, terminalDisposition, version } = finalDetail.instance;
  const actualState = { currentStep, round, kernelStatus, terminalDisposition, version };
  const expectedState = fixture.finalState;
  if (
    actualState.currentStep !== expectedState.currentStep ||
    actualState.round !== expectedState.round ||
    actualState.kernelStatus !== expectedState.kernelStatus ||
    actualState.terminalDisposition !== expectedState.terminalDisposition ||
    actualState.version !== expectedState.version
  ) {
    fail("state", undefined, `${fixture.name} (final state)`, expectedState, actualState);
  }

  const violations = runAllCheckers(finalDetail, seams.template, seams.resolveEvidence);
  if (violations.length > 0) {
    throw new TraceMismatchError(
      "checker",
      `${fixture.name}: post-condition checkers rejected the replay:\n${violations.join("\n")}`,
      { actual: violations },
    );
  }

  return { outcomes, finalDetail };
}
