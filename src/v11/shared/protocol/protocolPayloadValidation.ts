import {
  type ProtocolEnvelope
} from "./protocolEnvelopeContract.js";
import { type ValidationError } from "../validation/primitives.js";
import {
  validateAdvisoryFindings,
  validateFindings
} from "./protocolFindingValidation.js";
import {
  buildValidatedPayload,
  validateEnvelopeSpecificPayload,
  validateFindingsClaimFields,
  validatePayloadAdvisoryFindingsOpenTotal,
  validatePayloadFindingsParity,
  validatePayloadMetadata,
  validateUnknownPayloadKeys
} from "./protocolPayloadValidationHelpers.js";

export function validatePayloadByType(
  envelopeType: string,
  payload: Record<string, unknown>,
  errors: ValidationError[]
): ProtocolEnvelope["payload"] {
  validateUnknownPayloadKeys(envelopeType, payload, errors);
  if (envelopeType !== "COMMIT_RESULT") {
    validateFindingsClaimFields(payload, errors);
  }
  validatePayloadMetadata(envelopeType, payload, errors);
  validatePayloadFindingsParity(envelopeType, payload, errors);
  validatePayloadAdvisoryFindingsOpenTotal(envelopeType, payload, errors);

  const findings = payload.findings !== undefined
    ? envelopeType === "CONVERGENCE" || envelopeType === "APPROVAL_REQUEST"
      ? validateAdvisoryFindings(payload.findings, "payload.findings", errors)
      : envelopeType !== "COMMIT_RESULT"
        ? validateFindings(payload.findings, "payload.findings", errors)
        : undefined
    : undefined;

  return validateEnvelopeSpecificPayload(
    envelopeType,
    payload,
    buildValidatedPayload({ payload, findings }),
    errors
  );
}
