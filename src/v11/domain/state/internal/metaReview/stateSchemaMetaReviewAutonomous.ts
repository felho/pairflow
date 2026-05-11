import type { BubbleMetaReviewSnapshotState } from "../../../../shared/metaReview/metaReviewSnapshotTypes.js";
import { type ValidationError } from "../../../../shared/validation/primitives.js";
import { validateMetaReviewAutonomousControls } from "./stateSchemaMetaReviewAutonomousSupport.js";

export interface ValidatedMetaReviewAutonomousSnapshot {
  auto_rework_count: BubbleMetaReviewSnapshotState["auto_rework_count"];
  auto_rework_limit: BubbleMetaReviewSnapshotState["auto_rework_limit"];
  sticky_human_gate: BubbleMetaReviewSnapshotState["sticky_human_gate"];
  consecutive_clean_runs: number;
}

export function validateMetaReviewAutonomousSnapshot(
  input: Record<string, unknown>,
  pathPrefix: string,
  errors: ValidationError[]
): ValidatedMetaReviewAutonomousSnapshot | undefined {
  return validateMetaReviewAutonomousControls({
    autoReworkCount: input.auto_rework_count,
    autoReworkLimit: input.auto_rework_limit,
    stickyHumanGate: input.sticky_human_gate,
    consecutiveCleanRuns: input.consecutive_clean_runs,
    pathPrefix,
    errors
  });
}
