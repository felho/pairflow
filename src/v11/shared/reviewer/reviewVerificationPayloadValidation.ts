import {
  REVIEW_VERIFICATION_SCHEMA,
  type ReviewVerificationPayload,
  type ReviewVerificationValidationError,
  type ReviewVerificationOverall
} from "./reviewVerificationContract.js";
import { normalizeReviewVerificationClaim } from "./reviewVerificationClaimNormalization.js";

export function validateReviewVerificationPayload(
  value: unknown
): {
  ok: true;
  value: ReviewVerificationPayload;
}
| {
  ok: false;
  errors: ReviewVerificationValidationError[];
} {
  const errors: ReviewVerificationValidationError[] = [];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      errors: [
        {
          code: "invalid_payload",
          path: "$",
          message: "Payload must be a JSON object."
        }
      ]
    };
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.schema !== REVIEW_VERIFICATION_SCHEMA) {
    errors.push({
      code: "schema_mismatch",
      path: "schema",
      message: `schema must equal ${REVIEW_VERIFICATION_SCHEMA}.`
    });
  }

  const overall = candidate.overall;
  if (overall !== "pass" && overall !== "fail") {
    errors.push({
      code: "overall_invalid",
      path: "overall",
      message: "overall must be one of: pass, fail."
    });
  }

  const claimsRaw = candidate.claims;
  if (!Array.isArray(claimsRaw) || claimsRaw.length === 0) {
    errors.push({
      code: "claims_invalid",
      path: "claims",
      message: "claims must be a non-empty array."
    });
  }

  const claims = Array.isArray(claimsRaw)
    ? claimsRaw
        .map((claim, index) => normalizeReviewVerificationClaim(claim, index, errors))
        .filter((claim): claim is NonNullable<typeof claim> => claim !== undefined)
    : [];

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      schema: REVIEW_VERIFICATION_SCHEMA,
      overall: overall as ReviewVerificationOverall,
      claims
    }
  };
}
