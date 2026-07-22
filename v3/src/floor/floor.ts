import type {
  ActivationMode,
  InstanceId,
  KernelStatus,
  RuntimeContext,
  StepId,
  TemplateRef,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WorkflowInstance,
} from "../domain/index.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";

/**
 * R1 (packet ch12-P4, C21/C17): the COMPACT list-row projection — a
 * state-SCAN discriminant, the deliberate contrast with `detail`'s full
 * read. It carries the macro-lifecycle axis fields, the typed `wait`'s
 * KIND alone (not the full payload), and the runtime-context STATE
 * discriminant (`none | requested | ready`) WITHOUT the opaque locator
 * (the `projection-never-the-ref` culture applied to the human list
 * payload — a compact read never leaks the provider-defined locator) and
 * WITHOUT `version`. The keys are the `WorkflowInstance` camelCase field
 * names — the CLI read verbs `JSON.stringify` this verbatim (the emitted
 * read-doc grain).
 */
export interface CompactInstance {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly currentStep: StepId | null;
  readonly round: number;
  readonly kernelStatus: KernelStatus;
  readonly terminalDisposition: TerminalDisposition | null;
  readonly activationMode: ActivationMode;
  /** The typed wait's KIND alone (the full payload is `detail`'s, R2). */
  readonly wait: { readonly kind: WaitReason["kind"] } | null;
  /** The runtime-context STATE discriminant — no locator, no requestId. */
  readonly runtimeContext: { readonly state: RuntimeContext["state"] };
}

function toCompactInstance(instance: WorkflowInstance): CompactInstance {
  return {
    instanceId: instance.instanceId,
    templateRef: instance.templateRef,
    currentStep: instance.currentStep,
    round: instance.round,
    kernelStatus: instance.kernelStatus,
    terminalDisposition: instance.terminalDisposition,
    activationMode: instance.activationMode,
    wait: instance.wait === null ? null : { kind: instance.wait.kind },
    runtimeContext: { state: instance.runtimeContext.state },
  };
}

/**
 * The read-only visibility floor (plan §4.6; the ch12 macro-lifecycle
 * read surface): committed rows only — stated wide: no diagnostic or
 * non-committed data can ever enter this surface (the diagnostic channel
 * is ch 7, separate). Read-only by construction
 * (REV-C-PROJECTIONS-READONLY). `listInstances` projects the COMPACT
 * state discriminant (R1 — the ch12 two-axis lifecycle + wait-kind +
 * runtime-context state, the locator EXCLUDED); `getInstanceDetail`
 * exposes the FULL stored state including the opaque runtime-context ref
 * (R2 — an operator/debug read); `getTimeline` returns both transcript
 * entry classes with their kind visible (R3). The retired ch-4
 * `status`/`LifecycleStatus` field appears in NO floor read doc
 * (C11/C24 named replacement).
 */
export interface Floor {
  listInstances(): Promise<readonly CompactInstance[]>;
  getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null>;
  /**
   * §6.2 cursor read (packet ch6-P1): committed rows strictly after
   * `afterSeq`, seq-ascending. Unknown instance = null, known-but-empty
   * = [] — the caller must be able to tell "no such run" from "no new
   * rows". Invalid cursors (not a nonnegative safe integer) fail closed
   * with RangeError, delegated from the store.
   */
  getTimeline(
    instanceId: InstanceId,
    afterSeq: number,
  ): Promise<readonly TranscriptEntry[] | null>;
}

export function createFloor(store: StorePort): Floor {
  return {
    // R1: the floor COMPACTS the store's full-instance read into the
    // state-scan discriminant (the store's own `listInstances` — the
    // kernel's full read — is byte-untouched; the floor is a read-only
    // projection layer, REV-C-PROJECTIONS-READONLY).
    listInstances: async () => (await store.listInstances()).map(toCompactInstance),
    getInstanceDetail: (instanceId) => store.getInstanceDetail(instanceId),
    getTimeline: (instanceId, afterSeq) => store.getTimeline(instanceId, afterSeq),
  };
}
