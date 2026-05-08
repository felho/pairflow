import { isNonEmptyString } from "../../../validation/primitives.js";

export {
  resolveCanonicalMetaReviewReportJson
} from "./metaReviewCanonicalizationReport.js";

export function normalizeOptionalText(value: string | undefined): string | null {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}
