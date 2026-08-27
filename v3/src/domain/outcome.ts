import type { DispatchIntent, HumanDecisionRequest } from "./dispatch.js";
import type { InstanceId } from "./ids.js";
import type { RejectionName } from "./rejections.js";

/**
 * HANDLE's return vocabulary (l0a/l0b pseudocode). `rejected.reason` is
 * a RejectionName, never a free string. `committed.intent` is null at a
 * terminal target (commit ≠ deliver — the intent is returned, never
 * delivered; the runner is ch 9).
 *
 * O1 (packet ch11-P2b): the rejected arm is DISCRIMINATED on `reason`.
 * `gate_blocked` alone carries the blocking decision's verbatim
 * pass-through — `gate` REQUIRED (the blocking binding's `uses`, so a
 * multi-gate pipeline names WHICH gate blocked — packet ch12-P0),
 * `gateReason?` present iff the decision carried `reason`,
 * `evidenceRefs?` present iff carried (an empty list rides as
 * an empty list). EVERY OTHER reason carries NONE of the three — the
 * type forbids what the row forbids (the P2a arm-gate-2 lesson at write
 * time): a `gate`/`gateReason`/`evidenceRefs` on a non-gate reason is
 * an excess property.
 */
export type Outcome =
  | {
      readonly kind: "committed";
      readonly version: number;
      /**
       * K6 (packet ch14-p2a): WIDENED from `DispatchIntent | null`. The
       * committed arm's outbound effect is now selected from the status
       * the arrival set — a dispatch for an ACTIVE run, the ASK for a
       * run parked at a human gate, and null for a terminal run or a
       * bare wait.
       *
       * NARROW ON A DISCRIMINATING FIELD at every read site — never a
       * truthiness check and never a bare type assertion. The two
       * members share no key by construction, so a discriminator
       * exists; a `typecheck` run forces *a* narrow and cannot see
       * WHICH, which is why the rule is driven by a lane rather than
       * left to the compiler.
       */
      readonly intent: DispatchIntent | HumanDecisionRequest | null;
    }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | {
      readonly kind: "rejected";
      readonly reason: "gate_blocked";
      readonly gate: string;
      readonly gateReason?: string;
      readonly evidenceRefs?: readonly string[];
    }
  | { readonly kind: "rejected"; readonly reason: Exclude<RejectionName, "gate_blocked"> };

/**
 * The lifecycle outcome vocabulary (packet ch12-p1b, V1) — the l0d
 * units' RETURN forms, model-verbatim kinds. HANDLE's `Outcome` above
 * is untouched: the actor vocabulary is closed, and no lifecycle arm
 * joins it. `Activated` carries the FULL ch-4 `Started` continuity set
 * (instanceId + version + the first dispatch — the shipped stdout doc's
 * fields); `Accepted` is bare (lifecycle intents carry no
 * expectedVersion, so no caller consumes a hold's version — the floor
 * is the state read).
 */
export interface Created {
  readonly kind: "created";
  readonly instanceId: InstanceId;
  readonly version: number;
}

export interface Accepted {
  readonly kind: "accepted";
}

export interface Activated {
  readonly kind: "activated";
  readonly instanceId: InstanceId;
  readonly version: number;
  readonly intent: DispatchIntent;
}

export interface Terminated {
  readonly kind: "terminated";
  readonly disposition: "cancelled" | "failed";
}

/** The per-op unions — the kernel entry family's precise signatures
 * (V1). The shared arms reuse the existing Outcome arm forms verbatim. */
export type CreateOutcome =
  | Created
  | { readonly kind: "rejected"; readonly reason: "task_required" };

export type StartOutcome =
  | Activated
  | Accepted
  | { readonly kind: "duplicate" }
  | {
      readonly kind: "rejected";
      readonly reason:
        | "unknown_instance"
        | "op_id_collision"
        | "runtime_context_provider_unavailable";
    };

/**
 * RUNTIME_CONTEXT_READY's return vocabulary (packet ch12-p3, K family): the
 * accepted-readiness continues into `activate_or_hold` (immediate → the
 * `Activated` dispatch; deferred → `Accepted`). A rung- or guard-rejected
 * event (terminal-sink, correlation, or the kind boundary) is INERT — it
 * mutates NOTHING and returns `ignored` (never a business rejection, never a
 * throw — the seam delivers superseded completions and they must be inert).
 * A vanished instance is the L8 inert `unknown_instance` (droppable).
 */
export type RuntimeContextReadyOutcome =
  | Activated
  | Accepted
  | { readonly kind: "ignored" }
  | { readonly kind: "rejected"; readonly reason: "unknown_instance" };

/**
 * RUNTIME_CONTEXT_FAILED's return vocabulary (packet ch9-p1, F4): an ADMITTED
 * failure commits the terminal `FAIL` disposition and returns `Terminated`
 * (`disposition: "failed"`); a rung-rejected completion (terminal-sink or
 * correlation) is INERT — it mutates NOTHING and returns `ignored` (never a
 * business rejection, never a throw — the seam delivers superseded/second
 * completions and they must be inert). A vanished instance is the L8 inert
 * `unknown_instance` (droppable). The union mirrors READY's inert vocabulary
 * plus `fail`'s `Terminated` — the transport-gate integrity throw (an unknown
 * reason token / a non-string detail, G2/G3) is NOT an outcome: it surfaces as
 * a thrown kernel/config error, fail-closed, never a return value.
 */
export type RuntimeContextFailedOutcome =
  | Terminated
  | { readonly kind: "ignored" }
  | { readonly kind: "rejected"; readonly reason: "unknown_instance" };

/**
 * The completion seam's KIND-BLIND drain return (packet ch9-p1, T1): the union
 * of both completion kinds' outcomes — `settleRuntimeContextDeliveries` returns
 * these so a caller can prove a delivered-inert completion (of either kind) was
 * DELIVERED, not silently dropped (SM2's fail-able distinction).
 */
export type RuntimeContextCompletionOutcome =
  | RuntimeContextReadyOutcome
  | RuntimeContextFailedOutcome;

export type KickoffOutcome =
  | Activated
  | { readonly kind: "duplicate" }
  | { readonly kind: "rejected"; readonly reason: "unknown_instance" | "op_id_collision" };

export type CancelOutcome =
  | Terminated
  | { readonly kind: "duplicate" }
  | { readonly kind: "rejected"; readonly reason: "unknown_instance" | "op_id_collision" };

export type FailOutcome =
  | Terminated
  | { readonly kind: "rejected"; readonly reason: "unknown_instance" };

/**
 * SUBMIT_DECISION's return vocabulary (packet ch14-p2b, Q1/Q9): the
 * committed arm is HANDLE's own — `Committed(version,
 * post_commit_output(…))` (C12) — because the decision routes through
 * the SAME arrival and its post-commit selection produces the same
 * outbound effect class. The rejection names are the operator ladder's
 * rungs (C15) plus the key-scoped guards that run after the
 * ChoicePoint selection.
 */
export type SubmitDecisionOutcome =
  | {
      readonly kind: "committed";
      readonly version: number;
      readonly intent: DispatchIntent | HumanDecisionRequest | null;
    }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | {
      readonly kind: "rejected";
      readonly reason:
        | "unknown_instance"
        | "op_id_collision"
        | "not_awaiting_decision"
        | "decision_request_mismatch"
        | "missing_version"
        | "operator_not_authorized"
        | "unknown_decision"
        | "missing_required_field"
        | "override_required"
        | "override_not_applicable";
    };

/**
 * RESUME_WAIT's return vocabulary (packet ch14-p2b, Q1/Q9): the
 * committed arm as above; the rejection names are C18's rungs plus the
 * post-admission wait-SHAPE guard and the routing refusal. NO authority
 * rung on this path — the selection is kernel-classified (C18), which
 * is why no `operator_not_authorized` appears here.
 */
export type ResumeWaitOutcome =
  | {
      readonly kind: "committed";
      readonly version: number;
      readonly intent: DispatchIntent | HumanDecisionRequest | null;
    }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | {
      readonly kind: "rejected";
      readonly reason:
        | "unknown_instance"
        | "op_id_collision"
        | "not_waiting"
        | "resume_event_mismatch"
        | "missing_version"
        | "not_bare_wait"
        | "no_resume_transition";
    };
