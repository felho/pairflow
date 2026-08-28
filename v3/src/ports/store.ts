import type {
  ActorId,
  AgentConfig,
  DecisionRequestBody,
  EventEnvelope,
  InstanceId,
  KernelStatus,
  LifecycleFactKind,
  OpId,
  RetainedGateDecision,
  RuntimeContext,
  StepId,
  TerminalDisposition,
  TranscriptEntry,
  WaitReason,
  WorkflowInstance,
} from "../domain/index.js";

/**
 * StorePort (ADR-003; packet ch4-P1 contract matrix). The store owns
 * atomicity, the kernel owns semantics: the kernel derives target /
 * newRound / the axis fields, the store writes what it is told. NO
 * write API accepts a timestamp — the type-level half of
 * CHK-C-TS-SOURCE; the implementation stamps created_at / committed_at
 * inside the commit boundary from its injected TimeSource (plan §4.3).
 */
/**
 * K1 (packet ch14-p2a): the ARRIVAL's committed effect, as ONE closed
 * record — every state change a target entry produces, plus the optional
 * second row the human-gate park appends.
 *
 * THE MEMBER LIST IS CLOSED, and `newWait` is ALWAYS EXPLICIT (a value
 * or null) rather than optional: the `commitLifecycle` F1 rule is
 * adopted here so the S5 same-move clear cannot be FORGOTTEN. An
 * optional field would let an agent-branch arrival silently leave a
 * stale wait behind, which is a state no reader could explain.
 *
 * THE BRAND IS THE POINT, on the live `AdmittedTemplate` precedent: a
 * unique-symbol brand with no runtime value, whose only sanctioned
 * producer is the arrival function. A caller cannot hand-build a
 * substitute (it does not typecheck) and cannot swap ONE member (the
 * field is the whole record), so "the object the store receives is the
 * object the arrival returned" becomes a property the TYPE carries
 * rather than a lane's aspiration.
 */
declare const arrivalEffectBrand: unique symbol;

export interface ArrivalEffectFields {
  readonly newCurrentStep: StepId;
  readonly newRound: number;
  readonly newKernelStatus: KernelStatus;
  /**
   * Non-null EXACTLY when the commit enters TERMINAL — the type face of
   * the single-write rule (T1).
   */
  readonly newTerminalDisposition: TerminalDisposition | null;
  /** ALWAYS explicit: value or null. See the class comment. */
  readonly newWait: WaitReason | null;
  /**
   * The human-gate park's SECOND ROW, appended in the SAME transaction
   * as the state write. Two commits would be exactly the half-entered
   * gate the atomicity rule forbids, and a kernel-side compensating
   * delete would be a second correctness mechanism beside the
   * transaction (REV-A1-TXN).
   */
  readonly decisionRequest?: DecisionRequestBody;
  /**
   * Resolved from the step being LEFT, not the target — a REQUIRED
   * member of the record rather than a sibling of it, so a caller
   * cannot substitute its own.
   */
  readonly issuedAgentConfig: AgentConfig;
}

export type ArrivalEffect = ArrivalEffectFields & { readonly [arrivalEffectBrand]: true };

/* ch14-p3a (F4): `DecisionRequestBody` is DECLARED in `domain/` now — the
 * Ask derivation reads it and lives there, and re-declaring it here would
 * make `domain/` import `ports/`. This port consumes the domain type. */

export interface CommitTransitionInput {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly envelope: EventEnvelope;
  /** The type-inclusive emit digest (DigestSource; packet ch5-P4). */
  readonly payloadDigest: string;
  /**
   * S2/C27 (packet ch11-P2b): the kernel-derived ordered allow/warn
   * decisions this transition ran — REQUIRED (`[]` is a statement,
   * absence is not). The store writes it VERBATIM inside the SAME commit
   * transaction and stamps nothing into the list.
   */
  readonly gateDecisions: readonly RetainedGateDecision[];
  /**
   * K1 (packet ch14-p2a): the arrival's effect, NESTED as one branded
   * field rather than flattened alongside the caller's members. The
   * remaining members above stay the CALLER's, and the port type is what
   * closes the split — which is what made the caller-substitution defect
   * provable instead of merely asserted.
   *
   * Both halves ride the SAME transaction the commit always used
   * (REV-A1-TXN unchanged).
   */
  readonly arrival: ArrivalEffect;
}

/**
 * Conflict precedence (plan §4.2 extended by §5.4, binding): inside
 * the commit transaction the idempotency check PRECEDES the version
 * check, and it is DIGEST-AWARE — an existing (instance_id, op_id) row
 * with a MATCHING digest reports duplicate_op, a DIFFERING digest
 * reports op_id_collision; both even when the version has since
 * advanced. Misreporting a retransmission as a CAS conflict — or a
 * collision as Stale — violates IC-A1. A collision writes NOTHING
 * (rejected attempts never consume the idempotency key).
 */
export type CommitTransitionResult =
  | { readonly kind: "committed"; readonly version: number }
  | { readonly kind: "cas_conflict" }
  | { readonly kind: "duplicate_op" }
  | { readonly kind: "op_id_collision" };

/**
 * F1 (packet ch12-p1b): the uniform-commit write member's input — the
 * kernel derives EVERY written value, the store writes verbatim in ONE
 * transaction (the instances UPDATE under CAS, version + 1, plus the
 * fact INSERT when `fact` is non-null — REV-A1-TXN; `fact: null` is
 * FAIL's fact-less commit). `newWait` is ALWAYS explicit (value or
 * null — the S5 same-move clear made unforgettable at the type);
 * absent optional fields leave their columns unchanged. No timestamp
 * input (CHK-C-TS-SOURCE). The in-transaction idempotency re-check is
 * KIND-AWARE (A2): an existing (instance_id, op_id) row of the fact's
 * OWN kind → duplicate_op; any other kind → op_id_collision.
 */
export interface CommitLifecycleInput {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly fact: { readonly kind: LifecycleFactKind; readonly opId: OpId } | null;
  readonly newKernelStatus: KernelStatus;
  /** Non-null EXACTLY when the commit enters TERMINAL (T1's type face). */
  readonly newTerminalDisposition: TerminalDisposition | null;
  /** Always explicit — null clears; leaving WAITING clears in this same move (S5/T3). */
  readonly newWait: WaitReason | null;
  readonly newCurrentStep?: StepId;
  readonly newRound?: number;
  readonly newTask?: string;
  readonly newRuntimeContext?: RuntimeContext;
  readonly newFailureReason?: string;
}

/**
 * Q2 (packet ch14-p2b): the OPERATOR-ENTRY write member's input — ONE
 * member for BOTH op-carrying operator classes, discriminated by
 * `entry.kind`, rather than two members or a widened
 * `commitTransition`. Two members would duplicate the CAS + arrival-
 * write half twice over; widening `commitTransition` would make the
 * envelope optional and hand every existing caller a shape that can be
 * under-filled.
 *
 * THE MEMBER WRITES UP TO TWO ROWS: the arrival's effect record carries
 * the human-gate park's OPTIONAL SECOND ROW, so a decision routing back
 * to a gate commits its own op-carrying row AND a fresh
 * DECISION_REQUEST in the SAME transaction — exactly as the transition
 * member already does (REV-A1-TXN).
 *
 * The body rides `entry_body` as canonical JSON with the model's SNAKE
 * keys — the same store casing seam the `wait` column and the
 * DECISION_REQUEST body already follow. The in-transaction idempotency
 * re-check is KIND-AWARE (Q15): an existing (instance_id, op_id) row of
 * the entry's OWN kind → duplicate_op; any other kind → op_id_collision.
 */
export interface CommitOperatorEntryInput {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly entry: OperatorEntryWrite;
  /** The arrival's branded effect — the SAME record `commitTransition` nests. */
  readonly arrival: ArrivalEffect;
}

/**
 * The written row, discriminated by `kind`. The body carries the class's
 * own fields; the store serializes it into `entry_body` and writes the
 * transition-only columns NULL (Q2's column iff).
 */
export type OperatorEntryWrite =
  | {
      readonly kind: "DECISION_MADE";
      readonly opId: OpId;
      readonly body: DecisionMadeBody;
    }
  | {
      readonly kind: "WAIT_RESUMED";
      readonly opId: OpId;
      readonly body: WaitResumedBody;
    };

/** DECISION_MADE's closed field list (C22/Q5), less the store-stamped
 * `committedAt` and the `seq` the store assigns. */
export interface DecisionMadeBody {
  readonly decision: string;
  readonly payload?: unknown;
  readonly by: ActorId;
  readonly requestRef: string;
  /** `true` IFF against a recorded recommendation — never `false`. */
  readonly override?: true;
}

/** WAIT_RESUMED's closed field list (C22/Q7). */
export interface WaitResumedBody {
  readonly kind: string;
  readonly event: string;
}

export interface InstanceDetail {
  readonly instance: WorkflowInstance;
  /** Ordered by seq; committed rows only. */
  readonly transcript: readonly TranscriptEntry[];
}

export interface StorePort {
  /** null = unknown instance (kernel maps to Rejected(unknown_instance)). */
  loadInstance(instanceId: InstanceId): Promise<WorkflowInstance | null>;
  /**
   * Transcript pre-check FAST PATH only; correctness comes from the
   * commit transaction (REV-A1-TXN). Returns the committed row's
   * digest so the rung can answer the collision question — a boolean
   * cannot (packet ch5-P4; replaces ch-4's hasOp). KIND-AWARE since
   * ch12-p1b (A2): fact rows carry a NULL digest, and the entry kind
   * is what the lifecycle idempotency rung compares (same fact kind →
   * Duplicate; any other kind under the key → op_id_collision).
   */
  findOp(
    instanceId: InstanceId,
    opId: OpId,
  ): Promise<{
    readonly payloadDigest: string | null;
    readonly entryKind: TranscriptEntry["entryKind"];
  } | null>;
  /**
   * The caller mints instanceId (tests: deterministic ids; production
   * minting lands with the ch-6 CLI — no randomness in kernel or store).
   * An existing id THROWS: store-integrity error, not a rejection.
   */
  createInstance(instance: WorkflowInstance): Promise<void>;
  commitTransition(input: CommitTransitionInput): Promise<CommitTransitionResult>;
  /** The lifecycle write member (F1) — result vocabulary shared with
   * commitTransition; every lifecycle commit advances version by one. */
  commitLifecycle(input: CommitLifecycleInput): Promise<CommitTransitionResult>;
  /**
   * Q2 (packet ch14-p2b): the OPERATOR-ENTRY write member — result
   * vocabulary shared with the two members above. Writes the
   * op-carrying row AND, when the arrival parked at a human gate, the
   * DECISION_REQUEST second row, in ONE transaction.
   */
  commitOperatorEntry(input: CommitOperatorEntryInput): Promise<CommitTransitionResult>;
  /** Committed rows only (trivially: the store holds nothing else). */
  listInstances(): Promise<readonly WorkflowInstance[]>;
  getInstanceDetail(instanceId: InstanceId): Promise<InstanceDetail | null>;
  /**
   * Committed rows strictly after `afterSeq`, seq-ascending — or null
   * for an UNKNOWN instance (known-but-empty = `[]`: the caller must be
   * able to tell "no such run" from "no new rows"). Cursor domain: a
   * nonnegative safe integer; anything else throws `RangeError` BEFORE
   * any query (fail-closed integrity error, never a kernel rejection —
   * the ch-6 CLI maps it to its usage class). The null/`[]` decision
   * and the row suffix come from ONE snapshot (packet ch6-P1).
   * Committed-only stated wide: no diagnostic or non-committed data can
   * ever enter this surface (the diagnostic channel is ch 7, separate).
   */
  getTimeline(
    instanceId: InstanceId,
    afterSeq: number,
  ): Promise<readonly TranscriptEntry[] | null>;
}
