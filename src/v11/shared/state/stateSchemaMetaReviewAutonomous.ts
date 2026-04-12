import {
  type BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import { type ValidationError } from "../validation/primitives.js";
import { validateMetaReviewAutonomousControls } from "./stateSchemaMetaReviewAutonomousSupport.js";

export interface ValidatedMetaReviewAutonomousSnapshot {
  auto_rework_count: BubbleMetaReviewSnapshotState["auto_rework_count"];
  auto_rework_limit: BubbleMetaReviewSnapshotState["auto_rework_limit"];
  sticky_human_gate: BubbleMetaReviewSnapshotState["sticky_human_gate"];
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
    pathPrefix,
    errors
  });
}
