import type { EventEnvelope } from "./envelope.js";
import type { RetainedGateDecision } from "./gate.js";
import type { ActorId, InstanceId, RoleName, StepId } from "./ids.js";
import type { TemplateRef } from "./template.js";
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
 * TYPE-STAGING (S9/T3): the `task` and `current_step` STORE COLUMNS go
 * nullable at P1a, but no P1a writer produces NULL (the one-shot
 * requires the task and activates immediately), so the non-null TS
 * types here are the faithful image of the P1a inhabitant set; the
 * nullable flip and its reader narrowing enter with P1b's
 * genesis/deferred shapes.
 */
export interface WorkflowInstance {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task: string;
  readonly binding: Readonly<Record<RoleName, ActorId>>;
  readonly currentStep: StepId;
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
  /** Written only by FAIL (P1b); always null at P1a (S6). */
  readonly failureReason: string | null;
  readonly version: number;
}

/**
 * A committed transcript row; `committedAt` is store-stamped
 * (CHK-C-TS-SOURCE). `payloadDigest` rides the COMMITTED fact (packet
 * ch5-P4, the model's "recorded_digest_of reads the committed row") —
 * the type-inclusive emit digest the collision rung compares
 * (CHK-A1-DIGEST); rejected attempts record nothing.
 *
 * TYPE-STAGING (S11, packet ch12-p1a): the STORE gains the entry-kind
 * discriminator and per-class nullability, but at P1a only `transition`
 * rows are ever written, so this type keeps `envelope`/`payloadDigest`/
 * `gateDecisions` NON-NULL and gains no `issuedAgentConfig` field —
 * the discriminated fact-entry variant and its readers enter with
 * P1b's fact entries.
 */
export interface TranscriptEntry {
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
  readonly committedAt: EpochMillis;
}
