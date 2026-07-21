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
function derivePolicyView(
  template: WorkflowTemplate,
  committed: readonly TranscriptEntry[],
): readonly GateProjectionEntry[] {
  const history: GateProjectionEntry[] = [];
  let position = template.start;
  for (const entry of committed) {
    // F4 (packet ch12-p1b): the projection walks TRANSITION rows only —
    // fact rows carry no envelope and no gate decisions by class, so
    // they are class-invisible to gate history (skipping IS the
    // faithful semantics, not data loss).
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
    const target = step.transitions[eventType];
    if (target === undefined) {
      throw new Error(
        `kernel integrity: gate projection replay found no transition for '${eventType}' at '${position}' (corrupt committed history)`,
      );
    }
    history.push({ stepId: position, eventType, role: step.role });
    position = target;
  }
  return history;
}
