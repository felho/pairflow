import type { MetaReviewSubmitResultV11 as MetaReviewSubmitResult } from "./emitMetaReviewV11.js";
import {
  buildMetaReviewSubmitHeaderLines,
  appendMetaReviewOptionalFindingsParityLine,
  appendMetaReviewOptionalReworkTarget,
  appendMetaReviewOptionalRunId,
  appendMetaReviewOptionalWarnings
} from "./metaReviewSubmitRenderersHelpers.js";

export function renderMetaReviewSubmitText(result: MetaReviewSubmitResult): string {
  const lines = buildMetaReviewSubmitHeaderLines(result);
  appendMetaReviewOptionalRunId(lines, result.run_id);
  appendMetaReviewOptionalReworkTarget(lines, result.rework_target_message);
  appendMetaReviewOptionalFindingsParityLine(lines, result.report_json);
  appendMetaReviewOptionalWarnings(lines, result.warnings);
  return lines.join("\n");
}
