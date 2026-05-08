import type {
  ReviewVerificationClaim,
  ReviewVerificationValidationError
} from "../../reviewVerificationContract.js";

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

function isReviewVerificationClaimStatus(
  value: unknown
): value is ReviewVerificationClaim["status"] {
  return value === "verified" || value === "mismatch" || value === "unknown";
}

function normalizeClaimId(
  candidate: Record<string, unknown>,
  path: string,
  errors: ReviewVerificationValidationError[]
): string | undefined {
  const claimIdRaw = candidate.claim_id;
  const hasValidClaimId =
    typeof claimIdRaw === "string" && claimIdRaw.trim().length > 0;
  if (!hasValidClaimId) {
    errors.push({
      code: "claim_id_required",
      path: `${path}.claim_id`,
      message: "claim_id must be a non-empty string."
    });
    return undefined;
  }

  return claimIdRaw.trim();
}

function normalizeClaimNote(
  candidate: Record<string, unknown>,
  path: string,
  errors: ReviewVerificationValidationError[]
): string | undefined {
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

  return typeof noteRaw === "string" ? noteRaw.trim() : undefined;
}

function normalizeClaimEvidenceRefs(
  candidate: Record<string, unknown>,
  path: string,
  errors: ReviewVerificationValidationError[]
): string[] {
  const evidenceRefsRaw = candidate.evidence_refs;
  return evidenceRefsRaw !== undefined
    ? normalizeStringArray(evidenceRefsRaw, `${path}.evidence_refs`, errors)
    : [];
}

export function normalizeReviewVerificationClaim(
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
  const claimId = normalizeClaimId(candidate, path, errors);
  const statusRaw = candidate.status;
  if (!isReviewVerificationClaimStatus(statusRaw)) {
    errors.push({
      code: "claim_status_invalid",
      path: `${path}.status`,
      message: "status must be one of: verified, mismatch, unknown."
    });
    return undefined;
  }

  if (claimId === undefined) {
    return undefined;
  }

  const note = normalizeClaimNote(candidate, path, errors);
  const evidenceRefs = normalizeClaimEvidenceRefs(candidate, path, errors);

  if ((statusRaw === "verified" || statusRaw === "mismatch") && evidenceRefs.length === 0) {
    errors.push({
      code: "evidence_refs_required",
      path: `${path}.evidence_refs`,
      message:
        "evidence_refs is required and must be non-empty when status is verified or mismatch."
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
