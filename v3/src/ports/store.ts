import type {
  AgentConfig,
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
  readonly newCurrentStep: StepId;
  readonly newRound: number;
  /**
   * E3 (packet ch12-p1a): the axis replacement of the ch-4 `newStatus`
   * field. Both fields ride the SAME transaction the commit always used
   * (REV-A1-TXN unchanged).
   */
  readonly newKernelStatus: KernelStatus;
  /**
   * Non-null EXACTLY when the commit enters TERMINAL — the type face of
   * the single-write rule (T1): a terminal arrival writes `TERMINAL` +
   * `"done"` (the COMPLETE branch), a non-terminal commit writes
   * `ACTIVE` + null.
   */
  readonly newTerminalDisposition: TerminalDisposition | null;
  /**
   * C2/C10 (packet ch12-p2): the run profile the kernel issued for this
   * dispatched step — the store writes it CANONICAL JSON into the
   * transition row's `issued_agent_config` column (in place of the P1a
   * NULL) inside the SAME commit transaction (REV-A1-TXN unchanged). A
   * map, possibly `{}`; never null on a transition row.
   */
  readonly issuedAgentConfig: AgentConfig;
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
