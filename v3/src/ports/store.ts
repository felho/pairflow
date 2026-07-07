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
  readonly newCurrentStep: StepId;
  readonly newRound: number;
  readonly newStatus: LifecycleStatus;
}

/**
 * Conflict precedence (plan §4.2, binding): inside the commit
 * transaction the duplicate check PRECEDES the version check — an
 * existing (instance_id, op_id) reports duplicate_op even when the
 * version has since advanced. Misreporting a retransmission as a CAS
 * conflict violates IC-A1.
 */
export type CommitTransitionResult =
  | { readonly kind: "committed"; readonly version: number }
  | { readonly kind: "cas_conflict" }
  | { readonly kind: "duplicate_op" };

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
   * commit transaction (REV-A1-TXN).
   */
  hasOp(instanceId: InstanceId, opId: OpId): Promise<boolean>;
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
}
