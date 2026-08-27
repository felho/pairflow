import type {
  EventType,
  GateProjection,
  GateProjectionEntry,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";

/**
 * `l2-pseudocode/gate_projection` (packet ch11-P2b, V1–V4): the
 * policy-facing read model, PURE over (instance, template, committed
 * entries) + the current envelope's event type. The evaluator reads
 * this and NOTHING else — never the store, the raw transcript, the
 * instance aggregate, or any payload (V3: the projection carries only
 * C24's four fields, and each history entry only `{stepId, eventType,
 * role}`).
 *
 * The kernel derives it once per HANDLE attempt, lazily (K6), from a
 * committed-rows snapshot; the derivation writes nothing
 * (REV-C-PROJECTIONS-READONLY).
 */
export function deriveGateProjection(
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  committed: readonly TranscriptEntry[],
  eventType: EventType,
): GateProjection {
  // G2 (packet ch12-p1b): gates evaluate only in ACTIVE execution —
  // the state rung precedes every projection read, so a NULL position
  // here is integrity drift (the type-level narrow).
  if (instance.currentStep === null) {
    throw new Error(
      `kernel integrity: gate projection for instance '${instance.instanceId}' with a NULL current_step`,
    );
  }
  return {
    round: instance.round,
    currentStep: instance.currentStep,
    eventType,
    history: derivePolicyView(template, committed),
  };
}

/**
 * V2: the ordered `{stepId, eventType, role}` view of the committed
 * transcript. `stepId` is the step the transition was emitted FROM,
 * reconstructed by REPLAY over the pinned template: pos₀ =
 * `template.start`; entryᵢ's `stepId` = posᵢ, `eventType` = its
 * envelope's type, `role` = `steps[posᵢ].role` (the granted role);
 * posᵢ₊₁ = `steps[posᵢ].transitions[type]`. The replay is TOTAL over
 * committed state under the pinned immutable template (the l1 HANDLE
 * load-time-validation guarantee) — a non-resolving step is therefore a
 * kernel-integrity throw (V4, the `loadTemplate` class), never a
 * rejection.
 */
/**
 * The replay's authored-key indexes go through this (Q1's own-property
 * obligation): the id grammar admits prototype member names, and an
 * unguarded index answers such a spelling with an INHERITED member
 * rather than with the corrupt-history throw beside it.
 */
function ownEdge<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

function derivePolicyView(
  template: WorkflowTemplate,
  committed: readonly TranscriptEntry[],
): readonly GateProjectionEntry[] {
  const history: GateProjectionEntry[] = [];
  let position = template.start;
  for (const entry of committed) {
    // F4 (packet ch12-p1b): fact rows carry no envelope and no gate
    // decisions by class, so they are class-invisible to gate history
    // (skipping IS the faithful semantics, not data loss). The op-less
    // DECISION_REQUEST class is position-inert for the same reason.
    //
    // Q11 (packet ch14-p2b): THE POSITION WALK IS NOW THREE-WAY, and
    // THIS READER IS THE ONE THAT MATTERS — it is PRODUCTION. Before
    // this fix, any gated workflow crossing a `humanGate` would resume
    // its policy view from the PRE-GATE position and THROW on the next
    // transition row. The two operator classes advance the position
    // without contributing a gate-history ENTRY: a decision and a
    // resume run no gates, so they move the walk and push nothing.
    if (
      entry.entryKind === "DECISION_MADE" ||
      entry.entryKind === "WAIT_RESUMED"
    ) {
      const parked = template.steps[position];
      if (parked === undefined) {
        throw new Error(
          `kernel integrity: gate projection replay reached position '${position}' with no step (corrupt committed history)`,
        );
      }
      const edgeKey = entry.entryKind === "DECISION_MADE" ? entry.decision : entry.event;
      // Own-property guarded exactly as the arrival's own indexes are:
      // the id grammar admits prototype member names.
      const routed =
        entry.entryKind === "DECISION_MADE"
          ? ownEdge(parked.decisions, edgeKey)?.target
          : ownEdge(parked.onResume, edgeKey);
      if (routed === undefined) {
        throw new Error(
          `kernel integrity: gate projection replay found no route for '${edgeKey}' at '${position}' (corrupt committed history)`,
        );
      }
      position = routed;
      continue;
    }
    if (entry.entryKind !== "transition") {
      continue;
    }
    const step = template.steps[position];
    if (step === undefined) {
      throw new Error(
        `kernel integrity: gate projection replay reached position '${position}' with no step (corrupt committed history)`,
      );
    }
    const eventType = entry.envelope.type;
    // K11 (ch14-p2a): `transitions` and `role` are optional since the
    // class set opened. This replay walks COMMITTED TRANSITION rows, and
    // a transition can only have been committed FROM an agent step — so
    // their absence here is corrupt committed history, the same register
    // as the two throws around it, never a projection that skips a row.
    const { role, transitions } = step;
    if (transitions === undefined || role === undefined) {
      throw new Error(
        `kernel integrity: gate projection replay reached non-agent step '${position}' ` +
          `(role/transitions absent) with a committed transition row (corrupt committed history)`,
      );
    }
    const target = ownEdge(transitions, eventType);
    if (target === undefined) {
      throw new Error(
        `kernel integrity: gate projection replay found no transition for '${eventType}' at '${position}' (corrupt committed history)`,
      );
    }
    history.push({ stepId: position, eventType, role });
    position = target;
  }
  return history;
}
