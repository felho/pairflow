import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent
} from "../../../contracts/kernel/protocol.js";
import type { Finding } from "../../../contracts/kernel/findings.js";
import type { FindingsParityMetadata } from "../metaReviewGate/findingsParityMetadataContract.js";
import type { ProtocolEnvelope } from "./protocolEnvelopeContract.js";
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
  "findings_parity",
  "advisory_findings_open_total",
  "commit_sha",
  "commit_message",
  "staged_files",
  "metadata"
]);

const commitResultFieldNames = new Set([
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

const findingsParityFieldNames = new Set([
  "findings_claimed_open_total",
  "findings_artifact_open_total",
  "findings_blocking_open_total",
  "findings_advisory_open_total",
  "findings_artifact_status",
  "findings_digest_sha256",
  "meta_review_run_id",
  "findings_parity_status"
]);

function isNonNegativeIntegerOrNull(value: unknown): boolean {
  return value === null || (isInteger(value) && value >= 0);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

export function validateUnknownPayloadKeys(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  const unknownKeys = Object.keys(payload).filter((key) => {
    if (envelopeType === "COMMIT_RESULT" && donePackageFieldNames.has(key)) {
      return false;
    }
    return !allowedPayloadKeys.has(key);
  });
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

function validateFindingsParityFields(
  metadata: Record<string, unknown>,
  pathPrefix: string,
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
        path: `${pathPrefix}.${field}`,
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
      path: `${pathPrefix}.findings_parity_status`,
      message: "Must be one of: ok, mismatch, guard_failed, null"
    });
  }
}

function validateNoFindingsParityFieldsInMetadata(
  metadata: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const field of Object.keys(metadata)) {
    if (!findingsParityFieldNames.has(field)) {
      continue;
    }
    errors.push({
      path: `payload.metadata.${field}`,
      message: "Findings parity fields must use payload.findings_parity"
    });
  }
}

function validateNoAdvisoryFindingsOpenTotalInMetadata(
  metadata: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (metadata.advisory_findings_open_total === undefined) {
    return;
  }
  errors.push({
    path: "payload.metadata.advisory_findings_open_total",
    message:
      "Advisory findings open total must use payload.advisory_findings_open_total"
  });
}

function validateNoCommitResultFieldsInMetadata(
  metadata: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const field of commitResultFieldNames) {
    if (metadata[field] === undefined) {
      continue;
    }
    errors.push({
      path: `payload.metadata.${field}`,
      message: "Commit result fields must use top-level payload fields"
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
  if (isRecord(payload.metadata)) {
    validateNoFindingsParityFieldsInMetadata(payload.metadata, errors);
    validateNoAdvisoryFindingsOpenTotalInMetadata(payload.metadata, errors);
    validateNoCommitResultFieldsInMetadata(payload.metadata, errors);
  }
}

export function validatePayloadAdvisoryFindingsOpenTotal(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (payload.advisory_findings_open_total === undefined) {
    return;
  }
  if (envelopeType !== "CONVERGENCE") {
    errors.push({
      path: "payload.advisory_findings_open_total",
      message: "Only CONVERGENCE can carry advisory_findings_open_total"
    });
    return;
  }
  if (!isNonNegativeInteger(payload.advisory_findings_open_total)) {
    errors.push({
      path: "payload.advisory_findings_open_total",
      message: "Must be a non-negative integer"
    });
  }
}

export function validatePayloadFindingsParity(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  if (payload.findings_parity === undefined) {
    return;
  }
  if (envelopeType !== "APPROVAL_REQUEST" && envelopeType !== "APPROVAL_DECISION") {
    errors.push({
      path: "payload.findings_parity",
      message: "Only APPROVAL_REQUEST and APPROVAL_DECISION can carry findings_parity"
    });
    return;
  }
  if (!isRecord(payload.findings_parity)) {
    errors.push({
      path: "payload.findings_parity",
      message: "Must be an object when provided"
    });
    return;
  }
  validateFindingsParityFields(
    payload.findings_parity,
    "payload.findings_parity",
    errors
  );
}

function buildValidatedCommitPayloadFields(
  payload: Record<string, unknown>
): Partial<ProtocolEnvelope["payload"]> {
  return {
    ...(payload.commit_sha !== undefined && isNonEmptyString(payload.commit_sha)
      ? { commit_sha: payload.commit_sha }
      : {}),
    ...(payload.commit_message !== undefined && isNonEmptyString(payload.commit_message)
      ? { commit_message: payload.commit_message }
      : {}),
    ...(isStringArray(payload.staged_files)
      ? { staged_files: payload.staged_files }
      : {})
  };
}

export function buildValidatedPayload(input: {
  payload: Record<string, unknown>;
  findings: Finding[] | undefined;
}): ProtocolEnvelope["payload"] {
  const { payload, findings } = input;
  const findingsParity = isRecord(payload.findings_parity)
    ? payload.findings_parity as FindingsParityMetadata
    : undefined;
  const validatedPayload = {
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
    ...(findingsParity !== undefined ? { findings_parity: findingsParity } : {}),
    ...(isNonNegativeInteger(payload.advisory_findings_open_total)
      ? { advisory_findings_open_total: payload.advisory_findings_open_total }
      : {}),
    ...buildValidatedCommitPayloadFields(payload),
    ...(isRecord(payload.metadata) ? { metadata: payload.metadata } : {})
  };
  return validatedPayload as ProtocolEnvelope["payload"];
}

function validateCommitResultPayload(
  payload: Record<string, unknown>,
  errors: ValidationError[]
): void {
  for (const key of Object.keys(payload)) {
    if (
      key === "commit_sha" ||
      key === "commit_message" ||
      key === "staged_files" ||
      key === "metadata"
    ) {
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
    if (!allowedPayloadKeys.has(key)) {
      continue;
    }
    errors.push({
      path: `payload.${key}`,
      message: "COMMIT_RESULT payload only allows commit result fields and metadata"
    });
  }

  if (!isNonEmptyString(payload.commit_sha)) {
    errors.push({
      path: "payload.commit_sha",
      message: "COMMIT_RESULT payload requires non-empty commit_sha"
    });
  }
  if (!isNonEmptyString(payload.commit_message)) {
    errors.push({
      path: "payload.commit_message",
      message: "COMMIT_RESULT payload requires non-empty commit_message"
    });
  }
  if (!isStringArray(payload.staged_files)) {
    errors.push({
      path: "payload.staged_files",
      message:
        "COMMIT_RESULT payload requires staged_files as an array of non-empty strings"
    });
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : undefined;
  if (!metadata) {
    return;
  }

  for (const key of Object.keys(metadata)) {
    if (donePackageFieldNames.has(key)) {
      errors.push({
        path: `payload.metadata.${key}`,
        message: "COMMIT_RESULT metadata must not include done-package fields"
      });
    }
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
  if (envelopeType === "APPROVAL_REQUEST" && !isNonEmptyString(payload.summary)) {
    errors.push({
      path: "payload.summary",
      message: "APPROVAL_REQUEST payload requires non-empty summary"
    });
  }
  if (
    envelopeType === "CONVERGENCE" &&
    !isNonNegativeInteger(payload.advisory_findings_open_total)
  ) {
    errors.push({
      path: "payload.advisory_findings_open_total",
      message:
        "CONVERGENCE payload requires advisory_findings_open_total as a non-negative integer"
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
