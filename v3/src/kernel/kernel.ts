import type {
  CancelOutcome,
  CreateOutcome,
  EffectiveProcessConfig,
  EventEnvelope,
  FailOutcome,
  GateDecision,
  GateProjection,
  InstanceId,
  KickoffOutcome,
  Outcome,
  RejectionName,
  RetainedGateDecision,
  RuntimeContextCompletion,
  RuntimeContextCompletionOutcome,
  RuntimeContextFailedOutcome,
  RuntimeContextReadyOutcome,
  ResumeWaitOutcome,
  RuntimeContextRef,
  StartOutcome,
  SubmitDecisionOutcome,
  WorkflowInstance,
} from "../domain/index.js";
import { resolveRuntimeContextRequirement } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import type { DigestSource } from "../ports/digest.js";
import type { GateCatalog, ProcessGateRunner } from "../ports/gate.js";
import type {
  LocalExecutionCapability,
  ProviderRegistry,
} from "../ports/runtimeContextProvider.js";
import type { StorePort } from "../ports/store.js";
import type { TimeSource } from "../ports/time.js";
import { admitLoaded } from "./admission.js";
import { resolveAgentConfig } from "./agentConfig.js";
import { applyTargetEntryEffects } from "./arrival.js";
import { postCommitOutput } from "./postCommitOutput.js";
// The loader MOVED to a kernel-internal module (packet ch14-p2b): the
// operator-intent module needs it too, and a third copy is refused.
import { loadPinnedTemplate } from "./pinnedTemplate.js";
import { resumeWait, submitDecision } from "./operatorIntents.js";
import type {
  OperatorIntentDeps,
  ResumeWaitInput,
  SubmitDecisionInput,
} from "./operatorIntents.js";
import { capability } from "./capability.js";
import { deriveGateProjection } from "./gateProjection.js";
import { runProcessGate } from "./processGate.js";
import {
  cancel,
  createInstance,
  fail,
  kickoff,
  runtimeContextFailed,
  runtimeContextReady,
  start,
} from "./lifecycle.js";
import type {
  CancelInput,
  CreateInput,
  KickoffInput,
  LifecycleDeps,
  ReadyDeps,
  StartDeps,
  StartInput,
} from "./lifecycle.js";

/**
 * The port-parametric L1 kernel (packets ch4-P3 · ch11-P1). The check
 * ORDER is contract (l1-pseudocode/HANDLE): unknown_instance → the
 * consolidated ADMISSION ladder (idempotency → state → version →
 * staleness → authority; `kernel/admission.ts`) → no_transition → the
 * capability gate → atomic commit. On a CAS conflict the WHOLE handle
 * restarts from load — the FULL ladder re-runs on fresh state; never
 * re-commit a target computed from stale state.
 *
 * `time` is plumbed per PI-6 (the injected-clock seam); its first real
 * consumer is the ch-5 gate timeout. CHK-D-NOCLOCK stands regardless.
 *
 * Diagnostics (packet ch7-P1): emission lives in `handle`'s OUTER
 * loop, never in `handleOnce` — one classified event per non-success
 * return, one `cas_restart` per restart, NOTHING on a committed
 * return. The digest is THREADED from the attempt (never recomputed
 * at emit — the emit path performs no fallible work); the fail-open
 * contract lives on the DiagnosticsSink PORT, so every `diag.emit`
 * below is deliberately BARE.
 */
export interface KernelDeps {
  readonly store: StorePort;
  readonly definitions: DefinitionStore;
  readonly time: TimeSource;
  /** The transcript/collision digest seam (ch5-P4; production: emit-lib). */
  readonly digest: DigestSource;
  /** The non-authoritative diagnostic channel (ch7-P1; REQUIRED). */
  readonly diag: DiagnosticsSink;
  /**
   * The L2 gate catalog (ch11-P2b, T1; REQUIRED — the `diag` explicit-
   * wiring culture): the SAME `createGateRegistry()` value the
   * composition root injects into the definition store. An absent
   * catalog would turn every gated evaluation into the drift backstop.
   */
  readonly gates: GateCatalog;
  /**
   * The L2a process-gate executor (ch11-P3b, W1; REQUIRED — the `diag`/`gates`
   * explicit-wiring culture): an optional runner would turn a wiring omission
   * into a silent runtime surprise. The kit/tests inject the scripted runner;
   * the shipped CLI roots inject the fail-closed runner (W2).
   */
  readonly processRunner: ProcessGateRunner;
  /**
   * T3/PR2 (packet ch12-p3): the STATIC injected runtime-context provider
   * registry — ONE new REQUIRED dependency (the `diag`/`gates` explicit-wiring
   * culture). Since ch9-P2 (C6) the shipped CLI injects the PRODUCTION
   * registry whose sole member is `pairflow.worktree` (the real worktree
   * provider); the dev/test roots inject the scripted-provider registry.
   */
  readonly providerRegistry: ProviderRegistry;
}

/**
 * The kernel entry object IS the l0d source-routed entry (RECEIVE,
 * packet ch12-p1b I1/D1): `handle` is the actor_envelope class, the
 * four intent handlers the operator_intent class, `fail` the
 * kernel_event class (in-process only — C13; RUNTIME_CONTEXT_READY
 * joins at P3). The ch-4 one-shot `startInstance` is RETIRED (C24) —
 * the CREATE/START/activate split is its named replacement.
 */
export interface Kernel {
  handle(envelope: EventEnvelope): Promise<Outcome>;
  create(input: CreateInput): Promise<CreateOutcome>;
  start(input: StartInput): Promise<StartOutcome>;
  kickoff(input: KickoffInput): Promise<KickoffOutcome>;
  cancel(input: CancelInput): Promise<CancelOutcome>;
  /**
   * l3-pseudocode/SUBMIT_DECISION (packet ch14-p2b) — the operator's
   * decision on a parked human gate, a KICKOFF sibling in the
   * operator_intent source class.
   */
  submitDecision(input: SubmitDecisionInput): Promise<SubmitDecisionOutcome>;
  /**
   * l3-pseudocode/RESUME_WAIT — the BARE-wait dual, generalizing
   * KICKOFF. Kernel-classified: no authority rung on this path (C18).
   */
  resumeWait(input: ResumeWaitInput): Promise<ResumeWaitOutcome>;
  fail(instanceId: InstanceId, reason: string): Promise<FailOutcome>;
  /**
   * l0e-pseudocode/RUNTIME_CONTEXT_READY (packet ch12-p3, K1): the new kernel
   * event handler — in-process only (C13), wired via `lifecycleOp` exactly as
   * `fail` is. Driven by the completion seam (via `deliverCompletion`) or
   * directly by tests/composition post-commit delivery.
   */
  runtimeContextReady(
    instanceId: InstanceId,
    requestId: string,
    ref: RuntimeContextRef,
  ): Promise<RuntimeContextReadyOutcome>;
  /**
   * l0d-pseudocode/FAIL channel — the correlated RUNTIME_CONTEXT_FAILED kernel
   * event (packet ch9-p1, W1/F family): the NEW in-process-only handler beside
   * `runtimeContextReady`/`fail` (C13, no ingress), wired via `lifecycleOp`
   * exactly as `fail` is. Driven by the completion seam (via `deliverCompletion`
   * with a `failed` completion) or directly by tests. `reason` is an UNTRUSTED
   * wire token classified to `ProvisioningFailureReason` at the transport gate
   * (G2); `detail` is optional untrusted free text, string-gated (G3).
   */
  runtimeContextFailed(
    instanceId: InstanceId,
    requestId: string,
    reason: string,
    detail?: unknown,
  ): Promise<RuntimeContextFailedOutcome>;
  /**
   * The provider-completion delivery endpoint (SM seam): a resolved provider
   * fires its completion HERE — ONE `RuntimeContextCompletion` (a `ready(ref)`
   * OR a `failed(reason, detail?)`, W3); the seam HOLDS it until the START
   * attempt's atomic commit lands (ordered-after-commit, C15), releasing it
   * CONCLUSION-SIGNALLED at the attempt's conclusion — never on an event-loop
   * scheduling primitive (SM3). ONE buffer, ONE discipline for both kinds
   * (W3's foreclosure of a second buffer). Wired at the dev/test composition
   * root to the scripted provider; since ch9-P2 the shipped CLI wires the
   * real `pairflow.worktree` provider onto it through the DG4 diag-wrapping
   * sink (the first production firing path).
   */
  deliverCompletion(
    instanceId: InstanceId,
    requestId: string,
    completion: RuntimeContextCompletion,
  ): void;
  /**
   * Await every in-flight DETACHED post-conclusion runtime-context delivery
   * (a provider that fired its completion after its START attempt concluded —
   * the normal async path) and RETURN their outcomes (a delivered-inert
   * completion of EITHER kind yields `{kind:"ignored"}`, so a caller can prove
   * it was delivered, not dropped — SM2's fail-able distinction). A drain seam:
   * tests await it before asserting; a real shutdown awaits it before teardown.
   * Empty when none pend.
   */
  settleRuntimeContextDeliveries(): Promise<RuntimeContextCompletionOutcome[]>;
}

/** Per-ATTEMPT mutable holder: the digest THREADED from the current
 * attempt only — reset at the top of every attempt (the digest-point
 * contract is attempt-scoped; see the post-build regression lanes). */
interface AttemptContext {
  payloadDigest?: string;
}

// l0d-pseudocode/COMPLETE lived HERE (packet ch12-p1a, E4) until the
// ch14-p2a aftermath fold. p2a's ratified arrival took over the terminal
// branch — `applyTargetEntryEffects` writes TERMINAL + `done` in the
// arrival's own effect record — which left this function a DEAD PARALLEL
// PATH: a second, unreachable statement of one rule, which the domain
// registry's own doc forbids as a surviving parallel path. So it is
// deleted rather than kept behind a lint exemption, and the unit-map row
// re-points to the function that now carries the branch. The unit did
// not change; its address did.

function errorFields(error: unknown): { readonly name: string; readonly message: string } {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "unknown", message: String(error) };
}

function envelopeAttribution(
  envelope: EventEnvelope,
  ctx: AttemptContext,
): Pick<DiagnosticEventBody, "instanceId" | "opId" | "actorId" | "type" | "payloadDigest"> {
  return {
    instanceId: envelope.instanceId,
    opId: envelope.opId,
    actorId: envelope.actorId,
    type: envelope.type,
    ...(ctx.payloadDigest !== undefined ? { payloadDigest: ctx.payloadDigest } : {}),
  };
}

export function createKernel(deps: KernelDeps): Kernel {
  const { store, definitions, time, digest, diag, gates, processRunner, providerRegistry } = deps;

  // ── The ordered-after-commit completion seam (packet ch12-p3, SM family;
  // composition wiring, the store uninvolved). The buffer HOLDS a provider's
  // READY completion until the START attempt's commit lands; `start` signals
  // `concludeAttempt` at each attempt's conclusion (SM3), never on an
  // event-loop primitive — a microtask FIFO would deliver READY before the
  // `requested` marker commits and LOSE it (SM3's excluded anti-pattern). ──
  const lifecycleDeps: LifecycleDeps = { store, definitions, providerRegistry };
  // W3: ONE buffer carrying the completion UNION, routed by kind at delivery —
  // never a second buffer per kind (W3's foreclosure).
  const completionBuffer = new Map<
    string,
    { readonly instanceId: InstanceId; readonly completion: RuntimeContextCompletion }[]
  >();
  let requestCounter = 0;
  // A FRESH unique request_id per provisioning attempt (S3/S5): the injected
  // TimeSource's epoch-millis COMPOSED with a kernel-local counter —
  // `req-<epochMillis>-<n>` (packet ch9-p2, N5; contract:ch9-runner#C8 crash-
  // retry freshness). The one-shot shipped CLI builds a kernel PER process, so
  // a bare per-kernel counter would restart at 1 and a crash between worktree
  // creation and the marker commit would RE-MINT the crashed attempt's id —
  // colliding with its own orphan. The epoch-millis prefix keeps ids fresh
  // ACROSS restarts on a REAL clock (a same-millisecond restart re-mints the
  // same first id — that residual lands on N4's LOUD collision lane, never on
  // silent reuse); deterministic under the testkit's controlled clock (the
  // CHK-noRandom seam untouched), the counter suffix keeping same-millis
  // in-process attempts distinct.
  const newRequestId = (): string => {
    requestCounter += 1;
    return `req-${String(time.now())}-${String(requestCounter)}`;
  };
  // PR4 ref transport gate: reuse the injected emit-lib (DigestSource) — a
  // non-canonical ref throws at digest, exactly the isCanonicalizable culture
  // (the kernel imports no emit; the digest is the audited canonical seam).
  const assertRefCanonical = (
    instanceId: InstanceId,
    requestId: string,
    ref: RuntimeContextRef,
  ): void => {
    try {
      digest({
        instanceId,
        opId: requestId,
        type: "RUNTIME_CONTEXT_READY",
        actorId: "kernel",
        payload: ref,
      });
    } catch (error) {
      throw new Error(
        `kernel integrity: runtime-context ref for instance '${instanceId}' is not canonical-JSON-safe (transport gate): ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error },
      );
    }
  };
  const readyDeps: ReadyDeps = { store, definitions, providerRegistry, assertRefCanonical };
  // ch14-p2b: the two operator intents' dependency record. `newRequestId`
  // is the SAME minting seam the arrival uses on the actor path — one
  // counter, so a provisioning request_id and a decision request_ref
  // never collide under the controlled clock.
  const operatorDeps: OperatorIntentDeps = { store, definitions, providerRegistry, newRequestId };
  const startDeps: StartDeps = {
    store,
    definitions,
    providerRegistry,
    newRequestId,
    concludeAttempt,
  };
  function readyOp(
    instanceId: InstanceId,
    requestId: string,
    ref: RuntimeContextRef,
  ): Promise<RuntimeContextReadyOutcome> {
    return lifecycleOp(() => runtimeContextReady(readyDeps, instanceId, requestId, ref), {
      instanceId,
    });
  }
  // F family: the FAILED handler wired via lifecycleOp (the `fail`/READY
  // culture); deps = LifecycleDeps (no template load, no canonicality injection
  // — the G2 membership check and the G3 string gate are pure).
  function failedOp(
    instanceId: InstanceId,
    requestId: string,
    reason: string,
    detail?: unknown,
  ): Promise<RuntimeContextFailedOutcome> {
    return lifecycleOp(
      () => runtimeContextFailed(lifecycleDeps, instanceId, requestId, reason, detail),
      { instanceId },
    );
  }
  // W3 KIND-BLIND delivery: route ONE completion to its handler and return the
  // union outcome. The seam's hold/release/drain call THIS — zero per-kind seam
  // logic (the only branch is the terminal dispatch to a handler).
  function deliverOne(
    instanceId: InstanceId,
    requestId: string,
    completion: RuntimeContextCompletion,
  ): Promise<RuntimeContextCompletionOutcome> {
    return completion.kind === "ready"
      ? readyOp(instanceId, requestId, completion.ref)
      : failedOp(instanceId, requestId, completion.reason, completion.detail);
  }
  // The request_ids whose START attempt has CONCLUDED (its commit landed,
  // failed, or was superseded). NOTE: this Set grows by request_id per run —
  // bounded by the run's provisioning attempts; real cleanup (on run teardown)
  // is the ch9 provider seam's concern (the Absent named at C15/C23).
  const concluded = new Set<string>();
  // In-flight DETACHED post-conclusion deliveries — a test (or a shutdown
  // drain) awaits them via `settleRuntimeContextDeliveries`, which returns
  // their outcomes (so a test can prove delivered-inert ≠ silently-dropped).
  // Each tracked promise is WRAPPED to never reject (an integrity throw from
  // readyOp is captured as `{ok:false}` and re-surfaced by the drain), so a
  // detached delivery never leaks an unhandled rejection.
  type DeliveryResult =
    | { readonly ok: true; readonly outcome: RuntimeContextCompletionOutcome }
    | { readonly ok: false; readonly error: unknown };
  const pendingDeliveries = new Set<Promise<DeliveryResult>>();
  function deliverCompletion(
    instanceId: InstanceId,
    requestId: string,
    completion: RuntimeContextCompletion,
  ): void {
    // The HOLD/enqueue returns to the provider IMMEDIATELY (SM2) — never
    // blocks the completion call, so no circular wait with C18's detach await.
    if (concluded.has(requestId)) {
      // The normal real-world path: the provider fires its completion
      // ASYNCHRONOUSLY AFTER the START attempt concluded — the commit has
      // ALREADY landed, so buffering would be LOST (concludeAttempt ran once,
      // will not run again). Deliver DIRECTLY (SM2 "never dropped"): correlation
      // matches on the committed marker → ready/ACTIVE or FAIL; a superseded
      // id's late completion correlation-rejects inert. DETACHED (fire-and-track,
      // not awaited by the provider); no ordering hazard post-conclusion (the
      // marker is committed). WRAP so the tracked promise never rejects (a
      // handler integrity throw is captured, re-surfaced by the drain) — no
      // unhandled rejection on a detached delivery. No self-delete here: the
      // drain snapshots-and-clears (a `.finally` self-delete races the snapshot).
      pendingDeliveries.add(
        deliverOne(instanceId, requestId, completion).then(
          (outcome): DeliveryResult => ({ ok: true, outcome }),
          (error: unknown): DeliveryResult => ({ ok: false, error }),
        ),
      );
      return;
    }
    const held = completionBuffer.get(requestId);
    if (held === undefined) {
      completionBuffer.set(requestId, [{ instanceId, completion }]);
    } else {
      held.push({ instanceId, completion });
    }
  }
  async function concludeAttempt(requestId: string): Promise<void> {
    // CONCLUSION-SIGNALLED DELIVERY (SM2/SM3): flush the held completion(s)
    // for this attempt — commit-landed (correlation matches → ready/ACTIVE)
    // or superseded/failed (correlation rejects it inert). Mark CONCLUDED
    // (before flushing) so any LATER async completion for this id delivers
    // directly (deliverCompletion) instead of being lost. Idempotent.
    const held = completionBuffer.get(requestId);
    completionBuffer.delete(requestId);
    concluded.add(requestId);
    if (held !== undefined) {
      // Deliver EVERY held completion before surfacing any error — a `readyOp`
      // integrity throw on one must NOT drop the rest (SM2's unconditional
      // never-dropped; the buffer was already deleted). Collect errors, deliver
      // all, then throw the first (mirrors settleRuntimeContextDeliveries).
      const errors: unknown[] = [];
      for (const buffered of held) {
        try {
          // KIND-BLIND (SM2): an integrity-throwing completion of EITHER kind
          // must NOT drop a sibling — collect, deliver all, then re-surface the
          // first (a FAILED survivor after a READY throw proves the discipline).
          await deliverOne(buffered.instanceId, requestId, buffered.completion);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) {
        throw errors[0];
      }
    }
  }
  async function settleRuntimeContextDeliveries(): Promise<RuntimeContextCompletionOutcome[]> {
    // Await every in-flight detached post-conclusion delivery (a test drain;
    // a real shutdown would await this before teardown) and RETURN their
    // outcomes — a delivered-inert completion yields `{kind:"ignored"}`, a
    // dropped one yields nothing (the fail-able distinction, SM2).
    // Snapshot-and-CLEAR before awaiting (a delivery arriving mid-drain is
    // caught by the next loop turn); a post-conclusion integrity throw is
    // re-surfaced, never swallowed.
    const outcomes: RuntimeContextCompletionOutcome[] = [];
    const errors: unknown[] = [];
    while (pendingDeliveries.size > 0) {
      const batch = [...pendingDeliveries];
      pendingDeliveries.clear();
      for (const result of await Promise.all(batch)) {
        if (result.ok) {
          outcomes.push(result.outcome);
        } else {
          errors.push(result.error);
        }
      }
    }
    // Drain FULLY first (a delivery arriving mid-drain is caught by the loop),
    // THEN surface — throwing mid-loop would leave a concurrently-arrived
    // delivery undrained. First error wins (an integrity breach is a hard
    // failure; a shutdown drain observes it after every delivery is processed).
    if (errors.length > 0) {
      throw errors[0];
    }
    return outcomes;
  }

  async function handleOnce(
    envelope: EventEnvelope,
    ctx: AttemptContext,
  ): Promise<Outcome | "restart"> {
    const instance = await store.loadInstance(envelope.instanceId);
    if (instance === null) {
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const template = await loadPinnedTemplate(definitions, instance);

    // Hoisted positional read (l1 HANDLE) — TOLERATES undefined AND the
    // pre-activation NULL position (G2, packet ch12-p1b): a terminal
    // current-step id resolves no Step, and a CREATED/WAITING run HAS
    // no position; the `role` is consumed only at the authority rung,
    // which the state rung guards (ACTIVE ⇒ currentStep ∈ steps by
    // construction). Never a rejection source.
    const step =
      instance.currentStep === null ? undefined : template.steps[instance.currentStep];

    // Computed ONCE per attempt (the model's HANDLE: the rung compares
    // it, the commit records it) and threaded into ctx for the diag
    // emit. Ingress admission == canonicalizable, so the derivation
    // cannot throw on an admitted envelope (ch-4 aftermath).
    const payloadDigest = digest(envelope);
    ctx.payloadDigest = payloadDigest;

    // The consolidated ADMISSION ladder (ch11-P1) — rung order is
    // contract; the commit txn stays the correctness mechanism.
    const existing = await store.findOp(envelope.instanceId, envelope.opId);
    // The ladder's call site MOVES with the opening (packet ch14-p2b,
    // Q3) — the expectation is parameterized where it was hard-coded.
    // HANDLE's OUTCOMES are byte-unmoved, which family 2's no-move
    // control measures outcome by outcome rather than resting on
    // "HANDLE passes neither".
    //
    // THE AUTHORITY GROUP IS PASSED ALWAYS, with `claim` =
    // `envelope.expectedRole`: an absent claim keeps meaning
    // `missing_role`, exactly as today. Only an ABSENT GROUP is a skip,
    // and the resume path is its one inhabitant — mapping HANDLE's
    // absent expectedRole onto an absent group would hand an actor with
    // no role claim an `accepted`.
    const admitted = admitLoaded(instance, {
      idempotency: { existing, compare: { mode: "digest", payloadDigest } },
      state: { holds: (loaded) => loaded.kernelStatus === "ACTIVE", reject: "not_active" },
      expectedVersion: envelope.expectedVersion,
      authority: {
        claim: envelope.expectedRole,
        granted: step?.role,
        missing: "missing_role",
        mismatch: "role_not_authorized",
      },
    });
    if (admitted.kind !== "accepted") {
      return admitted;
    }

    // Navigation (L0b): does this action exist here? `step` is defined
    // past the state rung; the `?.` is the type-level belt only.
    // K11 (ch14-p2a): `transitions` is optional since the class set
    // opened, and the extra `?.` is not a type-level belt like the one
    // beside it — it carries MEANING. An actor event arriving at a
    // `humanGate` or `wait` step finds no transition map at all, and
    // `no_transition` is the honest answer: those classes are left by
    // DECISION and RESUME routing (p2b), never by an actor transition.
    const target = step?.transitions?.[envelope.type];
    if (target === undefined || step === undefined) {
      return { kind: "rejected", reason: "no_transition" };
    }

    // Past the ACTIVE state rung the position is non-null (the two-axis
    // truth; the store mapper refuses ACTIVE+NULL) — the type-level
    // narrow only (G2).
    if (instance.currentStep === null) {
      throw new Error(
        `kernel integrity: ACTIVE instance '${instance.instanceId}' with a NULL current_step`,
      );
    }
    // L1 action authorization: the action EXISTS as a transition, but
    // may this role emit it here? Dormant under default derivation.
    // A role-less step grants nothing through the transition channel:
    // `not_authorized` rather than a throw, because the position is a
    // legitimately admitted step and the actor simply has no authority
    // there. (Unreachable while the `no_transition` rung above fires
    // first for the same classes; stated so the ordering is not the
    // only thing holding it.)
    if (
      step.role === undefined ||
      !capability(template, step.role, instance.currentStep).includes(envelope.type)
    ) {
      return { kind: "rejected", reason: "not_authorized" };
    }

    // L2 policy gate pipeline (ch11-P2b, K1–K7): the transition exists
    // (L0b) and is authorized (L1); do the authored policies allow it
    // now? Ordered (authored order IS evaluation order), first-block-
    // wins, BEFORE any commit-side work. ABSENT key / absent map = the
    // empty pipeline (ungated). The projection read is LAZY (K6): it
    // fires only at the FIRST evaluate need — after a binding's resolve +
    // implementation checks pass, the model's own first
    // `gate_projection(...)` call point — so the ungated path performs
    // ZERO gated-path reads and a backstop rejection preceding the first
    // evaluate reads nothing.
    const pipeline = step.gates?.[envelope.type] ?? [];
    const gateDecisions: RetainedGateDecision[] = [];
    let projection: GateProjection | undefined;
    // ONE snapshot serves the whole pipeline (every gate sees the same
    // history); the read is LAZY — it fires at the FIRST need, an inline
    // `evaluate` OR a process invocation build (X2), and a backstop
    // rejection preceding the first need reads nothing. A CAS restart
    // re-runs the rung on fresh state.
    const ensureProjection = async (): Promise<GateProjection> => {
      if (projection === undefined) {
        const committed = await store.getTimeline(instance.instanceId, 0);
        if (committed === null) {
          // The instance vanished between load and this read — a
          // kernel-integrity failure (the `loadTemplate` class), never a
          // rejection.
          throw new Error(
            `kernel integrity: instance '${instance.instanceId}' vanished during gate projection`,
          );
        }
        projection = deriveGateProjection(instance, template, committed, envelope.type);
      }
      return projection;
    };
    for (const binding of pipeline) {
      const registration = gates.resolve(binding.uses);
      if (registration === null) {
        // Runtime availability backstop (K2): admission resolved the id
        // at load; this guards registry drift under a new process
        // generation's composition.
        return { kind: "rejected", reason: "gate_evaluator_unavailable" };
      }
      let decision: GateDecision;
      if (registration.implementation === "process") {
        // L2a: the inline process now RUNS (the model's reject→run flip).
        // C36 runtime backstop re-read (packet ch12-p1a, X2) — BEFORE any
        // runner call and before this arm's projection read: a process
        // gate reached without a ready REF — `ready(∅)` (ref null), or a
        // drifted non-ready state — rejects here (behavior-preserving:
        // the ch11 null→reject lane one-to-one).
        const context = instance.runtimeContext;
        if (context.state !== "ready" || context.ref === null) {
          return { kind: "rejected", reason: "runtime_context_required_for_process_gate" };
        }
        // GR6 (packet ch9-p4a, flag F5): the runner `cwd` is resolved through
        // the provider's OWN LocalExecutionCapability (H1's mechanism) — the
        // ch12-P1a X2 string-locator read is RETIRED (the ch9-P2 worktree
        // locator is an OBJECT, so the string read was a live seam defect
        // against C21's "cwd = the run's worktree"). The pinned template's
        // requirement is already in scope; the facet check is a VALUE-SHAPE
        // check, never a provider-TYPE branch (REV-E-NO-ADAPTER-BRANCH). A
        // ready-ref run whose provider is unresolvable, lacks the facet, or
        // throws is a kernel/config integrity failure (the E4 REQUIRE
        // pattern, D6's lane) — pre-commit, no state, never a rejection. The
        // kernel still never interprets the opaque ref.
        const requirement = resolveRuntimeContextRequirement(template.runtimeContext);
        if (requirement.state !== "required") {
          throw new Error(
            `kernel integrity: instance '${instance.instanceId}' holds a ready runtime-context ref but its pinned template declares no runtime context`,
          );
        }
        const provider = providerRegistry.resolve(requirement.spec.provider);
        if (provider === null) {
          throw new Error(
            `kernel integrity: provider '${requirement.spec.provider}' for the process gate on instance '${instance.instanceId}' is not resolvable (the registry must stay stable for the life of the run)`,
          );
        }
        const localCapability = provider as Partial<LocalExecutionCapability>;
        if (typeof localCapability.resolveLocalWorkingDirectory !== "function") {
          throw new Error(
            `kernel integrity: provider '${requirement.spec.provider}' has a runtime context but is not a local-execution provider (cannot resolve the process-gate cwd) for instance '${instance.instanceId}'`,
          );
        }
        const workspace: string = localCapability.resolveLocalWorkingDirectory(context.ref);
        decision = await runProcessGate(
          binding.config as EffectiveProcessConfig,
          instance,
          workspace,
          await ensureProjection(),
          envelope,
          processRunner,
        );
      } else {
        // Declarative / packaged, in-process (byte-unchanged inline arm).
        decision = registration.evaluate(binding.config, await ensureProjection());
      }
      if (decision.verdict === "block") {
        // First-block-wins (K4): no commit ⇒ round not burned; the
        // blocking decision's reason / evidence refs surface VERBATIM
        // (O1's pass-through arm) with the blocking binding's `uses`
        // as `gate` (ch12-P0 — the model fix 6dd8bd15), later gates
        // are NOT evaluated.
        return {
          kind: "rejected",
          reason: "gate_blocked",
          gate: binding.uses,
          ...(decision.reason !== undefined ? { gateReason: decision.reason } : {}),
          ...(decision.evidenceRefs !== undefined ? { evidenceRefs: decision.evidenceRefs } : {}),
        };
      }
      // Allow / warn ⇒ retained in pipeline order (K5), riding the commit.
      gateDecisions.push({
        uses: binding.uses,
        verdict: decision.verdict,
        ...(decision.reason !== undefined ? { reason: decision.reason } : {}),
        ...(decision.message !== undefined ? { message: decision.message } : {}),
        ...(decision.evidenceRefs !== undefined ? { evidenceRefs: decision.evidenceRefs } : {}),
      });
    }

    // C1 (packet ch12-p2): the run profile the kernel ISSUES for this
    // dispatched step — resolved on the OPTIMISTIC commit path, downstream
    // of every synchronous admission guard and the gate pipeline (a
    // rejected envelope returned before this point and never resolves),
    // just before the atomic commit. The resolver is PURE, so a doomed
    // attempt (a cas_conflict restart, a commit-time duplicate/collision)
    // records nothing; the provenance rides the committed transition only.
    // Recomputed from the SAME immutable sources the dispatch used, so it
    // equals the packet's effective_agent_config byte-identically.
    const issuedAgentConfig = resolveAgentConfig(template, instance.currentStep, instance);

    // K1 (packet ch14-p2a): the inline arrival is REFACTORED onto the
    // one shared target-entry rule. `HANDLE` is this packet's only
    // ARRIVAL inhabitant; the two operator intents join it at p2b, and
    // what p2a proves is STRUCTURAL — one function, one signature, no
    // second copy.
    //
    // The mint rides INSIDE the restart loop (K2): a CAS-restarted
    // attempt mints again, so the committed ref is the winning
    // attempt's and the losing attempt's value is burned from the
    // shared sequence. Hoisting it out would pin a ref computed against
    // stale state onto a commit that re-resolved its target.
    const arrival = applyTargetEntryEffects(
      { newRequestId },
      instance,
      template,
      { stepId: instance.currentStep, edgeKey: envelope.type },
      target,
      "payload" in envelope ? { payload: envelope.payload } : {},
      issuedAgentConfig,
    );

    const result = await store.commitTransition({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      envelope,
      payloadDigest,
      gateDecisions,
      arrival,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
      case "op_id_collision":
        // Content-level and version-independent: a restart cannot
        // change the answer — return directly, no CAS-restart.
        return { kind: "rejected", reason: "op_id_collision" };
      case "cas_conflict":
        return "restart";
      case "committed": {
        // K5 (packet ch14-p2a): the post-commit assembly must carry the
        // ARRIVAL's wait — reproducing the pre-ch14 assembly verbatim
        // would read a PRE-arrival wait and return no Ask at all.
        const committed: WorkflowInstance = {
          ...instance,
          currentStep: arrival.newCurrentStep,
          round: arrival.newRound,
          kernelStatus: arrival.newKernelStatus,
          terminalDisposition: arrival.newTerminalDisposition,
          wait: arrival.newWait,
          version: result.version,
        };
        return {
          kind: "committed",
          version: result.version,
          intent: postCommitOutput(
            committed,
            template,
            providerRegistry,
            envelope.payload,
            arrival.decisionRequest,
          ),
        };
      }
    }
  }

  /** One classified event per non-success final outcome; committed → nothing. */
  function emitOutcome(envelope: EventEnvelope, outcome: Outcome, ctx: AttemptContext): void {
    switch (outcome.kind) {
      case "committed":
        return;
      case "duplicate":
        diag.emit({ source: "kernel", kind: "duplicate", ...envelopeAttribution(envelope, ctx) });
        return;
      case "stale":
        diag.emit({
          source: "kernel",
          kind: "stale",
          ...envelopeAttribution(envelope, ctx),
          ...(envelope.expectedVersion !== undefined
            ? { expectedVersion: envelope.expectedVersion }
            : {}),
          currentVersion: outcome.currentVersion,
        });
        return;
      case "rejected":
        diag.emit({
          source: "kernel",
          kind: "rejected",
          reason: outcome.reason,
          ...envelopeAttribution(envelope, ctx),
        });
        return;
    }
  }

  return {
    async handle(envelope: EventEnvelope): Promise<Outcome> {
      // Reset PER ATTEMPT (post-build finding): the digest-point
      // contract is attempt-scoped — after a CAS restart a pre-digest
      // failure must not inherit the prior attempt's digest. The catch
      // below reads the CURRENT attempt's context.
      let ctx: AttemptContext = {};
      try {
        for (;;) {
          ctx = {};
          const outcome = await handleOnce(envelope, ctx);
          if (outcome === "restart") {
            diag.emit({
              source: "kernel",
              kind: "cas_restart",
              ...envelopeAttribution(envelope, ctx),
            });
            continue;
          }
          emitOutcome(envelope, outcome, ctx);
          return outcome;
        }
      } catch (error) {
        diag.emit({
          source: "kernel",
          kind: "internal_failure",
          ...envelopeAttribution(envelope, ctx),
          error: errorFields(error),
        });
        throw error;
      }
    },
    create: (input) =>
      lifecycleOp(() => createInstance(lifecycleDeps, input), {
        instanceId: input.instanceId,
      }),
    start: (input) =>
      lifecycleOp(() => start(startDeps, input), {
        instanceId: input.instanceId,
        opId: input.opId,
      }),
    kickoff: (input) =>
      lifecycleOp(() => kickoff(lifecycleDeps, input), {
        instanceId: input.instanceId,
        opId: input.opId,
      }),
    cancel: (input) =>
      lifecycleOp(() => cancel(lifecycleDeps, input), {
        instanceId: input.instanceId,
        opId: input.opId,
      }),
    fail: (instanceId, reason) =>
      lifecycleOp(() => fail(lifecycleDeps, instanceId, reason), { instanceId }),
    // K1: the RUNTIME_CONTEXT_READY kernel event, wired via lifecycleOp (the
    // `fail` culture). deliverCompletion is the SM seam's provider fire endpoint.
    runtimeContextReady: (instanceId, requestId, ref) => readyOp(instanceId, requestId, ref),
    // ch9-P1 F family: the RUNTIME_CONTEXT_FAILED kernel event, wired the same way.
    runtimeContextFailed: (instanceId, requestId, reason, detail) =>
      failedOp(instanceId, requestId, reason, detail),
    // ch14-p2b: RECEIVE's two new operator_intent routes. Both ride the
    // SAME shared wrapper the other operator intents ride (its `stale`
    // arm exists for exactly these two), and each emits its OWN
    // `cas_restart` from its own restart loop.
    submitDecision: (input) =>
      lifecycleOp(
        () =>
          submitDecision(operatorDeps, input, () => {
            diag.emit({
              source: "kernel",
              kind: "cas_restart",
              instanceId: input.instanceId,
              opId: input.opId,
            });
          }),
        { instanceId: input.instanceId, opId: input.opId },
      ),
    resumeWait: (input) =>
      lifecycleOp(
        () =>
          resumeWait(operatorDeps, input, () => {
            diag.emit({
              source: "kernel",
              kind: "cas_restart",
              instanceId: input.instanceId,
              opId: input.opId,
            });
          }),
        { instanceId: input.instanceId, opId: input.opId },
      ),
    deliverCompletion,
    settleRuntimeContextDeliveries,
  };

  /**
   * L9 (packet ch12-p1b): the lifecycle entry family rides the SAME
   * ch7-P1 diag classification — one classified event per non-success
   * final outcome (duplicate / rejected with reason), NOTHING on
   * success, `internal_failure` on any throw; attribution instanceId +
   * opId where present, no payload digest (intents carry no payload);
   * every emit BARE (REV-DIAG-FAILOPEN).
   */
  async function lifecycleOp<
    T extends {
      readonly kind: string;
      readonly reason?: RejectionName;
      readonly currentVersion?: number;
    },
  >(
    op: () => Promise<T>,
    attribution: Pick<DiagnosticEventBody, "instanceId" | "opId">,
  ): Promise<T> {
    try {
      const outcome = await op();
      if (outcome.kind === "duplicate") {
        diag.emit({ source: "kernel", kind: "duplicate", ...attribution });
      } else if (outcome.kind === "stale" && outcome.currentVersion !== undefined) {
        // Q18 (packet ch14-p2b): the wrapper's `stale` arm, opened for
        // the FIRST operator intents that carry a VERSION RUNG. Before
        // it, a stale operator intent emitted NOTHING while the actor
        // path emitted `stale` with its `currentVersion` — the generic
        // bound accepted a stale-carrying union silently.
        //
        // OPENING IT IS A CHANGE TO THE WRAPPER'S SIGNATURE, not only
        // its body: a `kind`-narrowed generic cannot reach
        // `currentVersion`, so the CONSTRAINT widened to admit it as an
        // OPTIONAL member. That stays compile-silent for EVERY existing
        // rider — an added optional member moves no call site — and
        // their unions carry no `stale` arm at all, so this arm is
        // unreachable for every one of them.
        //
        // `cas_restart` is NOT here and cannot be: this wrapper awaits
        // ONE call and classifies the RESOLVED outcome — it has no loop
        // and no sentinel, so no arm added to an outcome-inspecting
        // wrapper could ever fire that class. Each new handler emits it
        // from its OWN restart loop, which is HANDLE's pattern.
        diag.emit({
          source: "kernel",
          kind: "stale",
          ...attribution,
          currentVersion: outcome.currentVersion,
        });
      } else if (outcome.kind === "rejected" && outcome.reason !== undefined) {
        diag.emit({ source: "kernel", kind: "rejected", reason: outcome.reason, ...attribution });
      }
      return outcome;
    } catch (error) {
      diag.emit({
        source: "kernel",
        kind: "internal_failure",
        ...attribution,
        error: errorFields(error),
      });
      throw error;
    }
  }
}
