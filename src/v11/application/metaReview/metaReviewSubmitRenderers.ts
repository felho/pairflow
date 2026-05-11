import type { MetaReviewSubmitResult } from "../../shared/metaReview/metaReviewCommandContract.js";
import {
  buildMetaReviewSubmitHeaderLines,
  appendMetaReviewOptionalFindingsParityLine,
  appendMetaReviewOptionalReworkTarget,
  appendMetaReviewOptionalRunId,
  appendMetaReviewOptionalWarnings
} from "./internal/submit/renderersHelpers.js";

export function renderMetaReviewSubmitText(result: MetaReviewSubmitResult): string {
  const lines = buildMetaReviewSubmitHeaderLines(result);
  appendMetaReviewOptionalRunId(lines, result.run_id);
  appendMetaReviewOptionalReworkTarget(lines, result.rework_target_message);
  appendMetaReviewOptionalFindingsParityLine(lines, result.report_json);
  appendMetaReviewOptionalWarnings(lines, result.warnings);
  return lines.join("\n");
}
