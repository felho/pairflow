import {
  isApprovalDecision,
  isFindingsClaimSource,
  isFindingsClaimState,
  isPassIntent,
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord,
  type ValidationError
} from "../validation/primitives.js";
import { validateFindings } from "./protocolFindingValidation.js";

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

function isNonNegativeIntegerOrNull(value: unknown): boolean {
  return value === null || (isInteger(value) && value >= 0);
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

function buildValidatedPayload(
  payload: Record<string, unknown>,
  findings: ProtocolEnvelope["payload"]["findings"] | undefined
): ProtocolEnvelope["payload"] {
  const validatedPayload: ProtocolEnvelope["payload"] = {};
  if (payload.summary !== undefined && isNonEmptyString(payload.summary)) {
    validatedPayload.summary = payload.summary;
  }
  if (payload.question !== undefined && isNonEmptyString(payload.question)) {
    validatedPayload.question = payload.question;
  }
  if (payload.message !== undefined && isNonEmptyString(payload.message)) {
    validatedPayload.message = payload.message;
  }
  if (isApprovalDecision(payload.decision)) {
    validatedPayload.decision = payload.decision;
  }
  if (isPassIntent(payload.pass_intent)) {
    validatedPayload.pass_intent = payload.pass_intent;
  }
  if (isFindingsClaimState(payload.findings_claim_state)) {
    validatedPayload.findings_claim_state = payload.findings_claim_state;
  }
  if (isFindingsClaimSource(payload.findings_claim_source)) {
    validatedPayload.findings_claim_source = payload.findings_claim_source;
  }
  if (findings !== undefined) {
    validatedPayload.findings = findings;
  }
  if (isRecord(payload.metadata)) {
    validatedPayload.metadata = payload.metadata;
  }
  return validatedPayload;
}

function validateEnvelopeSpecificPayload(
  envelopeType: string,
  payload: Record<string, unknown>,
  validatedPayload: ProtocolEnvelope["payload"],
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  if (envelopeType === "PASS") {
    if (!isNonEmptyString(payload.summary)) {
      errors.push({
        path: "payload.summary",
        message: "PASS payload requires non-empty summary"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "HUMAN_QUESTION") {
    if (!isNonEmptyString(payload.question)) {
      errors.push({
        path: "payload.question",
        message: "HUMAN_QUESTION payload requires non-empty question"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "HUMAN_REPLY") {
    if (!isNonEmptyString(payload.message)) {
      errors.push({
        path: "payload.message",
        message: "HUMAN_REPLY payload requires non-empty message"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "CONVERGENCE") {
    if (!isNonEmptyString(payload.summary)) {
      errors.push({
        path: "payload.summary",
        message: "CONVERGENCE payload requires non-empty summary"
      });
    }
    return validatedPayload;
  }

  if (envelopeType === "APPROVAL_DECISION" && !isApprovalDecision(payload.decision)) {
    errors.push({
      path: "payload.decision",
      message: "APPROVAL_DECISION requires decision: approve|rework"
    });
  }

  return validatedPayload;
}

export function validatePayloadByType(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  const unknownKeys = Object.keys(payload).filter(
    (key) => !allowedPayloadKeys.has(key)
  );
  for (const key of unknownKeys) {
    errors.push({
      path: `payload.${key}`,
      message: "Unknown payload field; use payload.metadata for custom data"
    });
  }

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

  if (payload.metadata !== undefined && !isRecord(payload.metadata)) {
    errors.push({
      path: "payload.metadata",
      message: "Must be an object when provided"
    });
  } else if (isRecord(payload.metadata)) {
    validateParityMetadataFields(payload.metadata, errors);
  }

  const findings =
    payload.findings !== undefined
      ? validateFindings(payload.findings, "payload.findings", errors)
      : undefined;

  return validateEnvelopeSpecificPayload(
    envelopeType,
    payload,
    buildValidatedPayload(payload, findings),
    errors
  );
}
