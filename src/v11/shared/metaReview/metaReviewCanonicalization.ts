import { isNonEmptyString } from "../validation/primitives.js";

export {
  CANONICAL_META_REVIEW_REPORT_REF,
  resolveCanonicalMetaReviewReportJson
} from "./metaReviewCanonicalizationReport.js";

export function normalizeOptionalText(value: string | undefined): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}
