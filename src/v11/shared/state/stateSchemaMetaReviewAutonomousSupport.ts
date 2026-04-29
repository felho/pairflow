import type { BubbleMetaReviewSnapshotState } from "../../../types/bubble.js";
import { isInteger, type ValidationError } from "../validation/primitives.js";

export function validateMetaReviewAutonomousControls(input: {
  autoReworkCount: unknown;
  autoReworkLimit: unknown;
  stickyHumanGate: unknown;
  consecutiveCleanRuns: unknown;
  pathPrefix: string;
  errors: ValidationError[];
}): {
  auto_rework_count: BubbleMetaReviewSnapshotState["auto_rework_count"];
  auto_rework_limit: BubbleMetaReviewSnapshotState["auto_rework_limit"];
  sticky_human_gate: BubbleMetaReviewSnapshotState["sticky_human_gate"];
  consecutive_clean_runs: number;
} | undefined {
  const errorCountAtStart = input.errors.length;

  if (!(isInteger(input.autoReworkCount) && input.autoReworkCount >= 0)) {
    input.errors.push({
      path: `${input.pathPrefix}.auto_rework_count`,
      message: "Must be a non-negative integer"
    });
  }

  if (!(isInteger(input.autoReworkLimit) && input.autoReworkLimit >= 1)) {
    input.errors.push({
      path: `${input.pathPrefix}.auto_rework_limit`,
      message: "Must be an integer >= 1"
    });
  }

  if (typeof input.stickyHumanGate !== "boolean") {
    input.errors.push({
      path: `${input.pathPrefix}.sticky_human_gate`,
      message: "Must be a boolean"
    });
  }

  if (!(isInteger(input.consecutiveCleanRuns) && input.consecutiveCleanRuns >= 0)) {
    input.errors.push({
      path: `${input.pathPrefix}.consecutive_clean_runs`,
      message: "Must be a non-negative integer"
    });
  }

  if (input.errors.length > errorCountAtStart) {
    return undefined;
  }

  return {
    auto_rework_count: input.autoReworkCount as number,
    auto_rework_limit: input.autoReworkLimit as number,
    sticky_human_gate: input.stickyHumanGate as boolean,
    consecutive_clean_runs: input.consecutiveCleanRuns as number
  };
}
