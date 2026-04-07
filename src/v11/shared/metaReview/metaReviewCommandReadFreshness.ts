import { isInteger } from "../validation/primitives.js";
import type { MetaReviewStatusView } from "./metaReviewTypes.js";

export type MetaReviewSnapshotRoundIdentity =
  | "present"
  | "missing"
  | "unavailable";

export function isRoundLocalMetaReviewSnapshotOutsideCurrentRound(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): boolean {
  return (
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    ((input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) ||
      (input.snapshotRound !== null &&
        input.snapshotRound !== input.currentRound))
  );
}

export function resolveMetaReviewProjectionFreshness(input: {
  hasSnapshot: boolean;
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
  diagnostics?: string[];
}): MetaReviewStatusView["projection_freshness"] {
  if (!input.hasSnapshot) {
    return "no_snapshot";
  }
  if (input.snapshotRoundIdentity === "unavailable") {
    return "unknown";
  }
  if (
    input.snapshotRoundIdentity === "missing" &&
    input.snapshotRound === null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0
  ) {
    return "round_missing";
  }
  if (
    input.snapshotRoundIdentity === "missing" ||
    !isInteger(input.currentRound) ||
    input.currentRound < 1 ||
    (input.snapshotRoundIdentity === "present" && input.snapshotRound === null)
  ) {
    return "unknown";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound < input.currentRound
  ) {
    return "stale";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound > input.currentRound
  ) {
    return "ahead";
  }
  if ((input.diagnostics ?? []).length > 0) {
    return "unknown";
  }
  return "current_round";
}

export function resolveSnapshotFreshnessDiagnostics(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): string[] {
  if (!isInteger(input.currentRound) || input.currentRound < 1) {
    return [];
  }
  if (input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) {
    return [
      `META_REVIEW_SNAPSHOT_ROUND_MISSING:current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound === null) {
    return [];
  }
  if (input.snapshotRound < input.currentRound) {
    return [
      `META_REVIEW_SNAPSHOT_ROUND_STALE:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound > input.currentRound) {
    return [
      `META_REVIEW_SNAPSHOT_ROUND_AHEAD:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  return [];
}
