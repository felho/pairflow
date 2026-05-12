import type {
  BubbleStateReadyForApproval,
  BubbleStateRunningIdeation,
  BubbleStateRunningMetaReview,
  BubbleStateRunningStandard,
  BubbleStateSnapshot,
  BubbleStateWaitingHuman
} from "./bubbleStateSnapshot.js";

export function isRunningSnapshot(
  s: BubbleStateSnapshot
): s is BubbleStateRunningIdeation | BubbleStateRunningStandard | BubbleStateRunningMetaReview {
  return (
    s.kind === "running_ideation"
    || s.kind === "running_standard"
    || s.kind === "running_meta_review"
  );
}

export function isActiveSnapshot(
  s: BubbleStateSnapshot
): s is
  | BubbleStateRunningStandard
  | BubbleStateRunningMetaReview
  | BubbleStateWaitingHuman
  | BubbleStateReadyForApproval {
  return (
    s.kind === "running_standard"
    || s.kind === "running_meta_review"
    || s.kind === "waiting_human"
    || s.kind === "ready_for_approval"
  );
}

export function isMetaReviewAuthority(
  s: BubbleStateSnapshot
): s is BubbleStateRunningMetaReview {
  return s.kind === "running_meta_review";
}
