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
 * WAITING (S5's iff). The kind union is the ch12 wait-kind set, grown
 * only additively (C23); stored canonical JSON carries the model's
 * snake keys (`requested_by`, `resume_events`) — the store mapper owns
 * the casing seam.
 */
export interface WaitReason {
  readonly kind: "kickoff_pending";
  readonly requestedBy: string;
  readonly resumeEvents: readonly string[];
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

/** The discriminated transcript entry (S11's staged type face, landed
 * at P1b with the fact writers). Narrow on `entryKind` — exhaustive
 * switch/discriminant, never a cast (F4). */
export type TranscriptEntry = TransitionEntry | LifecycleFactEntry;
