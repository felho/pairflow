import type {
  ActivationMode,
  HumanDecisionRequest,
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
// ch14-p3a (F4): the Ask derivation sits in `domain/`, so the floor's
// production imports stay `domain/` + `ports/` — ch9-p4b's DT1 ground
// ("the floor MODULE stays kernel-only") is kept rather than crossed.
import { humanDecisionRequest } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
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
 * F5 (packet ch14-p3a; contract:ch14-human-decision#C21/#C27): the
 * floor-owned detail read. It EXTENDS the store's `InstanceDetail`
 * rather than redeclaring it — the store's shape stays byte-unchanged
 * (F6) — and carries the ONE optional member.
 *
 * The value domain is C21's BINARY: the whole C20 Ask, or ABSENT.
 * There is no third value, no unavailability token and no availability
 * class on this surface. ABSENT means exactly one thing the operator
 * separates by reading `wait.kind` in the SAME document: not parked on
 * a human decision, or parked with the pinned template unyielded.
 */
export interface FloorInstanceDetail extends InstanceDetail {
  readonly pendingDecision?: HumanDecisionRequest;
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
 * (R2 — an operator/debug read); `getTimeline` returns EVERY committed
 * transcript entry class with its kind visible (R3 — ch12-C12's rule
 * extended by class at ch14-p2a, when the kernel-derived op-less
 * DECISION_REQUEST class joined the transition and lifecycle-fact pair;
 * the count is deliberately not stated, because the class set grows with
 * each realizing chapter and a number here would go stale silently).
 * The retired ch-4
 * `status`/`LifecycleStatus` field appears in NO floor read doc
 * (C11/C24 named replacement).
 */
export interface Floor {
  listInstances(): Promise<readonly CompactInstance[]>;
  getInstanceDetail(instanceId: InstanceId): Promise<FloorInstanceDetail | null>;
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

/**
 * F1 (packet ch14-p3a; contract:ch14-human-decision#C21): the
 * definition-store dependency is an EXPLICIT parameter — REQUIRED, and
 * NULLABLE. Two separate properties, both load-bearing.
 *
 * REQUIRED, because an OPTIONAL parameter lets an existing composition
 * keep compiling while silently never showing an Ask; the compiler is
 * what makes every composition root answer. NULLABLE, because roots
 * legitimately answer "none": the read verb's degrade lane (V9) when no
 * dir is configured, and `resume`, whose floor is given `null` BY
 * CONSTRUCTION so that C27's "resume is not blocked early" rule holds
 * structurally rather than by assertion — a floor with no dependency
 * cannot load, cannot throw, and cannot block the verb before the
 * kernel.
 */
export function createFloor(store: StorePort, definitions: DefinitionStore | null): Floor {
  /**
   * F3: WHICH pending request the derivation reads — a JOIN on the
   * declared correlation handle (`request_ref`), never "the last one".
   * The row read is the transcript's `DecisionRequestEntry`, whose
   * record fields sit INLINE beside `entryKind`/`seq`.
   *
   * BOTH conditions below are INTEGRITY, not discriminants, and both
   * are type-reachable: `wait.requestRef` is optional on the domain
   * type, and a handle matching no committed row contradicts C13's
   * atomicity. F6 governs them — the floor is a projection and
   * classifying a failure is not a projection's act, so each THROWS and
   * each caller classifies in its own layer.
   */
  const pendingRequest = (detail: InstanceDetail) => {
    const requestRef = detail.instance.wait?.requestRef;
    if (requestRef === undefined) {
      throw new Error(
        `floor integrity: instance '${detail.instance.instanceId}' is ` +
          `WAITING(human_decision) with NO request_ref on its wait record`,
      );
    }
    const row = detail.transcript.find(
      (entry) => entry.entryKind === "DECISION_REQUEST" && entry.requestRef === requestRef,
    );
    if (row === undefined || row.entryKind !== "DECISION_REQUEST") {
      throw new Error(
        `floor integrity: instance '${detail.instance.instanceId}' is ` +
          `WAITING(human_decision) on request_ref '${requestRef}' with no committed ` +
          `DECISION_REQUEST row`,
      );
    }
    return row;
  };

  /**
   * F5's presence rule, and its EVALUATION ORDER is part of the rule
   * rather than a build liberty: the PARK STATE is tested FIRST and the
   * load is reached ONLY when it holds. An eager-load implementation
   * satisfies the value rule and still diverges observably on
   * `submit-decision` — V4 (iii) at exit 1 where V4 (ii) at exit 3 is
   * owed — and on the read verb it burns a load the operator never
   * asked for.
   */
  const withPendingDecision = async (
    detail: InstanceDetail | null,
  ): Promise<FloorInstanceDetail | null> => {
    if (detail === null) {
      return null;
    }
    const instance = detail.instance;
    if (instance.kernelStatus !== "WAITING" || instance.wait?.kind !== "human_decision") {
      return detail;
    }
    if (definitions === null) {
      return detail;
    }
    // A REJECTING load propagates (F6): "I cannot reach the template" is
    // the caller's to classify, per verb class, and the floor degrades
    // nothing.
    const template = await definitions.load(instance.templateRef);
    if (template === null) {
      return detail;
    }
    return {
      ...detail,
      pendingDecision: humanDecisionRequest(instance, template, pendingRequest(detail)),
    };
  };

  return {
    // R1: the floor COMPACTS the store's full-instance read into the
    // state-scan discriminant (the store's own `listInstances` — the
    // kernel's full read — is byte-untouched; the floor is a read-only
    // projection layer, REV-C-PROJECTIONS-READONLY).
    listInstances: async () => (await store.listInstances()).map(toCompactInstance),
    // R2 + F5: the store's detail read VERBATIM, plus the ONE derived
    // member. No query is added, no write surface grows, and the
    // store's own `InstanceDetail` is byte-unchanged
    // (REV-C-PROJECTIONS-READONLY).
    getInstanceDetail: async (instanceId) =>
      withPendingDecision(await store.getInstanceDetail(instanceId)),
    getTimeline: (instanceId, afterSeq) => store.getTimeline(instanceId, afterSeq),
  };
}

/**
 * F1's REQUIRED-not-optional property, pinned at the TYPE level (the
 * ch14-p2b arity-pin idiom): an optional or defaulted second parameter
 * widens this to `1 | 2`, a required one does not. Nothing else in the
 * suite falsifies it — every behavioural lane passes either way.
 */
export type CreateFloorArity = Parameters<typeof createFloor>["length"];
const createFloorArityIsTwo: CreateFloorArity extends 2 ? true : false = true;
void createFloorArityIsTwo;
