import type { DispatchIntent } from "./dispatch.js";
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
  | { readonly kind: "committed"; readonly version: number; readonly intent: DispatchIntent | null }
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

/** START_INSTANCE's return — not an Outcome arm. */
export interface Started {
  readonly kind: "started";
  readonly instanceId: InstanceId;
  readonly version: number;
  readonly intent: DispatchIntent;
}
