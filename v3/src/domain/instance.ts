import type { EventEnvelope } from "./envelope.js";
import type { RetainedGateDecision } from "./gate.js";
import type { ActorId, InstanceId, RoleName, StepId } from "./ids.js";
import type { TemplateRef } from "./template.js";
import type { EpochMillis } from "./time.js";

/** The L0a value chain verbatim; ch-4 paths only ever COMMIT RUNNING/DONE. */
export type LifecycleStatus = "CREATED" | "RUNNING" | "DONE";

/**
 * Instance aggregate (ledger §4 l0a + l0b) — the run. The transcript is
 * NOT inline: it lives as store rows, joined by the detail read.
 * `round` starts at 1; the kernel increments it on a commit whose target
 * step is `template.start` (the loop-back re-entry edge the L0a/L0b
 * traces exhibit). Formal round machinery (limits, gate rounds) is L2.
 */
export interface WorkflowInstance {
  readonly instanceId: InstanceId;
  readonly templateRef: TemplateRef;
  readonly task: string;
  readonly binding: Readonly<Record<RoleName, ActorId>>;
  readonly currentStep: StepId;
  readonly round: number;
  readonly status: LifecycleStatus;
  readonly version: number;
}

/**
 * A committed transcript row; `committedAt` is store-stamped
 * (CHK-C-TS-SOURCE). `payloadDigest` rides the COMMITTED fact (packet
 * ch5-P4, the model's "recorded_digest_of reads the committed row") —
 * the type-inclusive emit digest the collision rung compares
 * (CHK-A1-DIGEST); rejected attempts record nothing.
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
