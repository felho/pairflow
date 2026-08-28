import type {
  ActorId,
  AgentConfig,
  DecisionRequestBody,
  InstanceId,
  OpId,
  ResumeWaitOutcome,
  RoleName,
  StepId,
  SubmitDecisionOutcome,
  TranscriptEntry,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
// ch14-p3a (F4): the Ask's sibling now lives in `domain/`.
import { requiredFields } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { ProviderRegistry } from "../ports/runtimeContextProvider.js";
import type { StorePort } from "../ports/store.js";

import { admitLoaded } from "./admission.js";
import type {
  AdmitCompareKind,
  AdmitLadderOwnReason,
  AdmitPredicateExpect,
  AdmitRejectReason,
} from "./admission.js";
import { resolveAgentConfig } from "./agentConfig.js";
import { applyTargetEntryEffects } from "./arrival.js";
import { loadPinnedTemplate } from "./pinnedTemplate.js";
import { postCommitOutput } from "./postCommitOutput.js";

/**
 * The two OPERATOR INTENTS (packet ch14-p2b) — `SUBMIT_DECISION` and
 * `RESUME_WAIT`, a THIRD entry class sibling to neither the actor
 * envelope nor the lifecycle intent.
 *
 * They are SIBLINGS of KICKOFF in shape, not in lifecycle: they resume
 * a wait, they carry an op id, and they commit through ONE transaction
 * — but they route through a ChoicePoint and KICKOFF does not, and that
 * routing is what can make the transaction write TWO rows where
 * KICKOFF's writes one.
 *
 * Both end the same way (C11/C12): append their own committed row,
 * apply the SHARED arrival to the routed target, `version + 1`, and
 * return `Committed(version, post_commit_output(…))`. The arrival is
 * CALLED, never re-implemented.
 */

/**
 * EVERY AUTHORED-KEY INDEX GOES THROUGH THIS (Q1's own-property
 * obligation). The id grammar legally admits prototype member names,
 * and an unguarded index answers such a spelling with an INHERITED
 * member instead of a refusal — `decisions["constructor"]` would answer
 * with a function where the contract says `unknown_decision`. Realized
 * as a per-module private copy on the tree's own precedent (the arrival
 * carries its own), rather than by extracting a shared helper, which
 * would be a refactor outside this packet's subject.
 */
function ownEntry<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key)
    ? record[key]
    : undefined;
}

export interface OperatorIntentDeps {
  readonly store: StorePort;
  readonly definitions: DefinitionStore;
  readonly providerRegistry: ProviderRegistry;
  /** The kernel's minting seam, threaded into the arrival (never captured). */
  readonly newRequestId: () => string;
}

/**
 * SUBMIT_DECISION's KERNEL-SIDE input (C9's closed keyset in the
 * realized camel spelling, plus Q9's nominal discriminator).
 *
 * **`intent` IS A REQUIRED LITERAL-TYPED MEMBER and that is the whole
 * class separation.** C15 fixes the separation as a shape no envelope
 * type is assignable to, and SHAPE ALONE DOES NOT DELIVER IT: an
 * `EventEnvelope` is structurally assignable to a bare
 * `{ instanceId, opId, expectedVersion?, … }` because excess-property
 * checking binds only fresh object literals. A required literal member
 * no envelope carries — and no envelope TYPE can satisfy — is what
 * closes it. Family 17 drives it as a COMPILE-NEGATIVE.
 *
 * `expectedVersion` is `number | undefined` deliberately: its ABSENCE
 * must REACH the version rung's `missing_version` (Q9's presence
 * boundary), never be refused at ingress.
 */
export interface SubmitDecisionInput {
  readonly intent: "submit-decision";
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly expectedVersion: number | undefined;
  readonly requestRef: string;
  readonly verdict: string;
  readonly override?: boolean;
  readonly payload?: unknown;
  /** The deciding operator; ABSENT must reach the AUTHORITY rung. */
  readonly by: ActorId | undefined;
}

/** RESUME_WAIT's kernel-side input — the same rules as above. */
export interface ResumeWaitInput {
  readonly intent: "resume-wait";
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly expectedVersion: number | undefined;
  readonly type: string;
}

/**
 * `admit_input`'s own expectation type — NOT `AdmitExpect`, for two
 * forced reasons (the realization note): it carries the intent's `opId`
 * because IT performs the `findOp` lookup (the live ladder receives the
 * found ROW, resolved by its caller), and it must read whether an
 * authority expectation is PRESENT before it can resolve the granted
 * side. It PRODUCES `AdmitExpect` and DELEGATES.
 */
interface AdmitInputExpect<R extends AdmitRejectReason> {
  readonly instanceId: InstanceId;
  readonly opId: OpId;
  readonly compareKind: AdmitCompareKind;
  readonly state: AdmitPredicateExpect<R>;
  readonly correlate?: AdmitPredicateExpect<R>;
  readonly expectedVersion: number | undefined;
  /**
   * PRESENT on the submit path only. Its presence is ALSO what makes
   * `admitInput` load the pinned template — which is what keeps the
   * resume path's load post-admission.
   */
  readonly authority?: {
    readonly claim: string | undefined;
    /**
     * Resolved to a plain VALUE before the ladder is called, from the
     * loaded instance and its pinned template — so no port and no
     * `await` ever reaches a rung and the shared ladder stays
     * SYNCHRONOUS (Q3).
     */
    readonly granted: (instance: WorkflowInstance, template: WorkflowTemplate) => RoleName | undefined;
    readonly missing: R;
    readonly mismatch: R;
  };
}

/**
 * `admit_input`'s refused arms. `unknown_instance` lives HERE rather
 * than in the shared `AdmitResult` union: the load is NOT a rung (the
 * l0d unit is explicit), so its answer is carried outside the ladder's
 * result and every path sharing `AdmitResult` is left unwidened by it.
 */
type AdmitInputRefused<R extends AdmitRejectReason> =
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | {
      readonly kind: "rejected";
      readonly reason: R | AdmitLadderOwnReason | "unknown_instance";
    };

/**
 * THE ACCEPTED ARM CARRIES THE TEMPLATE as a REQUIRED member on the
 * SUBMIT path and none on the RESUME path — two accepted shapes
 * discriminated by the CALLER's own expectation, never one shape
 * narrowed by an assertion. The load is conditional, and a handler
 * asserting non-null on a state its own call shape guarantees is how
 * that guarantee stops being checked.
 */
interface AdmitInputAccepted<T> {
  readonly kind: "accepted";
  readonly instance: WorkflowInstance;
  readonly template: T;
}

/**
 * The load-first companion born at L3: ONE call either rejects an
 * unknown instance or runs the FULL ladder — the loaded instance leaves
 * this helper ONLY through `Accepted`.
 *
 * IT IS ONE LADDER, PARAMETERIZED, never a third one beside
 * `admitLoaded` and `admitLifecycle`: this function loads, resolves,
 * and DELEGATES.
 */
async function admitInput<R extends AdmitRejectReason>(
  deps: Pick<OperatorIntentDeps, "store" | "definitions">,
  expect: AdmitInputExpect<R> & {
    readonly authority: NonNullable<AdmitInputExpect<R>["authority"]>;
  },
): Promise<AdmitInputAccepted<WorkflowTemplate> | AdmitInputRefused<R>>;
async function admitInput<R extends AdmitRejectReason>(
  deps: Pick<OperatorIntentDeps, "store" | "definitions">,
  expect: AdmitInputExpect<R> & { readonly authority?: undefined },
): Promise<AdmitInputAccepted<undefined> | AdmitInputRefused<R>>;
async function admitInput<R extends AdmitRejectReason>(
  deps: Pick<OperatorIntentDeps, "store" | "definitions">,
  expect: AdmitInputExpect<R>,
): Promise<AdmitInputAccepted<WorkflowTemplate | undefined> | AdmitInputRefused<R>> {
  const instance = await deps.store.loadInstance(expect.instanceId);
  // THE LOAD IS NOT A RUNG — it precedes them, and its answer is this
  // helper's own (the unit is explicit about both halves).
  if (instance === null) {
    return { kind: "rejected", reason: "unknown_instance" };
  }
  const existing = await deps.store.findOp(expect.instanceId, expect.opId);
  // The pinned template is loaded ONLY when an authority expectation is
  // present, which is what keeps the resume path's load POST-admission.
  // The template ref lives on the instance THIS function loaded, so the
  // HANDLER cannot pre-resolve it the way HANDLE does — only this can.
  const template =
    expect.authority !== undefined
      ? await loadPinnedTemplate(deps.definitions, instance)
      : undefined;
  const outcome = admitLoaded(instance, {
    idempotency: { existing, compare: { mode: "kind", kind: expect.compareKind } },
    state: expect.state,
    ...(expect.correlate !== undefined ? { correlate: expect.correlate } : {}),
    expectedVersion: expect.expectedVersion,
    ...(expect.authority !== undefined && template !== undefined
      ? {
          authority: {
            claim: expect.authority.claim,
            granted: expect.authority.granted(instance, template),
            missing: expect.authority.missing,
            mismatch: expect.authority.mismatch,
          },
        }
      : {}),
  });
  if (outcome.kind !== "accepted") {
    return outcome;
  }
  return { kind: "accepted", instance, template };
}

/**
 * C17's `clear_stale_decision_context`, REALIZED AS A NAMED FUNCTION
 * rather than as an absence — a live call in an IMPLEMENTED unit gets a
 * witness, or the unit is not realized.
 *
 * WHAT IT DOES TODAY IS NOTHING, and that is stated IN it rather than
 * inferred: the realized instance record holds no review or approval
 * context. The `wait` is cleared by the arrival's own branch, and the
 * context a dispatch carries is assembled per-dispatch from the pinned
 * template plus the THREADED handoff, never read from stored state. So
 * the function is vacuous at this basis — named, called on the
 * advancing branch, and carrying its own emptiness here, the tree's own
 * idiom for a rule reached for a reason its current body does not show.
 *
 * The PROOF BOUNDARY: this packet proves the rework target's first
 * dispatch carries the submitted payload and that no stale value
 * survives into it. It CANNOT prove that no FUTURE stored decision
 * context will need clearing, and this function does not claim to.
 */
function clearStaleDecisionContext(): void {
  // Vacuous at this basis — see the class comment.
}

/**
 * The C15 CLOSED empty set, plus ABSENT as its own condition. A
 * whitespace-only string is NOT a member and must NOT be trimmed: a
 * trimming build passes every closed member (they reject either way)
 * and the nonempty control (it accepts either way), so only the
 * whitespace cell separates the two builds.
 */
function isEmptyRequiredValue(value: unknown): boolean {
  return (
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  );
}

/**
 * Q4's pending-request read: the DECISION_REQUEST row the park
 * committed, selected from committed state through the store's EXISTING
 * timeline read — no new port member.
 *
 * ITS COST IS STATED HONESTLY: the timeline read returns the transcript
 * from a cursor, so the scan is O(transcript), not O(parks). Acceptable
 * at this basis because a run's transcript is bounded by its own
 * committed ops.
 *
 * THE ABSENT DIRECTION IS A THROW, NEVER A REJECTION: the correlation
 * rung already proved the wait cites this ref, so a WAITING
 * (human_decision) instance whose request row is absent is CORRUPT
 * COMMITTED HISTORY and a fail-loud kernel-integrity error.
 */
async function pendingDecisionRequest(
  store: StorePort,
  instance: WorkflowInstance,
  requestRef: string,
): Promise<TranscriptEntry & { readonly entryKind: "DECISION_REQUEST" }> {
  const timeline = await store.getTimeline(instance.instanceId, 0);
  const found = timeline?.find(
    (entry) => entry.entryKind === "DECISION_REQUEST" && entry.requestRef === requestRef,
  );
  if (found === undefined || found.entryKind !== "DECISION_REQUEST") {
    throw new Error(
      `kernel integrity: instance '${instance.instanceId}' is WAITING(human_decision) on ` +
        `request_ref '${requestRef}' with no committed DECISION_REQUEST row`,
    );
  }
  return found;
}

/**
 * l3/SUBMIT_DECISION — the operator's decision on a parked human gate.
 *
 * The CAS-restart loop is HANDLE's own shape, unchanged: on a conflict
 * the WHOLE handler restarts from load, so the full ladder re-runs on
 * fresh state and no target computed from stale state is ever
 * re-committed. `onCasRestart` is the emission hook — the shared
 * lifecycle wrapper awaits ONE call and classifies the RESOLVED
 * outcome, so it has no loop and no sentinel and could never fire this
 * class (Q18).
 */
export async function submitDecision(
  deps: OperatorIntentDeps,
  input: SubmitDecisionInput,
  onCasRestart: () => void = () => undefined,
): Promise<SubmitDecisionOutcome> {
  for (;;) {
    const attempt = await submitDecisionOnce(deps, input);
    if (attempt === "restart") {
      onCasRestart();
      continue;
    }
    return attempt;
  }
}

async function submitDecisionOnce(
  deps: OperatorIntentDeps,
  input: SubmitDecisionInput,
): Promise<SubmitDecisionOutcome | "restart"> {
  // ADMISSION via admit_input — the operator-intent rungs, in the order
  // C15 fixes: idempotency → state → correlation → staleness →
  // authority.
  const admitted = await admitInput(
    { store: deps.store, definitions: deps.definitions },
    {
      instanceId: input.instanceId,
      opId: input.opId,
      // Q15: the KIND compare, the intent's OWN committed kind.
      compareKind: "DECISION_MADE",
      state: {
        // Only a parked human_gate accepts a decision.
        holds: (loaded) =>
          loaded.kernelStatus === "WAITING" && loaded.wait?.kind === "human_decision",
        reject: "not_awaiting_decision",
      },
      correlate: {
        // Correlation to THIS pending DECISION_REQUEST.
        holds: (loaded) => loaded.wait?.requestRef === input.requestRef,
        reject: "decision_request_mismatch",
      },
      expectedVersion: input.expectedVersion,
      authority: {
        claim: input.by,
        // The gate's role, resolved through the instance binding. BOTH
        // branches answer `operator_not_authorized` (C19 gives one name;
        // the L1 house style declares both).
        granted: (loaded, template) => {
          const gate =
            loaded.currentStep === null ? undefined : ownEntry(template.steps, loaded.currentStep);
          const role = gate?.role;
          return role === undefined ? undefined : ownEntry(loaded.binding, role);
        },
        missing: "operator_not_authorized",
        mismatch: "operator_not_authorized",
      },
    },
  );
  if (admitted.kind !== "accepted") {
    return admitted;
  }
  const instance = admitted.instance;
  const template = admitted.template;
  // Past the state rung the position is non-null: a WAITING
  // (human_decision) run is parked AT its gate. The narrow is the
  // type-level belt, with the tree's fail-loud integrity treatment.
  const gateId: StepId | null = instance.currentStep;
  if (gateId === null) {
    throw new Error(
      `kernel integrity: instance '${instance.instanceId}' parked at a human gate with a NULL current_step`,
    );
  }
  const step = ownEntry(template.steps, gateId);
  // The ChoicePoint selection: a human_gate's `decisions` map IS its
  // transition map, keyed by decision key. The kernel routes by the key
  // — it does not know what "approve" means. OWN-PROPERTY GUARDED: a
  // verdict spelling a prototype member name must answer
  // `unknown_decision`, which an unguarded index answers with an
  // inherited member instead.
  const choice = ownEntry(step?.decisions, input.verdict);
  if (choice === undefined) {
    return { kind: "rejected", reason: "unknown_decision" };
  }
  // The KEY-SCOPED guards, in the order dimension 5 fixes:
  // unknown_decision → missing_required_field → the override guards. An
  // unknown verdict NEVER reaches the override guards.
  //
  // THE REQUIRED-FIELD READER IS SHARED, NOT RE-WRITTEN: the Ask's
  // `decisionRequirements` and this guard read ONE function, or C20's
  // self-containment guarantee becomes two implementations agreeing by
  // luck. Its filter is `required === true`, never truthiness, and its
  // index over the authored spec map is own-property guarded — a
  // hand-rolled loop reproduces neither for free.
  const payload = input.payload;
  const payloadRecord =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Readonly<Record<string, unknown>>)
      : undefined;
  for (const field of requiredFields(choice.payload)) {
    const value = ownEntry(payloadRecord, field);
    if (value === undefined || isEmptyRequiredValue(value)) {
      return { kind: "rejected", reason: "missing_required_field" };
    }
  }
  // Q4's read — AFTER admission, in the key-scoped guard phase, where an
  // awaited store read is ordinary (C9's infallible-rung-read rule does
  // not reach here, and the phase is named that way so it is never read
  // as sitting under it).
  const request = await pendingDecisionRequest(deps.store, instance, input.requestRef);
  // C16's override rule — the fiduciary invariant. Override is
  // meaningful ONLY against a RECORDED recommendation: choosing against
  // the machine must be explicit and recorded.
  const againstRecommendation =
    request.recommendation !== undefined && input.verdict !== request.recommendation;
  if (againstRecommendation && input.override !== true) {
    return { kind: "rejected", reason: "override_required" };
  }
  if (!againstRecommendation && input.override === true) {
    // TWO DISTINCT CAUSES reach this one name — no recommendation
    // recorded at all, and agreement with the one recorded — and family
    // 6 drives them separately.
    return { kind: "rejected", reason: "override_not_applicable" };
  }

  // The config resolved from the step being LEFT — the GATE — which is
  // what HANDLE does from the agent step it leaves, and NEVER from the
  // target. It has NO COMMITTED SINK on this path (C22 puts
  // `issued_agent_config` absent by class on both new classes), so the
  // honest carrier of this rule is the STORE-PORT SEAM rather than a
  // committed byte; family 1 captures the branded effect record and
  // reads the member off it.
  const issuedAgentConfig: AgentConfig = resolveAgentConfig(template, gateId, instance);
  // The SHARED arrival, CALLED. `from.edgeKey` is the DECISION KEY —
  // the selector's own key, which is what `advancesRound` is keyed by
  // for all three edge classes. `arriving` carries the SUBMITTED
  // PAYLOAD, so a re-park's `context_ref` records the DECISION's
  // payload (C13's stated widening) — and the presence test is `in`,
  // never truthiness, so a payload-LESS submit records NO `context_ref`
  // rather than an empty object.
  const arrival = applyTargetEntryEffects(
    { newRequestId: deps.newRequestId },
    instance,
    template,
    { stepId: gateId, edgeKey: input.verdict },
    choice.target,
    "payload" in input ? { payload: input.payload } : {},
    issuedAgentConfig,
  );
  if (arrival.newRound !== instance.round) {
    // Keyed on the ADMITTED `advancesRound` of the (gate → target)
    // edge — NEVER on a verdict name. The arrival already consumed
    // exactly that flag off the source step's per-edge map.
    clearStaleDecisionContext();
  }
  const result = await deps.store.commitOperatorEntry({
    instanceId: instance.instanceId,
    expectedVersion: instance.version,
    entry: {
      kind: "DECISION_MADE",
      opId: input.opId,
      body: {
        decision: input.verdict,
        ...("payload" in input ? { payload: input.payload } : {}),
        by: input.by as ActorId,
        requestRef: input.requestRef,
        // Recorded `true` IFF against — ABSENT otherwise, never `false`.
        ...(againstRecommendation ? { override: true as const } : {}),
      },
    },
    arrival,
  });
  switch (result.kind) {
    case "duplicate_op":
      return { kind: "duplicate" };
    case "op_id_collision":
      // Content-level and version-independent: a restart cannot change
      // the answer — return directly, no CAS-restart.
      return { kind: "rejected", reason: "op_id_collision" };
    case "cas_conflict":
      return "restart";
    case "committed":
      return {
        kind: "committed",
        version: result.version,
        intent: postCommitOutput(
          projectCommitted(instance, arrival, result.version),
          template,
          deps.providerRegistry,
          // Q6: the DISPATCH HANDOFF is a SEPARATE parameter of the
          // post-commit selection, not the arrival's `arriving`. A build
          // threading the payload only into `arriving` dispatches with an
          // EMPTY handoff.
          input.payload,
          arrival.decisionRequest,
        ),
      };
  }
}

/**
 * l3/RESUME_WAIT — the BARE-wait dual of SUBMIT_DECISION. No authority
 * rung on this path: the resume is KERNEL-CLASSIFIED (C18's deliberate
 * absence, the ChoicePoint's `on_resume` selector authority), so the
 * expectation is simply ABSENT and the rung is skipped.
 */
export async function resumeWait(
  deps: OperatorIntentDeps,
  input: ResumeWaitInput,
  onCasRestart: () => void = () => undefined,
): Promise<ResumeWaitOutcome> {
  for (;;) {
    const attempt = await resumeWaitOnce(deps, input);
    if (attempt === "restart") {
      onCasRestart();
      continue;
    }
    return attempt;
  }
}

async function resumeWaitOnce(
  deps: OperatorIntentDeps,
  input: ResumeWaitInput,
): Promise<ResumeWaitOutcome | "restart"> {
  const admitted = await admitInput(
    { store: deps.store, definitions: deps.definitions },
    {
      instanceId: input.instanceId,
      opId: input.opId,
      compareKind: "WAIT_RESUMED",
      state: {
        // Only a parked instance can be resumed.
        holds: (loaded) => loaded.kernelStatus === "WAITING",
        reject: "not_waiting",
      },
      correlate: {
        // Correlation to THIS open wait's DECLARED resume class. It
        // fires BEFORE the shape guard by the rung order's design, so a
        // MISMATCHING event on a decision wait answers
        // `resume_event_mismatch` and never `not_bare_wait`.
        holds: (loaded) => (loaded.wait?.resumeEvents ?? []).includes(input.type),
        reject: "resume_event_mismatch",
      },
      expectedVersion: input.expectedVersion,
    },
  );
  if (admitted.kind !== "accepted") {
    return admitted;
  }
  const instance = admitted.instance;
  // The load lands POST-admission here: with no authority rung to feed,
  // this path has no reason to hoist it (the site grid's two phases).
  const template = await loadPinnedTemplate(deps.definitions, instance);
  // The wait-SHAPE guard — AFTER admission (the order is contract), and
  // TOTAL over the position read. RESUME_WAIT resumes ONLY a `wait`
  // step; a decision wait resumes via SUBMIT_DECISION.
  //
  // ITS INHABITANTS ARE TWO, not three: a run parked at a `humanGate`,
  // and the KERNEL-OWNED `kickoff_pending` hold, which carries NO
  // current step (the position is null until ACTIVE) and so is not a
  // bare wait step. The ACTIVE-agent-step case fails the STATE rung
  // above and never reaches here.
  const position = instance.currentStep;
  const step = position === null ? undefined : ownEntry(template.steps, position);
  if (position === null || step?.type !== "wait") {
    return { kind: "rejected", reason: "not_bare_wait" };
  }
  // CHOICEPOINT `on_resume`: kernel-classified — the event's
  // validated-and-routed type is the key. OWN-PROPERTY GUARDED: the
  // resume index is REACHABLE with a hostile key, because
  // `resumeEvents` members cite the ordinary id class (which admits
  // `constructor`) and a declared member with NO `onResume` route is
  // admissible BY DESIGN, to keep `no_resume_transition` reachable.
  const target = ownEntry(step.onResume, input.type);
  if (target === undefined) {
    return { kind: "rejected", reason: "no_resume_transition" };
  }
  const issuedAgentConfig: AgentConfig = resolveAgentConfig(template, position, instance);
  const arrival = applyTargetEntryEffects(
    { newRequestId: deps.newRequestId },
    instance,
    template,
    { stepId: position, edgeKey: input.type },
    target,
    // A resume event carries NO payload at this level (C18's named
    // Absent), so `arriving` carries nothing.
    {},
    issuedAgentConfig,
  );
  const result = await deps.store.commitOperatorEntry({
    instanceId: instance.instanceId,
    expectedVersion: instance.version,
    entry: {
      kind: "WAIT_RESUMED",
      opId: input.opId,
      body: {
        // `kind` is the WAIT's kind read off the INSTANCE record, not
        // the step's declaration: they are equal by the correspondence
        // checker and would diverge silently in a corrupt history.
        kind: instance.wait?.kind ?? "",
        event: input.type,
      },
    },
    arrival,
  });
  switch (result.kind) {
    case "duplicate_op":
      return { kind: "duplicate" };
    case "op_id_collision":
      return { kind: "rejected", reason: "op_id_collision" };
    case "cas_conflict":
      return "restart";
    case "committed":
      return {
        kind: "committed",
        version: result.version,
        intent: postCommitOutput(
          projectCommitted(instance, arrival, result.version),
          template,
          deps.providerRegistry,
          // A resume supplies NO handoff.
          undefined,
          arrival.decisionRequest,
        ),
      };
  }
}

/**
 * The POST-ARRIVAL instance projection the selection requires — a
 * snapshot carrying the ARRIVAL's own `wait`, never the pre-arrival
 * instance. Reproducing the caller's pre-ch14 assembly reads a STALE
 * wait and returns no Ask at all (Q1's named failure), which is why the
 * projection is a named function shared by both handlers rather than
 * two inline spreads.
 */
function projectCommitted(
  instance: WorkflowInstance,
  arrival: {
    readonly newCurrentStep: StepId;
    readonly newRound: number;
    readonly newKernelStatus: WorkflowInstance["kernelStatus"];
    readonly newTerminalDisposition: WorkflowInstance["terminalDisposition"];
    readonly newWait: WorkflowInstance["wait"];
    readonly decisionRequest?: DecisionRequestBody;
  },
  version: number,
): WorkflowInstance {
  return {
    ...instance,
    currentStep: arrival.newCurrentStep,
    round: arrival.newRound,
    kernelStatus: arrival.newKernelStatus,
    terminalDisposition: arrival.newTerminalDisposition,
    wait: arrival.newWait,
    version,
  };
}
