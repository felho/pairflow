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

function hasCurrentRound(input: {
  currentRound: number;
}): boolean {
  return isInteger(input.currentRound) && input.currentRound > 0;
}

function hasMissingSnapshotRound(input: {
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): boolean {
  return input.snapshotRoundIdentity === "missing" && input.snapshotRound === null;
}

function hasUnknownProjectionFreshness(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): boolean {
  return (
    input.snapshotRoundIdentity === "missing" ||
    !hasCurrentRound(input) ||
    (input.snapshotRoundIdentity === "present" && input.snapshotRound === null)
  );
}

function isStaleProjectionFreshness(input: {
  currentRound: number;
  snapshotRound: number | null;
}): boolean {
  return (
    input.snapshotRound !== null &&
    hasCurrentRound(input) &&
    input.snapshotRound < input.currentRound
  );
}

function isAheadProjectionFreshness(input: {
  currentRound: number;
  snapshotRound: number | null;
}): boolean {
  return (
    input.snapshotRound !== null &&
    hasCurrentRound(input) &&
    input.snapshotRound > input.currentRound
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
  if (hasMissingSnapshotRound(input) && hasCurrentRound(input)) {
    return "round_missing";
  }
  if (hasUnknownProjectionFreshness(input)) {
    return "unknown";
  }
  if (isStaleProjectionFreshness(input)) {
    return "stale";
  }
  if (isAheadProjectionFreshness(input)) {
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
