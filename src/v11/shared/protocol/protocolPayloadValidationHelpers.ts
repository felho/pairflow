import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent
} from "../../../contracts/kernel/protocol.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";

const allowedPayloadKeys = new Set([
  "summary",
  "question",
  "message",
  "decision",
  "pass_intent",
  "findings_claim_state",
  "findings_claim_source",
  "findings",
  "metadata"
]);

const commitResultMetadataKeys = new Set([
  "commit_sha",
  "commit_message",
  "staged_files"
]);

const donePackageFieldNames = new Set([
  "donePackagePath",
  "done_package_path",
  "donePackageContent",
  "done_package_content"
]);

function isNonNegativeIntegerOrNull(value: unknown): boolean {
  return value === null || (isInteger(value) && value >= 0);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

export function validateUnknownPayloadKeys(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (envelopeType === "COMMIT_RESULT") {
    return;
  }
  const unknownKeys = Object.keys(payload).filter(
    (key) => !allowedPayloadKeys.has(key)
  );
  for (const key of unknownKeys) {
    errors.push({
      path: `payload.${key}`,
      message: "Unknown payload field; use payload.metadata for custom data"
    });
  }
}

function pushMissingClaimPairErrors(
  hasClaimStateField: boolean,
  hasClaimSourceField: boolean,
  errors: ValidationError[]
): void {
  if (!hasClaimStateField) {
    errors.push({
      path: "payload.findings_claim_state",
      message: "Required when payload.findings_claim_source is provided"
    });
  }
  if (!hasClaimSourceField) {
    errors.push({
      path: "payload.findings_claim_source",
      message: "Required when payload.findings_claim_state is provided"
    });
  }
}

export function validateFindingsClaimFields(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (payload.pass_intent !== undefined && !isPassIntent(payload.pass_intent)) {
    errors.push({
      path: "payload.pass_intent",
      message: "Must be one of: task, review, fix_request"
    });
  }
  if (
    payload.findings_claim_state !== undefined &&
    !isFindingsClaimState(payload.findings_claim_state)
  ) {
    errors.push({
      path: "payload.findings_claim_state",
      message: "Must be one of: clean, open_findings, unknown"
    });
  }
  if (
    payload.findings_claim_source !== undefined &&
    !isFindingsClaimSource(payload.findings_claim_source)
  ) {
    errors.push({
      path: "payload.findings_claim_source",
      message:
        "Must be one of: payload_flags, payload_findings_count, legacy_summary_parser, meta_review_artifact"
    });
  }
  const hasClaimStateField = payload.findings_claim_state !== undefined;
  const hasClaimSourceField = payload.findings_claim_source !== undefined;
  if (hasClaimStateField !== hasClaimSourceField) {
    pushMissingClaimPairErrors(hasClaimStateField, hasClaimSourceField, errors);
  }
}

function validateParityMetadataFields(
  metadata: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const nonNegativeIntegerOrNullFields = [
    "findings_claimed_open_total",
    "findings_artifact_open_total",
    "findings_blocking_open_total",
    "findings_advisory_open_total"
  ] as const;

  for (const field of nonNegativeIntegerOrNullFields) {
    const value = metadata[field];
    if (value === undefined) {
      continue;
    }
    if (!isNonNegativeIntegerOrNull(value)) {
      errors.push({
        path: `payload.metadata.${field}`,
        message: "Must be a non-negative integer or null when provided"
      });
    }
  }

  const parityStatus = metadata.findings_parity_status;
  if (
    parityStatus !== undefined &&
    parityStatus !== null &&
    parityStatus !== "ok" &&
    parityStatus !== "mismatch" &&
    parityStatus !== "guard_failed"
  ) {
    errors.push({
      path: "payload.metadata.findings_parity_status",
      message: "Must be one of: ok, mismatch, guard_failed, null"
    });
  }
}

export function validatePayloadMetadata(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (payload.metadata !== undefined && !isRecord(payload.metadata)) {
    errors.push({
      path: "payload.metadata",
      message: "Must be an object when provided"
    });
    return;
  }
  if (isRecord(payload.metadata) && envelopeType !== "COMMIT_RESULT") {
    validateParityMetadataFields(payload.metadata, errors);
  }
}

export function buildValidatedPayload(input: {
  payload: Record<string, unknown>;
  findings: ProtocolEnvelope["payload"]["findings"] | undefined;
}): ProtocolEnvelope["payload"] {
  const { payload, findings } = input;
  return {
    ...(payload.summary !== undefined && isNonEmptyString(payload.summary)
      ? { summary: payload.summary }
      : {}),
    ...(payload.question !== undefined && isNonEmptyString(payload.question)
      ? { question: payload.question }
      : {}),
    ...(payload.message !== undefined && isNonEmptyString(payload.message)
      ? { message: payload.message }
      : {}),
    ...(isApprovalDecision(payload.decision) ? { decision: payload.decision } : {}),
    ...(isPassIntent(payload.pass_intent)
      ? { pass_intent: payload.pass_intent }
      : {}),
    ...(isFindingsClaimState(payload.findings_claim_state)
      ? { findings_claim_state: payload.findings_claim_state }
      : {}),
    ...(isFindingsClaimSource(payload.findings_claim_source)
      ? { findings_claim_source: payload.findings_claim_source }
      : {}),
    ...(findings !== undefined ? { findings } : {}),
    ...(isRecord(payload.metadata) ? { metadata: payload.metadata } : {})
  };
}

function validateCommitResultPayload(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const key of Object.keys(payload)) {
    if (key === "metadata") {
      continue;
    }
    if (key === "summary") {
      errors.push({
        path: "payload.summary",
        message: "COMMIT_RESULT payload must not include summary"
      });
      continue;
    }
    if (donePackageFieldNames.has(key)) {
      errors.push({
        path: `payload.${key}`,
        message: "COMMIT_RESULT payload must not include done-package fields"
      });
      continue;
    }
    errors.push({
      path: `payload.${key}`,
      message: "COMMIT_RESULT payload only allows metadata"
    });
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : undefined;
  if (!metadata || !isNonEmptyString(metadata.commit_sha)) {
    errors.push({
      path: "payload.metadata.commit_sha",
      message: "COMMIT_RESULT metadata requires non-empty commit_sha"
    });
  }
  if (!metadata || !isNonEmptyString(metadata.commit_message)) {
    errors.push({
      path: "payload.metadata.commit_message",
      message: "COMMIT_RESULT metadata requires non-empty commit_message"
    });
  }
  if (!metadata || !isStringArray(metadata.staged_files)) {
    errors.push({
      path: "payload.metadata.staged_files",
      message:
        "COMMIT_RESULT metadata requires staged_files as an array of non-empty strings"
    });
  }

  if (!metadata) {
    return;
  }

  for (const key of Object.keys(metadata)) {
    if (commitResultMetadataKeys.has(key)) {
      continue;
    }
    errors.push({
      path: `payload.metadata.${key}`,
      message: donePackageFieldNames.has(key)
        ? "COMMIT_RESULT metadata must not include done-package fields"
        : "Unknown COMMIT_RESULT metadata field"
    });
  }
}

export function validateEnvelopeSpecificPayload(
  envelopeType: string,
  payload: Record<string, unknown>,
  validatedPayload: ProtocolEnvelope["payload"],
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  if (envelopeType === "PASS" && !isNonEmptyString(payload.summary)) {
    errors.push({
      path: "payload.summary",
      message: "PASS payload requires non-empty summary"
    });
  }
  if (envelopeType === "HUMAN_QUESTION" && !isNonEmptyString(payload.question)) {
    errors.push({
      path: "payload.question",
      message: "HUMAN_QUESTION payload requires non-empty question"
    });
  }
  if (envelopeType === "HUMAN_REPLY" && !isNonEmptyString(payload.message)) {
    errors.push({
      path: "payload.message",
      message: "HUMAN_REPLY payload requires non-empty message"
    });
  }
  if (envelopeType === "CONVERGENCE" && !isNonEmptyString(payload.summary)) {
    errors.push({
      path: "payload.summary",
      message: "CONVERGENCE payload requires non-empty summary"
    });
  }
  if (envelopeType === "APPROVAL_DECISION" && !isApprovalDecision(payload.decision)) {
    errors.push({
      path: "payload.decision",
      message: "APPROVAL_DECISION requires decision: approve|rework"
    });
  }
  if (envelopeType === "COMMIT_RESULT") {
    validateCommitResultPayload(payload, errors);
  }

  return validatedPayload;
}
