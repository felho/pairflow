import type {
  EventEnvelope,
  GateProjection,
  LifecycleStatus,
  Outcome,
  RetainedGateDecision,
  Started,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import type { DigestSource } from "../ports/digest.js";
import type { GateCatalog } from "../ports/gate.js";
import type { StorePort } from "../ports/store.js";
import type { TimeSource } from "../ports/time.js";
import { admitLoaded } from "./admission.js";
import { capability } from "./capability.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";
import { deriveGateProjection } from "./gateProjection.js";
import { startInstance } from "./start.js";
import type { StartInstanceInput } from "./start.js";

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
}

export interface Kernel {
  handle(envelope: EventEnvelope): Promise<Outcome>;
  /** Bootstrap (l0b START_INSTANCE, packet ch4-P4). */
  startInstance(input: StartInstanceInput): Promise<Started>;
}

async function loadTemplate(
  definitions: DefinitionStore,
  instance: WorkflowInstance,
): Promise<WorkflowTemplate> {
  const template = await definitions.load(instance.templateRef);
  if (template === null) {
    // The ref was pinned at create — a missing definition is an
    // integrity failure, not a rejection (P1 matrix).
    throw new Error(
      `kernel integrity: pinned template '${instance.templateRef.id}@${String(instance.templateRef.version)}' not found`,
    );
  }
  return template;
}

/** Per-ATTEMPT mutable holder: the digest THREADED from the current
 * attempt only — reset at the top of every attempt (the digest-point
 * contract is attempt-scoped; see the post-build regression lanes). */
interface AttemptContext {
  payloadDigest?: string;
}

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
  const { store, definitions, digest, diag, gates } = deps;

  async function handleOnce(
    envelope: EventEnvelope,
    ctx: AttemptContext,
  ): Promise<Outcome | "restart"> {
    const instance = await store.loadInstance(envelope.instanceId);
    if (instance === null) {
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const template = await loadTemplate(definitions, instance);

    // Hoisted positional read (l1 HANDLE) — TOLERATES undefined: a
    // terminal current-step id resolves no Step (terminal ids live
    // outside `steps`); its `role` is consumed only at the authority
    // rung, which the state rung guards (RUNNING ⇒ currentStep ∈
    // steps by construction). Never a rejection source.
    const step = template.steps[instance.currentStep];

    // Computed ONCE per attempt (the model's HANDLE: the rung compares
    // it, the commit records it) and threaded into ctx for the diag
    // emit. Ingress admission == canonicalizable, so the derivation
    // cannot throw on an admitted envelope (ch-4 aftermath).
    const payloadDigest = digest(envelope);
    ctx.payloadDigest = payloadDigest;

    // The consolidated ADMISSION ladder (ch11-P1) — rung order is
    // contract; the commit txn stays the correctness mechanism.
    const existing = await store.findOp(envelope.instanceId, envelope.opId);
    const admitted = admitLoaded(instance, {
      existingOp: existing,
      payloadDigest,
      expectedVersion: envelope.expectedVersion,
      expectedRole: envelope.expectedRole,
      grantedRole: step?.role,
    });
    if (admitted.kind !== "accepted") {
      return admitted;
    }

    // Navigation (L0b): does this action exist here? `step` is defined
    // past the state rung; the `?.` is the type-level belt only.
    const target = step?.transitions[envelope.type];
    if (target === undefined || step === undefined) {
      return { kind: "rejected", reason: "no_transition" };
    }

    // L1 action authorization: the action EXISTS as a transition, but
    // may this role emit it here? Dormant under default derivation.
    if (!capability(template, step.role, instance.currentStep).includes(envelope.type)) {
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
    for (const binding of pipeline) {
      const registration = gates.resolve(binding.uses);
      if (registration === null) {
        // Runtime availability backstop (K2): admission resolved the id
        // at load; this guards registry drift under a new process
        // generation's composition.
        return { kind: "rejected", reason: "gate_evaluator_unavailable" };
      }
      if (registration.implementation === "process") {
        // The process contract is L2a (K3; P3 realizes its execution
        // path). The unit's third check (`execution ≠ inline`) ships no
        // code — the operand is type-unrepresentable.
        return { kind: "rejected", reason: "gate_execution_not_supported" };
      }
      if (projection === undefined) {
        // ONE snapshot serves the whole pipeline (every gate sees the
        // same history); a CAS restart re-runs the rung on fresh state.
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
      const decision = registration.evaluate(binding.config, projection);
      if (decision.verdict === "block") {
        // First-block-wins (K4): no commit ⇒ round not burned; the
        // blocking decision's reason / evidence refs surface VERBATIM
        // (O1's pass-through arm), later gates are NOT evaluated.
        return {
          kind: "rejected",
          reason: "gate_blocked",
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

    const terminal = template.terminal.includes(target);
    const newStatus: LifecycleStatus = terminal ? "DONE" : instance.status;
    const newRound = target === template.start ? instance.round + 1 : instance.round;

    const result = await store.commitTransition({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      envelope,
      payloadDigest,
      gateDecisions,
      newCurrentStep: target,
      newRound,
      newStatus,
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
        if (terminal) {
          return { kind: "committed", version: result.version, intent: null };
        }
        const committed: WorkflowInstance = {
          ...instance,
          currentStep: target,
          round: newRound,
          status: newStatus,
          version: result.version,
        };
        const intent = deriveDispatchIntent(committed, template, target, envelope.payload);
        return { kind: "committed", version: result.version, intent };
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
    startInstance: async (input) => {
      try {
        return await startInstance({ store, definitions }, input);
      } catch (error) {
        diag.emit({
          source: "kernel",
          kind: "internal_failure",
          instanceId: input.instanceId,
          error: errorFields(error),
        });
        throw error;
      }
    },
  };
}
