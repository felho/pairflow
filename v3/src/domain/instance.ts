import type { EventEnvelope } from "./envelope.js";
import type { RetainedGateDecision } from "./gate.js";
import type { ActorId, InstanceId, OpId, RoleName, StepId } from "./ids.js";
import type { AgentConfig, TemplateRef } from "./template.js";
import type { EpochMillis } from "./time.js";

/**
 * l0d/KernelStatus (ledger §4 l0d; packet ch12-p1a T3): the macro-
 * lifecycle EXECUTION axis — one half of the two-axis truth beside the
 * step position. At P1a the reachable tokens are exactly ACTIVE and
 * TERMINAL (the one-shot creates ACTIVE; the terminal branch writes
 * TERMINAL); CREATED/WAITING become reachable with P1b's entry
 * machinery.
 */
export type KernelStatus = "CREATED" | "ACTIVE" | "WAITING" | "TERMINAL";

/**
 * l0d/TerminalDisposition (T3): HOW the run ended — written exactly
 * once, in the same atomic move as `kernel_status ← TERMINAL` (T1).
 * At P1a the only writer is the kernel terminal branch (`done`);
 * `failed`/`cancelled` join with their P1b writers.
 */
export type TerminalDisposition = "done" | "failed" | "cancelled";

/**
 * l0d/WaitReason (T3/T4): typed waiting — non-null IFF the instance is
 * WAITING (S5's iff). Stored canonical JSON carries the model's snake
 * keys (`requested_by`, `resume_events`, `request_ref`) — the store
 * mapper owns the casing seam, and the TYPE grain is camelCase
 * throughout (K3's casing decision).
 *
 * OPENED at ch14-p2a (K4): `kind` was the single kernel-owned member
 * `kickoff_pending`; it now also admits this chapter's kernel kind
 * (`human_decision`) and the AUTHORED kinds a `wait` step declares.
 * The authored class is open by construction, so `kind` is a plain
 * string rather than a union — which has a consequence the type cannot
 * hide: `kind` CANNOT discriminate a union, so `requestRef` is an
 * optional field with a presence RULE rather than a variant.
 *
 * `requestRef` is present IFF the record was written by the human-gate
 * park. That rule is carried by a driven lane, not by this type, and
 * saying so here is the honest form — a reader must not infer from the
 * optionality that a bare wait might carry one.
 *
 * THE KERNEL-OWNED SET IS NOT RESTATED HERE. Admission owns the
 * collision refusal between authored kinds and kernel-owned ones; a
 * second membership constant beside it would be two authorities for
 * one rule. The kernel writes what the admitted step declares.
 */
export interface WaitReason {
  readonly kind: string;
  readonly requestedBy: string;
  readonly resumeEvents: readonly string[];
  /** Present IFF written by the human-gate park (K4's presence rule). */
  readonly requestRef?: string;
}

/**
 * l0d/RuntimeContextRef (T4): opaque `{kind, locator}` — the locator is
 * provider-defined per kind and KERNEL-UNINTERPRETED (C15 binds
 * providers at P3). v1 kind: `worktree`. At P1a the sole writer is the
 * start seam's X1 mapping, which stores a string locator; the process-
 * gate backstop narrows it to `string` at its single read site (X2).
 */
export interface RuntimeContextRef {
  readonly kind: string;
  readonly locator: unknown;
}

/**
 * l0d/RuntimeContext (T3/T4): the discriminated runtime-context state.
 * `ready` with `ref: null` IS the model's `ready(∅)` — the context-free
 * run's trivially-ready state (C14). `requested` has no writer until
 * P3. Stored form: canonical JSON with the model's snake key
 * (`request_id`).
 */
export type RuntimeContext =
  | { readonly state: "none" }
  | { readonly state: "requested"; readonly requestId: string }
  | { readonly state: "ready"; readonly ref: RuntimeContextRef | null };

/**
 * ch9/ProvisioningFailureReason (packet ch9-p1, G1; contract:ch9-runner#C3,
 * #C22 → ADR-018): the CLOSED, kernel-owned reason domain of the FAILED
 * completion channel — at ch9 exactly two members. `sys:provision_rejected`:
 * the provider determined the spec/config cannot be honored (e.g. a missing or
 * non-git `repo`). `sys:provision_failed`: the provisioning mechanics failed
 * (e.g. a git command's nonzero exit). Both carry the ADR-018 `sys:` prefix —
 * system-minted, disjoint from every authored token BY CONSTRUCTION (the
 * authored grammar cannot express `:`), never a registry rejection name.
 * Members grow ONLY by contract successor rows; the domain is validated at the
 * completion's own transport gate (G2).
 */
export type ProvisioningFailureReason = "sys:provision_rejected" | "sys:provision_failed";

/**
 * ch9/PROVISIONING_FAILURE_REASONS (packet ch9-p1, G1): the CLOSED reason
 * domain's member list AS A VALUE — the single membership set the G2 transport
 * gate (kernel/lifecycle.ts) validates against, homed BESIDE its type so the
 * two cannot drift. EXACTLY the two ch9 members; members grow ONLY by contract
 * successor rows (a new member is a type edit AND a list edit in lockstep).
 */
export const PROVISIONING_FAILURE_REASONS: readonly ProvisioningFailureReason[] = [
  "sys:provision_rejected",
  "sys:provision_failed",
];

/**
 * ch9/RuntimeContextCompletion (packet ch9-p1, W3 — the reference realization):
 * the discriminated completion a provider fires through the composition-injected
 * seam when its async provisioning concludes — ONE union carried by ONE sink and
 * ONE delivery endpoint, so the seam's hold/release/drain serve BOTH kinds with
 * zero per-kind seam logic (C1's "same seam" + C5's "unchanged in MECHANISM").
 *   - `ready(ref)` — the readiness for the request the kernel issued (the ch12-P3
 *     completion, unchanged in effect).
 *   - `failed(reason, detail?)` — a provisioning failure (C1): `reason` is an
 *     UNTRUSTED wire token classified to `ProvisioningFailureReason` at the
 *     transport gate (G2); `detail` is OPTIONAL untrusted diagnostic free text
 *     (C4) — string-gated (G3), never parsed, never in `failure_reason`.
 */
export type RuntimeContextCompletion =
  | { readonly kind: "ready"; readonly ref: RuntimeContextRef }
  | { readonly kind: "failed"; readonly reason: string; readonly detail?: unknown };

/** l0d/ActivationMode (T3): how the run activates. At P1a the one-shot
 * only ever writes `immediate`; `deferred_kickoff` is P1b's. */
export type ActivationMode = "immediate" | "deferred_kickoff";

/**
 * Instance aggregate (ledger §4 l0d; packet ch12-p1a) — the run. The
 * transcript is NOT inline: it lives as store rows, joined by the
 * detail read. `round` starts at 1; advancement is declared transition
 * semantics (K1, ch11-P2c).
 *
 * The macro-lifecycle is the TWO-AXIS truth (C11): `kernelStatus`
 * beside the step position, with at most one `terminalDisposition`
 * written exactly once. The ch-4 `status`/`LifecycleStatus` pair is
 * RETIRED (C24 named replacement; DONE ≡ TERMINAL(done)).
 *
 * The nullable `task`/`currentStep` (packet ch12-p1b, G2 — the P1a
 * S9/T3 staged flip, landed WITH its inhabitants): `task` is NULL
 * until kickoff in deferred mode, `currentStep` is NULL until ACTIVE
 * (position is meaningless before activation). `runOverrides` is the
 * C9 create-snapshot face (step-id → agent-config-class map, each
 * entry kernel-opaque per C7) — written at genesis, consumed only by
 * P2's cascade.
 */
export interface WorkflowInstance {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task: string | null;
  readonly binding: Readonly<Record<RoleName, ActorId>>;
  readonly currentStep: StepId | null;
  readonly round: number;
  readonly kernelStatus: KernelStatus;
  readonly terminalDisposition: TerminalDisposition | null;
  readonly activationMode: ActivationMode;
  /** Non-null IFF kernelStatus = WAITING (S5); vacuously null at P1a. */
  readonly wait: WaitReason | null;
  /**
   * The discriminated runtime-context state (X1's P1a-reachable values:
   * `ready(∅)` for a context-free start; `ready({kind: "worktree",
   * locator})` for the ch11-P3b seam start). Consumed at exactly ONE
   * point — the process-gate backstop's runner `cwd` (X2).
   */
  readonly runtimeContext: RuntimeContext;
  /** Written only by FAIL (L6); non-null only at `failed`. */
  readonly failureReason: string | null;
  /** The C9 snapshot (packet ch12-p1b, G2): frozen at CREATE; `{}` for
   * an absent input. No production reader until P2's cascade. */
  readonly runOverrides: Readonly<Record<StepId, Readonly<Record<string, unknown>>>>;
  readonly version: number;
}

/** The lifecycle fact names (C12) — the fact name IS the entry-kind
 * discriminator value (packet ch12-p1a S11; the writers land at P1b). */
export type LifecycleFactKind = "STARTED" | "CANCELLED" | "TASK_SUPPLIED";

/**
 * An actor-transition transcript row; `committedAt` is store-stamped
 * (CHK-C-TS-SOURCE). `payloadDigest` rides the COMMITTED fact (packet
 * ch5-P4, the model's "recorded_digest_of reads the committed row") —
 * the type-inclusive emit digest the collision rung compares
 * (CHK-A1-DIGEST); rejected attempts record nothing.
 */
export interface TransitionEntry {
  readonly entryKind: "transition";
  readonly seq: number;
  readonly envelope: EventEnvelope;
  readonly payloadDigest: string;
  /**
   * S3/C27 (packet ch11-P2b): the ordered retained allow/warn decisions
   * the L2 gate pipeline ran for this transition — `[]` when it ran no
   * gates (never null, never absent; the ch6 known-empty culture). The
   * ONE shared row mapper exposes it identically on both read surfaces.
   */
  readonly gateDecisions: readonly RetainedGateDecision[];
  /**
   * C2/C10 (packet ch12-p2): the run profile the kernel ISSUED for this
   * dispatched step — RECOMPUTED at commit from the same immutable
   * sources the dispatch used, so it equals the packet's
   * `effectiveAgentConfig` byte-identically (deterministic provenance).
   * A map, possibly `{}`; opaque; records what was issued, NOT that the
   * actor ran exactly so (issued ≠ proven runtime).
   */
  readonly issuedAgentConfig: AgentConfig;
  readonly committedAt: EpochMillis;
}

/**
 * A lifecycle fact row (C12; packet ch12-p1b F3): the op_id
 * consumption record of an op-carrying intent, committed in the SAME
 * atomic move as its state change. The transition-only fields are
 * ABSENT by entry class (C10) — never known-empty; the fact variant
 * carries NO `issuedAgentConfig` (a transition-only field, C10/C12).
 */
export interface LifecycleFactEntry {
  readonly entryKind: LifecycleFactKind;
  readonly seq: number;
  readonly opId: OpId;
  readonly committedAt: EpochMillis;
}

/**
 * ch14-C13/C22 (packet ch14-p2a, K2/K8): the recommendation a firing
 * edge declared, WITH where it came from. The pair travels together in
 * both directions — present together, absent together — because the
 * audit question is where a recommendation came from and not only what
 * it was. Absent entirely on BOTH of C13's absence branches, and then
 * every decision is equal and override never applies.
 */
export interface DecisionRecommendationSource {
  readonly fromStep: StepId;
  readonly eventType: string;
}

/**
 * A DECISION_REQUEST transcript row (ch14-C22; packet ch14-p2a, K8) —
 * the human-gate park's record, appended in the SAME atomic move as
 * the WAITING state write.
 *
 * A NEW ENTRY CLASS beside the transition and lifecycle-fact classes,
 * never a `LifecycleFactKind` growth: it is KERNEL-DERIVED, carries no
 * `opId`, consumes no `(instance_id, op_id)` uniqueness, and its
 * correlation handle is `requestRef`. Reading it as a fact kind would
 * put an op-less row into the op-consumption class, which is exactly
 * the confusion the separate variant prevents.
 *
 * ABSENCE BY CLASS (C10's rule, third branch): the transition-only
 * fields are ABSENT here rather than known-empty, and this class's own
 * fields are absent on the other two.
 */
export interface DecisionRequestEntry {
  readonly entryKind: "DECISION_REQUEST";
  readonly seq: number;
  /** Fresh per park attempt; the correlation handle in place of an op id. */
  readonly requestRef: string;
  /** The GATE's role — never the arriving step's. */
  readonly recipient: RoleName;
  /** The gate's DECLARED decision keys, in declaration order. */
  readonly decisions: readonly string[];
  /** The FIRING edge's declared `recommends`, absent on both absence branches. */
  readonly recommendation?: string;
  /** Present IFF `recommendation` is — the pair travels together. */
  readonly recommendationSource?: DecisionRecommendationSource;
  /**
   * The arriving entry's payload SURFACE (K3(ii)), present IFF that
   * payload is not ABSENT. A presence test, never a truth test: an
   * authored `{}`, `null`, `""` or `0` records as faithfully as an
   * authored object.
   */
  readonly contextRef?: unknown;
  readonly committedAt: EpochMillis;
}

/**
 * A DECISION_MADE transcript row (ch14-C22; packet ch14-p2b, Q2) — the
 * operator's committed decision, appended in the SAME atomic move as
 * the routed arrival's state write.
 *
 * A NEW UNION VARIANT beside the transition, lifecycle-fact and
 * DECISION_REQUEST classes, never a `LifecycleFactKind` growth (Q2):
 * a `LifecycleFactEntry` carries EXACTLY `{entryKind, seq, opId,
 * committedAt}` because a lifecycle fact IS its op-consumption record,
 * and this class carries five more fields. Growing the fact kind would
 * widen every fact row with fields three of its members can never
 * carry.
 *
 * OP-CARRYING: `opId` consumes the `(instance_id, op_id)` uniqueness,
 * and the idempotency rung compares KIND over it (Q15).
 *
 * ABSENCE BY CLASS (C10's rule): the transition-only fields —
 * `envelope`, `payloadDigest`, `gateDecisions`, `issuedAgentConfig` —
 * are ABSENT here rather than known-empty (C22).
 */
export interface DecisionMadeEntry {
  readonly entryKind: "DECISION_MADE";
  readonly seq: number;
  readonly opId: OpId;
  /** The WIRE's `verdict` records as the entry's `decision` (Q5) — an
   * admitted decision key, never interpreted by the kernel. */
  readonly decision: string;
  /** The decision's declared payload fields; absent when the verdict
   * declares none. Operator-authored UNTRUSTED text (Q16). */
  readonly payload?: unknown;
  /** The deciding operator — operator-authored untrusted text (Q16). */
  readonly by: ActorId;
  /** Correlation to the DECISION_REQUEST row this decision answers. */
  readonly requestRef: string;
  /**
   * Recorded `true` IFF the verdict went AGAINST a recorded
   * recommendation, ABSENT otherwise — NEVER `false` (Q5, dimension 8):
   * an explicit `false` would make the audit surface answer "declined
   * to override" where the contract says there was nothing to override.
   */
  readonly override?: true;
  readonly committedAt: EpochMillis;
}

/**
 * A WAIT_RESUMED transcript row (ch14-C22; packet ch14-p2b, Q7) — the
 * bare wait's resume record, appended in the SAME atomic move as the
 * routed arrival's state write. A NEW UNION VARIANT on the same ground
 * as DECISION_MADE above, and OP-CARRYING in the same sense.
 */
export interface WaitResumedEntry {
  readonly entryKind: "WAIT_RESUMED";
  readonly seq: number;
  readonly opId: OpId;
  /**
   * The WAIT's kind read off the INSTANCE record, not the step's
   * declaration (Q7) — they are equal by the correspondence checker and
   * would diverge silently in a corrupt history.
   */
  readonly kind: string;
  /** The resume event type that routed this resume. */
  readonly event: string;
  readonly committedAt: EpochMillis;
}

/** The discriminated transcript entry (S11's staged type face, landed
 * at P1b with the fact writers; the DECISION_REQUEST class joins at
 * ch14-p2a, and the two OP-CARRYING operator classes at ch14-p2b).
 * Narrow on `entryKind` — exhaustive switch/discriminant, never a cast
 * (F4). */
export type TranscriptEntry =
  | TransitionEntry
  | LifecycleFactEntry
  | DecisionRequestEntry
  | DecisionMadeEntry
  | WaitResumedEntry;
