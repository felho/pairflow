import type {
  WorkflowTemplate,
  AgentConfig,
  DecisionRecommendationSource,
  DecisionRequestBody,
  StepId,
  WaitReason,
  WorkflowInstance,
} from "../domain/index.js";
import type { ArrivalEffect, ArrivalEffectFields } from "../ports/store.js";

/**
 * l3/apply_target_entry_effects (packet ch14-p2a, K1) — the ONE target-
 * entry rule every ARRIVAL applies, whatever entry path chose the
 * target.
 *
 * An ARRIVAL is a routed entry through a ChoicePoint. The activation of
 * a run at its start step is NOT one (K18 names that fourth entry and
 * GUARDS it rather than routing it here), which is why this function
 * has no activation branch and must not grow one.
 *
 * The model MUTATES an instance in place; the realized store takes a
 * kernel-DERIVED commit input and writes it verbatim in one
 * transaction. So the arrival returns the arrival's committed EFFECT
 * rather than a mutated instance — and the effect record is CLOSED,
 * because a target-shaped vocabulary is exactly what drops the last
 * member.
 *
 * PURITY, stated precisely rather than broadly: no I/O, no argument
 * mutated, and ONE effect — the ref mint on the gate branch. That is
 * why `deps` is a parameter and not a captured global, and why a
 * CAS-restarted attempt mints again (the committed ref is the winning
 * attempt's, with the losing attempt's value burned from the shared
 * sequence).
 */

/** The kernel's own minting seam, threaded rather than captured. */
export interface ArrivalDeps {
  /**
   * The kernel's established `newRequestId` idiom, read WHOLE: the
   * injected TimeSource composed with a kernel-local counter,
   * deterministic under the controlled clock. It SHARES that counter
   * rather than minting a second — two counters under a frozen clock
   * emit byte-identical strings for a provisioning `request_id` and a
   * decision `request_ref`.
   */
  readonly newRequestId: () => string;
}

/**
 * The edge the arrival came in on. ALWAYS present, and the EDGE KEY is
 * what the kernel is permitted to read rather than the target, on
 * three independent grounds — the first alone is contestable, so the
 * other two are stated with it:
 *
 *  (i)   C39 bans inferring round advancement from target equality BY
 *        NAME, and a reverse scan over the source step's edge maps to
 *        recover the flag from `(from, target)` is that inference.
 *  (ii)  The REALIZED flags are keyed by EDGE at the source step, so a
 *        `fromStepId` alone cannot reach one — the shape, not the
 *        rule, forecloses the scan.
 *  (iii) The recommendation lookup independently needs the key: two
 *        edges into one gate may declare DIFFERENT recommendations, so
 *        no target-keyed lookup can answer it.
 */
export interface ArrivalFrom {
  readonly stepId: StepId;
  readonly edgeKey: string;
}

/**
 * The arriving entry's own surface. Carried here because `context_ref`
 * rides the ENVELOPE and not the instance — a build taking a bare
 * four-argument form ships a park with no context surface at all.
 */
export interface ArrivingEntry {
  readonly payload?: unknown;
}

/**
 * EVERY AUTHORED-KEY INDEX GOES THROUGH THIS, stated as a rule rather
 * than an aside: the id grammar legally admits prototype member names,
 * and an unguarded index answers such a spelling with an INHERITED
 * member. Realized as a per-module private copy on the tree's own
 * precedent rather than by extracting a shared helper, which would be a
 * refactor outside this packet's subject.
 */
function ownEntry<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

/** The brand's ONE sanctioned producer (K1) — module-private on purpose. */
function seal(fields: ArrivalEffectFields): ArrivalEffect {
  return fields as ArrivalEffect;
}

export function applyTargetEntryEffects(
  deps: ArrivalDeps,
  instance: WorkflowInstance,
  template: WorkflowTemplate,
  from: ArrivalFrom,
  target: StepId,
  arriving: ArrivingEntry,
  issuedAgentConfig: AgentConfig,
): ArrivalEffect {
  const fromStep = ownEntry(template.steps, from.stepId);
  // Round advancement is DECLARED transition semantics, read off the
  // SOURCE step's admission-normalized flag for the EDGE — never
  // inferred from target equality (C39's ban). `=== true` is explicit-
  // flag consumption; an admitted map is complete.
  const newRound =
    ownEntry(fromStep?.advancesRound, from.edgeKey) === true ? instance.round + 1 : instance.round;

  const base = { newCurrentStep: target, newRound, issuedAgentConfig } as const;

  // The terminal branch is the target SET's membership, not a class
  // discriminator. l0d/COMPLETE's precondition WIDENS here (packet
  // ch14-p2b, Q8): it was ACTIVE-only, and a resumed decision or wait
  // arrival may now complete too — only DOUBLE-completion is barred.
  //
  // THE GUARD IS A DEFENSIVE INTEGRITY BAR, not a driven entry-path
  // lane, and that is stated rather than dressed up: every entry path's
  // STATE rung refuses a TERMINAL instance before the arrival runs —
  // HANDLE requires ACTIVE, the submit requires WAITING(human_decision),
  // the resume requires WAITING — so no routed entry can present an
  // already-TERMINAL instance here. It is fail-loud and never a registry
  // rejection (C19's surface is closed), and its only reachable driver
  // is a DIRECT unit call.
  if (template.terminal.includes(target)) {
    if (instance.kernelStatus === "TERMINAL") {
      throw new Error(
        `kernel integrity: double completion — instance '${instance.instanceId}' is already TERMINAL`,
      );
    }
    return seal({
      ...base,
      newKernelStatus: "TERMINAL",
      newTerminalDisposition: "done",
      newWait: null,
    });
  }

  const targetStep = ownEntry(template.steps, target);

  // K14 (non-movement): a target that is neither terminal NOR a declared
  // step takes the AGENT branch here — the same branch the absence of a
  // discriminator takes — and is NOT refused at this point. Refusing it
  // would be an improvement that MOVES a pre-ch14 path: before this
  // refactor the commit landed and the DISPATCH derivation threw
  // afterwards, so the transition persisted. Throwing pre-commit would
  // leave nothing persisted and change what a caller observes on a path
  // this packet promised not to move.
  //
  // The downstream throw is unchanged and still the one that fires. If a
  // later chapter wants this refused earlier, that is a deliberate
  // behaviour change with its own parity argument, not a side effect of
  // factoring the arrival out.
  switch (targetStep?.type) {
    case undefined: {
      // The AGENT class, reached by ABSENCE of a discriminator and never
      // as a fallthrough for an unknown token. The wait is CLEARED
      // explicitly — the S5 same-move clear the record's always-explicit
      // `newWait` exists to make unforgettable.
      return seal({
        ...base,
        newKernelStatus: "ACTIVE",
        newTerminalDisposition: null,
        newWait: null,
      });
    }
    // The declared TOKEN spelling, snake — the model's token is what is
    // preserved, never a TS field spelling (K3's casing rule).
    case "human_gate": {
      const recipient = targetStep.role;
      if (recipient === undefined) {
        throw new Error(
          `kernel integrity: human_gate '${target}' declares no role — admission requires one`,
        );
      }
      const decisions = Object.keys(targetStep.decisions ?? {});
      // (i) `firing_transition_into`: the source step's CLASS decides
      // whether a recommendation can exist AT ALL. Only an agent step
      // carries `transitions`/`recommends`, so a gate- or wait-sourced
      // arrival takes C13's FIRST absence branch STRUCTURALLY — not by a
      // runtime search that could silently find the wrong edge on a
      // re-arrival.
      const recommendation =
        fromStep !== undefined && fromStep.type === undefined
          ? ownEntry(fromStep.recommends, from.edgeKey)
          : undefined;
      const recommendationSource: DecisionRecommendationSource | undefined =
        recommendation === undefined
          ? undefined
          : { fromStep: from.stepId, eventType: from.edgeKey };
      const requestRef = deps.newRequestId();
      const decisionRequest: DecisionRequestBody = {
        requestRef,
        recipient,
        decisions,
        ...(recommendation !== undefined ? { recommendation } : {}),
        ...(recommendationSource !== undefined ? { recommendationSource } : {}),
        // (ii) `payload_of_transition_into`: the arriving entry's payload
        // SURFACE, present IFF that payload is not ABSENT. A PRESENCE
        // test, never a truth test — an authored `{}`, `null`, `""` or
        // `0` records as faithfully as an authored object.
        ...("payload" in arriving ? { contextRef: arriving.payload } : {}),
      };
      const wait: WaitReason = {
        kind: "human_decision",
        requestedBy: target,
        resumeEvents: decisions,
        requestRef,
      };
      return seal({
        ...base,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: wait,
        decisionRequest,
      });
    }
    case "wait": {
      const declared = targetStep.wait;
      if (declared === undefined) {
        throw new Error(
          `kernel integrity: wait step '${target}' declares no wait — admission requires one`,
        );
      }
      // The bare wait appends NO transcript row of its own: the
      // arrival's committing entry IS the record, and wait state lives
      // in the instance record. No `requestRef` — the field is present
      // IFF the human-gate park wrote the record.
      return seal({
        ...base,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: {
          kind: declared.kind,
          requestedBy: target,
          resumeEvents: declared.resumeEvents,
        },
      });
    }
    default: {
      // An admitted template carries only tokens the declaration
      // admits, so a token the fan-out does not know is kernel-integrity
      // DRIFT rather than a default arm (the live
      // `resolveRuntimeContextRequirement` dead-belt precedent). This is
      // deliberately unlike the wait-KIND treatment downstream: an
      // unknown target TYPE would mean the arrival wrote a state it
      // cannot describe.
      const unknown = String(targetStep?.type);
      throw new Error(
        `kernel integrity: arrival target '${target}' carries unknown step type '${unknown}'`,
      );
    }
  }
}
