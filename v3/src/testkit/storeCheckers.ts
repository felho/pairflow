import type { WorkflowTemplate } from "../domain/index.js";
import type { ProcessGateEvidence } from "../ports/gate.js";
import type { InstanceDetail } from "../ports/store.js";

/**
 * T2 (packet ch11-P3b): the evidence-resolve seam — structurally the kit
 * runner's `resolve`. `undefined` means the ref does not resolve.
 */
export type EvidenceResolveSeam = (ref: string) => ProcessGateEvidence | undefined;

/**
 * Post-condition checker kit (packet ch5-P2; plan §5.3): PURE functions
 * over floor-read data — committed rows only, no store import (ADR-005's
 * import rule untouched). The ch5-P3 harness runs the aggregator after
 * every trace replay. Accounting: harness INFRASTRUCTURE — the checkers
 * are validity oracles, not disposition owners and not a second kernel.
 */

/** Transcript seq must be dense 1..N. */
export function checkSeqContinuity(detail: InstanceDetail): string[] {
  const violations: string[] = [];
  detail.transcript.forEach((entry, index) => {
    if (entry.seq !== index + 1) {
      violations.push(
        `seq continuity: row ${String(index)} carries seq ${String(entry.seq)}, expected ${String(index + 1)}`,
      );
    }
  });
  return violations;
}

/** Uniform commit discipline (packet ch12-p1b): genesis is version 1
 * and EVERY commit advances by one. Every commit writes a row EXCEPT
 * FAIL (deliberately row-less, L6) — and `failed` implies exactly ONE
 * FAIL commit (the sink guard forecloses a second), so the arithmetic
 * stays decidable over floor reads. */
export function checkVersionArithmetic(detail: InstanceDetail): string[] {
  const failCommits = detail.instance.terminalDisposition === "failed" ? 1 : 0;
  // Q11's FOURTH READER, RE-BASED (packet ch14-p2b). This checker was
  // blind on a DIFFERENT AXIS from the three position readers: it
  // counted ROWS, corrected upward for the row-LESS commits it already
  // knew about, which holds only while every commit writes exactly ONE
  // row. The human-gate park writes TWO in ONE commit, and the `l3`
  // fixture is its FIRST inhabitant — so the expectation becomes a
  // count of COMMITS rather than of rows.
  //
  // It is DERIVABLE from the committed sequence because the park's
  // second row is the OP-LESS class, which carries no version of its
  // own: every other class is committed one row per commit.
  //
  // THE RE-BASE IS A NO-OP wherever rows and commits are equal — which
  // is every history predating this packet — so it moves no existing
  // trace. That is the ground the "no instrument_manifest" decision
  // rests on, and it is a property of the histories rather than a hope.
  //
  // IT MUST NOT DEGENERATE: reporting nothing whenever the transcript
  // carries an op-less row would make the golden trace go green while
  // silently removing version arithmetic from every future trace. The
  // count below still runs on every history; only the DIVISOR changed.
  const commits = detail.transcript.filter(
    (entry) => entry.entryKind !== "DECISION_REQUEST",
  ).length;
  const expected = 1 + commits + failCommits;
  if (detail.instance.version !== expected) {
    return [
      `version arithmetic: version ${String(detail.instance.version)} ≠ 1 + ${String(commits)} commits + ${String(failCommits)} fail commits`,
    ];
  }
  return [];
}

/** (instanceId, opId) pairs are distinct across the transcript. */
export function checkOpUniqueness(detail: InstanceDetail): string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const entry of detail.transcript) {
    // TWO of the three classes consume the ONE (instance_id, op_id)
    // uniqueness (C12): a transition's op id rides its envelope, a
    // fact's rides the row itself.
    //
    // K12 (ch14-p2a): the DECISION_REQUEST class is OP-LESS — kernel-
    // derived, consuming no uniqueness, correlated by `requestRef`. It
    // is SKIPPED rather than read, because recording an `undefined` as
    // a seen key would make a SECOND op-less row report a FALSE
    // duplicate. The rule is one line long and general: an op-less row
    // is not an op.
    //
    // C22/Q11 (packet ch14-p2b): the two OPERATOR classes are
    // OP-CARRYING, so the read below is correct for them BY
    // CONSTRUCTION and they are NOT skipped. The delta this packet owns
    // is that the skip stays SCOPED TO THE OP-LESS CLASS rather than
    // growing to "non-transition" — a widened skip would stop seeing
    // two whole classes of op consumption, which is the lane family 11
    // drives.
    if (entry.entryKind === "DECISION_REQUEST") {
      continue;
    }
    const opId = entry.entryKind === "transition" ? entry.envelope.opId : entry.opId;
    if (seen.has(opId)) {
      violations.push(`op uniqueness: duplicated op '${opId}' in the transcript`);
    }
    seen.add(opId);
  }
  return violations;
}

/**
 * Final-state equivalence, re-based onto the axis (packet ch12-p1a,
 * T2): `kernel_status = TERMINAL` ⇔ currentStep ∈ template.terminal
 * (DONE ≡ TERMINAL(done), the E1 map). Deliberately NOT
 * terminal-is-a-sink (pre-approval finding) — that historical claim
 * lives in checkTerminalSink's reconstruction.
 */
export function checkEndStateConsistency(
  detail: InstanceDetail,
  template: WorkflowTemplate,
): string[] {
  // T2 (packet ch12-p1b): the DONE-era equivalence scoped per
  // disposition — `done` presupposes a terminal position; `cancelled`/
  // `failed` are position-independent (cancel/fail fire from any
  // non-terminal state, position parked wherever the run reached).
  const position = detail.instance.currentStep;
  const atTerminal = position !== null && template.terminal.includes(position);
  const { kernelStatus, terminalDisposition } = detail.instance;
  if (terminalDisposition === "done" && !atTerminal) {
    return [
      `end-state consistency: disposition 'done' but currentStep '${String(position)}' is not terminal`,
    ];
  }
  if (kernelStatus !== "TERMINAL" && atTerminal) {
    return [
      `end-state consistency: currentStep '${String(position)}' is terminal but kernel_status is '${kernelStatus}'`,
    ];
  }
  if (kernelStatus === "ACTIVE" && position === null) {
    return ["end-state consistency: ACTIVE instance with a NULL currentStep"];
  }
  return [];
}

/**
 * Q11's TWO REPLAY LOOKUPS go through this (Q1's own-property
 * obligation). A decision key or resume event is an ordinary id-grammar
 * token, which admits prototype member names — an unguarded index
 * answers `constructor` with an INHERITED member instead of failing the
 * reconstruction, which is exactly what these checkers exist to catch.
 */
function ownEdge<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

/**
 * l0d/terminal-is-a-sink (re-based and EXTENDED, packet ch12-p1a T2):
 * pure over floor reads like every checker. Lanes:
 *  (c) the HISTORICAL sink claim: after terminal entry there is no
 *      later commit — transcript-based path reconstruction from
 *      template.start; a row committed FROM a terminal position
 *      violates the sink, and a row whose type has no transition at
 *      the reconstructed position is a violation too — a corrupt
 *      history breaks the sink proof, and the checker must not
 *      silently skip what it cannot replay;
 *  (a) `kernel_status = TERMINAL` ⇔ `terminal_disposition` non-null
 *      (the single-write rule's read face, T1);
 *  (b) the disposition is consistent with the reconstruction — at P1a
 *      `done` ⇔ the replayed position is terminal (the `cancelled`/
 *      `failed` shapes join WITH their writers at P1b);
 *  (d) `wait` is NULL at TERMINAL (S5's iff at the terminal cell).
 */
export function checkTerminalSink(
  detail: InstanceDetail,
  template: WorkflowTemplate,
): string[] {
  // (c) scoped to the ROW-BEARING terminal writers (packet ch12-p1b,
  // T2): `done`'s terminal transition row and `cancelled`'s CANCELLED
  // fact — NO committed row of EITHER class follows that row. FAIL's
  // write is deliberately row-less (L6): its sink proof is structural
  // and lane-driven, never checker-located. The position walk moves on
  // TRANSITION rows only — facts are position-inert.
  let position = template.start;
  let terminalRowSeq: number | null = null;
  let sawCancelledFact = false;
  for (const entry of detail.transcript) {
    if (terminalRowSeq !== null) {
      return [
        `terminal sink: row seq ${String(entry.seq)} committed AFTER the terminal row seq ${String(terminalRowSeq)} (terminal-is-a-sink)`,
      ];
    }
    if (entry.entryKind === "CANCELLED") {
      sawCancelledFact = true;
      terminalRowSeq = entry.seq;
      continue;
    }
    // Q11 (packet ch14-p2b): POSITION is now THREE-WAY. The op-less
    // DECISION_REQUEST class stays position-inert (the park does not
    // move the run); the two OPERATOR classes advance it through their
    // own edge maps, which is what closes this reader's blindness.
    if (
      entry.entryKind !== "transition" &&
      entry.entryKind !== "DECISION_MADE" &&
      entry.entryKind !== "WAIT_RESUMED"
    ) {
      continue;
    }
    if (template.terminal.includes(position)) {
      return [
        `terminal sink: row seq ${String(entry.seq)} commits FROM terminal position '${position}' (terminal-is-a-sink)`,
      ];
    }
    const step = template.steps[position];
    if (step === undefined) {
      return [
        `terminal sink: reconstructed position '${position}' has no step entry (corrupt history)`,
      ];
    }
    // The edge the row rode, by ROW CLASS: an actor transition through
    // `transitions[type]`, a decision through `decisions[key].target`,
    // a resume through `onResume[event]`. Each own-property guarded
    // exactly as the arrival's own indexes are.
    const edgeKey =
      entry.entryKind === "transition"
        ? entry.envelope.type
        : entry.entryKind === "DECISION_MADE"
          ? entry.decision
          : entry.event;
    const target =
      entry.entryKind === "transition"
        ? ownEdge(step.transitions, edgeKey)
        : entry.entryKind === "DECISION_MADE"
          ? ownEdge(step.decisions, edgeKey)?.target
          : ownEdge(step.onResume, edgeKey);
    if (target === undefined) {
      return [
        `terminal sink: no transition for '${edgeKey}' at '${position}' — reconstruction failed (corrupt history)`,
      ];
    }
    position = target;
    if (template.terminal.includes(position)) {
      terminalRowSeq = entry.seq;
    }
  }

  const violations: string[] = [];
  const { kernelStatus, terminalDisposition, wait, failureReason } = detail.instance;
  // (a) TERMINAL ⇔ non-null disposition.
  if (kernelStatus === "TERMINAL" && terminalDisposition === null) {
    violations.push(
      "terminal sink: kernel_status TERMINAL without a terminal_disposition (single-write rule)",
    );
  }
  if (kernelStatus !== "TERMINAL" && terminalDisposition !== null) {
    violations.push(
      `terminal sink: terminal_disposition '${terminalDisposition}' on a non-TERMINAL instance (kernel_status '${kernelStatus}')`,
    );
  }
  // (b) per-disposition reconstruction consistency (the T2 growth):
  // done ⇔ the replayed position is terminal; cancelled ⇔ a CANCELLED
  // fact exists (position-independent); failed ⇔ failure_reason
  // non-null (both directions — FAIL is the only reason writer, L6).
  const replayedTerminal = template.terminal.includes(position);
  if (terminalDisposition === "done" && !replayedTerminal) {
    violations.push(
      `terminal sink: disposition 'done' but the replayed position '${position}' is not terminal`,
    );
  }
  if (replayedTerminal && terminalDisposition !== "done") {
    violations.push(
      `terminal sink: replayed position '${position}' is terminal but the disposition is '${String(terminalDisposition)}' (expected 'done')`,
    );
  }
  if (terminalDisposition === "cancelled" && !sawCancelledFact) {
    violations.push(
      "terminal sink: disposition 'cancelled' without a CANCELLED fact row (the cancel witness)",
    );
  }
  if (sawCancelledFact && terminalDisposition !== "cancelled") {
    violations.push(
      `terminal sink: a CANCELLED fact exists but the disposition is '${String(terminalDisposition)}'`,
    );
  }
  if (terminalDisposition === "failed" && failureReason === null) {
    violations.push("terminal sink: disposition 'failed' without a failure_reason");
  }
  if (failureReason !== null && terminalDisposition !== "failed") {
    violations.push(
      `terminal sink: failure_reason present but the disposition is '${String(terminalDisposition)}'`,
    );
  }
  // (d) the FULL S5/T3 iff, both directions (gate-2 aftermath): `wait`
  // is non-null IFF the instance is WAITING — a stale wait outside
  // WAITING and a WAITING hold without its typed wait both violate.
  if (kernelStatus !== "WAITING" && wait !== null) {
    violations.push(
      `terminal sink: non-null wait on a ${kernelStatus} instance (S5 iff — wait ⇔ WAITING)`,
    );
  }
  if (kernelStatus === "WAITING" && wait === null) {
    violations.push("terminal sink: WAITING instance without a typed wait (S5 iff)");
  }
  // (e) l3/waiting-is-honest — the CHAPTER's half (ch14-C14). The S5 iff
  // above says a WAITING run HAS a wait; it says nothing about that
  // wait's KIND agreeing with WHERE the run is parked, which is why the
  // disposition is `checker` and not `satisfied by the existing iff`.
  //
  // It reads the SAME reconstructed position the walk above produced —
  // a second walk would be a second authority — and therefore inherits
  // that walk's position blindness to decision- and resume-routed
  // arrivals, which the walk's own two deferral markers already carry.
  // Those markers are NOT re-spelled here: the deferral tooling scans
  // for the marker token, and a prose mention of it in a comment that
  // defers nothing is a nonconforming occurrence the gate rejects.
  if (wait !== null) {
    const parkedStep = Object.prototype.hasOwnProperty.call(template.steps, position)
      ? template.steps[position]
      : undefined;
    if (wait.kind === "human_decision") {
      // (i) the kernel's decision kind exists ONLY at a parked gate.
      if (parkedStep?.type !== "human_gate") {
        violations.push(
          `waiting is honest: a 'human_decision' wait at position '${position}', which is not a humanGate step`,
        );
      }
      // (ii) …and only WITH the correlation handle its resumer needs —
      // a decision park with no live request_ref is unanswerable.
      if (wait.requestRef === undefined) {
        violations.push(
          `waiting is honest: a 'human_decision' wait at '${position}' carries no live request_ref`,
        );
      }
    }
    // (iii) an AUTHORED kind belongs only at a `wait` step DECLARING it.
    // SCOPED to the record this position's own arrival wrote: the
    // kernel-owned activation hold names no step (`requestedBy:
    // activation`), so a deferred-mode run held at a wait-class START
    // step is outside the correspondence rather than a false violation.
    if (
      parkedStep?.type === "wait" &&
      wait.requestedBy === position &&
      wait.kind !== parkedStep.wait?.kind
    ) {
      violations.push(
        `waiting is honest: wait kind '${wait.kind}' at '${position}', which declares wait kind '${String(parkedStep.wait?.kind)}'`,
      );
    }
  }
  return violations;
}

/**
 * l2/round-is-canonical-reconstructable (packet ch11-P2c, T1): the stored
 * round must equal the round reconstructed by replaying the committed
 * transcript over the admitted template's `advancesRound` flags. Replay
 * from template.start (the checkTerminalSink walk); the round BASE is
 * activation-observable (packet ch12-p1b): genesis is 0, and the
 * activation write sets 1 — witnessed by an immediate-mode STARTED
 * fact or a TASK_SUPPLIED fact. Each
 * committed row whose replayed-position step carries
 * `advancesRound[type] === true` adds one. A divergent stored round is a
 * violation naming BOTH values (the checkVersionArithmetic idiom); a
 * non-resolving replay (no step at the position, no transition for the
 * row's type) is a violation, never a skip (the checkTerminalSink
 * corrupt-history precedent). Consumes the ADMITTED flags — the harness
 * seam narrows to AdmittedTemplate so a raw template cannot reconstruct 1
 * against a stored 2 silently.
 */
export function checkRoundReconstruction(
  detail: InstanceDetail,
  template: WorkflowTemplate,
): string[] {
  // Activation basis (packet ch12-p1b): genesis is round 0; the
  // activation write sets 1 (C11). Activation is floor-observable —
  // an immediate-mode STARTED fact, or a TASK_SUPPLIED fact (the
  // kickoff activation); facts are position-inert to the replay.
  const activated = detail.transcript.some(
    (entry) =>
      (entry.entryKind === "STARTED" && detail.instance.activationMode === "immediate") ||
      entry.entryKind === "TASK_SUPPLIED",
  );
  let position = template.start;
  let round = activated ? 1 : 0;
  for (const entry of detail.transcript) {
    // Q11: the same three-way position walk as the terminal sink above.
    if (
      entry.entryKind !== "transition" &&
      entry.entryKind !== "DECISION_MADE" &&
      entry.entryKind !== "WAIT_RESUMED"
    ) {
      continue;
    }
    const step = template.steps[position];
    if (step === undefined) {
      return [
        `round reconstruction: reconstructed position '${position}' has no step entry (corrupt history)`,
      ];
    }
    const edgeKey =
      entry.entryKind === "transition"
        ? entry.envelope.type
        : entry.entryKind === "DECISION_MADE"
          ? entry.decision
          : entry.event;
    const target =
      entry.entryKind === "transition"
        ? ownEdge(step.transitions, edgeKey)
        : entry.entryKind === "DECISION_MADE"
          ? ownEdge(step.decisions, edgeKey)?.target
          : ownEdge(step.onResume, edgeKey);
    if (target === undefined) {
      return [
        `round reconstruction: no transition for '${edgeKey}' at '${position}' — reconstruction failed (corrupt history)`,
      ];
    }
    // THE ROUND WALK GAINS THE SAME EDGES: `advancesRound` is the
    // SINGLE per-step map ch14-P1 expanded all three edge classes into,
    // so it is keyed by the DECISION KEY and the EVENT TYPE here
    // exactly as by the event type on a transition.
    if (ownEdge(step.advancesRound, edgeKey) === true) {
      round += 1;
    }
    position = target;
  }
  if (round !== detail.instance.round) {
    return [
      `round reconstruction: stored round ${String(detail.instance.round)} ≠ reconstructed round ${String(round)}`,
    ];
  }
  return [];
}

/**
 * T2 (packet ch11-P3b): the `l2a/evidence-on-every-run` invariant's
 * STORE-VISIBLE half. Over the floor-read detail, EVERY `evidenceRefs` element
 * on EVERY committed retained decision must resolve through the provided
 * evidence seam. A non-resolving ref is a violation naming the ref; refs
 * PRESENT with NO seam provided is a violation (fail-closed — a checker that
 * skips is the blind-lane class; the unknown-is-not-a-pass rule at checker
 * grain); a ref-FREE detail with no seam is clean (every pre-l2a trace passes
 * unchanged).
 */
export function checkEvidenceResolution(
  detail: InstanceDetail,
  resolveEvidence?: EvidenceResolveSeam,
): string[] {
  const violations: string[] = [];
  for (const entry of detail.transcript) {
    if (entry.entryKind !== "transition") {
      continue;
    }
    for (const decision of entry.gateDecisions) {
      for (const ref of decision.evidenceRefs ?? []) {
        if (resolveEvidence === undefined) {
          violations.push(
            `evidence resolution: ref '${ref}' present on a committed decision but NO evidence seam was provided (fail-closed)`,
          );
          continue;
        }
        if (resolveEvidence(ref) === undefined) {
          violations.push(
            `evidence resolution: ref '${ref}' does not resolve through the provided evidence seam`,
          );
        }
      }
    }
  }
  return violations;
}

/** The harness entry point: every checker, violations concatenated. The
 * OPTIONAL evidence seam threads to `checkEvidenceResolution` (T2). */
export function runAllCheckers(
  detail: InstanceDetail,
  template: WorkflowTemplate,
  resolveEvidence?: EvidenceResolveSeam,
): string[] {
  return [
    ...checkSeqContinuity(detail),
    ...checkVersionArithmetic(detail),
    ...checkOpUniqueness(detail),
    ...checkEndStateConsistency(detail, template),
    ...checkTerminalSink(detail, template),
    ...checkRoundReconstruction(detail, template),
    ...checkEvidenceResolution(detail, resolveEvidence),
  ];
}
