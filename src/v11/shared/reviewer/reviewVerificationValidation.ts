import type { AgentName } from "../../../types/bubble.js";
import {
  REVIEW_VERIFICATION_SCHEMA,
  type ReviewVerificationArtifact,
  type ReviewVerificationClaim,
  type ReviewVerificationOverall,
  type ReviewVerificationPayload,
  type ReviewVerificationValidationError
} from "./reviewVerificationContract.js";

function normalizeStringArray(
  value: unknown,
  path: string,
  errors: ReviewVerificationValidationError[]
): string[] {
  if (!Array.isArray(value)) {
    errors.push({
      code: "invalid_array",
      path,
      message: "Must be an array of non-empty strings."
    });
    return [];
  }

  const normalized: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      errors.push({
        code: "invalid_string",
        path: `${path}[${index}]`,
        message: "Must be a string."
      });
      return;
    }

    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      errors.push({
        code: "empty_string",
        path: `${path}[${index}]`,
        message: "Must not be empty."
      });
      return;
    }

    normalized.push(trimmed);
  });

  return normalized;
}

function normalizeClaim(
  value: unknown,
  index: number,
  errors: ReviewVerificationValidationError[]
): ReviewVerificationClaim | undefined {
  const path = `claims[${index}]`;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      code: "invalid_claim",
      path,
      message: "Claim must be an object."
    });
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const claimIdRaw = candidate.claim_id;
  const hasValidClaimId = typeof claimIdRaw === "string" && claimIdRaw.trim().length > 0;
  if (!hasValidClaimId) {
    errors.push({
      code: "claim_id_required",
      path: `${path}.claim_id`,
      message: "claim_id must be a non-empty string."
    });
  }
  const claimId = typeof claimIdRaw === "string" ? claimIdRaw.trim() : "";

  const statusRaw = candidate.status;
  if (
    statusRaw !== "verified"
    && statusRaw !== "mismatch"
    && statusRaw !== "unknown"
  ) {
    errors.push({
      code: "claim_status_invalid",
      path: `${path}.status`,
      message: "status must be one of: verified, mismatch, unknown."
    });
    return undefined;
  }

  if (!hasValidClaimId) {
    return undefined;
  }

  const noteRaw = candidate.note;
  if (
    noteRaw !== undefined &&
    (typeof noteRaw !== "string" || noteRaw.trim().length === 0)
  ) {
    errors.push({
      code: "note_invalid",
      path: `${path}.note`,
      message: "note must be a non-empty string when provided."
    });
  }
  const note = typeof noteRaw === "string" ? noteRaw.trim() : undefined;

  const evidenceRefsRaw = candidate.evidence_refs;
  const evidenceRefs = evidenceRefsRaw !== undefined
    ? normalizeStringArray(evidenceRefsRaw, `${path}.evidence_refs`, errors)
    : [];

  if ((statusRaw === "verified" || statusRaw === "mismatch") && evidenceRefs.length === 0) {
    errors.push({
      code: "evidence_refs_required",
      path: `${path}.evidence_refs`,
      message: "evidence_refs is required and must be non-empty when status is verified or mismatch."
    });
  }

  if (statusRaw === "unknown" && (note === undefined || note.length === 0)) {
    errors.push({
      code: "unknown_note_required",
      path: `${path}.note`,
      message: "note is required when status is unknown."
    });
  }

  const normalizedClaim: ReviewVerificationClaim = {
    claim_id: claimId,
    status: statusRaw
  };
  if (evidenceRefs.length > 0) {
    normalizedClaim.evidence_refs = evidenceRefs;
  }
  if (note !== undefined) {
    normalizedClaim.note = note;
  }

  return normalizedClaim;
}

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
        .map((claim, index) => normalizeClaim(claim, index, errors))
        .filter((claim): claim is ReviewVerificationClaim => claim !== undefined)
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

export function validateReviewVerificationArtifact(
  value: unknown
): {
  ok: true;
  value: ReviewVerificationArtifact;
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
          code: "invalid_artifact",
          path: "$",
          message: "Artifact must be a JSON object."
        }
      ]
    };
  }

  const candidate = value as Record<string, unknown>;
  const payloadValidation = validateReviewVerificationPayload(candidate);
  const normalizedPayload = payloadValidation.ok
    ? payloadValidation.value
    : undefined;
  if (!payloadValidation.ok) {
    errors.push(...payloadValidation.errors);
  }

  const inputRef = candidate.input_ref;
  if (typeof inputRef !== "string" || inputRef.trim().length === 0) {
    errors.push({
      code: "input_ref_invalid",
      path: "input_ref",
      message: "input_ref must be a non-empty string."
    });
  }

  const meta = candidate.meta;
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) {
    errors.push({
      code: "meta_invalid",
      path: "meta",
      message: "meta must be an object."
    });
  }
  const metaRecord =
    meta !== null && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : {};

  const bubbleId = metaRecord.bubble_id;
  if (typeof bubbleId !== "string" || bubbleId.trim().length === 0) {
    errors.push({
      code: "meta_bubble_id_invalid",
      path: "meta.bubble_id",
      message: "meta.bubble_id must be a non-empty string."
    });
  }

  const round = metaRecord.round;
  if (!Number.isInteger(round) || (round as number) < 1) {
    errors.push({
      code: "meta_round_invalid",
      path: "meta.round",
      message: "meta.round must be an integer >= 1."
    });
  }

  const reviewer = metaRecord.reviewer;
  if (reviewer !== "codex" && reviewer !== "claude") {
    errors.push({
      code: "meta_reviewer_invalid",
      path: "meta.reviewer",
      message: "meta.reviewer must be one of: codex, claude."
    });
  }

  const generatedAt = metaRecord.generated_at;
  if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) {
    errors.push({
      code: "meta_generated_at_invalid",
      path: "meta.generated_at",
      message: "meta.generated_at must be a valid ISO8601 timestamp."
    });
  }

  const validation = candidate.validation;
  if (
    validation === null ||
    typeof validation !== "object" ||
    Array.isArray(validation)
  ) {
    errors.push({
      code: "validation_invalid",
      path: "validation",
      message: "validation must be an object."
    });
  }
  const validationRecord =
    validation !== null && typeof validation === "object" && !Array.isArray(validation)
      ? (validation as Record<string, unknown>)
      : {};
  const validationStatus = validationRecord.status;
  if (validationStatus !== "valid" && validationStatus !== "invalid") {
    errors.push({
      code: "validation_status_invalid",
      path: "validation.status",
      message: "validation.status must be valid or invalid."
    });
  }

  const validationErrorsRaw = validationRecord.errors;
  const validationErrors: ReviewVerificationValidationError[] = [];
  if (!Array.isArray(validationErrorsRaw)) {
    errors.push({
      code: "validation_errors_invalid",
      path: "validation.errors",
      message: "validation.errors must be an array."
    });
  } else {
    validationErrorsRaw.forEach((entry, index) => {
      const entryPath = `validation.errors[${index}]`;
      if (
        entry === null ||
        typeof entry !== "object" ||
        Array.isArray(entry)
      ) {
        errors.push({
          code: "validation_error_invalid",
          path: entryPath,
          message: "validation error entry must be an object."
        });
        return;
      }
      const record = entry as Record<string, unknown>;
      if (typeof record.code !== "string" || record.code.trim().length === 0) {
        errors.push({
          code: "validation_error_code_invalid",
          path: `${entryPath}.code`,
          message: "validation error code must be a non-empty string."
        });
      }
      if (
        typeof record.message !== "string" ||
        record.message.trim().length === 0
      ) {
        errors.push({
          code: "validation_error_message_invalid",
          path: `${entryPath}.message`,
          message: "validation error message must be a non-empty string."
        });
      }
      if (
        record.path !== undefined &&
        (typeof record.path !== "string" || record.path.trim().length === 0)
      ) {
        errors.push({
          code: "validation_error_path_invalid",
          path: `${entryPath}.path`,
          message: "validation error path must be a non-empty string when provided."
        });
      }
      if (
        typeof record.code === "string"
        && typeof record.message === "string"
      ) {
        validationErrors.push({
          code: record.code,
          message: record.message,
          ...(typeof record.path === "string" ? { path: record.path } : {})
        });
      }
    });
  }

  if (validationStatus === "valid" && validationErrors.length > 0) {
    errors.push({
      code: "validation_mismatch",
      path: "validation",
      message: "validation.status=valid requires an empty validation.errors array."
    });
  }

  if (errors.length > 0 || normalizedPayload === undefined) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      ...normalizedPayload,
      input_ref: (inputRef as string).trim(),
      meta: {
        bubble_id: (bubbleId as string).trim(),
        round: round as number,
        reviewer: reviewer as AgentName,
        generated_at: generatedAt as string
      },
      validation: {
        status: validationStatus as "valid" | "invalid",
        errors: validationErrors
      }
    }
  };
}
