import type { DispatchIntent } from "./dispatch.js";
import type { InstanceId } from "./ids.js";
import type { RejectionName } from "./rejections.js";

/**
 * HANDLE's return vocabulary (l0a/l0b pseudocode). `rejected.reason` is
 * a RejectionName, never a free string. `committed.intent` is null at a
 * terminal target (commit ≠ deliver — the intent is returned, never
 * delivered; the runner is ch 9).
 */
export type Outcome =
  | { readonly kind: "committed"; readonly version: number; readonly intent: DispatchIntent | null }
  | { readonly kind: "duplicate" }
  | { readonly kind: "stale"; readonly currentVersion: number }
  | { readonly kind: "rejected"; readonly reason: RejectionName };

/** START_INSTANCE's return — not an Outcome arm. */
export interface Started {
  readonly kind: "started";
  readonly instanceId: InstanceId;
  readonly version: number;
  readonly intent: DispatchIntent;
}
