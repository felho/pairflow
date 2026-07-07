import type {
  EventEnvelope,
  InstanceId,
  LifecycleStatus,
  OpId,
  StepId,
  TranscriptEntry,
  WorkflowInstance,
} from "../domain/index.js";

/**
 * StorePort (ADR-003; packet ch4-P1 contract matrix). The store owns
 * atomicity, the kernel owns semantics: the kernel derives target /
 * newRound / newStatus, the store writes what it is told. NO write API
 * accepts a timestamp — the type-level half of CHK-C-TS-SOURCE; the
 * implementation stamps created_at / committed_at inside the commit
 * boundary from its injected TimeSource (plan §4.3).
 */
export interface CommitTransitionInput {
  readonly instanceId: InstanceId;
  readonly expectedVersion: number;
  readonly envelope: EventEnvelope;
  /** The type-inclusive emit digest (DigestSource; packet ch5-P4). */
  readonly payloadDigest: string;
  readonly newCurrentStep: StepId;
  readonly newRound: number;
  readonly newStatus: LifecycleStatus;
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
   * cannot (packet ch5-P4; replaces ch-4's hasOp).
   */
  findOp(instanceId: InstanceId, opId: OpId): Promise<{ readonly payloadDigest: string } | null>;
  /**
   * The caller mints instanceId (tests: deterministic ids; production
   * minting lands with the ch-6 CLI — no randomness in kernel or store).
   * An existing id THROWS: store-integrity error, not a rejection.
   */
  createInstance(instance: WorkflowInstance): Promise<void>;
  commitTransition(input: CommitTransitionInput): Promise<CommitTransitionResult>;
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
