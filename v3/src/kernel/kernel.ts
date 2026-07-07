import type {
  EventEnvelope,
  LifecycleStatus,
  Outcome,
  Started,
  WorkflowInstance,
  WorkflowTemplate,
} from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { StorePort } from "../ports/store.js";
import type { TimeSource } from "../ports/time.js";
import { deriveDispatchIntent } from "./dispatchIntent.js";
import { startInstance } from "./start.js";
import type { StartInstanceInput } from "./start.js";

/**
 * The port-parametric L0b kernel (packet ch4-P3). The check ORDER is
 * contract (l0b-pseudocode/HANDLE): unknown_instance → duplicate →
 * missing_version → stale → no_transition → atomic commit. On a CAS
 * conflict the WHOLE handle restarts from load — re-check idempotency,
 * re-resolve the transition; never re-commit a target computed from
 * stale state.
 *
 * `time` is plumbed per PI-6 (the injected-clock seam); its first real
 * consumer is the ch-5 gate timeout. CHK-D-NOCLOCK stands regardless.
 */
export interface KernelDeps {
  readonly store: StorePort;
  readonly definitions: DefinitionStore;
  readonly time: TimeSource;
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

export function createKernel(deps: KernelDeps): Kernel {
  const { store, definitions } = deps;

  async function handleOnce(envelope: EventEnvelope): Promise<Outcome | "restart"> {
    const instance = await store.loadInstance(envelope.instanceId);
    if (instance === null) {
      return { kind: "rejected", reason: "unknown_instance" };
    }
    const template = await loadTemplate(definitions, instance);

    // Idempotency first (fast path; the commit txn is the mechanism).
    if (await store.hasOp(envelope.instanceId, envelope.opId)) {
      return { kind: "duplicate" };
    }

    if (envelope.expectedVersion === undefined) {
      return { kind: "rejected", reason: "missing_version" };
    }
    if (envelope.expectedVersion !== instance.version) {
      return { kind: "stale", currentVersion: instance.version };
    }

    // A terminal current step has no Step entry → no transitions.
    const step = template.steps[instance.currentStep];
    const target = step?.transitions[envelope.type];
    if (target === undefined) {
      return { kind: "rejected", reason: "no_transition" };
    }

    const terminal = template.terminal.includes(target);
    const newStatus: LifecycleStatus = terminal ? "DONE" : instance.status;
    const newRound = target === template.start ? instance.round + 1 : instance.round;

    const result = await store.commitTransition({
      instanceId: instance.instanceId,
      expectedVersion: instance.version,
      envelope,
      newCurrentStep: target,
      newRound,
      newStatus,
    });
    switch (result.kind) {
      case "duplicate_op":
        return { kind: "duplicate" };
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

  return {
    async handle(envelope: EventEnvelope): Promise<Outcome> {
      for (;;) {
        const outcome = await handleOnce(envelope);
        if (outcome !== "restart") {
          return outcome;
        }
      }
    },
    startInstance: (input) => startInstance({ store, definitions }, input),
  };
}
