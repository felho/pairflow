import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  ReviewVerificationArtifact,
  ReviewVerificationValidationError
} from "./reviewVerificationContract.js";
import { validateReviewVerificationPayload } from "./reviewVerificationPayloadValidation.js";
import {
  validateReviewVerificationValidationEntry,
  type ReviewVerificationValidationEntry
} from "./reviewVerificationArtifactValidationEntry.js";

function validateArtifactMeta(
  candidate: Record<string, unknown>,
  errors: ReviewVerificationValidationError[]
): {
  bubbleId: string | undefined;
  round: number | undefined;
  reviewer: AgentName | undefined;
  generatedAt: string | undefined;
} {
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

  return {
    bubbleId: typeof bubbleId === "string" ? bubbleId.trim() : undefined,
    round: Number.isInteger(round) ? (round as number) : undefined,
    reviewer: reviewer === "codex" || reviewer === "claude" ? reviewer : undefined,
    generatedAt: typeof generatedAt === "string" ? generatedAt : undefined
  };
}

function validateArtifactValidation(
  candidate: Record<string, unknown>,
  errors: ReviewVerificationValidationError[]
): { status: "valid" | "invalid" | undefined; validationErrors: ReviewVerificationValidationError[] } {
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
      const normalizedEntry: ReviewVerificationValidationEntry | undefined =
        validateReviewVerificationValidationEntry(entry, entryPath, errors);
      if (normalizedEntry !== undefined) {
        validationErrors.push(normalizedEntry);
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

  return {
    status:
      validationStatus === "valid" || validationStatus === "invalid"
        ? validationStatus
        : undefined,
    validationErrors
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

  const meta = validateArtifactMeta(candidate, errors);
  const validation = validateArtifactValidation(candidate, errors);

  if (errors.length > 0 || normalizedPayload === undefined || meta.bubbleId === undefined || meta.round === undefined || meta.reviewer === undefined || meta.generatedAt === undefined || validation.status === undefined) {
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
        bubble_id: meta.bubbleId,
        round: meta.round,
        reviewer: meta.reviewer,
        generated_at: meta.generatedAt
      },
      validation: {
        status: validation.status,
        errors: validation.validationErrors
      }
    }
  };
}
